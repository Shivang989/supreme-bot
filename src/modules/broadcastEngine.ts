import { BROADCAST_API } from "../telegram/broadcastApi";
import { BroadcastContentItem } from "../types/broadcast";

interface JobRow {
  id: string;
  campaign_id: string;
  destination_id: number;
  destination_type: string;
  item_index: number;
  attempts: number;
  retry_after: number;
}

export const BROADCAST_ENGINE = {
  // 1. Snapshot target recipients into jobs table
  async snapshotAudience(
    db: D1Database,
    campaignId: string,
    audience: Array<{ id: number; type: string }>
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const statements: D1PreparedStatement[] = [];

    for (const target of audience) {
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO broadcast_recipients (campaign_id, destination_id, destination_type, status)
             VALUES (?, ?, ?, 'pending')`
          )
          .bind(campaignId, target.id, target.type)
      );
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO broadcast_jobs (id, campaign_id, destination_id, destination_type, item_index, status, updated_at)
             VALUES (?, ?, ?, ?, 0, 'pending', ?)`
          )
          .bind(`${campaignId}_${target.id}_0`, campaignId, target.id, target.type, now)
      );
    }

    for (let i = 0; i < statements.length; i += 50) {
      await db.batch(statements.slice(i, i + 50));
    }
  },

  // 2. Run continuous delivery loop within Cloudflare Worker execution window
  async runContinuousWorker(db: D1Database, maxRunTimeMs: number = 25000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxRunTimeMs) {
      const { processed, remaining } = await this.processBatch(db, 25);
      if (processed === 0 || remaining === 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  },

  // 3. Process a single batch of queued broadcast jobs
  async processBatch(
    db: D1Database,
    batchSize: number = 25
  ): Promise<{ processed: number; remaining: number }> {
    const now = Math.floor(Date.now() / 1000);
    const leaseTime = now + 45;

    // Release expired leases & due retries
    await db
      .prepare(
        `UPDATE broadcast_jobs 
         SET status = 'pending', worker_lease = 0 
         WHERE status = 'processing' AND worker_lease < ?`
      )
      .bind(now)
      .run();

    await db
      .prepare(
        `UPDATE broadcast_jobs 
         SET status = 'pending', retry_after = 0 
         WHERE status = 'retry_wait' AND retry_after <= ?`
      )
      .bind(now)
      .run();

    // Claim pending jobs for running campaigns
    const jobs = await db
      .prepare(
        `SELECT j.* 
         FROM broadcast_jobs j
         JOIN broadcast_campaigns c ON j.campaign_id = c.id
         WHERE j.status = 'pending' AND c.status = 'running'
         ORDER BY j.updated_at ASC
         LIMIT ?`
      )
      .bind(batchSize)
      .all<JobRow>();

    if (!jobs.results || jobs.results.length === 0) {
      return { processed: 0, remaining: 0 };
    }

    const jobIds = jobs.results.map((j) => j.id);
    const placeholders = jobIds.map(() => "?").join(",");
    await db
      .prepare(
        `UPDATE broadcast_jobs 
         SET status = 'processing', worker_lease = ?, attempts = attempts + 1, updated_at = ?
         WHERE id IN (${placeholders})`
      )
      .bind(leaseTime, now, ...jobIds)
      .run();

    const campaignMap = new Map<string, any>();

    for (const job of jobs.results) {
      if (!campaignMap.has(job.campaign_id)) {
        const camp = await db
          .prepare("SELECT * FROM broadcast_campaigns WHERE id = ?")
          .bind(job.campaign_id)
          .first();
        campaignMap.set(job.campaign_id, camp);
      }
      const campaign = campaignMap.get(job.campaign_id);
      if (!campaign || campaign.status !== "running") continue;

      let items: BroadcastContentItem[] = [];
      try {
        items = JSON.parse(campaign.content_payload);
      } catch {
        items = [];
      }

      const buttons = campaign.button_payload ? JSON.parse(campaign.button_payload) : undefined;
      const currentItem = items[job.item_index];

      if (!currentItem) {
        await db
          .prepare("UPDATE broadcast_jobs SET status = 'skipped', updated_at = ? WHERE id = ?")
          .bind(now, job.id)
          .run();
        continue;
      }

      // Send message (Copy or Forward, with fallback to Forward if Poll cannot be copied)
      let sendRes: any;
      try {
        if (campaign.mode === "forward" || currentItem.type === "poll") {
          sendRes = await BROADCAST_API.forwardMessage({
            chat_id: job.destination_id,
            from_chat_id: currentItem.from_chat_id,
            message_id: currentItem.message_id,
            disable_notification: campaign.is_silent === 1,
            protect_content: campaign.protect_content === 1,
          });
        } else {
          sendRes = await BROADCAST_API.copyMessage({
            chat_id: job.destination_id,
            from_chat_id: currentItem.from_chat_id,
            message_id: currentItem.message_id,
            reply_markup:
              job.item_index === items.length - 1 && buttons && buttons.length > 0
                ? { inline_keyboard: buttons }
                : undefined,
            disable_notification: campaign.is_silent === 1,
            protect_content: campaign.protect_content === 1,
          });

          // Fallback to forwardMessage if Telegram blocks copying (e.g. certain polls/games)
          if (!sendRes.ok && sendRes.description?.includes("can't be copied")) {
            sendRes = await BROADCAST_API.forwardMessage({
              chat_id: job.destination_id,
              from_chat_id: currentItem.from_chat_id,
              message_id: currentItem.message_id,
              disable_notification: campaign.is_silent === 1,
              protect_content: campaign.protect_content === 1,
            });
          }
        }
      } catch (err: any) {
        sendRes = { ok: false, description: err?.message || "Network error" };
      }

      if (sendRes.ok && sendRes.result) {
        const sentId = sendRes.result.message_id;

        // Pin message if enabled
        if (campaign.pin_mode !== "none" && job.item_index === campaign.pin_item_index) {
          try {
            await BROADCAST_API.pinChatMessage({
              chat_id: job.destination_id,
              message_id: sentId,
              disable_notification: campaign.pin_mode === "quiet",
            });
          } catch {
            // Ignore pin permission errors so broadcast still counts as sent
          }
        }

        // Advance sequence or mark sent
        if (job.item_index < items.length - 1) {
          const nextIndex = job.item_index + 1;
          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET item_index = ?, status = 'pending', worker_lease = 0, sent_message_id = ?, updated_at = ? 
               WHERE id = ?`
            )
            .bind(nextIndex, sentId, now, job.id)
            .run();
        } else {
          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET status = 'sent', worker_lease = 0, sent_message_id = ?, updated_at = ? 
               WHERE id = ?`
            )
            .bind(sentId, now, job.id)
            .run();

          // Tag All in groups if enabled by owner
          if (campaign.tag_all_enabled === 1 && job.destination_id < 0) {
            await this.dispatchGroupMentions(db, job.destination_id);
          }
        }
      } else {
        const desc = sendRes.description || "Unknown error";
        const retryAfterSec = sendRes.parameters?.retry_after;
        const migrateId = sendRes.parameters?.migrate_to_chat_id;

        // Handle group upgraded to supergroup automatically
        if (migrateId) {
          await db
            .prepare(
              `UPDATE OR IGNORE broadcast_chat_registry 
               SET chat_id = ?, chat_type = 'supergroup', can_send = 1, updated_at = ? 
               WHERE chat_id = ?`
            )
            .bind(migrateId, now, job.destination_id)
            .run();

          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET destination_id = ?, status = 'pending', worker_lease = 0, updated_at = ? 
               WHERE id = ?`
            )
            .bind(migrateId, now, job.id)
            .run();
          continue;
        }

        // Handle Telegram FloodWait
        if (retryAfterSec) {
          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET status = 'retry_wait', retry_after = ?, worker_lease = 0, last_error = ?, updated_at = ? 
               WHERE id = ?`
            )
            .bind(now + retryAfterSec, desc, now, job.id)
            .run();
          continue;
        }

        // Check if bot was permanently blocked or kicked
        const isKickedOrBlocked =
          desc.includes("bot was blocked") ||
          desc.includes("user is deactivated") ||
          desc.includes("chat not found") ||
          desc.includes("bot was kicked") ||
          desc.includes("bot is not a member") ||
          desc.includes("group chat was deactivated") ||
          desc.includes("can't initiate conversation");

        const isMediaRestricted = desc.includes("not enough rights");

        if (isKickedOrBlocked || isMediaRestricted) {
          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET status = 'failed', worker_lease = 0, last_error = ?, updated_at = ? 
               WHERE id = ?`
            )
            .bind(desc, now, job.id)
            .run();

          // Only disable future broadcasts if the bot was actually kicked/blocked (NOT if just a sticker/poll was restricted)
          if (isKickedOrBlocked) {
            if (job.destination_id > 0) {
              await db
                .prepare("UPDATE broadcast_user_registry SET is_blocked = 1 WHERE user_id = ?")
                .bind(job.destination_id)
                .run();
              await db
                .prepare("UPDATE broadcast_chat_registry SET can_send = 0 WHERE chat_id = ?")
                .bind(job.destination_id)
                .run();
            } else {
              await db
                .prepare("UPDATE broadcast_chat_registry SET can_send = 0 WHERE chat_id = ?")
                .bind(job.destination_id)
                .run();
            }
          }
        } else {
          // Temporary failure: retry up to 3 times
          if (job.attempts >= 3) {
            await db
              .prepare(
                `UPDATE broadcast_jobs 
                 SET status = 'failed', worker_lease = 0, last_error = ?, updated_at = ? 
                 WHERE id = ?`
              )
              .bind(desc, now, job.id)
              .run();
          } else {
            const backoff = Math.pow(2, job.attempts) * 5;
            await db
              .prepare(
                `UPDATE broadcast_jobs 
                 SET status = 'retry_wait', retry_after = ?, worker_lease = 0, last_error = ?, updated_at = ? 
                 WHERE id = ?`
              )
              .bind(now + backoff, desc, now, job.id)
              .run();
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    // Mark finished campaigns as completed
    for (const [cId] of campaignMap.entries()) {
      const remainingCount = await db
        .prepare(
          `SELECT COUNT(*) AS c 
           FROM broadcast_jobs 
           WHERE campaign_id = ? AND status IN ('pending', 'processing', 'retry_wait')`
        )
        .bind(cId)
        .first<{ c: number }>();

      if (remainingCount && remainingCount.c === 0) {
        await db
          .prepare(
            `UPDATE broadcast_campaigns 
             SET status = 'completed', completed_at = ? 
             WHERE id = ?`
          )
          .bind(now, cId)
          .run();
      }
    }

    const totalRemaining = await db
      .prepare(
        `SELECT COUNT(*) AS c 
         FROM broadcast_jobs 
         WHERE status IN ('pending', 'processing', 'retry_wait')`
      )
      .first<{ c: number }>();

    return { processed: jobs.results.length, remaining: totalRemaining?.c || 0 };
  },

  // 4. Mention known group members in chunks of 5
  async dispatchGroupMentions(db: D1Database, chatId: number): Promise<void> {
    try {
      const members = await db
        .prepare(
          `SELECT user_id, first_name 
           FROM broadcast_group_members 
           WHERE chat_id = ? 
           ORDER BY last_seen DESC 
           LIMIT 50`
        )
        .bind(chatId)
        .all<{ user_id: number; first_name: string }>();

      if (!members.results || members.results.length === 0) return;

      for (let i = 0; i < members.results.length; i += 5) {
        const chunk = members.results.slice(i, i + 5);
        const mentions = chunk
          .map((m) => {
            const safeName = (m.first_name || "Member")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return `<a href="tg://user?id=${m.user_id}">${safeName}</a>`;
          })
          .join(" ");

        await BROADCAST_API.sendTextMessage({
          chat_id: chatId,
          text: `📢 ${mentions}`,
          parse_mode: "HTML",
          disable_notification: false,
        });

        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    } catch (err) {
      console.error("Non-fatal Tag All error:", err);
    }
  },
};
