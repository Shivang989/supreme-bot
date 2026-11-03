import { TelegramMessage, TelegramUpdate } from "../types";


export const BROADCAST_REGISTRY = {
  async trackDestination(db: D1Database, chat: { id: number; type: string; title?: string }): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await db.prepare(
        `INSERT INTO broadcast_chat_registry (chat_id, chat_type, title, can_send, updated_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(chat_id) DO UPDATE SET
           chat_type = excluded.chat_type,
           title = COALESCE(excluded.title, broadcast_chat_registry.title),
           can_send = 1,
           updated_at = excluded.updated_at`
      ).bind(chat.id, chat.type, chat.title || null, now).run();
    } catch (err) {
      console.error("Non-fatal registry trackDestination error:", err);
    }
  },

  async trackUser(db: D1Database, from: { id: number; first_name?: string; username?: string }): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await db.prepare(
        `INSERT INTO broadcast_user_registry (user_id, first_name, username, last_interaction)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           first_name = excluded.first_name,
           username = excluded.username,
           last_interaction = excluded.last_interaction`
      ).bind(from.id, from.first_name || "User", from.username || null, now).run();
    } catch (err) {
      console.error("Non-fatal registry trackUser error:", err);
    }
  },

  async trackGroupMember(db: D1Database, chatId: number, from: { id: number; first_name: string; username?: string }): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await db.prepare(
        `INSERT INTO broadcast_group_members (chat_id, user_id, first_name, username, last_seen)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(chat_id, user_id) DO UPDATE SET
           first_name = excluded.first_name,
           username = excluded.username,
           last_seen = excluded.last_seen`
      ).bind(chatId, from.id, from.first_name, from.username || null, now).run();
    } catch (err) {
      console.error("Non-fatal registry trackGroupMember error:", err);
    }
  },


  async handleChatMemberUpdated(db: D1Database, update: TelegramUpdate): Promise<void> {
    const myChatMember = (update as any).my_chat_member;
    if (!myChatMember) return;

    const chat = myChatMember.chat;
    const newStatus = myChatMember.new_chat_member?.status;
    const canSend = ["member", "administrator"].includes(newStatus) ? 1 : 0;
    const canPin = myChatMember.new_chat_member?.can_pin_messages ? 1 : 0;
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(
      `INSERT INTO broadcast_chat_registry (chat_id, chat_type, title, can_send, can_pin, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         can_send = excluded.can_send,
         can_pin = excluded.can_pin,
         updated_at = excluded.updated_at`
    ).bind(chat.id, chat.type, chat.title || null, canSend, canPin, now).run();
  },

  async setOptOut(db: D1Database, userId: number, optOut: boolean): Promise<void> {
    await db.prepare("UPDATE broadcast_user_registry SET is_opted_out = ? WHERE user_id = ?")
      .bind(optOut ? 1 : 0, userId)
      .run();
  },

  async setGroupTagAll(db: D1Database, chatId: number, allow: boolean): Promise<void> {
    await db.prepare("UPDATE broadcast_chat_registry SET allow_tag_all = ? WHERE chat_id = ?")
      .bind(allow ? 1 : 0, chatId)
      .run();
  },

  async resolveEligibleAudience(
    db: D1Database,
    scope: "global" | "dm_only",
    audienceFilter: string
  ): Promise<Array<{ id: number; type: string }>> {
    // 1. Sync existing economy players into broadcast_user_registry
    try {
      const now = Math.floor(Date.now() / 1000);
      await db.prepare(`
        INSERT OR IGNORE INTO broadcast_user_registry (user_id, first_name, is_opted_out, is_blocked, last_interaction)
        SELECT user_id, 'Player', 0, 0, ? FROM users
      `).bind(now).run();
    } catch (e) {
      console.error("User sync error:", e);
    }

    // 2. Fetch based on scope and filter
    if (scope === "dm_only" || audienceFilter === "private") {
      const res = await db.prepare(
        `SELECT user_id as id, 'private' as type 
         FROM broadcast_user_registry 
         WHERE is_opted_out = 0 AND is_blocked = 0`
      ).all<{ id: number; type: string }>();
      return res.results || [];
    }

    if (audienceFilter === "groups") {
      const res = await db.prepare(
        `SELECT chat_id as id, chat_type as type 
         FROM broadcast_chat_registry 
         WHERE chat_type IN ('group', 'supergroup') AND can_send = 1 AND allow_broadcast = 1`
      ).all<{ id: number; type: string }>();
      return res.results || [];
    }

    if (audienceFilter === "channels") {
      const res = await db.prepare(
        `SELECT chat_id as id, chat_type as type 
         FROM broadcast_chat_registry 
         WHERE chat_type = 'channel' AND can_send = 1 AND allow_broadcast = 1`
      ).all<{ id: number; type: string }>();
      return res.results || [];
    }

    // Default: 'all' destinations
    const users = await db.prepare(
      `SELECT user_id as id, 'private' as type 
       FROM broadcast_user_registry 
       WHERE is_opted_out = 0 AND is_blocked = 0`
    ).all<{ id: number; type: string }>();

    const chats = await db.prepare(
      `SELECT chat_id as id, chat_type as type 
       FROM broadcast_chat_registry 
       WHERE can_send = 1 AND allow_broadcast = 1`
    ).all<{ id: number; type: string }>();

    return [...(users.results || []), ...(chats.results || [])];
  },

};
