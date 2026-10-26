import { BotContext, CommandHandler, CloudflareEnv, DMUIConfig, SimpleButton } from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG } from "../config";
import {
  sendMessage,
  sendPhoto,
  sendVideo,
  editMessageText,
  answerCallbackQuery,
} from "../index";

const DMUI_CONFIG_KEY = "dmui_live_config";
const DMUI_STATE_KEY = "dmui_owner_state";

export function isOwner(userId: number): boolean {
  return userId === Number(CONFIG.OWNER_ID);
}

// Default buttons if none are configured yet
export function getDefaultButtons(): SimpleButton[][] {
  return [
    [{ text: "📖 Help", type: "cmd", value: "/help" }],
    [
      { text: "📢 Updates", type: "alert", value: "Updates will be posted here as new features launch!" },
      { text: "💬 Feedback", type: "alert", value: "Have suggestions? Message us directly!" },
    ],
    [{ text: "➕ Add Me to Your Group", type: "url", value: "https://t.me/Myaloobot?startgroup=true" }],
  ];
}

// Convert button matrix into Telegram API inline_keyboard
export function compileInlineKeyboard(rows: SimpleButton[][]): { inline_keyboard: any[][] } {
  const inline_keyboard = rows.map((row) =>
    row.map((btn) => {
      if (btn.type === "url") {
        return { text: btn.text, url: btn.value };
      }
      if (btn.type === "cmd") {
        return { text: btn.text, callback_data: `dm_cmd:${btn.value}` };
      }
      if (btn.type === "alert") {
        return { text: btn.text, callback_data: `dm_alt:${btn.value.slice(0, 40)}` };
      }
      return { text: btn.text, callback_data: "dm_none" };
    })
  );
  return { inline_keyboard };
}

// Parse text formatted like Group Help / Rose into button rows
export function parseButtonRows(raw: string): { rows: SimpleButton[][]; alerts: Record<string, string> } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: SimpleButton[][] = [];
  const alerts: Record<string, string> = {};

  for (const line of lines) {
    const segments = line.split("&&").map((s) => s.trim()).filter(Boolean);
    const row: SimpleButton[] = [];

    for (const seg of segments) {
      const splitIdx = seg.indexOf("-");
      if (splitIdx === -1) continue;

      const title = seg.slice(0, splitIdx).trim();
      let target = seg.slice(splitIdx + 1).trim();
      if (!title || !target) continue;

      if (/^(alert|popup):/i.test(target)) {
        const alertMsg = target.replace(/^(alert|popup):\s*/i, "").trim();
        const alertKey = `alt_${Math.random().toString(36).slice(2, 8)}`;
        alerts[alertKey] = alertMsg;
        row.push({ text: title, type: "alert", value: alertKey });
      } else if (/^share:/i.test(target)) {
        const shareMsg = target.replace(/^share:\s*/i, "").trim();
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareMsg)}`;
        row.push({ text: title, type: "url", value: shareUrl });
      } else if (target.startsWith("/")) {
        row.push({ text: title, type: "cmd", value: target.toLowerCase() });
      } else {
        if (!/^https?:\/\//i.test(target) && !/^tg:\/\//i.test(target)) {
          target = `https://${target}`;
        }
        row.push({ text: title, type: "url", value: target });
      }
    }

    if (row.length > 0) rows.push(row);
  }

  return { rows, alerts };
}

// Replace format tags with HTML tags and user details
export function renderCustomTemplate(
  template: string,
  user: { id: number; first_name: string; balance?: number; kills?: number }
): string {
  const safeName = (user.first_name || "Player")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const mention = `<a href="tg://user?id=${user.id}">${safeName}</a>`;

  return template
    .replace(/\{first_name\}/g, safeName)
    .replace(/\{mention\}/g, mention)
    .replace(/\{balance\}/g, String(user.balance ?? 0))
    .replace(/\{kills\}/g, String(user.kills ?? 0))
    .replace(/\{b\}/g, "<b>")
    .replace(/\{\/b\}/g, "</b>")
    .replace(/\{c\}/g, "<code>")
    .replace(/\{\/c\}/g, "</code>")
    .replace(/\{i\}/g, "<i>")
    .replace(/\{\/i\}/g, "</i>")
    .replace(/\{q\}/g, "<blockquote>")
    .replace(/\{\/q\}/g, "</blockquote>");
}

