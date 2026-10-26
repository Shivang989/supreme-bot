import {
  BotContext,
  CommandHandler,
  CloudflareEnv,
  TelegramMessage,
  TelegramUser,
  DMUIConfig,
} from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG } from "../config";
import { toCustomFont } from "../ui";
import { sendMessage, sendPhoto, sendVideo } from "../index";
import {
  renderCustomTemplate,
  getDefaultButtons,
  compileInlineKeyboard,
} from "./dmui";

// Group Welcome (Unmodified)
export async function handleWelcome(
  env: CloudflareEnv,
  message: TelegramMessage,
  members?: TelegramUser[]
): Promise<void> {
  const memberList = members || message.new_chat_members || [];
  if (memberList.length === 0) return;

  for (const member of memberList) {
    if (member.is_bot) continue;

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
  // /start handler
  "/start": async (ctx: BotContext) => {
    const isPrivate = ctx.message.chat.type === "private";
    const rawName = ctx.message.from.first_name?.trim() || "Player";
    const safeName = rawName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // GROUP /start — Unchanged direct reply
    if (!isPrivate) {
      const styledName = toCustomFont(safeName);
      const text = `<blockquote>𝙷𝖾ᥣᥣⱺ, ${styledName} 💕\n\n𝚂𝗍α𝗋𝗍 α 𝙳𝙼 𝗍ⱺ υ𝗌𝖾 αᥣᥣ 𝗍ɦ𝖾 𝖿𝖾α𝗍υ𝗋𝖾𝗌.</blockquote>`;
      const groupKb = {
        inline_keyboard: [
          [
            { text: "➕ Add", url: "https://t.me/Myaloobot?startgroup=true" },
            { text: "💬 Start DM", url: "https://t.me/Myaloobot?start=true" },
          ],
        ],
      };
      await sendMessage(ctx.chatId, text, groupKb, ctx.message.message_id);
      return;
    }

    // PRIVATE DM /start — Reads /dmui settings
    await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    const balance = user?.balance ?? CONFIG.STARTING_BALANCE ?? 0;
    const kills = user?.kills ?? 0;

    const liveConfig =
      (await DB_MANAGER.getSetting<DMUIConfig>(ctx.env.DB, "dmui_live_config")) || {};

    // 1. Resolve Text
    let dmText: string;
    if (liveConfig.customText) {
      dmText = renderCustomTemplate(liveConfig.customText, {
        id: ctx.userId,
        first_name: rawName,
        balance,
        kills,
      });
    } else {
      dmText =
        `Hey, 💕 <b>${safeName}</b>! 👋\n` +
        `I'm Aloo — your gaming partner for managing your balance, earning money, and competing with other players.\n\n` +
        `👤 <b>Your Profile</b>\n\n` +
        `Name: ${safeName}\n` +
        `Balance: ${balance} 💰\n` +
        `Kills: ${kills} ☠️\n\n` +
        `Quick Commands\n\n` +
        `💰 "/bal" — Check your balance\n` +
        `🔫 "/fire" — Fire a bullet\n` +
        `💵 "/rob" — Attempt to steal money\n` +
        `🛡️ "/safe" — Keep your money safe`;
    }

    // 2. Resolve Buttons
    const buttonRows = liveConfig.buttonRows || getDefaultButtons();
    const dmKeyboard = compileInlineKeyboard(buttonRows);

    // 3. Resolve Media with Fallback
    if (liveConfig.mediaType === "photo" && liveConfig.mediaFileId) {
      try {
        const res = await sendPhoto(ctx.chatId, liveConfig.mediaFileId, dmText, dmKeyboard);
        if (res.ok) return;
      } catch (e) {
        console.error("sendPhoto failed:", e);
      }
    }

    if (liveConfig.mediaType === "video" && liveConfig.mediaFileId) {
      try {
        const res = await sendVideo(ctx.chatId, liveConfig.mediaFileId, dmText, dmKeyboard);
        if (res.ok) return;
      } catch (e) {
        console.error("sendVideo failed:", e);
      }
    }

    // Fallback: standard HTML message
    await sendMessage(ctx.chatId, dmText, dmKeyboard);
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
