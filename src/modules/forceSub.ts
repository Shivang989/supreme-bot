import { BotContext, CommandHandler, TelegramUpdate } from "../types";
import { CONFIG } from "../config";
import { FORCE_SUB_API } from "../telegram/forceSubApi";
import { sendMessage } from "../index";

// Short-term in-memory cache to prevent spamming getChatMember on every message (key: `${groupId}:${userId}`, value: timestamp)
const VERIFIED_CACHE = new Map<string, number>();

export function isOwner(userId: number | string): boolean {
  return String(userId).trim() === String(CONFIG.OWNER_ID).trim();
}

/**
 * Type-safe authorization check for Bot Owner or Group Moderator
 */
export async function isUserAuthorized(
  db: D1Database,
  chatId: number | string,
  userId: number | string
): Promise<boolean> {
  if (isOwner(userId)) return true;

  const cId = String(chatId).trim();
  const uId = String(userId).trim();

  try {
    const row = await db
      .prepare(
        `SELECT 1 FROM force_sub_authorized 
         WHERE (CAST(group_id AS TEXT) = ? OR group_id = ?) 
           AND (CAST(user_id AS TEXT) = ? OR user_id = ?)`
      )
      .bind(cId, Number(cId) || 0, uId, Number(uId) || 0)
      .first();

    return !!row;
  } catch (err) {
    console.error("Authorization check error:", err);
    return false;
  }
}

