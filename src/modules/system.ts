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

async function sendAnimation(
  chatId: number,
  animation: string,
  caption?: string,
  replyMarkup?: any
): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendAnimation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      animation,
      caption,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
  return await res.json();
}


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


async function resolvePlayerName(
  env: CloudflareEnv,
  player: any,
  chatId?: number
): Promise<string> {
  let rawName: string | undefined = player?.first_name || player?.name;

  // 1. Check cached name in broadcast_users
  if (!rawName) {
    try {
      const cached = await env.DB.prepare(
        "SELECT first_name FROM broadcast_users WHERE user_id = ?"
      )
        .bind(player.user_id)
        .first<{ first_name?: string }>();
      if (cached?.first_name) {
        rawName = cached.first_name;
      }
    } catch {
      // Ignore if table/column is absent
    }
  }

  // 2. Check group member info via getChatMember (works for any group member even without DM)
  if (!rawName && chatId && chatId < 0) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${player.user_id}`
      );
      const data: any = await res.json();
      if (data?.ok && data.result?.user?.first_name) {
        rawName = data.result.user.first_name;
      }
    } catch {
      // Ignore lookup failure
    }
  }

  // 3. Fallback to Telegram getChat API
  if (!rawName) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/getChat?chat_id=${player.user_id}`
      );
      const data: any = await res.json();
      if (data?.ok && data.result?.first_name) {
        rawName = data.result.first_name;
      }
    } catch {
      // Ignore lookup failure
    }
  }

  // 4. Cache the resolved name in D1 for future leaderboard calls
  if (rawName) {
    try {
      const upd = await env.DB.prepare(
        "UPDATE broadcast_users SET first_name = ? WHERE user_id = ?"
      )
        .bind(rawName, player.user_id)
        .run();
      if ((upd.meta?.changes ?? 0) === 0) {
        await env.DB.prepare(
          "INSERT OR IGNORE INTO broadcast_users (user_id, first_name) VALUES (?, ?)"
        )
          .bind(player.user_id, rawName)
          .run();
      }
    } catch {
      // Ignore cache write errors
    }
  }

  const clean = (rawName || "Player").trim();
  return clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

    // 3. Resolve Media with Fallback (GIF Animation, Photo, Video)
    if (liveConfig.mediaType === "animation" && liveConfig.mediaFileId) {
      try {
        const res = await sendAnimation(ctx.chatId, liveConfig.mediaFileId, dmText, dmKeyboard);
        if (res.ok) return;
      } catch (e) {
        console.error("sendAnimation failed:", e);
      }
    }

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
    // Cache the command sender's current first_name so they never show as "Player"
    if (ctx.message?.from?.first_name) {
      try {
        const upd = await ctx.env.DB.prepare(
          "UPDATE broadcast_users SET first_name = ? WHERE user_id = ?"
        )
          .bind(ctx.message.from.first_name, ctx.userId)
          .run();
        if ((upd.meta?.changes ?? 0) === 0) {
          await ctx.env.DB.prepare(
            "INSERT OR IGNORE INTO broadcast_users (user_id, first_name) VALUES (?, ?)"
          )
            .bind(ctx.userId, ctx.message.from.first_name)
            .run();
        }
      } catch {
        // Ignore if table schema differs
      }
    }

    const topPlayers = await DB_MANAGER.getTopPlayers(ctx.env.DB, 5);
    if (!topPlayers || topPlayers.length === 0) {
      await sendMessage(ctx.chatId, "🏆 <b>No players registered yet.</b>");
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = await Promise.all(
      topPlayers.map(async (p, idx) => {
        const name = await resolvePlayerName(ctx.env, p, ctx.chatId);
        const rank = medals[idx] || `${idx + 1}.`;
        const mention = `<a href="tg://user?id=${p.user_id}">${name}</a>`;
        return `${rank} ${mention} — ₹${p.balance ?? 0}`;
      })
    );

    const report = `🏆 <b>LEADERBOARD</b>\n\n${lines.join("\n")}`;
    await sendMessage(ctx.chatId, report, undefined, ctx.message?.message_id);
  },

  "/leaderboard": async (ctx: BotContext) => {
    await systemHandlers["/top"](ctx);
  },

};
