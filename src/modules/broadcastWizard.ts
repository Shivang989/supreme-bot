import { BotContext, CommandHandler, CloudflareEnv } from "../types";
import { CONFIG } from "../config";
import { BROADCAST_REGISTRY } from "./broadcastRegistry";
import { BROADCAST_ENGINE } from "./broadcastEngine";
import { BROADCAST_API } from "../telegram/broadcastApi";
import { BroadcastDraft, BroadcastScope } from "../types/broadcast";
import { sendMessage, editMessageText, answerCallbackQuery } from "../index";

function isOwner(userId: number): boolean {
  return userId === Number(CONFIG.OWNER_ID);
}

export const broadcastHandlers: Record<string, CommandHandler> = {
  "/broadcast": async (ctx: BotContext) => {
    if (!isOwner(ctx.userId)) return;
    await renderDashboard(ctx.env.DB, ctx.chatId, "global");
  },

  "/broadcastdm": async (ctx: BotContext) => {
    if (!isOwner(ctx.userId)) return;
    await renderDashboard(ctx.env.DB, ctx.chatId, "dm_only");
  },

  "/broadcaststop": async (ctx: BotContext) => {
    await BROADCAST_REGISTRY.setOptOut(ctx.env.DB, ctx.userId, true);
    await sendMessage(
      ctx.chatId,
      "🔕 <b>Broadcasts Disabled:</b> You will no longer receive announcements from Aloo.",
      undefined,
      ctx.message.message_id
    );
  },

  "/broadcaststart": async (ctx: BotContext) => {
    await BROADCAST_REGISTRY.setOptOut(ctx.env.DB, ctx.userId, false);
    await sendMessage(
      ctx.chatId,
      "🔔 <b>Broadcasts Enabled:</b> You will receive official announcements from Aloo.",
      undefined,
      ctx.message.message_id
    );
  },
};

export async function renderDashboard(db: D1Database, chatId: number, scope: BroadcastScope, messageId?: number): Promise<void> {
  const users = await db.prepare("SELECT COUNT(*) as c FROM broadcast_user_registry WHERE is_opted_out = 0 AND is_blocked = 0").first<{ c: number }>();
  const groups = await db.prepare("SELECT COUNT(*) as c FROM broadcast_chat_registry WHERE chat_type IN ('group', 'supergroup') AND can_send = 1").first<{ c: number }>();
  const channels = await db.prepare("SELECT COUNT(*) as c FROM broadcast_chat_registry WHERE chat_type = 'channel' AND can_send = 1").first<{ c: number }>();
  const active = await db.prepare("SELECT COUNT(*) as c FROM broadcast_campaigns WHERE status = 'running'").first<{ c: number }>();

  const title = scope === "dm_only" ? "📢 <b>ALOO BROADCAST MANAGER (DM ONLY)</b>" : "📢 <b>ALOO GLOBAL BROADCAST MANAGER</b>";
  const breakdown = scope === "dm_only"
    ? `• <b>Eligible Private Users:</b> <code>${users?.c || 0}</code>\n`
    : `• <b>Private Users:</b> <code>${users?.c || 0}</code>\n• <b>Groups & Supergroups:</b> <code>${groups?.c || 0}</code>\n• <b>Channels:</b> <code>${channels?.c || 0}</code>\n`;

  const text =
    `${title}\n━━━━━━━━━━━━━━━━━━━━\n` +
    `${breakdown}` +
    `• <b>Active Campaigns:</b> <code>${active?.c || 0}</code>\n━━━━━━━━━━━━━━━━━━━━\n` +
    `Select an operation below:`;

  const kb = {
    inline_keyboard: [
      [{ text: "➕ New Campaign", callback_data: `bc:new:${scope}` }],
      [
        { text: "📊 Active Campaigns", callback_data: `bc:active:${scope}` },
        { text: "📅 Scheduled", callback_data: `bc:sched:${scope}` },
      ],
      [
        { text: "📜 Campaign History", callback_data: `bc:hist:${scope}` },
        { text: "🔄 Refresh", callback_data: `bc:dash:${scope}` },
      ],
    ],
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, kb);
  }
}

