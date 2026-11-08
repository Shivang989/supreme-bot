import { BotContext, CommandHandler, TelegramUpdate } from "../types";
import { CONFIG } from "../config";
import { FORCE_SUB_API } from "../telegram/forceSubApi";
import { sendMessage } from "../index";

// Short-term in-memory cache to prevent spamming getChatMember on every message (key: `${groupId}:${userId}`, value: timestamp)
const VERIFIED_CACHE = new Map<string, number>();

function isOwner(userId: number | string): boolean {
  return String(userId).trim() === String(CONFIG.OWNER_ID).trim();
}

function parseAddArguments(rawText: string): { buttonName: string; link: string; explicitTarget?: string } | null {
  const text = rawText.trim();
  // Match any link starting with http://, https://, or t.me/
  const urlMatch = text.match(/(https?:\/\/[^\s]+|t\.me\/[^\s]+)/i);
  if (!urlMatch || urlMatch.index === undefined) return null;

  const link = urlMatch[0].trim();
  const buttonName = text.slice(0, urlMatch.index).trim();
  const afterLink = text.slice(urlMatch.index + link.length).trim();

  if (!buttonName) return null;

  return {
    buttonName,
    link,
    explicitTarget: afterLink || undefined,
  };
}

function resolveTargetChat(link: string, explicitTarget?: string): { targetChat: string; isPrivateLink: boolean } {
  if (explicitTarget) {
    const clean = explicitTarget.trim();
    return { targetChat: clean.startsWith("@") || clean.startsWith("-") ? clean : `@${clean}`, isPrivateLink: false };
  }

  const isPrivate = link.includes("/+") || link.includes("/joinchat/");
  const match = link.match(/(?:t\.me\/|telegram\.me\/|@)([a-zA-Z0-9_]+)/i);

  if (match && !isPrivate) {
    return { targetChat: `@${match[1]}`, isPrivateLink: false };
  }

  return { targetChat: link, isPrivateLink: isPrivate };
}

