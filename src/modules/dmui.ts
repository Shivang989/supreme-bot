import {
  BotContext,
  CommandHandler,
  CloudflareEnv,
  DMUIConfig,
  DMUISession,
  DMButton,
  ButtonLayout,
  ButtonActionType,
} from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG } from "../config";
import { sendMessage, editMessageText, editMessageReplyMarkup, answerCallbackQuery } from "../index";

const LIVE_KEY = "dmui_live_config";
const SAVED_DRAFT_KEY = "dmui_saved_draft";
const SESSION_KEY = "dmui_owner_session";

const ALLOWED_COMMANDS = [
  "/bal", "/b", "/fire", "/rob", "/safe", "/defend", "/revive",
  "/daily", "/market", "/sell", "/inv", "/me", "/top", "/help",
  "/dice", "/flip", "/rps", "/8ball"
];

const REGISTERED_CUSTOM_ACTIONS: Record<string, string> = {
  "show_updates": "📢 Updates Alert",
  "show_feedback": "💬 Feedback Prompt",
  "show_profile_popup": "👤 Quick Balance Popup",
};

export function isOwner(userId: number): boolean {
  return userId === Number(CONFIG.OWNER_ID);
}

export function getDefaultDMUIConfig(): DMUIConfig {
  return {
    menus: {
      root: { id: "root", name: "Main Menu" },
    },
    buttons: [
      {
        id: "btn_help",
        text: "📖 Help",
        parentMenuId: "root",
        row: 0,
        position: 0,
        layout: "full",
        actionType: "command",
        actionValue: "/help",
      },
      {
        id: "btn_updates",
        text: "📢 Updates",
        parentMenuId: "root",
        row: 1,
        position: 0,
        layout: "half",
        actionType: "custom",
        actionValue: "show_updates",
      },
      {
        id: "btn_feedback",
        text: "💬 Feedback",
        parentMenuId: "root",
        row: 1,
        position: 1,
        layout: "half",
        actionType: "custom",
        actionValue: "show_feedback",
      },
      {
        id: "btn_add_grp",
        text: "➕ Add Me to Your Group",
        parentMenuId: "root",
        row: 2,
        position: 0,
        layout: "full",
        actionType: "url",
        actionValue: "https://t.me/Myaloobot?startgroup=true",
      },
    ],
  };
}

// ==========================================
// 📐 KEYBOARD COMPILER (Data -> Telegram API)
// ==========================================
export function compileMenuKeyboard(
  config: DMUIConfig,
  menuId: string = "root",
  isPreview: boolean = false
): { inline_keyboard: any[][] } {
  const menuButtons = config.buttons
    .filter((b) => b.parentMenuId === menuId)
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.position - b.position));

  const rowsMap = new Map<number, DMButton[]>();
  for (const btn of menuButtons) {
    if (!rowsMap.has(btn.row)) rowsMap.set(btn.row, []);
    rowsMap.get(btn.row)!.push(btn);
  }

  const inline_keyboard: any[][] = [];
  const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  for (const rKey of sortedRowKeys) {
    const rowBtns = rowsMap.get(rKey)!;
    const apiRow: any[] = [];

    for (const btn of rowBtns) {
      if (btn.actionType === "url" || btn.actionType === "join") {
        apiRow.push({ text: btn.text, url: btn.actionValue });
      } else if (btn.actionType === "submenu") {
        const prefix = isPreview ? "dmui_prev_sub:" : "dm_nav:";
        apiRow.push({ text: btn.text, callback_data: `${prefix}${btn.actionValue}` });
      } else if (btn.actionType === "back") {
        const target = btn.actionValue || config.menus[menuId]?.parentId || "root";
        const prefix = isPreview ? "dmui_prev_sub:" : "dm_nav:";
        apiRow.push({ text: btn.text, callback_data: `${prefix}${target}` });
      } else if (btn.actionType === "command") {
        apiRow.push({ text: btn.text, callback_data: `dm_cmd:${btn.actionValue}` });
      } else if (btn.actionType === "custom") {
        apiRow.push({ text: btn.text, callback_data: `dm_cust:${btn.actionValue}` });
      }
    }

    if (apiRow.length > 0) inline_keyboard.push(apiRow);
  }

  if (isPreview) {
    inline_keyboard.push([{ text: "🔙 Return to Button Builder", callback_data: "dmui:btn_home" }]);
  }

  return { inline_keyboard };
}

// ==========================================
// 🛠 ROW NORMALIZATION HELPER
// ==========================================
function normalizeMenuRows(config: DMUIConfig, menuId: string): void {
  const menuBtns = config.buttons
    .filter((b) => b.parentMenuId === menuId)
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.position - b.position));

  const rows: DMButton[][] = [];
  for (const btn of menuBtns) {
    if (btn.layout === "full") {
      rows.push([btn]);
    } else {
      const lastRow = rows[rows.length - 1];
      if (lastRow && lastRow.length === 1 && lastRow[0].layout === "half" && lastRow[0].row === btn.row) {
        lastRow.push(btn);
      } else {
        rows.push([btn]);
      }
    }
  }

  rows.forEach((r, rIdx) => {
    r.forEach((b, pIdx) => {
      b.row = rIdx;
      b.position = pIdx;
    });
  });
}