export async function handleBroadcastCallback(env: CloudflareEnv, cq: any): Promise<boolean> {
  const data: string = cq.data || "";
  if (!data.startsWith("bc:")) return false;

  const userId = cq.from?.id;
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;

  if (!userId || !chatId || !isOwner(userId)) {
    await answerCallbackQuery(cq.id, "⛔ Access denied: Owner authorization required.", true);
    return true;
  }

  const parts = data.split(":");
  const action = parts[1];
  const scope = (parts[2] as BroadcastScope) || "global";

  if (action === "dash") {
    await answerCallbackQuery(cq.id);
    await renderDashboard(env.DB, chatId, scope, messageId);
    return true;
  }

  // 1. Initializing New Campaign Wizard
  if (action === "new") {
    const campaignId = `bc_${Date.now().toString(36)}`;
    const draft: BroadcastDraft = {
      campaignId,
      name: `Broadcast ${new Date().toISOString().slice(0, 10)}`,
      scope,
      mode: "copy",
      contentType: "single",
      items: [],
      buttons: [],
      audienceFilter: scope === "dm_only" ? "private" : "all",
      pinMode: "none",
      pinDestination: "all",
      pinItemIndex: 0,
      tagAllEnabled: false,
      tagAllGroups: [],
      isSilent: false,
      protectContent: false,
      disableLinkPreview: false,
    };

    await env.DB.prepare(
      `INSERT INTO broadcast_wizards (owner_id, step, campaign_id, session_data, updated_at)
       VALUES (?, 'AWAIT_CONTENT', ?, ?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET
         step = 'AWAIT_CONTENT', campaign_id = excluded.campaign_id, session_data = excluded.session_data, updated_at = excluded.updated_at`
    ).bind(userId, campaignId, JSON.stringify(draft), Math.floor(Date.now() / 1000)).run();

    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `📤 <b>STEP 1 OF 4: CONTENT CAPTURE</b>\n\n` +
      `<b>Scope:</b> ${scope.toUpperCase()}\n\n` +
      `Please <b>forward or send</b> the message you want to broadcast directly to this chat.\n\n` +
      `<i>Supported: Text, Photos, Videos, Documents, Voice, Stickers, Audio, and Polls.</i>`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: `bc:dash:${scope}` }]] }
    );
    return true;
  }

  // 2. Select Forward or Copy
  if (action === "set_mode") {
    const selectedMode = parts[3] as "copy" | "forward";
    const wiz = await env.DB.prepare("SELECT session_data FROM broadcast_wizards WHERE owner_id = ?").bind(userId).first<{ session_data: string }>();
    if (!wiz) return true;
    const draft: BroadcastDraft = JSON.parse(wiz.session_data);
    draft.mode = selectedMode;

    await env.DB.prepare("UPDATE broadcast_wizards SET session_data = ? WHERE owner_id = ?")
      .bind(JSON.stringify(draft), userId).run();

    await answerCallbackQuery(cq.id, `Mode set to: ${selectedMode.toUpperCase()}`);
    await renderOptionsStep(env.DB, chatId, draft, messageId);
    return true;
  }

  // 3. Toggle Options (Pinning, Tag All, Silent)
  if (action === "toggle_opt") {
    const opt = parts[3];
    const wiz = await env.DB.prepare("SELECT session_data FROM broadcast_wizards WHERE owner_id = ?").bind(userId).first<{ session_data: string }>();
    if (!wiz) return true;
    const draft: BroadcastDraft = JSON.parse(wiz.session_data);

    if (opt === "pin") {
      draft.pinMode = draft.pinMode === "none" ? "quiet" : draft.pinMode === "quiet" ? "loud" : "none";
    } else if (opt === "tag" && draft.scope === "global") {
      draft.tagAllEnabled = !draft.tagAllEnabled;
    } else if (opt === "silent") {
      draft.isSilent = !draft.isSilent;
    }

    await env.DB.prepare("UPDATE broadcast_wizards SET session_data = ? WHERE owner_id = ?")
      .bind(JSON.stringify(draft), userId).run();

    await answerCallbackQuery(cq.id);
    await renderOptionsStep(env.DB, chatId, draft, messageId);
    return true;
  }

  // 4. Test Delivery to Owner
  if (action === "test_send") {
    const wiz = await env.DB.prepare("SELECT session_data FROM broadcast_wizards WHERE owner_id = ?").bind(userId).first<{ session_data: string }>();
    if (!wiz) return true;
    const draft: BroadcastDraft = JSON.parse(wiz.session_data);

    for (const item of draft.items) {
      if (draft.mode === "forward") {
        await BROADCAST_API.forwardMessage({ chat_id: userId, from_chat_id: item.from_chat_id, message_id: item.message_id });
      } else {
        await BROADCAST_API.copyMessage({
          chat_id: userId,
          from_chat_id: item.from_chat_id,
          message_id: item.message_id,
          reply_markup: draft.buttons.length > 0 ? { inline_keyboard: draft.buttons } : undefined,
        });
      }
    }
    await answerCallbackQuery(cq.id, "✅ Test broadcast delivered to your DM!", true);
    return true;
  }

  // 5. Final Confirmation & Run Execution
  if (action === "confirm_run") {
    const wiz = await env.DB.prepare("SELECT session_data FROM broadcast_wizards WHERE owner_id = ?").bind(userId).first<{ session_data: string }>();
    if (!wiz) return true;
    const draft: BroadcastDraft = JSON.parse(wiz.session_data);

    // Resolve snapshot audience
    const audience = await BROADCAST_REGISTRY.resolveEligibleAudience(env.DB, draft.scope, draft.audienceFilter);
    if (audience.length === 0) {
      await answerCallbackQuery(cq.id, "⚠️ No eligible recipients available for this audience.", true);
      return true;
    }

    const now = Math.floor(Date.now() / 1000);

    // Persist Campaign
    await env.DB.prepare(
      `INSERT INTO broadcast_campaigns (
        id, name, scope, mode, content_type, content_payload, button_payload, audience_filter,
        pin_mode, pin_destination, pin_item_index, tag_all_enabled, is_silent, protect_content,
        disable_link_preview, status, owner_id, created_at, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?)`
    ).bind(
      draft.campaignId,
      draft.name,
      draft.scope,
      draft.mode,
      draft.contentType,
      JSON.stringify(draft.items),
      draft.buttons.length > 0 ? JSON.stringify(draft.buttons) : null,
      draft.audienceFilter,
      draft.pinMode,
      draft.pinDestination,
      draft.pinItemIndex,
      draft.tagAllEnabled ? 1 : 0,
      draft.isSilent ? 1 : 0,
      draft.protectContent ? 1 : 0,
      draft.disableLinkPreview ? 1 : 0,
      userId,
      now,
      now
    ).run();

    // Create Recipient & Job Snapshots
    await BROADCAST_ENGINE.snapshotAudience(env.DB, draft.campaignId, audience);

    // Clean active wizard
    await env.DB.prepare("DELETE FROM broadcast_wizards WHERE owner_id = ?").bind(userId).run();

    await answerCallbackQuery(cq.id, "🚀 Campaign initiated!");
    await editMessageText(
      chatId,
      messageId,
      `🚀 <b>CAMPAIGN LAUNCHED</b>\n\n` +
      `• <b>Campaign ID:</b> <code>${draft.campaignId}</code>\n` +
      `• <b>Total Targets:</b> <code>${audience.length}</code>\n` +
      `• <b>Status:</b> Running (Batch workers queued)\n\n` +
      `Delivery proceeds automatically according to Telegram rate limits.`,
      { inline_keyboard: [[{ text: "📊 Monitor Campaign", callback_data: `bc:view:${draft.campaignId}` }]] }
    );

    // Dispatch initial batch immediately
    await BROADCAST_ENGINE.processBatch(env.DB, 25);
    return true;
  }

  // 6. View & Control Active Campaign
  if (action === "view") {
    const cId = parts[2];
    const camp = await env.DB.prepare("SELECT * FROM broadcast_campaigns WHERE id = ?").bind(cId).first<any>();
    if (!camp) return true;

    const stats = await env.DB.prepare(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
         SUM(CASE WHEN status = 'retry_wait' THEN 1 ELSE 0 END) as retrying,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM broadcast_jobs WHERE campaign_id = ?`
    ).bind(cId).first<any>();

    const text =
      `📊 <b>CAMPAIGN STATUS: ${camp.name}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Status:</b> <code>${camp.status.toUpperCase()}</code>\n` +
      `• <b>Total Targets:</b> <code>${stats?.total || 0}</code>\n` +
      `• <b>Sent:</b> <code>${stats?.sent || 0}</code>\n` +
      `• <b>Pending/Queued:</b> <code>${(stats?.pending || 0) + (stats?.processing || 0)}</code>\n` +
      `• <b>Retrying:</b> <code>${stats?.retrying || 0}</code>\n` +
      `• <b>Failed:</b> <code>${stats?.failed || 0}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const controlRow = [];
    if (camp.status === "running") {
      controlRow.push({ text: "⏸ Pause", callback_data: `bc:pause:${cId}` });
      controlRow.push({ text: "🛑 Cancel", callback_data: `bc:cancel:${cId}` });
    } else if (camp.status === "paused") {
      controlRow.push({ text: "▶️ Resume", callback_data: `bc:resume:${cId}` });
      controlRow.push({ text: "🛑 Cancel", callback_data: `bc:cancel:${cId}` });
    }

    const kb = {
      inline_keyboard: [
        controlRow,
        [{ text: "🔄 Refresh Metrics", callback_data: `bc:view:${cId}` }],
        [{ text: "🔙 Return to Dashboard", callback_data: `bc:dash:${camp.scope}` }],
      ],
    };

    await answerCallbackQuery(cq.id);
    await editMessageText(chatId, messageId, text, kb);
    return true;
  }

  // 7. Pause, Resume, Cancel Actions
  if (action === "pause") {
    const cId = parts[2];
    await env.DB.prepare("UPDATE broadcast_campaigns SET status = 'paused' WHERE id = ?").bind(cId).run();
    await answerCallbackQuery(cq.id, "Campaign paused.");
    await handleBroadcastCallback(env, { ...cq, data: `bc:view:${cId}` });
    return true;
  }

  if (action === "resume") {
    const cId = parts[2];
    await env.DB.prepare("UPDATE broadcast_campaigns SET status = 'running' WHERE id = ?").bind(cId).run();
    await answerCallbackQuery(cq.id, "Campaign resumed.");
    await BROADCAST_ENGINE.processBatch(env.DB, 25);
    await handleBroadcastCallback(env, { ...cq, data: `bc:view:${cId}` });
    return true;
  }

  if (action === "cancel") {
    const cId = parts[2];
    await env.DB.prepare("UPDATE broadcast_campaigns SET status = 'cancelled' WHERE id = ?").bind(cId).run();
    await env.DB.prepare("UPDATE broadcast_jobs SET status = 'skipped' WHERE campaign_id = ? AND status IN ('pending', 'processing', 'retry_wait')").bind(cId).run();
    await answerCallbackQuery(cq.id, "Campaign cancelled.");
    await handleBroadcastCallback(env, { ...cq, data: `bc:view:${cId}` });
    return true;
  }

  return false;
}

