import { BotContext, CommandHandler, TelegramUpdate, CloudflareEnv } from "./types";
import { DB_MANAGER } from "./db";
import { handleWelcome } from "./modules/system";
import { adminHandlers } from "./modules/admin";
import { vaultHandlers } from "./modules/vault";
import { combatHandlers } from "./modules/combat";
import { entertainmentHandlers } from "./modules/entertainment";
import { systemHandlers } from "./modules/system";
import { helpHandlers } from "./modules/help";

const commandRegistry: Record<string, CommandHandler> = {
  ...systemHandlers,
  ...helpHandlers,
  ...vaultHandlers,
  ...combatHandlers,
  ...adminHandlers,
  ...entertainmentHandlers,
};


export async function handleMessage(update: TelegramUpdate, env: CloudflareEnv): Promise<void> {
  const message = update.message;
  if (!message || !message.from) return;

  const chatId = message.chat.id;
  const userId = message.from.id;

  // 1. Ensure user is tracked in D1
  await DB_MANAGER.ensureUserExists(env.DB, userId);

  // 2. Intercept join events before parsing commands
  if (message.new_chat_members && message.new_chat_members.length > 0) {
    await handleWelcome(env, message);
    return;
  }

  const rawText = message.text?.trim();
  if (!rawText || !rawText.startsWith("/")) return;

  // 3. Command normalization (handles /cmd@botname formats)
  const parts = rawText.split(/\s+/);
  const command = parts[0].toLowerCase().split("@")[0];
  const args = parts.slice(1);

  const ctx: BotContext = {
    env,
    update,
    message,
    chatId,
    userId,
    text: rawText,
    command,
    args,
    reply: message.reply_to_message,
  };

  // 4. Execution Pipeline
  const handler = commandRegistry[command];
  if (handler) {
    try {
      await handler(ctx);
    } catch (error) {
      console.error(`Execution failure in command ${command}:`, error);
    }
  }
}
