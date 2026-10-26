import { UserData, InventoryItem } from "./types";
import { CONFIG } from "./config";

export interface AdminRecord {
  chat_id: number;
  user_id: number;
  level: number;
  title?: string;
}

export const DB_MANAGER = {
  // ==========================================
  // 👤 USER OPERATIONS
  // ==========================================
  async ensureUserExists(db: D1Database, userId: number): Promise<void> {
    const existing = await db
      .prepare("SELECT user_id FROM users WHERE user_id = ?")
      .bind(userId)
      .first();

    if (!existing) {
      await db
        .prepare(
          "INSERT INTO users (user_id, balance, ammo, kills, is_alive, protected_until, last_daily) VALUES (?, ?, 0, 0, 1, 0, 0)"
        )
        .bind(userId, CONFIG.STARTING_BALANCE)
        .run();
    }
  },

  async getUser(db: D1Database, userId: number): Promise<UserData | null> {
    const user = await db
      .prepare("SELECT * FROM users WHERE user_id = ?")
      .bind(userId)
      .first<UserData>();

    return user || null;
  },

  async updateBalance(db: D1Database, userId: number, balance: number): Promise<void> {
    await db
      .prepare("UPDATE users SET balance = ? WHERE user_id = ?")
      .bind(balance, userId)
      .run();
  },

  async setAliveStatus(db: D1Database, userId: number, isAlive: number): Promise<void> {
    await db
      .prepare("UPDATE users SET is_alive = ? WHERE user_id = ?")
      .bind(isAlive, userId)
      .run();
  },

  async addKill(db: D1Database, userId: number): Promise<void> {
    await db
      .prepare("UPDATE users SET kills = COALESCE(kills, 0) + 1 WHERE user_id = ?")
      .bind(userId)
      .run();
  },

  async setProtection(db: D1Database, userId: number, expireTimestamp: number): Promise<void> {
    await db
      .prepare("UPDATE users SET protected_until = ? WHERE user_id = ?")
      .bind(expireTimestamp, userId)
      .run();
  },

  async getTopPlayers(db: D1Database, limit: number = 5): Promise<UserData[]> {
    const result = await db
      .prepare("SELECT * FROM users ORDER BY balance DESC LIMIT ?")
      .bind(limit)
      .all<UserData>();

    return result.results || [];
  },


  // ==========================================
  // ⚙️ DM UI CONFIG & BUILDER STORAGE
  // ==========================================
  async ensureSettingsTable(db: D1Database): Promise<void> {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS bot_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`
      )
      .run();
  },

  async getSetting<T>(db: D1Database, key: string): Promise<T | null> {
    await this.ensureSettingsTable(db);
    const row = await db
      .prepare("SELECT value FROM bot_settings WHERE key = ?")
      .bind(key)
      .first<{ value: string }>();
    if (!row) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  },

  async setSetting(db: D1Database, key: string, value: any): Promise<void> {
    await this.ensureSettingsTable(db);
    const serialized = JSON.stringify(value);
    await db
      .prepare(
        `INSERT INTO bot_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .bind(key, serialized)
      .run();
  },

  async deleteSetting(db: D1Database, key: string): Promise<void> {
    await this.ensureSettingsTable(db);
    await db.prepare("DELETE FROM bot_settings WHERE key = ?").bind(key).run();
  },


  // ==========================================
  // 🎒 INVENTORY OPERATIONS
  // ==========================================
  async getInventory(db: D1Database, userId: number): Promise<InventoryItem[]> {
    const result = await db
      .prepare("SELECT * FROM inventory WHERE user_id = ? AND quantity > 0")
      .bind(userId)
      .all<InventoryItem>();

    return result.results || [];
  },

  // ==========================================
  // 🛡️ ADMIN OPERATIONS
  // ==========================================
  async getAdmin(db: D1Database, chatId: number, userId: number): Promise<AdminRecord | null> {
    const admin = await db
      .prepare("SELECT * FROM admins WHERE chat_id = ? AND user_id = ?")
      .bind(chatId, userId)
      .first<AdminRecord>();

    return admin || null;
  },

  async setAdmin(
    db: D1Database,
    chatId: number,
    userId: number,
    level: number,
    title?: string
  ): Promise<void> {
    await db
      .prepare(
        `INSERT INTO admins (chat_id, user_id, level, title)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(chat_id, user_id)
         DO UPDATE SET level = excluded.level, title = excluded.title`
      )
      .bind(chatId, userId, level, title ?? "Admin")
      .run();
  },

  async removeAdmin(db: D1Database, chatId: number, userId: number): Promise<void> {
    await db
      .prepare("DELETE FROM admins WHERE chat_id = ? AND user_id = ?")
      .bind(chatId, userId)
      .run();
  },

  async getAllAdmins(db: D1Database, chatId: number): Promise<AdminRecord[]> {
    const result = await db
      .prepare("SELECT * FROM admins WHERE chat_id = ?")
      .bind(chatId)
      .all<AdminRecord>();

    return result.results || [];
  },
};

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
