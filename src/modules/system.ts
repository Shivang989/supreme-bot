import { BotContext, CommandHandler, CloudflareEnv, TelegramMessage } from "../types";
import { DB_MANAGER } from "../db";
import { toCustomFont } from "../ui";
import { sendMessage } from "../index";

export async function handleWelcome(env: CloudflareEnv, message: TelegramMessage): Promise<void> {
  if (!message.new_chat_members || message.new_chat_members.length === 0) return;

  for (const member of message.new_chat_members) {
    // 1. Ensure new member is registered in D1 database
    await DB_MANAGER.ensureUserExists(env.DB, member.id);

    // 2. Safe name extraction with fallback
    const rawName = member.first_name?.trim() || "there";
    const safeName = rawName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 3. Format text using the custom typography engine
    const greeting = toCustomFont(`Hello, ${safeName} 💕`);
    const instructions = toCustomFont("Start a DM to use all the features.");

    // 4. Construct blockquote container (produces the vertical accent line)
    const text = `<blockquote>${greeting}\n\n${instructions}</blockquote>`;

    // 5. Single inline action button directing to the bot's private chat
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: toCustomFont("SOW"),
            url: "https://t.me/Myaloobot?start=true",
          },
        ],
      ],
    };

    // 6. Deliver the welcome message
    await sendMessage(message.chat.id, text, inlineKeyboard);
  }
}


export const systemHandlers: Record<string, CommandHandler> = {

  // ==========================================
  // 🚀 /start
  // ==========================================
  "/start": async (ctx: BotContext) => {
    const rawName = ctx.message.from.first_name || "Operative";
    const safeName = rawName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const greeting = toCustomFont(`Welcome back, ${safeName}.`);
    const actionText = toCustomFont("Start! a DM and explore all features.");

    const text = `<blockquote>${greeting}\n${actionText}</blockquote>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: `➕ ${toCustomFont("Add")}`,
            url: "https://t.me/Myaloobot?startgroup=true",
          },
          {
            text: `💬 ${toCustomFont("Start DM")}`,
            url: "https://t.me/Myaloobot?start=true",
          },
        ],
      ],
    };

    await sendMessage(ctx.chatId, text, inlineKeyboard);
  },


  "/ping": async (ctx: BotContext) => {
    const start = Date.now();
    await sendMessage(ctx.chatId, `🏓 <b>${toCustomFont("Pong!")}</b> <code>${Date.now() - start}ms</code>`);
  },

  "/top": async (ctx: BotContext) => {
    const topPlayers = await DB_MANAGER.getTopPlayers(ctx.env.DB, 5);

    if (!topPlayers || topPlayers.length === 0) {
      await sendMessage(ctx.chatId, `🏆 <b>${toCustomFont("No active operatives registered.")}</b>`);
      return;
    }

    let report = `🏆 <b>${toCustomFont("SYNDICATE LEADERBOARD")}</b>\n\n`;
    topPlayers.forEach((p, idx) => {
      report += `${idx + 1}. <b>UID:</b> <code>${p.user_id}</code> • <b>Cash:</b> ₹${p.balance}\n`;
    });

    await sendMessage(ctx.chatId, report);
  },

  "/leaderboard": async (ctx: BotContext) => {
    await systemHandlers["/top"](ctx);
  },
};
