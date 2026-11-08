import { BotContext, CommandHandler, TelegramUpdate } from "../types";
import { CONFIG } from "../config";
import { FORCE_SUB_API } from "../telegram/forceSubApi";
import { sendMessage } from "../index";

function isOwner(userId: number): boolean {
  return userId === Number(CONFIG.OWNER_ID);
}

function extractTarget(link: string): string {
  const clean = link.trim();
  const match = clean.match(/(?:t\.me\/|@)([a-zA-Z0-9_+]+)/);
  if (match) {
    const val = match[1];
    if (!val.startsWith("+")) {
      return `@${val}`;
    }
    return val;
  }
  return clean;
}

export const forceSubHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // ➕ /add <button name> <link>
  // ==========================================
  "/add": async (ctx: BotContext) => {
    if (ctx.chatId > 0) {
      await sendMessage(ctx.chatId, "⚠️ This command can only be used inside groups.", undefined, ctx.message.message_id);
      return;
    }

    const isAuthorized =
      isOwner(ctx.userId) ||
      (await ctx.env.DB.prepare(
        "SELECT 1 FROM force_sub_authorized WHERE group_id = ? AND user_id = ?"
      )
        .bind(ctx.chatId, ctx.userId)
        .first());

    if (!isAuthorized) {
      await sendMessage(ctx.chatId, "⛔ You are not authorized to configure force-join in this group.", undefined, ctx.message.message_id);
      return;
    }

    const argsText = ctx.args.join(" ").trim();
    if (!argsText) {
      await sendMessage(
        ctx.chatId,
        "ℹ️ <b>Usage:</b> <code>/add &lt;button name&gt; &lt;link&gt;</code>\n" +
          "<b>Example:</b> <code>/add Join Channel https://t.me/yourchannel</code>",
        undefined,
        ctx.message.message_id
      );
      return;
    }

    const lastSpace = argsText.lastIndexOf(" ");
    if (lastSpace === -1) {
      await sendMessage(
        ctx.chatId,
        "⚠️ Invalid format. Provide both button text and link.\n<b>Example:</b> <code>/add Join https://t.me/yourchannel</code>",
        undefined,
        ctx.message.message_id
      );
      return;
    }

    const buttonName = argsText.slice(0, lastSpace).trim();
    const link = argsText.slice(lastSpace + 1).trim();

    if (!link.startsWith("http://") && !link.startsWith("https://") && !link.startsWith("t.me/")) {
      await sendMessage(ctx.chatId, "⚠️ Please provide a valid URL link.", undefined, ctx.message.message_id);
      return;
    }

    const targetChat = extractTarget(link);
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

    await sendMessage(
      ctx.chatId,
      `✅ <b>Force Join Configured!</b>\n\n` +
        `• <b>Button:</b> ${buttonName}\n` +
        `• <b>Link:</b> ${link}\n` +
        `• <b>Target:</b> <code>${targetChat}</code>\n\n` +
        `<i>Make sure Aloo is an admin in the target channel/group to verify membership!</i>`,
      undefined,
      ctx.message.message_id
    );
  },

  // ==========================================
  // 🛡 /approved (Reply to user)
  // ==========================================
  "/approved": async (ctx: BotContext) => {
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
  },

  // ==========================================
  // 🗑 /empty (Reset)
  // ==========================================
  "/empty": async (ctx: BotContext) => {
    if (ctx.chatId > 0) return;

    const isAuthorized =
      isOwner(ctx.userId) ||
      (await ctx.env.DB.prepare(
        "SELECT 1 FROM force_sub_authorized WHERE group_id = ? AND user_id = ?"
      )
        .bind(ctx.chatId, ctx.userId)
        .first());

    if (!isAuthorized) {
      await sendMessage(ctx.chatId, "⛔ You are not authorized to reset settings.", undefined, ctx.message.message_id);
      return;
    }

    await ctx.env.DB.prepare("DELETE FROM force_sub WHERE group_id = ?").bind(ctx.chatId).run();

    await sendMessage(
      ctx.chatId,
      "🗑 <b>Force Join Cleared!</b>\nAll buttons removed. Members can now chat freely.",
      undefined,
      ctx.message.message_id
    );
  },
};

// ==========================================
// 🔍 Incoming Message Verification Interceptor
// ==========================================
export async function handleForceSubCheck(ctx: BotContext): Promise<boolean> {
  // Only enforce in groups
  if (ctx.chatId > 0) return false;

  // Bot owner is exempt
  if (isOwner(ctx.userId)) return false;

  const rule = await ctx.env.DB.prepare(
    "SELECT button_name, link, target_chat FROM force_sub WHERE group_id = ?"
  )
    .bind(ctx.chatId)
    .first<{ button_name: string; link: string; target_chat: string }>();

  if (!rule) return false;

  // 1. Check if user already submitted a join request
  const hasRequested = await ctx.env.DB.prepare(
    "SELECT 1 FROM force_sub_requests WHERE user_id = ? AND target_chat = ?"
  )
    .bind(ctx.userId, rule.target_chat)
    .first();

  if (hasRequested) return false;

  // 2. Check live membership status
  let isMember = false;
  try {
    const status = await FORCE_SUB_API.getChatMember(rule.target_chat, ctx.userId);
    if (status && ["creator", "administrator", "member", "restricted"].includes(status)) {
      isMember = true;
    }
  } catch {
    isMember = false;
  }

  if (isMember) return false;

  // 3. Not verified: Delete message instantly
  await FORCE_SUB_API.deleteMessage(ctx.chatId, ctx.message.message_id);

  // Send prompt with force-join button
  const name = ctx.message.from?.first_name || "User";
  const text =
    `⚠️ <b>Hey <a href="tg://user?id=${ctx.userId}">${name}</a>!</b>\n\n` +
    `You must join our channel/group or send a join request before you can chat here.`;

  const kb = {
    inline_keyboard: [[{ text: rule.button_name, url: rule.link }]],
  };

  await sendMessage(ctx.chatId, text, kb);
  return true; // Intercepted: stops further command/economy execution
}

// ==========================================
// 📩 Record Join Requests
// ==========================================
export async function handleJoinRequest(update: TelegramUpdate, db: D1Database): Promise<void> {
  const req = (update as any).chat_join_request;
  if (!req || !req.from) return;

  const userId = req.from.id;
  const targetChat = req.chat.username ? `@${req.chat.username}` : String(req.chat.id);
  const now = Math.floor(Date.now() / 1000);

  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO force_sub_requests (user_id, target_chat, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(userId, targetChat, now)
      .run();
  } catch (err) {
    console.error("Non-fatal join request tracking error:", err);
  }
}
