// ╭━━━━━━━━━━━━━━━✪
// │ 📜 THE RULEBOOK (TYPES)
// ╰━━━━━━━━━━━━━━━✪
// Is file me koi action nahi hoga, sirf strict rules define honge
// taaki TypeScript humari mistakes (bugs) pakad sake.

// ====================================================
export type ButtonLayout = "full" | "half";

export type ButtonActionType =
  | "submenu"
  | "url"
  | "command"
  | "join"
  | "back"
  | "custom";

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number; type: string; title?: string };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  reply_to_message?: TelegramMessage;
  new_chat_members?: TelegramUser[];
}

export interface DMUIConfig {
  customText?: string;
  mediaType?: "photo" | "video" | "none";
  mediaFileId?: string;
  menus: Record<string, DMMenu>;
  buttons: DMButton[];
}



export interface DMButton {
  id: string;
  text: string;
  parentMenuId: string;
  row: number;
  position: number;
  layout: ButtonLayout;
  actionType: ButtonActionType;
  actionValue: string; // URL, command name, target submenu ID, or custom action key
}

export interface DMMenu {
  id: string;
  name: string;
  parentId?: string;
}

export interface DMUISession {
  ownerId: number;
  activeMenuId: string;
  step: string; // e.g., "IDLE", "AWAIT_BTN_TEXT", "AWAIT_BTN_URL", "AWAIT_SUBMENU_NAME", etc.
  tempButton?: Partial<DMButton>;
  editingButtonId?: string;
  targetMenuId?: string;
  draft: DMUIConfig;
}


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