// Intercept message sent by owner when wizard is in 'AWAIT_CONTENT'
export async function handleBroadcastMessageInput(ctx: BotContext): Promise<boolean> {
  if (!isOwner(ctx.userId)) return false;

  const wiz = await ctx.env.DB.prepare(
    "SELECT step, session_data FROM broadcast_wizards WHERE owner_id = ?"
  ).bind(ctx.userId).first<{ step: string; session_data: string }>();

  if (!wiz || wiz.step !== "AWAIT_CONTENT") return false;

  const draft: BroadcastDraft = JSON.parse(wiz.session_data);
  const msg = ctx.message;

  // Extract content item representation
  draft.items = [{
    message_id: msg.message_id,
    from_chat_id: msg.chat.id,
    type: msg.photo ? "photo" : msg.video ? "video" : msg.document ? "document" : msg.audio ? "audio" : "text",
    text: msg.text,
    caption: msg.caption,
  }];

  await ctx.env.DB.prepare(
    "UPDATE broadcast_wizards SET step = 'OPTIONS', session_data = ? WHERE owner_id = ?"
  ).bind(JSON.stringify(draft), ctx.userId).run();

  await renderOptionsStep(ctx.env.DB, ctx.chatId, draft);
  return true;
}

async function renderOptionsStep(db: D1Database, chatId: number, draft: BroadcastDraft, messageId?: number): Promise<void> {
  const pinDisplay = draft.pinMode === "none" ? "OFF" : draft.pinMode === "quiet" ? "QUIET" : "LOUD";
  const tagDisplay = draft.tagAllEnabled ? "ON" : "OFF";
  const silentDisplay = draft.isSilent ? "YES" : "NO";

  const audience = await BROADCAST_REGISTRY.resolveEligibleAudience(db, draft.scope, draft.audienceFilter);

  const text =
    `⚙️ <b>STEP 2 OF 3: CONFIGURE ANNOUNCEMENT</b>\n\n` +
    `• <b>Scope:</b> <code>${draft.scope.toUpperCase()}</code>\n` +
    `• <b>Delivery Mode:</b> <code>${draft.mode.toUpperCase()}</code>\n` +
    `• <b>Target Recipients:</b> <code>${audience.length}</code>\n` +
    `• <b>Pin Message:</b> <code>${pinDisplay}</code>\n` +
    (draft.scope === "global" ? `• <b>Tag Members (Groups):</b> <code>${tagDisplay}</code>\n` : "") +
    `• <b>Silent Notification:</b> <code>${silentDisplay}</code>\n\n` +
    `Toggle parameters below before sending:`;

  const kb = {
    inline_keyboard: [
      [
        { text: `Mode: ${draft.mode.toUpperCase()}`, callback_data: `bc:set_mode:${draft.scope}:${draft.mode === "copy" ? "forward" : "copy"}` },
        { text: `Pin: ${pinDisplay}`, callback_data: `bc:toggle_opt:${draft.scope}:pin` },
      ],
      [
        ...(draft.scope === "global" ? [{ text: `Tag All: ${tagDisplay}`, callback_data: `bc:toggle_opt:${draft.scope}:tag` }] : []),
        { text: `Silent: ${silentDisplay}`, callback_data: `bc:toggle_opt:${draft.scope}:silent` },
      ],
      [{ text: "👁 Send Test to My DM", callback_data: `bc:test_send:${draft.scope}` }],
      [
        { text: "✅ Confirm & Launch", callback_data: `bc:confirm_run:${draft.scope}` },
        { text: "❌ Cancel", callback_data: `bc:dash:${draft.scope}` },
      ],
    ],
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, kb);
  }
}
