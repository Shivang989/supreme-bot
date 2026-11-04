import { BotContext, CommandHandler, CloudflareEnv } from "../types";
import { CONFIG } from "../config";
import { BROADCAST_REGISTRY } from "./broadcastRegistry";
import { BROADCAST_ENGINE } from "./broadcastEngine";
import { BROADCAST_API } from "../telegram/broadcastApi";
import { AudienceTarget, BroadcastDraft } from "../types/broadcast";
import { sendMessage, editMessageText, answerCallbackQuery } from "../index";

function isOwner(userId: number): boolean {
  return userId === Number(CONFIG.OWNER_ID);
}

function formatTargetLabel(target: AudienceTarget): string {
  if (target === "dm") return "👤 DM Only (Users)";
  if (target === "groups") return "👥 Groups Only";
  return "🌐 Groups + DM (Everywhere)";
}

export const broadcastHandlers: Record<string, CommandHandler> = {
  "/broadcast": async (ctx: BotContext) => {
    if (!isOwner(ctx.userId)) return;
    // Clear any stale wizard state and open the 3-option selector
    await ctx.env.DB.prepare("DELETE FROM broadcast_wizards WHERE owner_id = ?")
      .bind(ctx.userId)
      .run();
    await renderDashboard(ctx.env.DB, ctx.chatId);
  },

  "/broadcaststop": async (ctx: BotContext) => {
    await BROADCAST_REGISTRY.setOptOut(ctx.env.DB, ctx.userId, true);
    await sendMessage(
      ctx.chatId,
      "🔕 <b>Broadcasts Disabled:</b> You will no longer receive DM announcements.",
      undefined,
      ctx.message.message_id
    );
  },

  "/broadcaststart": async (ctx: BotContext) => {
    await BROADCAST_REGISTRY.setOptOut(ctx.env.DB, ctx.userId, false);
    await sendMessage(
      ctx.chatId,
      "🔔 <b>Broadcasts Enabled:</b> You will now receive official announcements.",
      undefined,
      ctx.message.message_id
    );
  },
};

