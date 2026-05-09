// ╭━━━━━━━━━━━━━━━✪
// │ 🏥 THE CLINIC (DATABASE MANAGER)
// ╰━━━━━━━━━━━━━━━✪
// Yahan sirf D1 Database se baat karne ke functions honge.
// Koi bhi dusri file direct DB ko nahi chhuegi, sab is clinic ke through aayenge.

import { UserData, InventoryItem } from './types';

export const DB_MANAGER = {
  
  // 1. Naya user create karna (Agar pehle se nahi hai)
  async ensureUserExists(db: D1Database, userId: number): Promise<void> {
    await db.prepare(
      "INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)"
    ).bind(userId).run();
  },


  // 2. User ka pura data nikalna
  async getUser(db: D1Database, userId: number): Promise<UserData | null> {
    const { results } = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).all();
    if (results && results.length > 0) {
      return results[0] as unknown as UserData;
    }
    return null;
  },

  // 3. User ka balance update karna
  async updateBalance(db: D1Database, userId: number, newBalance: number): Promise<void> {
    await db.prepare("UPDATE users SET balance = ? WHERE user_id = ?").bind(newBalance, userId).run();
  },

  // 4. User ka status (Alive/Dead) update karna
  async setAliveStatus(db: D1Database, userId: number, status: number): Promise<void> {
    await db.prepare("UPDATE users SET is_alive = ? WHERE user_id = ?").bind(status, userId).run();
  },

  // 5. Kills ka counter badhana
  async addKill(db: D1Database, userId: number): Promise<void> {
    await db.prepare("UPDATE users SET kills = kills + 1 WHERE user_id = ?").bind(userId).run();
  },

  // 6. Inventory me naya item add karna ya quantity badhana
  async addInventoryItem(db: D1Database, userId: number, itemName: string, quantity: number = 1): Promise<void> {
    await db.prepare(`
      INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?)
      ON CONFLICT(user_id, item_name) DO UPDATE SET quantity = quantity + ?
    `).bind(userId, itemName, quantity, quantity).run();
  },

  // 7. Pura inventory bag check karna
  async getInventory(db: D1Database, userId: number): Promise<InventoryItem[]> {
    const { results } = await db.prepare("SELECT item_name, quantity FROM inventory WHERE user_id = ? AND quantity > 0").bind(userId).all();
    return (results || []) as unknown as InventoryItem[];
  },

  // 8. Top players nikalna (Leaderboard ke liye)
  async getTopPlayers(db: D1Database, limit: number = 10): Promise<UserData[]> {
    // Note: D1 engine me kabhi-kabhi 'LIMIT ?' bind karne me error aati hai.
    // Isliye humne limit ko directly SQL string me inject kar diya hai (Safe because it's a hardcoded number).
    const { results } = await db.prepare(`SELECT * FROM users ORDER BY balance DESC LIMIT ${limit}`).all();
    return (results || []) as unknown as UserData[];
  },

  // 9. Shield/Protection Timer Update karna
  async setProtection(db: D1Database, userId: number, timestamp: number): Promise<void> {
    await db.prepare("UPDATE users SET protection_until = ? WHERE user_id = ?").bind(timestamp, userId).run();
  },

  // 10. Admin Level & Title Set karna
  async setAdmin(db: D1Database, chatId: number, userId: number, level: number, title: string): Promise<void> {
    await db.prepare(`
      INSERT INTO group_admins (chat_id, user_id, level, title) VALUES (?, ?, ?, ?)
      ON CONFLICT(chat_id, user_id) DO UPDATE SET level = ?, title = ?
    `).bind(chatId, userId, level, title, level, title).run();
  },

  // 11. Admin Check karna
  async getAdmin(db: D1Database, chatId: number, userId: number): Promise<{level: number, title: string} | null> {
    const { results } = await db.prepare("SELECT level, title FROM group_admins WHERE chat_id = ? AND user_id = ?").bind(chatId, userId).all();
    return (results && results.length > 0) ? results[0] as any : null;
  },

  // 12. Admin Remove karna
  async removeAdmin(db: D1Database, chatId: number, userId: number): Promise<void> {
    await db.prepare("DELETE FROM group_admins WHERE chat_id = ? AND user_id = ?").bind(chatId, userId).run();
  },

  // 13. Group ke saare admins ki list
  async getAllAdmins(db: D1Database, chatId: number): Promise<any[]> {
    const { results } = await db.prepare("SELECT user_id, level, title FROM group_admins WHERE chat_id = ? ORDER BY level DESC").bind(chatId).all();
    return results || [];
  }

};

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
