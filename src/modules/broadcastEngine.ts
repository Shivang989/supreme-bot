import { BROADCAST_API } from "../telegram/broadcastApi";
import { BroadcastContentItem, BroadcastDraft } from "../types/broadcast";

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
  async snapshotAudience(db: D1Database, campaignId: string, audience: Array<{ id: number; type: string }>): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const statements = [];

    for (const target of audience) {
      statements.push(
        db.prepare(
          `INSERT OR IGNORE INTO broadcast_recipients (campaign_id, destination_id, destination_type, status)
           VALUES (?, ?, ?, 'pending')`
        ).bind(campaignId, target.id, target.type)
      );
      statements.push(
        db.prepare(
          `INSERT OR IGNORE INTO broadcast_jobs (id, campaign_id, destination_id, destination_type, item_index, status, updated_at)
           VALUES (?, ?, ?, ?, 0, 'pending', ?)`
        ).bind(`${campaignId}_${target.id}_0`, campaignId, target.id, target.type, now)
      );
    }

    // Execute in batch blocks of 50 statements
    for (let i = 0; i < statements.length; i += 50) {
      await db.batch(statements.slice(i, i + 50));
    }
  },

  async processBatch(db: D1Database, batchSize: number = 25): Promise<{ processed: number; remaining: number }> {
    const now = Math.floor(Date.now() / 1000);
    const leaseId = now + 45; // 45 seconds lease time

    // Reclaim expired worker leases & activate retryable jobs
    await db.prepare(
      `UPDATE broadcast_jobs 
       SET status = 'pending', worker_lease = 0 
       WHERE status = 'processing' AND worker_lease < ?`
    ).bind(now).run();

    await db.prepare(
      `UPDATE broadcast_jobs 
       SET status = 'pending', retry_after = 0 
       WHERE status = 'retry_wait' AND retry_after <= ?`
    ).bind(now).run();

    // Atomically claim a batch of jobs for this invocation
    const jobs = await db.prepare(
      `SELECT j.* 
       FROM broadcast_jobs j
       JOIN broadcast_campaigns c ON j.campaign_id = c.id
       WHERE j.status = 'pending' AND c.status = 'running'
       ORDER BY j.updated_at ASC
       LIMIT ?`
    ).bind(batchSize).all<JobRow>();

    if (!jobs.results || jobs.results.length === 0) {
      return { processed: 0, remaining: 0 };
    }

    const jobIds = jobs.results.map((j) => j.id);
    const placeholders = jobIds.map(() => "?").join(",");
    await db.prepare(
      `UPDATE broadcast_jobs 
       SET status = 'processing', worker_lease = ?, attempts = attempts + 1, updated_at = ?
       WHERE id IN (${placeholders})`
    ).bind(leaseId, now, ...jobIds).run();

    // Cache active campaign settings
    const campaignMap = new Map<string, any>();

    for (const job of jobs.results) {
      if (!campaignMap.has(job.campaign_id)) {
        const camp = await db.prepare("SELECT * FROM broadcast_campaigns WHERE id = ?")
          .bind(job.campaign_id)
          .first();
        campaignMap.set(job.campaign_id, camp);
      }
      const campaign = campaignMap.get(job.campaign_id);
      if (!campaign || campaign.status !== "running") continue;

      const items: BroadcastContentItem[] = JSON.parse(campaign.content_payload);
      const buttons = campaign.button_payload ? JSON.parse(campaign.button_payload) : undefined;
      const currentItem = items[job.item_index];

      if (!currentItem) {
        await db.prepare("UPDATE broadcast_jobs SET status = 'skipped', updated_at = ? WHERE id = ?")
          .bind(now, job.id).run();
        continue;
      }

      // Execute Telegram API Send/Copy/Forward
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
          // Default: Copy
          sendRes = await BROADCAST_API.copyMessage({
            chat_id: job.destination_id,
            from_chat_id: currentItem.from_chat_id,
            message_id: currentItem.message_id,
            reply_markup: job.item_index === items.length - 1 && buttons ? { inline_keyboard: buttons } : undefined,
            disable_notification: campaign.is_silent === 1,
            protect_content: campaign.protect_content === 1,
          });
        }
      } catch (err: any) {
        sendRes = { ok: false, description: err.message };
      }

      // Handle Telegram response
      if (sendRes.ok && sendRes.result) {
        const sentId = sendRes.result.message_id;

        // Process Pinning if configured for this item
        let pinSuccess = false;
        if (
          campaign.pin_mode !== "none" &&
          job.item_index === campaign.pin_item_index &&
          (campaign.pin_destination === "all" ||
            (campaign.pin_destination === "groups" && ["group", "supergroup"].includes(job.destination_type)) ||
            (campaign.pin_destination === "channels" && job.destination_type === "channel") ||
            (campaign.pin_destination === "private" && job.destination_type === "private"))
        ) {
          try {
            const pinRes = await BROADCAST_API.pinChatMessage({
              chat_id: job.destination_id,
              message_id: sentId,
              disable_notification: campaign.pin_mode === "quiet",
            });
            pinSuccess = pinRes.ok;
          } catch {
            pinSuccess = false; // Pin failure does not mark delivery as failed
          }
        }

        // Advance Sequence if more items exist
        if (job.item_index < items.length - 1) {
          const nextIndex = job.item_index + 1;
          await db.prepare(
            `UPDATE broadcast_jobs 
             SET item_index = ?, status = 'pending', worker_lease = 0, sent_message_id = ?, updated_at = ? 
             WHERE id = ?`
          ).bind(nextIndex, sentId, now, job.id).run();
        } else {
          // Completed all items for this destination
          await db.prepare(
            `UPDATE broadcast_jobs 
             SET status = 'sent', worker_lease = 0, sent_message_id = ?, updated_at = ? 
             WHERE id = ?`
          ).bind(sentId, now, job.id).run();

          // Execute Tag All if configured and allowed in this group
          if (
            campaign.tag_all_enabled === 1 &&
            ["group", "supergroup"].includes(job.destination_type)
          ) {
            await this.dispatchGroupMentions(db, job.destination_id);
          }
        }
      } else {
        // Handle Failures & Backoff
        const desc = sendRes.description || "Unknown send error";
        const retryAfterSec = sendRes.parameters?.retry_after;

        if (retryAfterSec) {
          // FloodWait rate limit: schedule retry
          await db.prepare(
            `UPDATE broadcast_jobs 
             SET status = 'retry_wait', retry_after = ?, worker_lease = 0, last_error = ?, updated_at = ? 
             WHERE id = ?`
          ).bind(now + retryAfterSec, desc, now, job.id).run();
        } else if (
          desc.includes("bot was blocked") ||
          desc.includes("user is deactivated") ||
          desc.includes("chat not found") ||
          desc.includes("bot was kicked")
        ) {
          // Permanent failure: mark failed immediately and de-register
          await db.prepare(
            `UPDATE broadcast_jobs 
             SET status = 'failed', worker_lease = 0, last_error = ?, updated_at = ? 
             WHERE id = ?`
          ).bind(desc, now, job.id).run();

          if (job.destination_type === "private") {
            await db.prepare("UPDATE broadcast_user_registry SET is_blocked = 1 WHERE user_id = ?")
              .bind(job.destination_id).run();
          } else {
            await db.prepare("UPDATE broadcast_chat_registry SET can_send = 0 WHERE chat_id = ?")
              .bind(job.destination_id).run();
          }
        } else {
          // Temporary error: retry up to 3 attempts with exponential backoff
          if (job.attempts >= 3) {
            await db.prepare(
              `UPDATE broadcast_jobs 
               SET status = 'failed', worker_lease = 0, last_error = ?, updated_at = ? 
               WHERE id = ?`
            ).bind(desc, now, job.id).run();
          } else {
            const backoff = Math.pow(2, job.attempts) * 5;
            await db.prepare(
              `UPDATE broadcast_jobs 
               SET status = 'retry_wait', retry_after = ?, worker_lease = 0, last_error = ?, updated_at = ? 
               WHERE id = ?`
            ).bind(now + backoff, desc, now, job.id).run();
          }
        }
      }
    }

    // Check completion for active campaigns
    for (const [cId] of campaignMap.entries()) {
      const remainingCount = await db.prepare(
        `SELECT COUNT(*) as c FROM broadcast_jobs WHERE campaign_id = ? AND status IN ('pending', 'processing', 'retry_wait')`
      ).bind(cId).first<{ c: number }>();

      if (remainingCount && remainingCount.c === 0) {
        await db.prepare(
          `UPDATE broadcast_campaigns 
           SET status = 'completed', completed_at = ? 
           WHERE id = ?`
        ).bind(now, cId).run();
      }
    }

    const totalRemaining = await db.prepare(
      `SELECT COUNT(*) as c FROM broadcast_jobs WHERE status IN ('pending', 'processing', 'retry_wait')`
    ).first<{ c: number }>();

    return { processed: jobs.results.length, remaining: totalRemaining?.c || 0 };
  },

  async dispatchGroupMentions(db: D1Database, chatId: number): Promise<void> {
    const chatSettings = await db.prepare(
      "SELECT allow_tag_all FROM broadcast_chat_registry WHERE chat_id = ?"
    ).bind(chatId).first<{ allow_tag_all: number }>();

    if (!chatSettings || chatSettings.allow_tag_all !== 1) return;

    const members = await db.prepare(
      "SELECT user_id, first_name FROM broadcast_group_members WHERE chat_id = ? ORDER BY last_seen DESC LIMIT 50"
    ).bind(chatId).all<{ user_id: number; first_name: string }>();

    if (!members.results || members.results.length === 0) return;

    // Chunk mentions into safe groups of 5 members per message to prevent spam triggers
    for (let i = 0; i < members.results.length; i += 5) {
      const chunk = members.results.slice(i, i + 5);
      const text = "📢 <b>Notice to Members:</b> " + chunk
        .map((m) => `<a href="tg://user?id=${m.user_id}">${m.first_name.replace(/</g, "&lt;")}</a>`)
        .join(" ");

      await BROADCAST_API.sendTextMessage({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_notification: false,
      });
    }
  },
};