// ==========================================
// 🖥 UI RENDERERS FOR BUILDER PANELS
// ==========================================
function formatVisualAsciiLayout(config: DMUIConfig, menuId: string): string {
  const menu = config.menus[menuId] || { name: "Unknown Menu" };
  const menuBtns = config.buttons
    .filter((b) => b.parentMenuId === menuId)
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.position - b.position));

  if (menuBtns.length === 0) {
    return `📂 <b>Menu:</b> ${menu.name} (<code>${menuId}</code>)\n<i>No buttons configured in this menu yet.</i>`;
  }

  const rowsMap = new Map<number, DMButton[]>();
  for (const b of menuBtns) {
    if (!rowsMap.has(b.row)) rowsMap.set(b.row, []);
    rowsMap.get(b.row)!.push(b);
  }

  let out = `📂 <b>Active Menu:</b> ${menu.name}\n🔢 <b>Buttons in Menu:</b> ${menuBtns.length} | <b>Total Buttons:</b> ${config.buttons.length}\n\n<b>Current Layout Map:</b>\n`;
  Array.from(rowsMap.keys())
    .sort((a, b) => a - b)
    .forEach((rIdx) => {
      const rBtns = rowsMap.get(rIdx)!;
      const line = rBtns.map((b) => `[ ${b.text} (${b.layout === "full" ? "Full" : "Half"}) ]`).join(" ");
      out += `Row ${rIdx + 1}: <code>${line}</code>\n`;
    });

  return out;
}

export async function renderButtonBuilderHome(
  chatId: number,
  session: DMUISession,
  messageId?: number
): Promise<void> {
  const summary = formatVisualAsciiLayout(session.draft, session.activeMenuId);
  const text =
    `🎛 <b>ALOO "/start" BUTTON BUILDER</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${summary}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Select an operation below. Changes remain in your working draft until you Save or Apply.</i>`;

  const kb = {
    inline_keyboard: [
      [
        { text: "➕ Add Button", callback_data: "dmui:add_btn" },
        { text: "✏️ Edit Button", callback_data: "dmui:edit_list" },
      ],
      [
        { text: "🗑 Delete Button", callback_data: "dmui:del_list" },
        { text: "↕️ Reorder Buttons", callback_data: "dmui:reorder_list" },
      ],
      [
        { text: "📐 Change Layout", callback_data: "dmui:layout_list" },
        { text: "📂 Manage Submenus", callback_data: "dmui:submenus" },
      ],
      [
        { text: "👁 Preview", callback_data: "dmui:preview" },
        { text: "💾 Save Draft", callback_data: "dmui:save_draft" },
      ],
      [
        { text: "✅ Apply Changes", callback_data: "dmui:apply_live" },
      ],
      [
        { text: "❌ Cancel Session", callback_data: "dmui:cancel_confirm" },
        { text: "🔙 Back", callback_data: "dmui:root" },
      ],
    ],
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, kb);
  }
}

// ==========================================
// 👑 /dmui COMMAND ENTRYPOINT
// ==========================================
export const dmuiHandlers: Record<string, CommandHandler> = {
  "/dmui": async (ctx: BotContext) => {
    if (!isOwner(ctx.userId)) {
      await sendMessage(ctx.chatId, "⛔ <b>Access Denied:</b> Only the Bot Owner can access <code>/dmui</code>.");
      return;
    }

    const text =
      `⚙️ <b>ALOO DM "/start" CONFIGURATION</b>\n\n` +
      `Select a module to customize the private <code>/start</code> interface:`;

    const kb = {
      inline_keyboard: [
        [
          { text: "📝 Text", callback_data: "dmui:mod_text" },
          { text: "🔘 Button", callback_data: "dmui:mod_button" },
          { text: "🖼 Media", callback_data: "dmui:mod_media" },
        ],
      ],
    };

    await sendMessage(ctx.chatId, text, kb);
  },
};