// /dmui Main Panel
export const dmuiHandlers: Record<string, CommandHandler> = {
  "/dmui": async (ctx: BotContext) => {
    if (!isOwner(ctx.userId)) {
      await sendMessage(ctx.chatId, "⛔ <b>Access Denied:</b> Owner only.");
      return;
    }

    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_STATE_KEY, "IDLE");

    const text =
      `⚙️ <b>ALOO DM "/start" CONFIGURATION</b>\n\n` +
      `Choose a component to configure:`;

    const kb = {
      inline_keyboard: [
        [
          { text: "📝 Text", callback_data: "dmui:ask_text" },
          { text: "🔘 Buttons", callback_data: "dmui:ask_buttons" },
          { text: "🖼 Media", callback_data: "dmui:ask_media" },
        ],
      ],
    };

    await sendMessage(ctx.chatId, text, kb);
  },
};

// Handle Button Clicks in /dmui
export async function handleDMUICallback(env: CloudflareEnv, cq: any): Promise<boolean> {
  const data: string = cq.data || "";
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const userId = cq.from?.id;

  if (!chatId || !userId) return false;

  // Handle custom alert button clicks in DM
  if (data.startsWith("dm_alt:")) {
    const key = data.replace("dm_alt:", "");
    const config = (await DB_MANAGER.getSetting<DMUIConfig>(env.DB, DMUI_CONFIG_KEY)) || {};
    const alertMsg = (config.alerts && config.alerts[key]) || key || "Notice";
    await answerCallbackQuery(cq.id, alertMsg, true);
    return true;
  }

  if (data === "dm_none") {
    await answerCallbackQuery(cq.id);
    return true;
  }

  if (!data.startsWith("dmui:")) return false;

  if (!isOwner(userId)) {
    await answerCallbackQuery(cq.id, "⛔ Unauthorized.", true);
    return true;
  }

  const action = data.replace("dmui:", "");

  // Return to root panel
  if (action === "root") {
    await DB_MANAGER.setSetting(env.DB, DMUI_STATE_KEY, "IDLE");
    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `⚙️ <b>ALOO DM "/start" CONFIGURATION</b>\n\nChoose a component to configure:`,
      {
        inline_keyboard: [
          [
            { text: "📝 Text", callback_data: "dmui:ask_text" },
            { text: "🔘 Buttons", callback_data: "dmui:ask_buttons" },
            { text: "🖼 Media", callback_data: "dmui:ask_media" },
          ],
        ],
      }
    );
    return true;
  }

  // 1. Text Prompt
  if (action === "ask_text") {
    await DB_MANAGER.setSetting(env.DB, DMUI_STATE_KEY, "AWAIT_TEXT");
    await answerCallbackQuery(cq.id);
    const msg =
      `📝 <b>SET DM "/start" MESSAGE TEXT</b>\n\n` +
      `Send the exact text to display. Supported tags:\n` +
      `• <code>{mention}</code> — User mention\n` +
      `• <code>{first_name}</code> — First name\n` +
      `• <code>{balance}</code> — Cash balance\n` +
      `• <code>{kills}</code> — Kill count\n` +
      `• <code>{b}text{/b}</code> — <b>Bold</b>\n` +
      `• <code>{c}text{/c}</code> — <code>Monospace / Copyable</code>\n` +
      `• <code>{q}text{/q}</code> — Blockquote\n\n` +
      `<i>Send your text now, or send <code>/default</code> to restore the default greeting.</i>`;

    await editMessageText(chatId, messageId, msg, {
      inline_keyboard: [[{ text: "🔙 Cancel", callback_data: "dmui:root" }]],
    });
    return true;
  }

  // 2. Buttons Prompt (Group Help Style)
  if (action === "ask_buttons") {
    await DB_MANAGER.setSetting(env.DB, DMUI_STATE_KEY, "AWAIT_BUTTONS");
    await answerCallbackQuery(cq.id);

    const config = (await DB_MANAGER.getSetting<DMUIConfig>(env.DB, DMUI_CONFIG_KEY)) || {};
    const currentCode = config.rawButtonsText ? `\n\n<b>Current Buttons:</b>\n<code>${config.rawButtonsText}</code>` : "";

    const guide =
      `🔘 <b>SET INLINE BUTTONS</b>\n\n` +
      `Send your button structure using this format:\n\n` +
      `• <b>Single button (full width):</b>\n` +
      `<code>Button Title - t.me/example</code>\n\n` +
      `• <b>Multiple buttons on one line (half width):</b>\n` +
      `<code>Button 1 - t.me/link1 && Button 2 - t.me/link2</code>\n\n` +
      `• <b>Special Buttons:</b>\n` +
      `<code>Alert - alert: Popup message here</code>\n` +
      `<code>Share - share: Join this awesome bot!</code>\n` +
      `<code>Help - /help</code>\n` +
      `<code>Balance - /bal</code>\n\n` +
      `• <b>Multiple rows:</b> Add each row on a new line.${currentCode}\n\n` +
      `<i>Send your button layout now, or send <code>/default</code> to restore default buttons.</i>`;

    await editMessageText(chatId, messageId, guide, {
      inline_keyboard: [[{ text: "🔙 Cancel", callback_data: "dmui:root" }]],
    });
    return true;
  }

  // 3. Media Prompt
  if (action === "ask_media") {
    await DB_MANAGER.setSetting(env.DB, DMUI_STATE_KEY, "AWAIT_MEDIA");
    await answerCallbackQuery(cq.id);

    const config = (await DB_MANAGER.getSetting<DMUIConfig>(env.DB, DMUI_CONFIG_KEY)) || {};
    const status = config.mediaType && config.mediaType !== "none"
      ? `Active Media: <b>${config.mediaType.toUpperCase()}</b>`
      : "Active Media: <b>None (Text-only)</b>";

    const prompt =
      `🖼 <b>SET DM "/start" MEDIA</b>\n\n` +
      `${status}\n\n` +
      `• Send any <b>Photo</b> or <b>Video</b> directly in this chat to attach it.\n` +
      `• Send <code>/empty</code> or click below to remove media and use text-only.`;

    await editMessageText(chatId, messageId, prompt, {
      inline_keyboard: [
        [{ text: "🗑 Clear Media (/empty)", callback_data: "dmui:clear_media" }],
        [{ text: "🔙 Cancel", callback_data: "dmui:root" }],
      ],
    });
    return true;
  }

  if (action === "clear_media") {
    const config = (await DB_MANAGER.getSetting<DMUIConfig>(env.DB, DMUI_CONFIG_KEY)) || {};
    config.mediaType = "none";
    config.mediaFileId = undefined;
    await DB_MANAGER.setSetting(env.DB, DMUI_CONFIG_KEY, config);
    await DB_MANAGER.setSetting(env.DB, DMUI_STATE_KEY, "IDLE");

    await answerCallbackQuery(cq.id, "Media removed.");
    await editMessageText(chatId, messageId, "✅ <b>Media Cleared:</b> /start is now text-only.", {
      inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "dmui:root" }]],
    });
    return true;
  }

  return false;
}

