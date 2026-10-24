import { BotContext, CommandHandler, CloudflareEnv, TelegramMessage } from "../types";
import { DB_MANAGER } from "../db";
import { createStatusCard } from "../ui";
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
  "/start": async (ctx: BotContext) => {
    await sendMessage(ctx.chatId, `Operative verified. Use /help for available operations.`);
  },

  "/help": async (ctx: BotContext) => {
    await sendMessage(
      ctx.chatId,
      `<b>Command Directory:</b>\n\n` +
      `• <b>Economy:</b> /b, /pay, /rob, /daily, /market, /sell, /inv\n` +
      `• <b>Combat:</b> /fire, /defend, /revive\n` +
      `• <b>Arcade:</b> /dice, /flip, /rps, /8ball\n` +
      `• <b>Management:</b> /me, /top, /admins, /promote, /demote, /title`
    );
  },

  "/ping": async (ctx: BotContext) => {
    const start = Date.now();
    await sendMessage(ctx.chatId, `🏓 <b>Pong!</b> Latency: <code>${Date.now() - start}ms</code>`);
  },

  // ==========================================
  // 🏆 /top or /leaderboard - Highest Net Worth
  // ==========================================
  "/top": async (ctx: BotContext) => {
    const topPlayers = await DB_MANAGER.getTopPlayers(ctx.env.DB, 5);

    if (!topPlayers || topPlayers.length === 0) {
      await sendMessage(ctx.chatId, "🏆 <b>No active operatives on the leaderboard yet.</b>");
      return;
    }

    const rows = topPlayers.map((p, index) => ({
      label: `#${index + 1} UID:${p.user_id}`.slice(0, 10),
      value: `₹${p.balance}`,
    }));

    const card = createStatusCard({
      title: "🏆 SYNDICATE LEADERBOARD",
      rows,
      footer: "⚡ Ranked by total liquid cash in the underworld.",
    });

    await sendMessage(ctx.chatId, card);
  },

  "/leaderboard": async (ctx: BotContext) => {
    await systemHandlers["/top"](ctx);
  },
};