// ==========================================
// 🔄 CALLBACK ROUTER FOR BUTTON BUILDER
// ==========================================
export async function handleDMUICallback(
  env: CloudflareEnv,
  cq: any
): Promise<boolean> {
  const data: string = cq.data || "";
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const userId = cq.from?.id;

  if (!chatId || !userId) return false;

  // 1. Live User Navigation Callbacks (Public DM /start menu interactions)
  if (data.startsWith("dm_nav:") || data.startsWith("dm_cmd:") || data.startsWith("dm_cust:")) {
    await handleLiveStartButtonAction(env, cq);
    return true;
  }

  // 2. Owner-Only Builder Callbacks
  if (!data.startsWith("dmui:") && !data.startsWith("dmui_prev_sub:")) return false;

  if (!isOwner(userId)) {
    await answerCallbackQuery(cq.id, "⛔ Unauthorized: Owner access only.", true);
    return true;
  }

  // Load or initialize isolated editing session
  let session = await DB_MANAGER.getSetting<DMUISession>(env.DB, SESSION_KEY);
  if (!session) {
    const savedDraft = await DB_MANAGER.getSetting<DMUIConfig>(env.DB, SAVED_DRAFT_KEY);
    const liveConfig = await DB_MANAGER.getSetting<DMUIConfig>(env.DB, LIVE_KEY);
    session = {
      ownerId: userId,
      activeMenuId: "root",
      step: "IDLE",
      draft: savedDraft || liveConfig || getDefaultDMUIConfig(),
    };
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
  }

  // Handle Preview Submenu Navigation
  if (data.startsWith("dmui_prev_sub:")) {
    const targetSub = data.replace("dmui_prev_sub:", "");
    const kb = compileMenuKeyboard(session.draft, targetSub, true);
    await answerCallbackQuery(cq.id, `Previewing menu: ${targetSub}`);
    await editMessageReplyMarkup(chatId, messageId, kb);
    return true;
  }

  const action = data.replace("dmui:", "");

  // --- ROOT /DMUI MENU ---
  if (action === "root") {
    session.step = "IDLE";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `⚙️ <b>ALOO DM "/start" CONFIGURATION</b>\n\nSelect a module to customize the private <code>/start</code> interface:`,
      {
        inline_keyboard: [
          [
            { text: "📝 Text", callback_data: "dmui:mod_text" },
            { text: "🔘 Button", callback_data: "dmui:mod_button" },
            { text: "🖼 Media", callback_data: "dmui:mod_media" },
          ],
        ],
      }
    );
    return true;
  }

  if (action === "mod_text" || action === "mod_media") {
    await answerCallbackQuery(cq.id, "This module is managed separately.", true);
    return true;
  }

  if (action === "mod_button" || action === "btn_home") {
    session.step = "IDLE";
    session.tempButton = undefined;
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await renderButtonBuilderHome(chatId, session, messageId);
    return true;
  }

  // ==========================================
  // ➕ GUIDED BUTTON CREATION WIZARD (Steps 1-5)
  // ==========================================
  if (action === "add_btn") {
    session.step = "AWAIT_BTN_TEXT";
    session.tempButton = {
      id: `btn_${Date.now().toString(36)}`,
      parentMenuId: session.activeMenuId,
    };
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `➕ <b>ADD BUTTON — STEP 1 OF 5 (Button Text)</b>\n\n` +
        `📂 <b>Target Menu:</b> ${session.draft.menus[session.activeMenuId]?.name}\n\n` +
        `What should this button say?\n<i>Send the button label as a message (e.g., 🎮 Games).</i>`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]] }
    );
    return true;
  }

  // Step 2: Layout & Row Selection
  if (action.startsWith("wiz_layout:")) {
    const layout = action.replace("wiz_layout:", "") as ButtonLayout;
    if (!session.tempButton) return true;
    session.tempButton.layout = layout;

    const menuBtns = session.draft.buttons.filter((b) => b.parentMenuId === session!.activeMenuId);
    const maxRow = menuBtns.reduce((max, b) => Math.max(max, b.row), -1);

    const rowButtons: any[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const existingInRow = menuBtns.filter((b) => b.row === r);
      if (layout === "half" && existingInRow.length === 1 && existingInRow[0].layout === "half") {
        rowButtons.push([
          {
            text: `Join Row ${r + 1} (Next to "${existingInRow[0].text}")`,
            callback_data: `dmui:wiz_row:${r}:1`,
          },
        ]);
      }
    }
    rowButtons.push([
      { text: `➕ Place on New Row (Row ${maxRow + 2})`, callback_data: `dmui:wiz_row:${maxRow + 1}:0` },
    ]);
    rowButtons.push([{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]);

    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `📐 <b>ADD BUTTON — STEP 2B OF 5 (Row & Position)</b>\n\n` +
        `Selected Layout: <b>${layout === "full" ? "Full Width" : "Half Width"}</b>\n` +
        `Choose which row this button should occupy:`,
      { inline_keyboard: rowButtons }
    );
    return true;
  }

  // Step 3: Select Action Type
  if (action.startsWith("wiz_row:")) {
    const [, rStr, pStr] = action.split(":");
    if (!session.tempButton) return true;
    session.tempButton.row = parseInt(rStr, 10);
    session.tempButton.position = parseInt(pStr, 10);

    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `⚡ <b>ADD BUTTON — STEP 3 OF 5 (Button Action)</b>\n\n` +
        `Select what happens when a user taps <b>${session.tempButton.text}</b>:`,
      {
        inline_keyboard: [
          [{ text: "📂 1. Open Submenu", callback_data: "dmui:wiz_act:submenu" }],
          [{ text: "🌐 2. Open URL", callback_data: "dmui:wiz_act:url" }],
          [{ text: "🤖 3. Run Bot Command", callback_data: "dmui:wiz_act:command" }],
          [{ text: "📢 4. Join Group / Channel", callback_data: "dmui:wiz_act:join" }],
          [{ text: "🔙 5. Back / Return", callback_data: "dmui:wiz_act:back" }],
          [{ text: "⚙️ 6. Custom Action", callback_data: "dmui:wiz_act:custom" }],
          [{ text: "❌ Cancel", callback_data: "dmui:btn_home" }],
        ],
      }
    );
    return true;
  }

  // Step 4: Action Configuration
  if (action.startsWith("wiz_act:")) {
    const actType = action.replace("wiz_act:", "") as ButtonActionType;
    if (!session.tempButton) return true;
    session.tempButton.actionType = actType;

    if (actType === "url" || actType === "join") {
      session.step = "AWAIT_BTN_URL";
      await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
      await answerCallbackQuery(cq.id);
      await editMessageText(
        chatId,
        messageId,
        `🌐 <b>STEP 4 OF 5 — Configure Destination Link</b>\n\n` +
          `Send the valid <code>https://</code> or <code>https://t.me/...</code> link in chat:`,
        { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]] }
      );
      return true;
    }

    if (actType === "command") {
      session.step = "AWAIT_BTN_CMD";
      const cmdRows: any[][] = [];
      for (let i = 0; i < ALLOWED_COMMANDS.length; i += 3) {
        cmdRows.push(
          ALLOWED_COMMANDS.slice(i, i + 3).map((c) => ({
            text: c,
            callback_data: `dmui:wiz_val:${c}`,
          }))
        );
      }
      cmdRows.push([{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]);

      await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
      await answerCallbackQuery(cq.id);
      await editMessageText(
        chatId,
        messageId,
        `🤖 <b>STEP 4 OF 5 — Select Bot Command</b>\n\n` +
          `Tap a supported command below, or type a supported command (e.g. <code>/bal</code>):`,
        { inline_keyboard: cmdRows }
      );
      return true;
    }

    if (actType === "submenu") {
      const subRows: any[][] = Object.values(session.draft.menus)
        .filter((m) => m.id !== session!.activeMenuId)
        .map((m) => [{ text: `📂 ${m.name} (${m.id})`, callback_data: `dmui:wiz_val:${m.id}` }]);

      subRows.push([{ text: "➕ Create New Submenu", callback_data: "dmui:wiz_new_sub" }]);
      subRows.push([{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]);

      await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
      await answerCallbackQuery(cq.id);
      await editMessageText(
        chatId,
        messageId,
        `📂 <b>STEP 4 OF 5 — Select or Create Submenu</b>\n\nChoose which submenu this button opens:`,
        { inline_keyboard: subRows }
      );
      return true;
    }

    if (actType === "back") {
      const currentMenu = session.draft.menus[session.activeMenuId];
      const defaultParent = currentMenu?.parentId || "root";
      const menuOptions = Object.values(session.draft.menus).map((m) => [
        {
          text: `🔙 Return to ${m.name} (${m.id === defaultParent ? "Default Parent" : m.id})`,
          callback_data: `dmui:wiz_val:${m.id}`,
        },
      ]);
      menuOptions.push([{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]);

      await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
      await answerCallbackQuery(cq.id);
      await editMessageText(
        chatId,
        messageId,
        `🔙 <b>STEP 4 OF 5 — Configure Back Destination</b>\n\nSelect the target menu to return to:`,
        { inline_keyboard: menuOptions }
      );
      return true;
    }

    if (actType === "custom") {
      const custRows = Object.entries(REGISTERED_CUSTOM_ACTIONS).map(([k, label]) => [
        { text: label, callback_data: `dmui:wiz_val:${k}` },
      ]);
      custRows.push([{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]);

      await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
      await answerCallbackQuery(cq.id);
      await editMessageText(
        chatId,
        messageId,
        `⚙️ <b>STEP 4 OF 5 — Select Registered Custom Action</b>`,
        { inline_keyboard: custRows }
      );
      return true;
    }
  }

  if (action === "wiz_new_sub") {
    session.step = "AWAIT_NEW_SUBMENU_FOR_BTN";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `📂 <b>Create New Submenu</b>\n\nSend a name for the new submenu (e.g., <code>Games Menu</code>):`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "dmui:btn_home" }]] }
    );
    return true;
  }

  // Step 5: Confirmation Screen
  if (action.startsWith("wiz_val:")) {
    const val = action.replace("wiz_val:", "");
    if (!session.tempButton) return true;
    session.tempButton.actionValue = val;
    session.step = "IDLE";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await renderWizardConfirmation(chatId, session, messageId);
    return true;
  }

  if (action === "wiz_confirm") {
    const tb = session.tempButton;
    if (!tb || !tb.id || !tb.text || !tb.actionType || !tb.actionValue) {
      await answerCallbackQuery(cq.id, "⚠️ Incomplete button configuration.", true);
      return true;
    }

    if (session.editingButtonId) {
      const idx = session.draft.buttons.findIndex((b) => b.id === session!.editingButtonId);
      if (idx !== -1) {
        session.draft.buttons[idx] = tb as DMButton;
      }
      session.editingButtonId = undefined;
    } else {
      session.draft.buttons.push(tb as DMButton);
    }

    normalizeMenuRows(session.draft, session.activeMenuId);
    session.tempButton = undefined;
    session.step = "IDLE";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id, "✅ Button added to working draft!");
    await renderButtonBuilderHome(chatId, session, messageId);
    return true;
  }

  // ==========================================
  // ✏️ EDIT EXISTING BUTTONS
  // ==========================================
  if (action === "edit_list") {
    const btns = session.draft.buttons.filter((b) => b.parentMenuId === session!.activeMenuId);
    if (btns.length === 0) {
      await answerCallbackQuery(cq.id, "No buttons in this menu to edit.", true);
      return true;
    }

    const rows = btns.map((b) => [
      { text: `${b.text} (Row ${b.row + 1}, ${b.layout})`, callback_data: `dmui:edit_sel:${b.id}` },
    ]);
    rows.push([{ text: "🔙 Back", callback_data: "dmui:btn_home" }]);

    await answerCallbackQuery(cq.id);
    await editMessageText(chatId, messageId, `✏️ <b>Select a button to edit:</b>`, {
      inline_keyboard: rows,
    });
    return true;
  }

  if (action.startsWith("edit_sel:")) {
    const btnId = action.replace("edit_sel:", "");
    const btn = session.draft.buttons.find((b) => b.id === btnId);
    if (!btn) return true;

    session.editingButtonId = btnId;
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await renderSingleButtonEditor(chatId, session, btn, messageId);
    return true;
  }

  if (action === "eb_text") {
    session.step = "AWAIT_EDIT_BTN_TEXT";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(chatId, messageId, `✏️ <b>Send the new text label for this button:</b>`, {
      inline_keyboard: [[{ text: "🔙 Back", callback_data: `dmui:edit_sel:${session.editingButtonId}` }]],
    });
    return true;
  }

  if (action === "eb_layout") {
    const btn = session.draft.buttons.find((b) => b.id === session!.editingButtonId);
    if (!btn) return true;
    btn.layout = btn.layout === "full" ? "half" : "full";
    normalizeMenuRows(session.draft, session.activeMenuId);
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id, `Layout switched to ${btn.layout.toUpperCase()}`);
    await renderSingleButtonEditor(chatId, session, btn, messageId);
    return true;
  }

  if (action === "eb_dest") {
    const btn = session.draft.buttons.find((b) => b.id === session!.editingButtonId);
    if (!btn) return true;
    session.tempButton = { ...btn };
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await handleDMUICallback(env, {
      ...cq,
      data: `dmui:wiz_act:${btn.actionType}`,
    });
    return true;
  }

  if (action === "eb_act") {
    const btn = session.draft.buttons.find((b) => b.id === session!.editingButtonId);
    if (!btn) return true;
    session.tempButton = { ...btn };
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await handleDMUICallback(env, {
      ...cq,
      data: `dmui:wiz_row:${btn.row}:${btn.position}`,
    });
    return true;
  }

  if (action === "eb_move_menu") {
    const menus = Object.values(session.draft.menus).filter((m) => m.id !== session!.activeMenuId);
    if (menus.length === 0) {
      await answerCallbackQuery(cq.id, "No other submenus exist yet.", true);
      return true;
    }
    const rows = menus.map((m) => [
      { text: `📂 Move to ${m.name}`, callback_data: `dmui:eb_move_to:${m.id}` },
    ]);
    rows.push([{ text: "🔙 Back", callback_data: `dmui:edit_sel:${session.editingButtonId}` }]);
    await editMessageText(chatId, messageId, `📂 <b>Select destination menu for this button:</b>`, {
      inline_keyboard: rows,
    });
    return true;
  }

  if (action.startsWith("eb_move_to:")) {
    const targetMenu = action.replace("eb_move_to:", "");
    const btn = session.draft.buttons.find((b) => b.id === session!.editingButtonId);
    if (!btn) return true;
    const oldMenu = btn.parentMenuId;
    btn.parentMenuId = targetMenu;
    btn.row = 99;
    normalizeMenuRows(session.draft, oldMenu);
    normalizeMenuRows(session.draft, targetMenu);
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id, "✅ Button moved!");
    await renderButtonBuilderHome(chatId, session, messageId);
    return true;
  }

  // ==========================================
  // 🗑 DELETE BUTTON
  // ==========================================
  if (action === "del_list") {
    const btns = session.draft.buttons.filter((b) => b.parentMenuId === session!.activeMenuId);
    if (btns.length === 0) {
      await answerCallbackQuery(cq.id, "No buttons to delete.", true);
      return true;
    }
    const rows = btns.map((b) => [
      { text: `🗑 ${b.text}`, callback_data: `dmui:del_btn:${b.id}` },
    ]);
    rows.push([{ text: "🔙 Back", callback_data: "dmui:btn_home" }]);
    await editMessageText(chatId, messageId, `🗑 <b>Tap a button to delete it from the draft:</b>`, {
      inline_keyboard: rows,
    });
    return true;
  }

  if (action.startsWith("del_btn:")) {
    const btnId = action.replace("del_btn:", "");
    session.draft.buttons = session.draft.buttons.filter((b) => b.id !== btnId);
    normalizeMenuRows(session.draft, session.activeMenuId);
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id, "🗑 Button deleted from draft.");
    await renderButtonBuilderHome(chatId, session, messageId);
    return true;
  }

  // ==========================================
  // ↕️ REORDER & CHANGE LAYOUT
  // ==========================================
  if (action === "reorder_list" || action === "layout_list") {
    const btns = session.draft.buttons
      .filter((b) => b.parentMenuId === session!.activeMenuId)
      .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.position - b.position));

    if (btns.length === 0) {
      await answerCallbackQuery(cq.id, "No buttons in this menu.", true);
      return true;
    }

    const rows = btns.map((b) => [
      { text: `${b.text} [R${b.row + 1}:P${b.position + 1}]`, callback_data: `dmui:pos_ctrl:${b.id}` },
      { text: "⬆️", callback_data: `dmui:mv:${b.id}:up` },
      { text: "⬇️", callback_data: `dmui:mv:${b.id}:down` },
      { text: "⬅️", callback_data: `dmui:mv:${b.id}:left` },
      { text: "➡️", callback_data: `dmui:mv:${b.id}:right` },
      { text: b.layout === "full" ? "1/2" : "Full", callback_data: `dmui:mv:${b.id}:width` },
    ]);
    rows.push([{ text: "🔙 Back to Builder", callback_data: "dmui:btn_home" }]);

    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `${formatVisualAsciiLayout(session.draft, session.activeMenuId)}\n<b>Use arrows to move buttons or toggle Full/Half width:</b>`,
      { inline_keyboard: rows }
    );
    return true;
  }

  if (action.startsWith("mv:")) {
    const [, btnId, dir] = action.split(":");
    const btn = session.draft.buttons.find((b) => b.id === btnId);
    if (!btn) return true;

    if (dir === "width") {
      btn.layout = btn.layout === "full" ? "half" : "full";
    } else if (dir === "up" && btn.row > 0) {
      btn.row -= 1.5;
    } else if (dir === "down") {
      btn.row += 1.5;
    } else if (dir === "left") {
      btn.position -= 1.5;
    } else if (dir === "right") {
      btn.position += 1.5;
    }

    normalizeMenuRows(session.draft, session.activeMenuId);
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await handleDMUICallback(env, { ...cq, data: "dmui:reorder_list" });
    return true;
  }

  // ==========================================
  // 📂 SUBMENU MANAGER
  // ==========================================
  if (action === "submenus") {
    const menuRows = Object.values(session.draft.menus).map((m) => [
      {
        text: `${m.id === session!.activeMenuId ? "🟢 " : "📂 "}${m.name} (${m.id})`,
        callback_data: `dmui:sub_switch:${m.id}`,
      },
      ...(m.id !== "root"
        ? [
            { text: "✏️ Rename", callback_data: `dmui:sub_ren:${m.id}` },
            { text: "🗑 Delete", callback_data: `dmui:sub_del:${m.id}` },
          ]
        : []),
    ]);

    menuRows.push([{ text: "➕ Create New Submenu", callback_data: "dmui:sub_create" }]);
    menuRows.push([{ text: "🔙 Back to Builder", callback_data: "dmui:btn_home" }]);

    await answerCallbackQuery(cq.id);
    await editMessageText(
      chatId,
      messageId,
      `📂 <b>SUBMENU MANAGER</b>\n\n` +
        `Tap any menu to switch your active editor context without losing unfinished changes:`,
      { inline_keyboard: menuRows }
    );
    return true;
  }

  if (action.startsWith("sub_switch:")) {
    const targetId = action.replace("sub_switch:", "");
    if (session.draft.menus[targetId]) {
      session.activeMenuId = targetId;
      await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
      await answerCallbackQuery(cq.id, `Switched editor to ${session.draft.menus[targetId].name}`);
      await renderButtonBuilderHome(chatId, session, messageId);
    }
    return true;
  }

  if (action === "sub_create") {
    session.step = "AWAIT_NEW_SUBMENU_STANDALONE";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(chatId, messageId, `📂 <b>Send a display name for the new submenu:</b>`, {
      inline_keyboard: [[{ text: "🔙 Back", callback_data: "dmui:submenus" }]],
    });
    return true;
  }

  if (action.startsWith("sub_ren:")) {
    session.targetMenuId = action.replace("sub_ren:", "");
    session.step = "AWAIT_RENAME_SUBMENU";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id);
    await editMessageText(chatId, messageId, `✏️ <b>Send the new name for submenu <code>${session.targetMenuId}</code>:</b>`, {
      inline_keyboard: [[{ text: "🔙 Back", callback_data: "dmui:submenus" }]],
    });
    return true;
  }

  if (action.startsWith("sub_del:")) {
    const subId = action.replace("sub_del:", "");
    const refs = session.draft.buttons.filter(
      (b) => (b.actionType === "submenu" || b.actionType === "back") && b.actionValue === subId
    );

    if (refs.length > 0) {
      const refNames = refs.map((r) => `"${r.text}"`).join(", ");
      await editMessageText(
        chatId,
        messageId,
        `⚠️ <b>Submenu Reference Warning!</b>\n\n` +
          `Submenu <b>${session.draft.menus[subId]?.name}</b> is currently referenced by: ${refNames}.\n\n` +
          `Deleting it will also remove those buttons. Confirm deletion?`,
        {
          inline_keyboard: [
            [{ text: "🗑 Force Delete Submenu & References", callback_data: `dmui:sub_del_force:${subId}` }],
            [{ text: "🔙 Cancel", callback_data: "dmui:submenus" }],
          ],
        }
      );
      return true;
    }

    delete session.draft.menus[subId];
    session.draft.buttons = session.draft.buttons.filter((b) => b.parentMenuId !== subId);
    if (session.activeMenuId === subId) session.activeMenuId = "root";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id, "🗑 Submenu deleted.");
    await handleDMUICallback(env, { ...cq, data: "dmui:submenus" });
    return true;
  }

  if (action.startsWith("sub_del_force:")) {
    const subId = action.replace("sub_del_force:", "");
    delete session.draft.menus[subId];
    session.draft.buttons = session.draft.buttons.filter(
      (b) => b.parentMenuId !== subId && !(b.actionType === "submenu" && b.actionValue === subId)
    );
    if (session.activeMenuId === subId) session.activeMenuId = "root";
    await DB_MANAGER.setSetting(env.DB, SESSION_KEY, session);
    await answerCallbackQuery(cq.id, "🗑 Submenu and referencing buttons removed.");
    await handleDMUICallback(env, { ...cq, data: "dmui:submenus" });
    return true;
  }

  // ==========================================
  // 👁 PREVIEW, 💾 SAVE DRAFT, ✅ APPLY, ❌ CANCEL
  // ==========================================
  if (action === "preview") {
    const kb = compileMenuKeyboard(session.draft, session.activeMenuId, true);
    await answerCallbackQuery(cq.id, "Rendering interactive preview...");
    await editMessageText(
      chatId,
      messageId,
      `👁 <b>INTERACTIVE KEYBOARD PREVIEW</b>\n` +
        `📂 <b>Menu:</b> ${session.draft.menus[session.activeMenuId]?.name}\n\n` +
        `<i>Test submenu navigation directly below:</i>`,
      kb
    );
    return true;
  }

  if (action === "save_draft") {
    await DB_MANAGER.setSetting(env.DB, SAVED_DRAFT_KEY, session.draft);
    await answerCallbackQuery(cq.id, "💾 Draft persisted to database! (Not yet live)", true);
    return true;
  }

  if (action === "apply_live") {
    const validationError = validateConfiguration(session.draft);
    if (validationError) {
      await answerCallbackQuery(cq.id, `❌ Validation Failed: ${validationError}`, true);
      return true;
    }

    await DB_MANAGER.setSetting(env.DB, SAVED_DRAFT_KEY, session.draft);
    await DB_MANAGER.setSetting(env.DB, LIVE_KEY, session.draft);
    await answerCallbackQuery(cq.id, "✅ Live '/start' configuration updated!", true);
    await renderButtonBuilderHome(chatId, session, messageId);
    return true;
  }

  if (action === "cancel_confirm") {
    await editMessageText(
      chatId,
      messageId,
      `⚠️ <b>Discard Unsaved Session Changes?</b>\n\nThis will revert your session to the last Saved Draft or Live Configuration.`,
      {
        inline_keyboard: [
          [{ text: "✅ Yes, Discard Unsaved Changes", callback_data: "dmui:cancel_exec" }],
          [{ text: "🔙 No, Keep Editing", callback_data: "dmui:btn_home" }],
        ],
      }
    );
    return true;
  }

  if (action === "cancel_exec") {
    await DB_MANAGER.deleteSetting(env.DB, SESSION_KEY);
    await answerCallbackQuery(cq.id, "Unpublished session changes discarded.");
    await handleDMUICallback(env, { ...cq, data: "dmui:root" });
    return true;
  }

  return true;
}