// Handle Incoming Text (Text template or Button structure)
export async function handleDMUITextInput(ctx: BotContext): Promise<boolean> {
  if (!isOwner(ctx.userId)) return false;

  const state = await DB_MANAGER.getSetting<string>(ctx.env.DB, DMUI_STATE_KEY);
  if (!state || state === "IDLE") return false;

  const input = ctx.text.trim();
  const config = (await DB_MANAGER.getSetting<DMUIConfig>(ctx.env.DB, DMUI_CONFIG_KEY)) || {};

  // Handling Text Setup
  if (state === "AWAIT_TEXT") {
    if (input === "/default") {
      delete config.customText;
    } else {
      config.customText = input;
    }

    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_CONFIG_KEY, config);
    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_STATE_KEY, "IDLE");

    const preview = renderCustomTemplate(
      config.customText || "Hey, 💕 {first_name}!",
      { id: ctx.userId, first_name: ctx.message.from.first_name, balance: 1000, kills: 5 }
    );

    await sendMessage(
      ctx.chatId,
      `✅ <b>Message Text Saved!</b>\n\n<b>Preview:</b>\n${preview}`,
      { inline_keyboard: [[{ text: "🔙 Return to /dmui", callback_data: "dmui:root" }]] }
    );
    return true;
  }

  // Handling Button Setup via Group Help Syntax
  if (state === "AWAIT_BUTTONS") {
    if (input === "/default") {
      delete config.buttonRows;
      delete config.rawButtonsText;
      delete config.alerts;
    } else {
      const { rows, alerts } = parseButtonRows(input);
      if (rows.length === 0) {
        await sendMessage(
          ctx.chatId,
          `⚠️ <b>No valid buttons detected.</b>\n` +
          `Make sure to use the format:\n<code>Button Title - https://link.com</code>\nor\n<code>Btn 1 - link1 && Btn 2 - link2</code>`
        );
        return true;
      }
      config.buttonRows = rows;
      config.rawButtonsText = input;
      config.alerts = alerts;
    }

    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_CONFIG_KEY, config);
    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_STATE_KEY, "IDLE");

    const kb = compileInlineKeyboard(config.buttonRows || getDefaultButtons());

    await sendMessage(
      ctx.chatId,
      `✅ <b>Buttons Updated Successfully!</b>\nHere is how they look:`,
      kb
    );
    await sendMessage(
      ctx.chatId,
      `Ready to test in /start.`,
      { inline_keyboard: [[{ text: "🔙 Return to /dmui", callback_data: "dmui:root" }]] }
    );
    return true;
  }

  // Handling Media /empty command sent as text
  if (state === "AWAIT_MEDIA" && input === "/empty") {
    config.mediaType = "none";
    config.mediaFileId = undefined;
    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_CONFIG_KEY, config);
    await DB_MANAGER.setSetting(ctx.env.DB, DMUI_STATE_KEY, "IDLE");

    await sendMessage(
      ctx.chatId,
      `✅ <b>Media Cleared:</b> /start set to text-only mode.`,
      { inline_keyboard: [[{ text: "🔙 Return to /dmui", callback_data: "dmui:root" }]] }
    );
    return true;
  }

  return false;
}

