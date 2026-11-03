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
  // Snapshot audience list into database tables at campaign launch
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

    // Execute in chunks to respect Cloudflare D1 batch limits
    for (let i = 0; i < statements.length; i += 50) {
      await db.batch(statements.slice(i, i + 50));
    }
  },

  // Continuously process jobs in worker background until the queue is drained or runtime limit is reached
  async runContinuousWorker(db: D1Database, maxRunTimeMs: number = 25000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxRunTimeMs) {
      const { processed, remaining } = await this.processBatch(db, 20);
      if (processed === 0 || remaining === 0) {
        break;
      }
      // Pacing delay to avoid exceeding Telegram's global 30 msg/sec limit
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  },

  // Process a single batch of delivery jobs with lease claiming and error recovery
  async processBatch(
    db: D1Database,
    batchSize: number = 20
  ): Promise<{ processed: number; remaining: number }> {
    const now = Math.floor(Date.now() / 1000);
    const leaseTime = now + 45; // 45-second lock lease

    // 1. Reclaim expired worker leases & activate ready retries
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

    // 2. Fetch active pending jobs
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

    // 3. Atomically lock selected jobs with a lease
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

    // 4. Deliver messages
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

      let sendRes: any;
      try {
        if (campaign.mode === "forward") {
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
              job.item_index === items.length - 1 && buttons
                ? { inline_keyboard: buttons }
                : undefined,
            disable_notification: campaign.is_silent === 1,
            protect_content: campaign.protect_content === 1,
          });
        }
      } catch (err: any) {
        sendRes = { ok: false, description: err?.message || "Network exception during dispatch" };
      }

      // Handle Telegram response
      if (sendRes.ok && sendRes.result) {
        const sentId = sendRes.result.message_id;

        // Message pinning logic
        if (
          campaign.pin_mode !== "none" &&
          job.item_index === campaign.pin_item_index &&
          (campaign.pin_destination === "all" ||
            (campaign.pin_destination === "groups" &&
              ["group", "supergroup"].includes(job.destination_type)) ||
            (campaign.pin_destination === "channels" && job.destination_type === "channel") ||
            (campaign.pin_destination === "private" && job.destination_type === "private"))
        ) {
          try {
            await BROADCAST_API.pinChatMessage({
              chat_id: job.destination_id,
              message_id: sentId,
              disable_notification: campaign.pin_mode === "quiet",
            });
          } catch {
            // Pin failure does not invalidate delivery
          }
        }

        // Multi-message sequence progression
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
          // Destination fully completed
          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET status = 'sent', worker_lease = 0, sent_message_id = ?, updated_at = ? 
               WHERE id = ?`
            )
            .bind(sentId, now, job.id)
            .run();

          // Group member tagging if enabled
          if (
            campaign.tag_all_enabled === 1 &&
            ["group", "supergroup"].includes(job.destination_type)
          ) {
            await this.dispatchGroupMentions(db, job.destination_id);
          }
        }
      } else {
        const desc = sendRes.description || "Unknown error";
        const retryAfterSec = sendRes.parameters?.retry_after;
        const migrateId = sendRes.parameters?.migrate_to_chat_id;

        // Auto-migrate groups upgraded to supergroups
        if (migrateId) {
          await db
            .prepare(
              `UPDATE broadcast_chat_registry 
               SET chat_id = ?, chat_type = 'supergroup', updated_at = ? 
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

        // Permanent failures (block, kick, permission lack, deleted user)
        const isPermanent =
          desc.includes("bot was blocked") ||
          desc.includes("user is deactivated") ||
          desc.includes("chat not found") ||
          desc.includes("bot was kicked") ||
          desc.includes("can't initiate conversation") ||
          desc.includes("not enough rights");

        if (isPermanent) {
          await db
            .prepare(
              `UPDATE broadcast_jobs 
               SET status = 'failed', worker_lease = 0, last_error = ?, updated_at = ? 
               WHERE id = ?`
            )
            .bind(desc, now, job.id)
            .run();

          if (job.destination_type === "private") {
            await db
              .prepare("UPDATE broadcast_user_registry SET is_blocked = 1 WHERE user_id = ?")
              .bind(job.destination_id)
              .run();
          } else {
            await db
              .prepare("UPDATE broadcast_chat_registry SET can_send = 0 WHERE chat_id = ?")
              .bind(job.destination_id)
              .run();
          }
        } else {
          // Temporary failure: exponential backoff up to 3 attempts
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

      // Safe pacing pause between requests
      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    // 5. Finalize completed campaigns
    for (const [cId] of campaignMap.entries()) {
      const remainingCount = await db
        .prepare(
          `SELECT COUNT(*) as c 
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
        `SELECT COUNT(*) as c 
         FROM broadcast_jobs 
         WHERE status IN ('pending', 'processing', 'retry_wait')`
      )
      .first<{ c: number }>();

    return { processed: jobs.results.length, remaining: totalRemaining?.c || 0 };
  },

  // Tag observed members in groups where Tag All is authorized
  async dispatchGroupMentions(db: D1Database, chatId: number): Promise<void> {
    const chatSettings = await db
      .prepare("SELECT allow_tag_all FROM broadcast_chat_registry WHERE chat_id = ?")
      .bind(chatId)
      .first<{ allow_tag_all: number }>();

    if (!chatSettings || chatSettings.allow_tag_all !== 1) return;

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
      const text =
        "📢 <b>Notice to Members:</b> " +
        chunk
          .map((m) => `<a href="tg://user?id=${m.user_id}">${m.first_name.replace(/</g, "&lt;")}</a>`)
          .join(" ");

      await BROADCAST_API.sendTextMessage({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_notification: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },
};