// ==========================================
// 💬 TEXT INPUT INTERCEPTOR FOR WIZARD STEPS
// ==========================================
export async function handleDMUITextInput(ctx: BotContext): Promise<boolean> {
  if (!isOwner(ctx.userId)) return false;

  const session = await DB_MANAGER.getSetting<DMUISession>(ctx.env.DB, SESSION_KEY);
  if (!session || session.step === "IDLE") return false;

  const input = ctx.text.trim();

  if (session.step === "AWAIT_BTN_TEXT") {
    if (!session.tempButton) return false;
    session.tempButton.text = input.slice(0, 48);
    session.step = "IDLE";
    await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);

    await sendMessage(
      ctx.chatId,
      `📐 <b>ADD BUTTON — STEP 2A OF 5 (Button Layout)</b>\n\n` +
        `Button Text: <b>${session.tempButton.text}</b>\n` +
        `Choose the width arrangement for this button:`,
      {
        inline_keyboard: [
          [
            { text: "Half Width (2 per row)", callback_data: "dmui:wiz_layout:half" },
            { text: "Full Width (1 per row)", callback_data: "dmui:wiz_layout:full" },
          ],
          [{ text: "❌ Cancel", callback_data: "dmui:btn_home" }],
        ],
      }
    );
    return true;
  }

  if (session.step === "AWAIT_BTN_URL") {
    if (!/^https?:\/\/.+/i.test(input) && !/^tg:\/\/.+/i.test(input)) {
      await sendMessage(
        ctx.chatId,
        `❌ <b>Invalid Link:</b> Please provide a valid <code>https://...</code> or <code>https://t.me/...</code> URL.`
      );
      return true;
    }
    session.tempButton!.actionValue = input;
    session.step = "IDLE";
    await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);
    await renderWizardConfirmation(ctx.chatId, session);
    return true;
  }

  if (session.step === "AWAIT_BTN_CMD") {
    const normalized = input.startsWith("/") ? input.toLowerCase() : `/${input.toLowerCase()}`;
    if (!ALLOWED_COMMANDS.includes(normalized)) {
      await sendMessage(
        ctx.chatId,
        `❌ <b>Unsupported Command:</b> <code>${normalized}</code>\nAllowed commands: <code>${ALLOWED_COMMANDS.join(", ")}</code>`
      );
      return true;
    }
    session.tempButton!.actionValue = normalized;
    session.step = "IDLE";
    await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);
    await renderWizardConfirmation(ctx.chatId, session);
    return true;
  }

  if (session.step === "AWAIT_NEW_SUBMENU_FOR_BTN") {
    const subId = `sub_${Date.now().toString(36)}`;
    session.draft.menus[subId] = {
      id: subId,
      name: input.slice(0, 32),
      parentId: session.activeMenuId,
    };
    session.tempButton!.actionValue = subId;
    session.step = "IDLE";
    await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);
    await renderWizardConfirmation(ctx.chatId, session);
    return true;
  }

  if (session.step === "AWAIT_NEW_SUBMENU_STANDALONE") {
    const subId = `sub_${Date.now().toString(36)}`;
    session.draft.menus[subId] = {
      id: subId,
      name: input.slice(0, 32),
      parentId: session.activeMenuId,
    };
    session.activeMenuId = subId;
    session.step = "IDLE";
    await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);
    await renderButtonBuilderHome(ctx.chatId, session);
    return true;
  }

  if (session.step === "AWAIT_RENAME_SUBMENU" && session.targetMenuId) {
    if (session.draft.menus[session.targetMenuId]) {
      session.draft.menus[session.targetMenuId].name = input.slice(0, 32);
    }
    session.step = "IDLE";
    session.targetMenuId = undefined;
    await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);
    await renderButtonBuilderHome(ctx.chatId, session);
    return true;
  }

  if (session.step === "AWAIT_EDIT_BTN_TEXT" && session.editingButtonId) {
    const btn = session.draft.buttons.find((b) => b.id === session.editingButtonId);
    if (btn) {
      btn.text = input.slice(0, 48);
      session.step = "IDLE";
      await DB_MANAGER.setSetting(ctx.env.DB, SESSION_KEY, session);
      await renderSingleButtonEditor(ctx.chatId, session, btn);
      return true;
    }
  }

  return false;
}

