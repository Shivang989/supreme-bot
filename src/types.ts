// ╭━━━━━━━━━━━━━━━✪
// │ 📜 THE RULEBOOK (TYPES)
// ╰━━━━━━━━━━━━━━━✪
// Is file me koi action nahi hoga, sirf strict rules define honge
// taaki TypeScript humari mistakes (bugs) pakad sake.

// ====================================================
export interface CloudflareEnv {
  DB: D1Database;
  BOT_TOKEN?: string;
  OWNER_ID?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_bot?: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number; type: string; title?: string };
  text?: string;
  reply_to_message?: TelegramMessage;
  new_chat_members?: TelegramUser[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: any;
  chat_member?: any;
}

export interface BotContext {
  env: CloudflareEnv;
  update: TelegramUpdate;
  message: TelegramMessage;
  chatId: number;
  userId: number;
  text: string;
  command: string;
  args: string[];
  reply?: TelegramMessage;
}

export interface MarketItem {
  id?: string;
  name: string;
  base_price: number;
  volatility?: number;
  emoji?: string;
  price?: number;
  description?: string;
  [key: string]: any;
}

export interface UserData {
  user_id: number;
  balance: number;
  ammo?: number;
  kills?: number;
  is_alive?: number;
  protected_until?: number;
  [key: string]: any;
}

export interface InventoryItem {
  user_id: number;
  item_name: string;
  quantity: number;
  [key: string]: any;
}

export type CommandHandler = (ctx: BotContext) => Promise<void | Response>;

// ====================================================


// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
