import { BotContext, CommandHandler } from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG } from "../config";
import { createStatusCard } from "../ui";
import { sendMessage } from "../index";

async function verifyHighAdmin(ctx: BotContext): Promise<boolean> {
  const isOwner = ctx.userId === Number(CONFIG.OWNER_ID);
  const callerAdmin = await DB_MANAGER.getAdmin(ctx.env.DB, ctx.chatId, ctx.userId);
  return isOwner || (callerAdmin !== null && callerAdmin.level >= 3);
}

function resolveTarget(ctx: BotContext): { targetUserId: number | null; targetName: string } {
  if (ctx.reply && ctx.reply.from) {
    return {
      targetUserId: ctx.reply.from.id,
      targetName: ctx.reply.from.first_name,
    };
  }

  const idArg = ctx.args.find((a: string) => !isNaN(parseInt(a)) && a.length > 7);
  if (idArg) {
    return {
      targetUserId: parseInt(idArg),
      targetName: `User (${idArg})`,
    };
  }

  return { targetUserId: null, targetName: "Player" };
}

export const adminHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 🛡️ /promote - Elevate Chat Admin Privileges
  // ==========================================
  "/promote": async (ctx: BotContext) => {
    if (!(await verifyHighAdmin(ctx))) return;

    const lvlArg = ctx.args.find((a: string) => ["1", "2", "3"].includes(a));
    const level = lvlArg ? parseInt(lvlArg) : 1;
    const { targetUserId, targetName } = resolveTarget(ctx);

    if (!targetUserId) {
      await sendMessage(
        ctx.chatId,
        "⚠️ <b>Usage:</b> Reply to a user with <code>/promote [level 1-3]</code> or <code>/promote [id] [level]</code>"
      );
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ctx.chatId,
        user_id: targetUserId,
        can_manage_chat: true,
        can_change_info: level >= 2,
        can_delete_messages: true,
        can_invite_users: true,
        can_restrict_members: level >= 2,
        can_pin_messages: true,
        can_promote_members: level >= 3,
        can_manage_video_chats: true,
        is_anonymous: false,
      }),
    });

    const data = (await response.json()) as any;
    if (!data.ok) {
      await sendMessage(
        ctx.chatId,
        `❌ <b>Telegram Error:</b> ${data.description}\n<i>(Ensure the bot has "Add New Admins" rights!)</i>`
      );
      return;
    }

    const title = level === 3 ? "Underboss" : level === 2 ? "Capo" : "Soldier";
    await DB_MANAGER.setAdmin(ctx.env.DB, ctx.chatId, targetUserId, level, title);

    const card = createStatusCard({
      title: "🛡️ ADMIN PROMOTED",
      rows: [
        { label: "👤 TARGET", value: targetName },
        { label: "🆔 UID", value: targetUserId },
        { label: "🎖️ RANK", value: `Level ${level} (${title})` },
        { label: "👮 PROMOTER", value: ctx.message.from.first_name },
      ],
      footer: "⚡ Admin privileges granted and synced to database.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // 🚫 /demote - Strip Admin Privileges
  // ==========================================
  "/demote": async (ctx: BotContext) => {
    if (!(await verifyHighAdmin(ctx))) return;

    const { targetUserId, targetName } = resolveTarget(ctx);
    if (!targetUserId) {
      await sendMessage(
        ctx.chatId,
        "⚠️ <b>Usage:</b> Reply to a user with <code>/demote</code> or specify <code>/demote [id]</code>"
      );
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ctx.chatId,
        user_id: targetUserId,
        can_manage_chat: false,
        can_change_info: false,
        can_delete_messages: false,
        can_invite_users: false,
        can_restrict_members: false,
        can_pin_messages: false,
        can_promote_members: false,
        can_manage_video_chats: false,
        is_anonymous: false,
      }),
    });

    const data = (await response.json()) as any;
    if (!data.ok) {
      await sendMessage(
        ctx.chatId,
        `❌ <b>Telegram Error:</b> ${data.description}\n<i>(Ensure the bot has permission to manage administrators!)</i>`
      );
      return;
    }

    await DB_MANAGER.removeAdmin(ctx.env.DB, ctx.chatId, targetUserId);

    const card = createStatusCard({
      title: "🛡️ ADMIN DEMOTED",
      rows: [
        { label: "👤 TARGET", value: targetName },
        { label: "🆔 UID", value: targetUserId },
        { label: "🎖️ RANK", value: "Revoked" },
        { label: "👮 DEMOTER", value: ctx.message.from.first_name },
      ],
      footer: "⚡ Privileges stripped and administrative credentials cleared.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // 🏷️ /title - Set Custom Administrator Badge
  // ==========================================
  "/title": async (ctx: BotContext) => {
    if (!(await verifyHighAdmin(ctx))) return;

    let titleName = ctx.args.filter((a: string) => isNaN(parseInt(a)) || a.length < 7).join(" ");
    const { targetUserId, targetName } = resolveTarget(ctx);

    if (!targetUserId || !titleName.trim()) {
      await sendMessage(
        ctx.chatId,
        "⚠️ <b>Usage:</b> Reply to an admin with <code>/title [Custom Title]</code> or <code>/title [Custom Title] [id]</code>"
      );
      return;
    }

    titleName = titleName.trim().slice(0, 16);

    await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ctx.chatId,
        user_id: targetUserId,
        can_manage_chat: true,
      }),
    });

    const titleRes = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setChatAdministratorCustomTitle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ctx.chatId,
        user_id: targetUserId,
        custom_title: titleName,
      }),
    });

    const titleData = (await titleRes.json()) as any;
    if (!titleData.ok) {
      await sendMessage(
        ctx.chatId,
        `❌ <b>Telegram Error:</b> ${titleData.description}\n<i>(Bot needs 'Add Admins' right!)</i>`
      );
      return;
    }

    const existingAdmin = await DB_MANAGER.getAdmin(ctx.env.DB, ctx.chatId, targetUserId);
    const currentLevel = existingAdmin ? existingAdmin.level : 1;
    await DB_MANAGER.setAdmin(ctx.env.DB, ctx.chatId, targetUserId, currentLevel, titleName);

    const card = createStatusCard({
      title: "🏷️ TITLE UPDATED",
      rows: [
        { label: "👤 TARGET", value: targetName },
        { label: "🆔 UID", value: targetUserId },
        { label: "🏷️ TITLE", value: titleName },
        { label: "👮 UPDATER", value: ctx.message.from.first_name },
      ],
      footer: "⚡ Custom badge updated in Telegram chat header.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // 📋 /admins - List Registered Staff
  // ==========================================
  "/admins": async (ctx: BotContext) => {
    const admins = await DB_MANAGER.getAllAdmins(ctx.env.DB, ctx.chatId);

    if (!admins || admins.length === 0) {
      await sendMessage(ctx.chatId, "📋 <b>No custom admins registered in database for this chat.</b>");
      return;
    }

    const rows = admins.slice(0, 6).map((a) => ({
      label: `L${a.level} ${a.title ?? "Admin"}`.slice(0, 10),
      value: `UID: ${a.user_id}`,
    }));

    const card = createStatusCard({
      title: "📋 CHAT ADMINISTRATORS",
      rows,
      footer: `Total Active Staff: ${admins.length}`,
    });

    await sendMessage(ctx.chatId, card);
  },
};
