// ╭━━━━━━━━━━━━━━━✪
// │ 🔐 THE VAULT (CONFIG)
// ╰━━━━━━━━━━━━━━━✪
// Yahan humare saare secret tokens, variables aur designs rahenge.

import { MarketItem } from './types';

export const CONFIG = {
  // Apna asli bot token yahan check kar lena
  BOT_TOKEN: "8322009620:AAG7rLte-1Q8-CjKiJqxEppPwjsVFJyvc6U", 
  STARTING_BALANCE: 1000,
  MARKET_UPDATE_INTERVAL: 300, // 5 minutes (in seconds)
};

export const UI = {
  BORDER_TOP: "╭━━━━━━━━━━━━━━━✪",
  BORDER_BOT: "╰━━━━━━━━━━━━━━━✪",
  DIVIDER:    "┣━━━━━━━━━━━━━━━✪",
};

export const EMOJIS = {
  success: "✅",
  error: "❌",
  dead: "💀",
  alive: "🟢",
  money: "💰",
  gun: "🔫",
  vault: "🎒"
};

export const MARKET_ITEMS: Record<string, MarketItem> = {
  "cheap_watch": { base_price: 100, volatility: 0.3, emoji: "⌚", name: "Cheap Watch" },
  "stolen_phone": { base_price: 500, volatility: 0.4, emoji: "📱", name: "Stolen Phone" },
  "gold_chain": { base_price: 1000, volatility: 0.5, emoji: "⛓️", name: "Gold Chain" },
  "crypto_wallet": { base_price: 5000, volatility: 0.8, emoji: "💻", name: "Crypto Wallet" },
  "classified_documents": { base_price: 10000, volatility: 0.9, emoji: "📁", name: "Classified Docs" }
};

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
