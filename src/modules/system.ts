import { BotContext, CommandHandler, CloudflareEnv, TelegramMessage } from "../types";
import { DB_MANAGER } from "../db";
import { toCustomFont } from "../ui";
import { sendMessage } from "../index";

// ==========================================
// 👋 GROUP WELCOME HANDLER (Unmodified)
// ==========================================
export async function handleWelcome(env: CloudflareEnv, message: TelegramMessage): Promise<void> {
  if (!message.new_chat_members || message.new_chat_members.length === 0) return;

  for (const member of message.new_chat_members) {
    await DB_MANAGER.ensureUserExists(env.DB, member.id);

    const rawName = member.first_name?.trim() || "Member";
    const safeName = rawName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const mention = `<a href="tg://user?id=${member.id}">${safeName}</a>`;

    await sendMessage(
      message.chat.id,
      `Welcome, ${mention}\n\nType /help to explore.`
    );
  }
}

export const systemHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 🚀 /start - Private DM Introduction
  // ==========================================
  "/start": async (ctx: BotContext) => {
    const rawName = ctx.message.from.first_name?.trim() || "Operative";
    const safeName = rawName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const styledName = toCustomFont(safeName);

    // Exact two-line layout with Unicode styling inside Telegram's quote container
    const text = `<blockquote>𝙷𝖾ᥣᥣⱺ, ${styledName} 💕\n\n𝚂𝗍α𝗋𝗍 α 𝙳𝙼 𝗍ⱺ υ𝗌𝖾 αᥣᥣ 𝗍ɦ𝖾 𝖿𝖾α𝗍υ𝗋𝖾𝗌.</blockquote>`;

    // Two side-by-side inline buttons (each occupying half width)
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "➕ Add",
            url: "https://t.me/Myaloobot?startgroup=true",
          },
          {
            text: "💬 Start DM",
            url: "https://t.me/Myaloobot?start=true",
          },
        ],
      ],
    };

    await sendMessage(ctx.chatId, text, inlineKeyboard);
  },

  "/ping": async (ctx: BotContext) => {
    const start = Date.now();
    await sendMessage(ctx.chatId, `🏓 <b>Pong!</b> <code>${Date.now() - start}ms</code>`);
  },

  "/top": async (ctx: BotContext) => {
    const topPlayers = await DB_MANAGER.getTopPlayers(ctx.env.DB, 5);

    if (!topPlayers || topPlayers.length === 0) {
      await sendMessage(ctx.chatId, "🏆 <b>No active operatives registered.</b>");
      return;
    }

    let report = "🏆 <b>SYNDICATE LEADERBOARD</b>\n\n";
    topPlayers.forEach((p, idx) => {
      report += `${idx + 1}. <b>UID:</b> <code>${p.user_id}</code> • <b>Cash:</b> ₹${p.balance}\n`;
    });

    await sendMessage(ctx.chatId, report);
  },

  "/leaderboard": async (ctx: BotContext) => {
    await systemHandlers["/top"](ctx);
  },
};