function parseAddArguments(rawText: string): { buttonName: string; link: string; explicitTarget?: string } | null {
  const text = rawText.trim();
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
    let clean = explicitTarget.trim();

    // Auto-fix numerical IDs: if missing -100 prefix, prepend it automatically
    if (/^-?\d+$/.test(clean)) {
      const rawDigits = clean.replace(/^-/, "");
      if (!clean.startsWith("-100")) {
        clean = `-100${rawDigits}`;
      }
    } else if (!clean.startsWith("@")) {
      clean = `@${clean}`; }  return { targetChat: clean, isPrivateLink: false }; }  const isPrivate = link.includes("/+") \vert{}\vert{} link.includes("/joinchat/"); const match = link.match(/(?:t\.me\/\vert{}telegram\.me\/\vert{}@)([a-zA-Z0-9_]+)/i);  if (match && !isPrivate) { return { targetChat: `@${match[1]}`, isPrivateLink: false };
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

      const authorized = await isUserAuthorized(ctx.env.DB, ctx.chatId, ctx.userId);
      if (!authorized) {
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
            "<i>Example:</i> <code>/add Join Channel https://t.me/mychannel</code>\n\n" +
            "• <b>Private Channel:</b> <code>/add &lt;Button Name&gt; &lt;Link&gt; &lt;Chat_ID&gt;</code>\n" +
            "<i>Example:</i> <code>/add Join https://t.me/+AbCdEf -1004367561053</code>",
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
            "Please include the numerical <b>Channel ID</b> at the end of the command:\n\n" +
            `<code>/add ${buttonName}${link} -100xxxxxxxxxx</code>`,
          undefined,
          ctx.message.message_id
        );
        return;
      }

      const chatCheck = await FORCE_SUB_API.getChat(targetChat);
      if (!chatCheck.ok) {
        await sendMessage(
          ctx.chatId,
          `❌ <b>Cannot access target chat:</b> <code>${targetChat}</code>\n` + `<i>Reason: ${chatCheck.error}</i>\n\n` +
            `👉 Make sure Aloo is an <b>Administrator</b> in that channel/group with member management permissions.`,
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

      for (const key of VERIFIED_CACHE.keys()) {
        if (key.startsWith(`${ctx.chatId}:`)) VERIFIED_CACHE.delete(key);
      }

      await sendMessage(
        ctx.chatId,
        `✅ <b>Force Join Configured!</b>\n\n` +
          `• <b>Button:</b> ${buttonName}\n` + `• <b>Link:</b> ${link}\n` +
          `• <b>Target Chat:</b> <code>${targetChat}</code> (${chatCheck.title || "Verified"})\n\n` +
          `<i>Users must join or request to join before chatting here.</i>`,
        undefined,
        ctx.message.message_id
      );
    } catch (err: any) {
      console.error("Error in /add command:", err);
      await sendMessage(ctx.chatId, `⚠️ <b>Error:</b> <code>${err?.message \vert{}\vert{} "Execution error"}</code>`); } },  // ========================================== // 🛡 /approved (Reply to user OR /approved <user_id>) // ========================================== "/approved": async (ctx: BotContext) => { try { if (!isOwner(ctx.userId)) { await sendMessage(ctx.chatId, "⛔ Only the bot owner can approve moderators.", undefined, ctx.message.message_id); return; }  if (ctx.chatId > 0) { await sendMessage(ctx.chatId, "⚠️ This command can only be used inside groups.", undefined, ctx.message.message_id); return; }  let targetUserId: number \vert{} null = null; let targetUserName = "User";  const replyMsg = ctx.message.reply_to_message; if (replyMsg && replyMsg.from) { if (replyMsg.from.is_bot) { await sendMessage(ctx.chatId, "⚠️ Bots cannot be authorized.", undefined, ctx.message.message_id); return; } targetUserId = replyMsg.from.id; targetUserName = replyMsg.from.first_name \vert{}\vert{} "User"; } else if (ctx.args.length > 0 && /^\d+$/.test(ctx.args[0])) { targetUserId = Number(ctx.args[0]); targetUserName = `User (${targetUserId})`;
      } else {
        await sendMessage(
          ctx.chatId,
          "ℹ️ <b>How to authorize:</b>\n" +
            "1. Reply to the user's message with <code>/approved</code>\n" +
            "2. Or specify their user ID: <code>/approved &lt;user_id&gt;</code>",
          undefined,
          ctx.message.message_id
        );
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const cId = String(ctx.chatId).trim();
      const uId = String(targetUserId).trim();

      await ctx.env.DB.prepare(
        `INSERT INTO force_sub_authorized (group_id, user_id, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(group_id, user_id) DO UPDATE SET created_at = excluded.created_at`
      )
        .bind(Number(cId) || cId, Number(uId) || uId, now)
        .run();

      await sendMessage(
        ctx.chatId,
        `✅ <b>Moderator Authorized!</b>\n\n` +
          `• <b>User:</b> <a href="tg://user?id=${targetUserId}">${targetUserName}</a>\n` +
          `• <b>User ID:</b> <code>${targetUserId}</code>\n\n` +
          `This user can now use <code>/add</code> and <code>/empty</code> in this group.`,
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

      const authorized = await isUserAuthorized(ctx.env.DB, ctx.chatId, ctx.userId);
      if (!authorized) {
        await sendMessage(ctx.chatId, "⛔ You are not authorized to reset settings.", undefined, ctx.message.message_id);
        return;
      }

      await ctx.env.DB.prepare("DELETE FROM force_sub WHERE group_id = ?").bind(ctx.chatId).run();

      for (const key of VERIFIED_CACHE.keys()) {
        if (key.startsWith(`${ctx.chatId}:`)) VERIFIED_CACHE.delete(key); }  await sendMessage( ctx.chatId, "🗑 <b>Force Join Cleared!</b>\nAll buttons removed. Members can now chat freely.", undefined, ctx.message.message_id ); } catch (err: any) { console.error("Error in /empty command:", err); await sendMessage(ctx.chatId, `⚠️ <b>Error:</b> <code>${err?.message || "Execution error"}</code>`);
    }
  },
};

// ==========================================
// 🔍 Incoming Message Verification Interceptor
// ==========================================
export async function handleForceSubCheck(ctx: BotContext): Promise<boolean> {
  if (ctx.chatId > 0) return false;

  // Bot owner, bots, and anonymous channel admins are exempt
  if (isOwner(ctx.userId) || ctx.message.from?.is_bot || (ctx.message as any).sender_chat) {
    return false;
  }

  // Approved moderators for this group are exempt
  const isAuthorized = await isUserAuthorized(ctx.env.DB, ctx.chatId, ctx.userId);
  if (isAuthorized) {
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

    // 2. Check join request tracking
    const cleanTarget = rule.target_chat.trim();
    const hasRequested = await ctx.env.DB.prepare(
      `SELECT 1 FROM force_sub_requests
       WHERE user_id = ? AND (target_chat