// ==========================================
// 🔎 VALIDATION & WIZARD HELPERS
// ==========================================
function validateConfiguration(config: DMUIConfig): string | null {
  for (const btn of config.buttons) {
    if (!config.menus[btn.parentMenuId]) {
      return `Button "${btn.text}" belongs to missing menu "${btn.parentMenuId}".`;
    }
    if (btn.actionType === "submenu" && !config.menus[btn.actionValue]) {
      return `Button "${btn.text}" points to non-existent submenu "${btn.actionValue}".`;
    }
    if ((btn.actionType === "url" || btn.actionType === "join") && !/^https?:\/\/.+/i.test(btn.actionValue)) {
      return `Button "${btn.text}" has an invalid URL.`;
    }
    if (btn.actionType === "command" && !ALLOWED_COMMANDS.includes(btn.actionValue)) {
      return `Button "${btn.text}" uses unsupported command "${btn.actionValue}".`;
    }
  }
  return null;
}

async function renderWizardConfirmation(
  chatId: number,
  session: DMUISession,
  messageId?: number
): Promise<void> {
  const b = session.tempButton!;
  const parentName = session.draft.menus[b.parentMenuId || "root"]?.name || "Main Menu";

  const text =
    `✅ <b>STEP 5 OF 5 — CONFIRM BUTTON</b>\n\n` +
    `• <b>Text:</b> ${b.text}\n` +
    `• <b>Layout:</b> ${b.layout === "full" ? "Full Width" : "Half Width"} (Row ${(b.row ?? 0) + 1})\n` +
    `• <b>Action Type:</b> ${b.actionType?.toUpperCase()}\n` +
    `• <b>Destination:</b> <code>${b.actionValue}</code>\n` +
    `• <b>Parent Menu:</b> ${parentName}\n\n` +
    `Confirm adding this button to your draft?`;

  const kb = {
    inline_keyboard: [
      [{ text: "✅ Confirm", callback_data: "dmui:wiz_confirm" }],
      [
        { text: "✏️ Edit", callback_data: "dmui:add_btn" },
        { text: "❌ Cancel", callback_data: "dmui:btn_home" },
      ],
    ],
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, kb);
  }
}