// Handle Incoming Photos/Videos for Media Attachment
export async function handleDMUIMediaInput(ctx: BotContext): Promise<boolean> {
  if (!isOwner(ctx.userId)) return false;

  const state = await DB_MANAGER.getSetting<string>(ctx.env.DB, DMUI_STATE_KEY);
  if (state !== "AWAIT_MEDIA") return false;

  let fileId: string | null = null;
  let type: "photo" | "video" = "photo";

  if (ctx.message.photo && ctx.message.photo.length > 0) {
    const highestQuality = ctx.message.photo[ctx.message.photo.length - 1];
    fileId = highestQuality.file_id;
    type = "photo";
  } else if (ctx.message.video) {
    fileId = ctx.message.video.file_id;
    type = "video";
  }

  if (!fileId) return false;

  const config = (await DB_MANAGER.getSetting<DMUIConfig>(ctx.env.DB, DMUI_CONFIG_KEY)) || {};
  config.mediaType = type;
  config.mediaFileId = fileId;

  await DB_MANAGER.setSetting(ctx.env.DB, DMUI_CONFIG_KEY, config);
  await DB_MANAGER.setSetting(ctx.env.DB, DMUI_STATE_KEY, "IDLE");

  // Send test preview
  if (type === "photo") {
    await sendPhoto(ctx.chatId, fileId, `✅ <b>Photo Saved Successfully!</b>`);
  } else {
    await sendVideo(ctx.chatId, fileId, `✅ <b>Video Saved Successfully!</b>`);
  }

  await sendMessage(
    ctx.chatId,
    `Media linked to DM /start.`,
    { inline_keyboard: [[{ text: "🔙 Return to /dmui", callback_data: "dmui:root" }]] }
  );

  return true;
}