export const forceSubHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // ➕ /add <button name> <link> [channel_id]
  // ==========================================
  "/add": async (ctx: BotContext) => {
    try {
      if (ctx.chatId > 0) {
        await sendMessage(ctx.chatId, "⚠️ This command can only be used inside groups.", undefined, ctx.message.message_id);
        return;
      }

      let isAuthorized = isOwner(ctx.userId);
      if (!isAuthorized) {
        const row = await ctx.env.DB.prepare(
          "SELECT 1 FROM force_sub_authorized WHERE group_id = ? AND user_id = ?"
        )
          .bind(ctx.chatId, ctx.userId)
          .first();
        if (row) isAuthorized = true;
      }

      if (!isAuthorized) {
        await sendMessage(ctx.chatId, "⛔ You are not authorized to configure force-join in this group.", undefined, ctx.message.message_id);
        return;
      }

      const argsText = ctx.args.join(" ").trim();
      const parsed = parseAddArguments(argsText);

      if (!parsed) {
        await sendMessage(
          ctx.chatId,
          "ℹ️ <b>Usage:</b>\n" +
            "• <b>Public Channel:</b> <code>/add &lt;Button Name&gt; &lt;Link&gt;</code>\n" +
            "<i>Example:</i> <code>/add Join Our Channel https://t.me/mychannel</code>\n\n" +
            "• <b>Private Channel:</b> <code>/add &lt;Button Name&gt; &lt;Link&gt; &lt;Chat_ID&gt;</code>\n" +
            "<i>Example:</i> <code>/add Join https://t.me/+AbCdEf -1001234567890</code>",
          undefined,
          ctx.message.message_id
        );
        return;
      }

      const { buttonName, link, explicitTarget } = parsed;
      const { targetChat, isPrivateLink } = resolveTargetChat(link, explicitTarget);

      if (isPrivateLink && !explicitTarget) {
        await sendMessage(
          ctx.chatId,
          "⚠️ <b>Private invite link detected!</b>\n\n" +
            "Telegram Bot API cannot query private invite links directly. Please specify the <b>Channel ID</b> at the end of the command:\n\n" +
            `<code>/add ${buttonName} ${link} -100xxxxxxxxxx</code>\n\n` +
            "<i>(Tip: Forward any message from the channel to @userinfobot to get its numerical ID)</i>",
          undefined,
          ctx.message.message_id
        );
        return;
      }

      // Test bot permissions in target chat immediately
      const chatCheck = await FORCE_SUB_API.getChat(targetChat);
      if (!chatCheck.ok) {
        await sendMessage(
          ctx.chatId,
          `❌ <b>Cannot access target chat:</b> <code>${targetChat}</code>\n` +
            `<i>Reason: ${chatCheck.error}</i>\n\n` +
            `👉 <b>Action Required:</b> Make sure Aloo is added to that channel/group as an <b>Administrator</b> with permission to manage members.`,
          undefined,
          ctx.message.message_id
        );
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      await ctx.env.DB.prepare(
        `INSERT INTO force_sub (group_id, button_name, link, target_chat, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(group_id) DO UPDATE SET
           button_name = excluded.button_name,
           link = excluded.link,
           target_chat = excluded.target_chat,
           created_at = excluded.created_at`
      )
        .bind(ctx.chatId, buttonName, link, targetChat, now)
        .run();

      // Clear memory cache for this group so new rules take effect immediately
      for (const key of VERIFIED_CACHE.keys()) {
        if (key.startsWith(`${ctx.chatId}:`)) VERIFIED_CACHE.delete(key);
      }

      await sendMessage(
        ctx.chatId,
        `✅ <b>Force Join Configured!</b>\n\n` +
          `• <b>Button:</b> ${buttonName}\n` +
          `• <b>Link:</b> ${link}\n` +
          `• <b>Target Chat:</b> <code>${targetChat}</code> (${chatCheck.title || "Verified"})\n\n` +
          `<i>Users will now be verified before they can chat.</i>`,
        undefined,
        ctx.message.message_id
      );
    } catch (err: any) {
      console.error("Error in /add command:", err);
      await sendMessage(ctx.chatId, `⚠️ <b>Error:</b> <code>${err?.message || "Execution error"}</code>`);
    }
  },

  // ==========================================
  // 🛡 /approved (Reply to user)
  // ==========================================
  "/approved": async (ctx: BotContext) => {
    try {
      if (!isOwner(ctx.userId)) {
        await sendMessage(ctx.chatId, "⛔ Only the bot owner can approve moderators.", undefined, ctx.message.message_id);
        return;
      }

      if (ctx.chatId > 0) {
        await sendMessage(ctx.chatId, "⚠️ This command can only be used inside groups.", undefined, ctx.message.message_id);
        return;
      }

      const replyMsg = ctx.message.reply_to_message;
      if (!replyMsg || !replyMsg.from) {
        await sendMessage(ctx.chatId, "ℹ️ Reply to a user's message with <code>/approved</code> to authorize them.", undefined, ctx.message.message_id);
        return;
      }

      const targetUser = replyMsg.from;
      if (targetUser.is_bot) {
        await sendMessage(ctx.chatId, "⚠️ Bots cannot be authorized.", undefined, ctx.message.message_id);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      await ctx.env.DB.prepare(
        `INSERT OR IGNORE INTO force_sub_authorized (group_id, user_id, created_at)
         VALUES (?, ?, ?)`
      )
        .bind(ctx.chatId, targetUser.id, now)
        .run();

      await sendMessage(
        ctx.chatId,
        `✅ <b>Moderator Authorized!</b>\n\n` +
          `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a> can now use <code>/add</code> and <code>/empty</code> in this group.`,
        undefined,
        ctx.message.message_id
      );
    } catch (err: any) {
      console.error("Error in /approved command:", err);
      await sendMessage(ctx.chatId, `⚠️ <b>Error:</b> <code>${err?.message || "Execution error"}</code>`);
    }
  },

  // ==========================================
  // 🗑 /empty (Reset)
  // ==========================================
  "/empty": async (ctx: BotContext) => {
    try {
      if (ctx.chatId > 0) return;

      let isAuthorized = isOwner(ctx.userId);
      if (!isAuthorized) {
        const row = await ctx.env.DB.prepare(
          "SELECT 1 FROM force_sub_authorized WHERE group_id = ? AND user_id = ?"
        )
          .bind(ctx.chatId, ctx.userId)
          .first();
        if (row) isAuthorized = true;
      }

      if (!isAuthorized) {
        await sendMessage(ctx.chatId, "⛔ You are not authorized to reset settings.", undefined, ctx.message.message_id);
        return;
      }

      await ctx.env.DB.prepare("DELETE FROM force_sub WHERE group_id = ?").bind(ctx.chatId).run();

      for (const key of VERIFIED_CACHE.keys()) {
        if (key.startsWith(`${ctx.chatId}:`)) VERIFIED_CACHE.delete(key);
      }

      await sendMessage(
        ctx.chatId,
        "🗑 <b>Force Join Cleared!</b>\nAll buttons removed. Members can now chat freely.",
        undefined,
        ctx.message.message_id
      );
    } catch (err: any) {
      console.error("Error in /empty command:", err);
      await sendMessage(ctx.chatId, `⚠️ <b>Error:</b> <code>${err?.message || "Execution error"}</code>`);
    }
  },
};

// ==========================================
// 🔍 Incoming Message Verification Interceptor
// ==========================================
export async function handleForceSubCheck(ctx: BotContext): Promise<boolean> {
  // Only enforce in groups
  if (ctx.chatId > 0) return false;

  // Bot owner, bots, and anonymous channel admins are exempt
  if (isOwner(ctx.userId) || ctx.message.from?.is_bot || (ctx.message as any).sender_chat) {
    return false;
  }

  try {
    const rule = await ctx.env.DB.prepare(
      "SELECT button_name, link, target_chat FROM force_sub WHERE group_id = ?"
    )
      .bind(ctx.chatId)
      .first<{ button_name: string; link: string; target_chat: string }>();

    if (!rule) return false;

    // 1. Check in-memory verification cache (valid for 60 seconds)
    const cacheKey = `${ctx.chatId}:${ctx.userId}`;
    const cachedTime = VERIFIED_CACHE.get(cacheKey);
    const now = Date.now();
    if (cachedTime && now - cachedTime < 60000) {
      return false;
    }

    // 2. Check if user already submitted a join request
    const cleanTarget = rule.target_chat.trim();
    const hasRequested = await ctx.env.DB.prepare(
      `SELECT 1 FROM force_sub_requests
       WHERE user_id = ? AND (target_chat = ? OR target_chat = ? OR target_chat = ?)`
    )
      .bind(
        ctx.userId,
        cleanTarget,
        cleanTarget.toLowerCase(),
        cleanTarget.replace("@", "")
      )
      .first();

    if (hasRequested) {
      VERIFIED_CACHE.set(cacheKey, now);
      return false;
    }

    // 3. Check live membership status via getChatMember
    const check = await FORCE_SUB_API.getChatMember(cleanTarget, ctx.userId);

    if (check.ok) {
      if (check.isMember) {
        // User is confirmed in the channel/group
        VERIFIED_CACHE.set(cacheKey, now);
        return false;
      }

      // If user explicitly left or was banned, clean up any outdated join request records
      if (check.status === "left" || check.status === "kicked") {
        VERIFIED_CACHE.delete(cacheKey);
        await ctx.env.DB.prepare(
          "DELETE FROM force_sub_requests WHERE user_id = ? AND (target_chat = ? OR target_chat = ?)"
        )
          .bind(ctx.userId, cleanTarget, cleanTarget.toLowerCase())
          .run();
      }
    } else {
      // If Telegram returns an error (e.g. invalid target or bot kicked from channel),
      // log the error and avoid deleting messages so the group doesn't break.
      console.error(`ForceSub check API error on '${cleanTarget}':`, check.error);
      return false;
    }

    // 4. User is not a member: Delete unauthorized message
    await FORCE_SUB_API.deleteMessage(ctx.chatId, ctx.message.message_id);

    const name = ctx.message.from?.first_name || "User";
    const text =
      `⚠️ <b>Hey <a href="tg://user?id=${ctx.userId}">${name}</a>!</b>\n\n` +
      `You must join our channel/group or send a join request before you can chat here.`;

    const kb = {
      inline_keyboard: [[{ text: rule.button_name, url: rule.link }]],
    };

    await sendMessage(ctx.chatId, text, kb);
    return true; // Intercepted
  } catch (err) {
    console.error("Non-fatal handleForceSubCheck error:", err);
    return false;
  }
}

// ==========================================
// 📩 Record Join Requests
// ==========================================
export async function handleJoinRequest(update: TelegramUpdate, db: D1Database): Promise<void> {
  const req = (update as any).chat_join_request;
  if (!req || !req.from || !req.chat) return;

  const userId = req.from.id;
  const chatIdStr = String(req.chat.id);
  const usernameStr = req.chat.username ? `@${req.chat.username.toLowerCase()}` : null;
  const now = Math.floor(Date.now() / 1000);

  try {
    // Record numeric ID
    await db
      .prepare(
        `INSERT OR IGNORE INTO force_sub_requests (user_id, target_chat, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(userId, chatIdStr, now)
      .run();

    // Record username if present
    if (usernameStr) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO force_sub_requests (user_id, target_chat, created_at)
           VALUES (?, ?, ?)`
        )
        .bind(userId, usernameStr, now)
        .run();
    }
  } catch (err) {
    console.error("Non-fatal join request tracking error:", err);
  }
}

