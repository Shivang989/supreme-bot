import { TelegramUpdate } from "../types";

export const BROADCAST_REGISTRY = {
  // 1. Record / update chat status (groups, supergroups, channels, private DMs)
  async trackDestination(
    db: D1Database,
    chat: { id: number; type: string; title?: string }
  ): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await db
        .prepare(
          `INSERT INTO broadcast_chat_registry (chat_id, chat_type, title, can_send, updated_at)
           VALUES (?, ?, ?, 1, ?)
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

  // 2. Record / update private DM users who have legitimately started the bot
  async trackUser(
    db: D1Database,
    from: { id: number; first_name?: string; username?: string }
  ): Promise<void> {
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

  // 3. Record group members observed via group interactions (for Tag All)
  async trackGroupMember(
    db: D1Database,
    chatId: number,
    from: { id: number; first_name: string; username?: string }
  ): Promise<void> {
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
        .bind(chatId, from.id, from.first_name, from.username || null, now)
        .run();
    } catch (err) {
      console.error("Non-fatal registry trackGroupMember error:", err);
    }
  },

  // 4. Track status updates when bot is added, removed, or permissions change
  async handleChatMemberUpdated(db: D1Database, update: TelegramUpdate): Promise<void> {
    try {
      const myChatMember = (update as any).my_chat_member;
      if (!myChatMember) return;

      const chat = myChatMember.chat;
      const newStatus = myChatMember.new_chat_member?.status;
      const canSend = ["member", "administrator"].includes(newStatus) ? 1 : 0;
      const canPin = myChatMember.new_chat_member?.can_pin_messages ? 1 : 0;
      const now = Math.floor(Date.now() / 1000);

      await db
        .prepare(
          `INSERT INTO broadcast_chat_registry (chat_id, chat_type, title, can_send, can_pin, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET
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

  // 5. User broadcast opt-out / opt-in toggles
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

  // 6. Group setting: toggle permission for Tag All broadcasts
  async setGroupTagAll(db: D1Database, chatId: number, allow: boolean): Promise<void> {
    try {
      await db
        .prepare("UPDATE broadcast_chat_registry SET allow_tag_all = ? WHERE chat_id = ?")
        .bind(allow ? 1 : 0, chatId)
        .run();
    } catch (err) {
      console.error("Non-fatal setGroupTagAll error:", err);
    }
  },

  // 7. Resolve valid recipients for audience snapshots
  async resolveEligibleAudience(
    db: D1Database,
    scope: "global" | "dm_only",
    audienceFilter: string
  ): Promise<Array<{ id: number; type: string }>> {
    try {
      // DM-only scope or private filter: only verified private DM chats
      if (scope === "dm_only" || audienceFilter === "private") {
        const res = await db
          .prepare(
            `SELECT user_id AS id, 'private' AS type
             FROM broadcast_user_registry
             WHERE is_opted_out = 0 AND is_blocked = 0`
          )
          .all<{ id: number; type: string }>();
        return res.results || [];
      }

      // Filter: Groups & Supergroups only
      if (audienceFilter === "groups") {
        const res = await db
          .prepare(
            `SELECT chat_id AS id, chat_type AS type
             FROM broadcast_chat_registry
             WHERE chat_type IN ('group', 'supergroup') AND can_send = 1 AND allow_broadcast = 1`
          )
          .all<{ id: number; type: string }>();
        return res.results || [];
      }

      // Filter: Channels only
      if (audienceFilter === "channels") {
        const res = await db
          .prepare(
            `SELECT chat_id AS id, chat_type AS type
             FROM broadcast_chat_registry
             WHERE chat_type = 'channel' AND can_send = 1 AND allow_broadcast = 1`
          )
          .all<{ id: number; type: string }>();
        return res.results || [];
      }

      // Global default: All eligible private chats, groups, and channels
      const users = await db
        .prepare(
          `SELECT user_id AS id, 'private' AS type
           FROM broadcast_user_registry
           WHERE is_opted_out = 0 AND is_blocked = 0`
        )
        .all<{ id: number; type: string }>();

      const chats = await db
        .prepare(
          `SELECT chat_id AS id, chat_type AS type
           FROM broadcast_chat_registry
           WHERE can_send = 1 AND allow_broadcast = 1`
        )
        .all<{ id: number; type: string }>();

      return [...(users.results || []), ...(chats.results || [])];
    } catch (err) {
      console.error("Error resolving eligible audience:", err);
      return [];
    }
  },
};
