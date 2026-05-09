// ╭━━━━━━━━━━━━━━━✪
// │ 📜 THE RULEBOOK (TYPES)
// ╰━━━━━━━━━━━━━━━✪
// Is file me koi action nahi hoga, sirf strict rules define honge
// taaki TypeScript humari mistakes (bugs) pakad sake.

export interface CloudflareEnv {
  DB: D1Database;
}

export interface UserData {
  user_id: number;
  balance: number;
  is_alive: number; // 1 = Alive, 0 = Dead
  kills: number;
}

export interface InventoryItem {
  user_id: number;
  item_name: string;
  quantity: number;
}

export interface MarketItem {
  base_price: number;
  volatility: number;
  emoji: string;
  name: string;
}

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
