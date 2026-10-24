import { BotContext, CommandHandler, CloudflareEnv, TelegramMessage } from "../types";
import { DB_MANAGER } from "../db";
import { toCustomFont } from "../ui";
import { sendMessage } from "../index";

export async function handleWelcome(env: CloudflareEnv, message: TelegramMessage): Promise<void> {
  if (!message.new_chat_members) return;

  for (const member of message.new_chat_members) {
    const safeName = member.first_name
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const mention = `<a href="tg://user?id=${member.id}">${safeName}</a>`;
    await DB_MANAGER.ensureUserExists(env.DB, member.id);

    await sendMessage(
      message.chat.id,
      `Welcome, ${mention}. Type /help to explore.`
    );
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
