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
  }
};

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
