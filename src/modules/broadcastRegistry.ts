import { TelegramUpdate } from "../types";
import { AudienceTarget } from "../types/broadcast";

export const BROADCAST_REGISTRY = {
  // 1. Track groups, supergroups, and channels (strictly negative chat IDs)
  async trackDestination(
    db: D1Database,
    chat: { id: number; type: string; title?: string }
  ): Promise<void> {
    if (!chat || chat.type === "private" || chat.id > 0) return;

    try {
      const now = Math.floor(Date.now() / 1000);
      await db
        .prepare(
          `INSERT INTO broadcast_chat_registry (chat_id, chat_type, title, can_send, allow_broadcast, allow_tag_all, updated_at)
           VALUES (?, ?, ?, 1, 1, 1, ?)
           ON CONFLICT(chat_id) DO UPDATE SET
             chat_type = excluded.chat_type,
             title = COALESCE(excluded.title, broadcast_chat_registry.title),
             can_send = 1,
             updated_at = excluded.updated_at`
        )
        .bind(chat.id, chat.type, chat.title || null, now)
        .run();
    } catch (err) {
      console.error("Non-fatal registry trackDestination error:", err);
    }
  },

  // 2. Track private DM users (strictly positive user IDs)
  async trackUser(
    db: D1Database,
    from: { id: number; first_name?: string; username?: string; is_bot?: boolean }
  ): Promise<void> {
    if (!from || from.is_bot || from.id <= 0) return;

    try {
      const now = Math.floor(Date.now() / 1000);
      await db
        .prepare(
          `INSERT INTO broadcast_user_registry (user_id, first_name, username, is_opted_out, is_blocked, last_interaction)
           VALUES (?, ?, ?, 0, 0, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             first_name = excluded.first_name,
             username = excluded.username,
             is_blocked = 0,
             last_interaction = excluded.last_interaction`
        )
        .bind(from.id, from.first_name || "User", from.username || null, now)
        .run();
    } catch (err) {
      console.error("Non-fatal registry trackUser error:", err);
    }
  },

  // 3. Track group members for Tag All
  async trackGroupMember(
    db: D1Database,
    chatId: number,
    from: { id: number; first_name: string; username?: string; is_bot?: boolean }
  ): Promise<void> {
    if (!from || from.is_bot || chatId >= 0) return;

    try {
      const now = Math.floor(Date.now() / 1000);
      await db
        .prepare(
          `INSERT INTO broadcast_group_members (chat_id, user_id, first_name, username, last_seen)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(chat_id, user_id) DO UPDATE SET
             first_name = excluded.first_name,
             username = excluded.username,
             last_seen = excluded.last_seen`
        )
        .bind(chatId, from.id, from.first_name || "Member", from.username || null, now)
        .run();
    } catch (err) {
      console.error("Non-fatal registry trackGroupMember error:", err);
    }
  },

  // 4. Handle bot added/kicked/promoted in groups
  async handleChatMemberUpdated(db: D1Database, update: TelegramUpdate): Promise<void> {
    try {
      const myChatMember = (update as any).my_chat_member;
      if (!myChatMember) return;

      const chat = myChatMember.chat;
      if (!chat || chat.type === "private") return;

      const newStatus = myChatMember.new_chat_member?.status;
      const canSend = ["member", "administrator", "creator"].includes(newStatus) ? 1 : 0;
      const canPin = myChatMember.new_chat_member?.can_pin_messages ? 1 : 0;
      const now = Math.floor(Date.now() / 1000);

      await db
        .prepare(
          `INSERT INTO broadcast_chat_registry (chat_id, chat_type, title, can_send, can_pin, allow_broadcast, allow_tag_all, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, 1, ?)
           ON CONFLICT(chat_id) DO UPDATE SET
             chat_type = excluded.chat_type,
             title = COALESCE(excluded.title, broadcast_chat_registry.title),
             can_send = excluded.can_send,
             can_pin = excluded.can_pin,
             updated_at = excluded.updated_at`
        )
        .bind(chat.id, chat.type, chat.title || null, canSend, canPin, now)
        .run();
    } catch (err) {
      console.error("Non-fatal handleChatMemberUpdated error:", err);
    }
  },

  // 5. User Opt-Out / Opt-In
  async setOptOut(db: D1Database, userId: number, optOut: boolean): Promise<void> {
    try {
      await db
        .prepare("UPDATE broadcast_user_registry SET is_opted_out = ? WHERE user_id = ?")
        .bind(optOut ? 1 : 0, userId)
        .run();
    } catch (err) {
      console.error("Non-fatal setOptOut error:", err);
    }
  },

  // 6. Get live counts for the dashboard
  async getAudienceCounts(db: D1Database): Promise<{ dmCount: number; groupCount: number }> {
    try {
      const dmRes = await db
        .prepare(
          `SELECT COUNT(*) AS c FROM (
             SELECT user_id AS id FROM broadcast_user_registry WHERE user_id > 0 AND is_opted_out = 0 AND is_blocked = 0
             UNION
             SELECT chat_id AS id FROM broadcast_chat_registry WHERE chat_id > 0 AND chat_type = 'private' AND can_send = 1
           )`
        )
        .first<{ c: number }>();

      const grpRes = await db
        .prepare(
          `SELECT COUNT(*) AS c FROM broadcast_chat_registry
           WHERE chat_id < 0 AND chat_type IN ('group', 'supergroup') AND can_send = 1 AND allow_broadcast = 1`
        )
        .first<{ c: number }>();

      return {
        dmCount: dmRes?.c || 0,
        groupCount: grpRes?.c || 0,
      };
    } catch (err) {
      console.error("Error fetching audience counts:", err);
      return { dmCount: 0, groupCount: 0 };
    }
  },

  // 7. Resolve exact recipients for 'dm', 'groups', or 'all'
  async resolveEligibleAudience(
    db: D1Database,
    target: AudienceTarget
  ): Promise<Array<{ id: number; type: string }>> {
    try {
      const results: Array<{ id: number; type: string }> = [];

      // Fetch DMs if target is 'dm' or 'all'
      if (target === "dm" || target === "all") {
        const users = await db
          .prepare(
            `SELECT user_id AS id FROM broadcast_user_registry
             WHERE user_id > 0 AND is_opted_out = 0 AND is_blocked = 0
             UNION
             SELECT chat_id AS id FROM broadcast_chat_registry
             WHERE chat_id > 0 AND chat_type = 'private' AND can_send = 1`
          )
          .all<{ id: number }>();

        for (const row of users.results || []) {
          results.push({ id: row.id, type: "private" });
        }
      }

      // Fetch Groups & Supergroups if target is 'groups' or 'all'
      if (target === "groups" || target === "all") {
        const groups = await db
          .prepare(
            `SELECT chat_id AS id, chat_type AS type
             FROM broadcast_chat_registry
             WHERE chat_id < 0 AND chat_type IN ('group', 'supergroup') AND can_send = 1 AND allow_broadcast = 1`
          )
          .all<{ id: number; type: string }>();

        for (const row of groups.results || []) {
          results.push({ id: row.id, type: row.type });
        }
      }

      return results;
    } catch (err) {
      console.error("Error resolving eligible audience:", err);
      return [];
    }
  },
};