export async function renderDashboard(
  db: D1Database,
  chatId: number,
  messageId?: number
): Promise<void> {
  // Heal any groups that were accidentally marked can_send = 0 due to media restrictions
  const counts = await BROADCAST_REGISTRY.getAudienceCounts(db);
  const total = counts.dmCount + counts.groupCount;

  const active = await db
    .prepare("SELECT COUNT(*) AS c FROM broadcast_campaigns WHERE status = 'running'")
    .first<{ c: number }>();

  const text =
    `📢 <b>ALOO BROADCAST PANEL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Users (DM):</b> <code>${counts.dmCount}</code>\n` +
    `👥 <b>Groups:</b> <code>${counts.groupCount}</code>\n` +
    `🌐 <b>Total (Groups + DM):</b> <code>${total}</code>\n` +
    `⚡ <b>Active Campaigns:</b> <code>${active?.c || 0}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 <b>Choose where to send your broadcast:</b>`;

  const kb = {
    inline_keyboard: [
      [
        { text: `👤 DM Only (${counts.dmCount})`, callback_data: "bc:target:dm" },
        { text: `👥 Groups Only (${counts.groupCount})`, callback_data: "bc:target:groups" },
      ],
      [{ text: `🌐 Groups + DM (${total})`, callback_data: "bc:target:all" }],
      [
        { text: "📊 Active", callback_data: "bc:active" },
        { text: "📜 History", callback_data: "bc:hist" },
        { text: "🔄 Refresh", callback_data: "bc:dash" },
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
    await answerCallbackQuery(cq.id, "⛔ Owner authorization required.", true);
    return true;
  }

  const parts = data.split(":");
  const action = parts[1];

  // 1. Return to Main Dashboard
  if (action === "dash") {
    await env.DB.prepare("DELETE FROM broadcast_wizards WHERE owner_id = ?").bind(userId).run();
    await answerCallbackQuery(cq.id);
    await renderDashboard(env.DB, chatId, messageId);
    return true;
  }

  // 2. Step 1: Target Chosen (DM, Groups, or Groups + DM) -> Ask for Message
  if (action === "target") {
    const selectedTarget = (parts[2] as AudienceTarget) || "all";
    const campaignId = `bc_${Date.now().toString(36)}`;

    const draft: BroadcastDraft = {
      campaignId,
      name: `Broadcast ${new Date().toISOString().slice(0, 10)}`,
      audienceFilter: selectedTarget,
      mode: "copy",
      contentType: "single",
      items: [],
      buttons: [],
      pinMode: "none",
      pinItemIndex: 0,
      tagAllEnabled: false,
      isSilent: false,
      protectContent: false,
      disableLinkPreview: false,
    };

    await env.DB.prepare(
      `INSERT INTO broadcast_wizards (owner_id, step, campaign_id, session_data, updated_at)
       VALUES (?, 'AWAIT_CONTENT', ?, ?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET
         step = 'AWAIT_CONTENT',
         campaign_id = excluded.campaign_id,
         session_data = excluded.session_data,
         updated_at = excluded.updated_at`
    )
      .bind(userId, campaignId, JSON.stringify(draft), Math.floor(Date.now() / 1000))
      .run();

    await answerCallbackQuery(cq.id, `Selected: ${formatTargetLabel(selectedTarget)}`);
    await editMessageText(
      chatId,
      messageId,
      `📤 <b>SEND BROADCAST MESSAGE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 <b>Target:</b> ${formatTargetLabel(selectedTarget)}\n\n` +
        `Now <b>send or forward</b> the message you want to broadcast into this chat.\n\n` +
        `<i>Supported: Text, Photo, Video, Sticker, GIF, Audio, Voice, Document, or Poll.</i>`,
      {
        inline_keyboard: [[{ text: "🔙 Change Target / Cancel", callback_data: "bc:dash" }]],
      }
    );
    return true;
  }

  // 3. Toggle Copy / Forward Mode
  if (action === "set_mode") {
    const selectedMode = parts[2] as "copy" | "forward";
    const wiz = await env.DB.prepare(
      "SELECT session_data FROM broadcast_wizards WHERE owner_id = ?"
    )
      .bind(userId)
      .first<{ session_data: string }>();
    if (!wiz) return true;

    const draft: BroadcastDraft = JSON.parse(wiz.session_data);
    draft.mode = selectedMode;

    await env.DB.prepare("UPDATE broadcast_wizards SET session_data = ? WHERE owner_id = ?")
      .bind(JSON.stringify(draft), userId)
      .run();

    await answerCallbackQuery(cq.id, `Mode: ${selectedMode.toUpperCase()}`);
    await renderOptionsStep(env.DB, chatId, draft, messageId);
    return true;
  }

  // 4. Toggle Pin, Tag All, or Silent Options
  if (action === "toggle_opt") {
    const opt = parts[2];
    const wiz = await env.DB.prepare(
      "SELECT session_data FROM broadcast_wizards WHERE owner_id = ?"
    )
      .bind(userId)
      .first<{ session_data: string }>();
    if (!wiz) return true;

    const draft: BroadcastDraft = JSON.parse(wiz.session_data);

    if (opt === "pin") {
      draft.pinMode =
        draft.pinMode === "none" ? "quiet" : draft.pinMode === "quiet" ? "loud" : "none";
    } else if (opt === "tag") {
      draft.tagAllEnabled = !draft.tagAllEnabled;
    } else if (opt === "silent") {
      draft.isSilent = !draft.isSilent;
    }

    await env.DB.prepare("UPDATE broadcast_wizards SET session_data = ? WHERE owner_id = ?")
      .bind(JSON.stringify(draft), userId)
      .run();

    await answerCallbackQuery(cq.id);
    await renderOptionsStep(env.DB, chatId, draft, messageId);
    return true;
  }

  // 5. Send Test Preview to Owner DM
  if (action === "test_send") {
    const wiz = await env.DB.prepare(
      "SELECT session_data FROM broadcast_wizards WHERE owner_id = ?"
    )
      .bind(userId)
      .first<{ session_data: string }>();
    if (!wiz) return true;

    const draft: BroadcastDraft = JSON.parse(wiz.session_data);

    for (const item of draft.items) {
      if (draft.mode === "forward" || item.type === "poll") {
        await BROADCAST_API.forwardMessage({
          chat_id: userId,
          from_chat_id: item.from_chat_id,
          message_id: item.message_id,
        });
      } else {
        await BROADCAST_API.copyMessage({
          chat_id: userId,
          from_chat_id: item.from_chat_id,
          message_id: item.message_id,
          reply_markup: draft.buttons.length > 0 ? { inline_keyboard: draft.buttons } : undefined,
        });
      }
    }
    await answerCallbackQuery(cq.id, "✅ Test preview sent!", true);
    return true;
  }

  // 6. Confirm & Launch Broadcast
  if (action === "confirm_run") {
    const wiz = await env.DB.prepare(
      "SELECT session_data FROM broadcast_wizards WHERE owner_id = ?"
    )
      .bind(userId)
      .first<{ session_data: string }>();
    if (!wiz) return true;

    const draft: BroadcastDraft = JSON.parse(wiz.session_data);
    const audience = await BROADCAST_REGISTRY.resolveEligibleAudience(
      env.DB,
      draft.audienceFilter
    );

    if (audience.length === 0) {
      await answerCallbackQuery(
        cq.id,
        "⚠️ No eligible recipients found for this target!",
        true
      );
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const scopeValue = draft.audienceFilter === "dm" ? "dm_only" : "global";

    await env.DB.prepare(
      `INSERT INTO broadcast_campaigns (
        id, name, scope, mode, content_type, content_payload, button_payload, audience_filter,
        pin_mode, pin_destination, pin_item_index, tag_all_enabled, is_silent, protect_content,
        disable_link_preview, status, owner_id, created_at, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'all', ?, ?, ?, ?, ?, 'running', ?, ?, ?)`
    )
      .bind(
        draft.campaignId,
        draft.name,
        scopeValue,
        draft.mode,
        draft.contentType,
        JSON.stringify(draft.items),
        draft.buttons.length > 0 ? JSON.stringify(draft.buttons) : null,
        draft.audienceFilter,
        draft.pinMode,
        draft.pinItemIndex,
        draft.tagAllEnabled ? 1 : 0,
        draft.isSilent ? 1 : 0,
        draft.protectContent ? 1 : 0,
        draft.disableLinkPreview ? 1 : 0,
        userId,
        now,
        now
      )
      .run();

    await BROADCAST_ENGINE.snapshotAudience(env.DB, draft.campaignId, audience);
    await env.DB.prepare("DELETE FROM broadcast_wizards WHERE owner_id = ?").bind(userId).run();

    await answerCallbackQuery(cq.id, "🚀 Broadcast started!");
    await editMessageText(
      chatId,
      messageId,
      `🚀 <b>BROADCAST LAUNCHED</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `• <b>Target:</b> ${formatTargetLabel(draft.audienceFilter)}\n` +
        `• <b>Total Recipients:</b> <code>${audience.length}</code>\n` +
        `• <b>Pin Mode:</b> <code>${draft.pinMode.toUpperCase()}</code>\n` +
        `• <b>Tag All:</b> <code>${draft.tagAllEnabled ? "ON" : "OFF"}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Sending messages now...</i>`,
      {
        inline_keyboard: [
          [{ text: "📊 View Live Progress", callback_data: `bc:view:${draft.campaignId}` }],
          [{ text: "🔙 Main Panel", callback_data: "bc:dash" }],
        ],
      }
    );

    await BROADCAST_ENGINE.runContinuousWorker(env.DB, 25000);
    return true;
  }

  // 7. Active Campaigns List
  if (action === "active") {
    const list = await env.DB.prepare(
      "SELECT id, name, status FROM broadcast_campaigns WHERE status IN ('running', 'paused') ORDER BY created_at DESC LIMIT 10"
    ).all<any>();

    await answerCallbackQuery(cq.id);

    if (!list.results || list.results.length === 0) {
      await editMessageText(
        chatId,
        messageId,
        `📊 <b>ACTIVE CAMPAIGNS</b>\n\nNo campaigns are currently running or paused.`,
        { inline_keyboard: [[{ text: "🔙 Back", callback_data: "bc:dash" }]] }
      );
      return true;
    }

    const kbRows = list.results.map((c) => [
      {
        text: `${c.status === "paused" ? "⏸" : "▶️"} ${c.name} (${c.id})`,
        callback_data: `bc:view:${c.id}`,
      },
    ]);
    kbRows.push([{ text: "🔙 Back", callback_data: "bc:dash" }]);

    await editMessageText(
      chatId,
      messageId,
      `📊 <b>ACTIVE CAMPAIGNS (${list.results.length})</b>\n\nSelect a campaign to inspect:`,
      { inline_keyboard: kbRows }
    );
    return true;
  }

  // 8. Campaign History List
  if (action === "hist") {
    const list = await env.DB.prepare(
      "SELECT id, name, status FROM broadcast_campaigns WHERE status IN ('completed', 'cancelled') ORDER BY created_at DESC LIMIT 8"
    ).all<any>();

    await answerCallbackQuery(cq.id);

    if (!list.results || list.results.length === 0) {
      await editMessageText(
        chatId,
        messageId,
        `📜 <b>CAMPAIGN HISTORY</b>\n\nNo completed or cancelled campaigns yet.`,
        { inline_keyboard: [[{ text: "🔙 Back", callback_data: "bc:dash" }]] }
      );
      return true;
    }

    const kbRows = list.results.map((c) => [
      {
        text: `${c.status === "completed" ? "✅" : "🛑"} ${c.name} (${c.id})`,
        callback_data: `bc:view:${c.id}`,
      },
    ]);
    kbRows.push([{ text: "🔙 Back", callback_data: "bc:dash" }]);

    await editMessageText(
      chatId,
      messageId,
      `📜 <b>CAMPAIGN HISTORY</b>\n\nSelect a campaign to view report:`,
      { inline_keyboard: kbRows }
    );
    return true;
  }

  // 9. View Specific Campaign Status
  if (action === "view") {
    const cId = parts[2];
    const camp = await env.DB.prepare("SELECT * FROM broadcast_campaigns WHERE id = ?")
      .bind(cId)
      .first<any>();
    if (!camp) return true;

    const stats = await env.DB.prepare(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'retry_wait' THEN 1 ELSE 0 END) AS retrying,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM broadcast_jobs WHERE campaign_id = ?`
    )
      .bind(cId)
      .first<any>();

    const targetLabel = formatTargetLabel((camp.audience_filter as AudienceTarget) || "all");

    const text =
      `📊 <b>CAMPAIGN STATUS: ${camp.name}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Status:</b> <code>${camp.status.toUpperCase()}</code>\n` +
      `• <b>Target:</b> ${targetLabel}\n` +
      `• <b>Total Targets:</b> <code>${stats?.total || 0}</code>\n` +
      `• <b>Sent Successfully:</b> <code>${stats?.sent || 0}</code>\n` +
      `• <b>Pending / Sending:</b> <code>${stats?.pending || 0}</code>\n` +
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

    const kb: { inline_keyboard: any[][] } = { inline_keyboard: [] };
    if (controlRow.length > 0) kb.inline_keyboard.push(controlRow);
    kb.inline_keyboard.push([{ text: "🔄 Refresh Status", callback_data: `bc:view:${cId}` }]);
    kb.inline_keyboard.push([{ text: "🔙 Main Panel", callback_data: "bc:dash" }]);

    await answerCallbackQuery(cq.id);
    await editMessageText(chatId, messageId, text, kb);
    return true;
  }

  // 10. Pause / Resume / Cancel Controls
  if (action === "pause") {
    const cId = parts[2];
    await env.DB.prepare("UPDATE broadcast_campaigns SET status = 'paused' WHERE id = ?")
      .bind(cId)
      .run();
    await answerCallbackQuery(cq.id, "⏸ Broadcast paused.");
    await handleBroadcastCallback(env, { ...cq, data: `bc:view:${cId}` });
    return true;
  }

  if (action === "resume") {
    const cId = parts[2];
    await env.DB.prepare("UPDATE broadcast_campaigns SET status = 'running' WHERE id = ?")
      .bind(cId)
      .run();
    await answerCallbackQuery(cq.id, "▶️ Broadcast resumed.");
    await BROADCAST_ENGINE.runContinuousWorker(env.DB, 25000);
    await handleBroadcastCallback(env, { ...cq, data: `bc:view:${cId}` });
    return true;
  }

  if (action === "cancel") {
    const cId = parts[2];
    await env.DB.prepare("UPDATE broadcast_campaigns SET status = 'cancelled' WHERE id = ?")
      .bind(cId)
      .run();
    await env.DB.prepare(
      "UPDATE broadcast_jobs SET status = 'skipped' WHERE campaign_id = ? AND status IN ('pending', 'processing', 'retry_wait')"
    )
      .bind(cId)
      .run();
    await answerCallbackQuery(cq.id, "🛑 Broadcast cancelled.");
    await handleBroadcastCallback(env, { ...cq, data: `bc:view:${cId}` });
    return true;
  }

  return false;
}

// Intercept any message (Text, Photo, Video, Sticker, Poll, Voice, etc.) when owner is in AWAIT_CONTENT
export async function handleBroadcastMessageInput(ctx: BotContext): Promise<boolean> {
  if (!isOwner(ctx.userId)) return false;

  // Allow commands like /broadcast or /start to pass through normally
  if (ctx.message.text && ctx.message.text.trim().startsWith("/")) {
    return false;
  }

  try {
    const wiz = await ctx.env.DB.prepare(
      "SELECT step, session_data FROM broadcast_wizards WHERE owner_id = ?"
    )
      .bind(ctx.userId)
      .first<{ step: string; session_data: string }>();

    if (!wiz || wiz.step !== "AWAIT_CONTENT") return false;

    const draft: BroadcastDraft = JSON.parse(wiz.session_data);
    const msg = ctx.message as any;

    const detectedType = msg.sticker
      ? "sticker"
      : msg.photo
      ? "photo"
      : msg.video
      ? "video"
      : msg.animation
      ? "animation"
      : msg.voice
      ? "voice"
      : msg.video_note
      ? "video_note"
      : msg.audio
      ? "audio"
      : msg.document
      ? "document"
      : msg.poll
      ? "poll"
      : "text";

    draft.items = [
      {
        message_id: msg.message_id,
        from_chat_id: msg.chat.id,
        type: detectedType,
        text: msg.text,
        caption: msg.caption,
      },
    ];

    await ctx.env.DB.prepare(
      "UPDATE broadcast_wizards SET step = 'OPTIONS', session_data = ? WHERE owner_id = ?"
    )
      .bind(JSON.stringify(draft), ctx.userId)
      .run();

    await renderOptionsStep(ctx.env.DB, ctx.chatId, draft);
    return true;
  } catch (err) {
    console.error("Non-fatal broadcast message input error:", err);
    return false;
  }
}

async function renderOptionsStep(
  db: D1Database,
  chatId: number,
  draft: BroadcastDraft,
  messageId?: number
): Promise<void> {
  const pinDisplay =
    draft.pinMode === "none" ? "OFF" : draft.pinMode === "quiet" ? "QUIET" : "LOUD 🔔";
  const tagDisplay = draft.tagAllEnabled ? "ON ✅" : "OFF";
  const silentDisplay = draft.isSilent ? "YES 🔕" : "NO 🔔";
  const contentTypeLabel = (draft.items[0]?.type || "message").toUpperCase();

  const audience = await BROADCAST_REGISTRY.resolveEligibleAudience(db, draft.audienceFilter);
  const includesGroups = draft.audienceFilter === "groups" || draft.audienceFilter === "all";

  const text =
    `⚙️ <b>CONFIRM BROADCAST SETTINGS</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 <b>Target:</b> ${formatTargetLabel(draft.audienceFilter)}\n` +
    `📨 <b>Recipients:</b> <code>${audience.length}</code>\n` +
    `📦 <b>Content Type:</b> <code>${contentTypeLabel}</code>\n` +
    `🔄 <b>Send Mode:</b> <code>${draft.mode.toUpperCase()}</code>\n` +
    `📌 <b>Pin Message:</b> <code>${pinDisplay}</code>\n` +
    (includesGroups ? `📢 <b>Tag All (Groups):</b> <code>${tagDisplay}</code>\n` : "") +
    `🔕 <b>Silent Mode:</b> <code>${silentDisplay}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Configure options below or tap <b>Confirm & Broadcast</b>:`;

  const row2 = [];
  if (includesGroups) {
    row2.push({ text: `📢 Tag All: ${tagDisplay}`, callback_data: "bc:toggle_opt:tag" });
  }
  row2.push({ text: `🔕 Silent: ${silentDisplay}`, callback_data: "bc:toggle_opt:silent" });

  const kb = {
    inline_keyboard: [
      [
        {
          text: `🔄 Mode: ${draft.mode.toUpperCase()}`,
          callback_data: `bc:set_mode:${draft.mode === "copy" ? "forward" : "copy"}`,
        },
        { text: `📌 Pin: ${pinDisplay}`, callback_data: "bc:toggle_opt:pin" },
      ],
      row2,
      [{ text: "👁 Send Test to My DM", callback_data: "bc:test_send" }],
      [
        { text: "🚀 Confirm & Broadcast", callback_data: "bc:confirm_run" },
        { text: "❌ Cancel", callback_data: "bc:dash" },
      ],
    ],
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, kb);
  }
}
