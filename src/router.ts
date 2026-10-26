import { BotContext, CommandHandler, TelegramUpdate, CloudflareEnv } from "./types";
import { DB_MANAGER } from "./db";
import { handleWelcome, systemHandlers } from "./modules/system";
import { adminHandlers } from "./modules/admin";
import { vaultHandlers } from "./modules/vault";
import { combatHandlers } from "./modules/combat";
import { entertainmentHandlers } from "./modules/entertainment";
import { helpHandlers } from "./modules/help";
import {
  dmuiHandlers,
  handleDMUICallback,
  handleDMUITextInput,
  handleDMUIMediaInput,
} from "./modules/dmui";
import { answerCallbackQuery } from "./index";

const commandRegistry: Record<string, CommandHandler> = {
  ...systemHandlers,
  ...helpHandlers,
  ...vaultHandlers,
  ...combatHandlers,
  ...adminHandlers,
  ...entertainmentHandlers,
  ...dmuiHandlers,
};

export async function handleMessage(update: TelegramUpdate, env: CloudflareEnv): Promise<void> {
  // 1. Inline Button Callbacks
  if (update.callback_query) {
    const cq = update.callback_query;
    const data: string = cq.data || "";

    // Command runner button
    if (data.startsWith("dm_cmd:")) {
      const cmd = data.replace("dm_cmd:", "");
      const handler = commandRegistry[cmd];
      await answerCallbackQuery(cq.id);
      if (handler && cq.message && cq.from) {
        const ctx: BotContext = {
          env,
          update,
          message: { ...cq.message, from: cq.from },
          chatId: cq.message.chat.id,
          userId: cq.from.id,
          text: cmd,
          command: cmd,
          args: [],
        };
        await handler(ctx);
      }
      return;
    }

    // DMUI Builder Callbacks
    const handled = await handleDMUICallback(env, cq);
    if (handled) return;
  }

  // 2. Chat Member Additions
  if (update.chat_member) {
    const cm = update.chat_member;
    const oldStatus = cm.old_chat_member?.status;
    const newStatus = cm.new_chat_member?.status;

    if (
      (newStatus === "member" || newStatus === "administrator") &&
      oldStatus !== "member" &&
      oldStatus !== "administrator"
    ) {
      const user = cm.new_chat_member?.user;
      if (user && !user.is_bot) {
        await handleWelcome(env, { chat: cm.chat } as any, [user]);
      }
    }
    return;
  }

  const message = update.message;
  if (!message || !message.from) return;

  const chatId = message.chat.id;
  const userId = message.from.id;

  await DB_MANAGER.ensureUserExists(env.DB, userId);

  // 3. Group Joins
  const newMembers =
    message.new_chat_members ||
    ((message as any).new_chat_participant ? [(message as any).new_chat_participant] : []);
  if (newMembers.length > 0) {
    await handleWelcome(env, message, newMembers);
    return;
  }

  // 4. Capture Photo / Video for /dmui Media Setup
  if (message.photo || message.video) {
    const ctx: BotContext = {
      env,
      update,
      message,
      chatId,
      userId,
      text: message.caption || "",
      command: "",
      args: [],
    };
    const handledMedia = await handleDMUIMediaInput(ctx);
    if (handledMedia) return;
  }

  const rawText = message.text?.trim();
  if (!rawText) return;

  // 5. Intercept Owner Text for /dmui
  const ctx: BotContext = {
    env,
    update,
    message,
    chatId,
    userId,
    text: rawText,
    command: "",
    args: [],
    reply: message.reply_to_message,
  };

  if (!rawText.startsWith("/")) {
    const handledInput = await handleDMUITextInput(ctx);
    if (handledInput) return;
  } else if (rawText === "/empty" || rawText === "/default") {
    const handledInput = await handleDMUITextInput(ctx);
    if (handledInput) return;
  }

  // 6. Standard Command Execution
  const parts = rawText.split(/\s+/);
  const command = parts[0].toLowerCase().split("@")[0];
  const args = parts.slice(1);

  ctx.command = command;
  ctx.args = args;

  const handler = commandRegistry[command];
  if (handler) {
    try {
      await handler(ctx);
    } catch (error) {
      console.error(`Command execution failure on ${command}:`, error);
    }
  }
}