async function renderSingleButtonEditor(
  chatId: number,
  session: DMUISession,
  btn: DMButton,
  messageId?: number
): Promise<void> {
  const text =
    `✏️ <b>EDITING BUTTON: ${btn.text}</b>\n\n` +
    `• <b>Menu:</b> ${session.draft.menus[btn.parentMenuId]?.name}\n` +
    `• <b>Position:</b> Row ${btn.row + 1}, Slot ${btn.position + 1}\n` +
    `• <b>Layout:</b> ${btn.layout === "full" ? "Full Width" : "Half Width"}\n` +
    `• <b>Action:</b> ${btn.actionType} → <code>${btn.actionValue}</code>`;

  const kb = {
    inline_keyboard: [
      [
        { text: "✏️ Edit Text", callback_data: "dmui:eb_text" },
        { text: "📐 Change Layout", callback_data: "dmui:eb_layout" },
      ],
      [
        { text: "↕️ Change Position", callback_data: "dmui:reorder_list" },
        { text: "⚡ Change Action", callback_data: "dmui:eb_act" },
      ],
      [
        { text: "🎯 Edit Destination", callback_data: "dmui:eb_dest" },
        { text: "📂 Move to Another Menu", callback_data: "dmui:eb_move_menu" },
      ],
      [
        { text: "🗑 Delete Button", callback_data: `dmui:del_btn:${btn.id}` },
        { text: "🔙 Back", callback_data: "dmui:edit_list" },
      ],
    ],
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, kb);
  } else {
    await sendMessage(chatId, text, kb);
  }
}

// ==========================================
// 🚀 LIVE RUNTIME EXECUTION FOR "/start" BUTTONS
// ==========================================
async function handleLiveStartButtonAction(env: CloudflareEnv, cq: any): Promise<void> {
  const data: string = cq.data;
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;

  const liveConfig =
    (await DB_MANAGER.getSetting<DMUIConfig>(env.DB, LIVE_KEY)) || getDefaultDMUIConfig();

  if (data.startsWith("dm_nav:")) {
    const targetMenuId = data.replace("dm_nav:", "");
    if (!liveConfig.menus[targetMenuId]) {
      await answerCallbackQuery(cq.id, "⚠️ Menu unavailable.", true);
      return;
    }
    const kb = compileMenuKeyboard(liveConfig, targetMenuId, false);
    await answerCallbackQuery(cq.id);
    await editMessageReplyMarkup(chatId, messageId, kb);
    return;
  }

  if (data.startsWith("dm_cust:")) {
    const act = data.replace("dm_cust:", "");
    if (act === "show_updates") {
      await answerCallbackQuery(cq.id, "📢 Updates will be posted here as new features launch!", true);
    } else if (act === "show_feedback") {
      await answerCallbackQuery(cq.id, "💬 Have suggestions or feedback? Send a message directly in this chat!", true);
    } else {
      await answerCallbackQuery(cq.id, "⚡ Action triggered!");
    }
  }
}
