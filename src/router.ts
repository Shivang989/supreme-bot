import { BotContext, CommandHandler, TelegramUpdate, CloudflareEnv } from "./types";
import { DB_MANAGER } from "./db";
import { handleWelcome } from "./modules/system";
import { adminHandlers } from "./modules/admin";
import { vaultHandlers } from "./modules/vault";
import { combatHandlers } from "./modules/combat";
import { entertainmentHandlers } from "./modules/entertainment";
import { systemHandlers } from "./modules/system";
import { helpHandlers } from "./modules/help";
import { answerCallbackQuery } from "./index";

const commandRegistry: Record<string, CommandHandler> = {
  ...systemHandlers,
  ...helpHandlers,
  ...vaultHandlers,
  ...combatHandlers,
  ...adminHandlers,
  ...entertainmentHandlers,
};

export async function handleMessage(update: TelegramUpdate, env: CloudflareEnv): Promise<void> {
  // 1. Handle Inline Button Callbacks (Help, Updates, Feedback)
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data;
    const chatId = cq.message?.chat?.id;
    const userId = cq.from?.id;

    if (!chatId || !userId) return;

    if (data === "help") {
      await answerCallbackQuery(cq.id);
      const ctx: BotContext = {
        env,
        update,
        message: cq.message,
        chatId,
        userId,
        text: "/help",
        command: "/help",
        args: [],
      };
      await helpHandlers["/help"](ctx);
      return;
    }

    if (data === "updates") {
      await answerCallbackQuery(cq.id, "📢 Updates will be posted here as new features launch!", true);
      return;
    }

    if (data === "feedback") {
      await answerCallbackQuery(cq.id, "💬 Have suggestions or feedback? Send a message directly in this chat!", true);
      return;
    }
  }

  // 2. Handle Chat Member Updates (Supergroup direct additions)
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

  // 3. Ensure user exists in database
  await DB_MANAGER.ensureUserExists(env.DB, userId);

  // 4. Handle Service Message joins and member additions
  const newMembers = message.new_chat_members || ((message as any).new_chat_participant ? [(message as any).new_chat_participant] : []);
  if (newMembers.length > 0) {
    await handleWelcome(env, message, newMembers);
    return;
  }

  const rawText = message.text?.trim();
  if (!rawText || !rawText.startsWith("/")) return;

  // 5. Command Parsing and Routing
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

  const handler = commandRegistry[command];
  if (handler) {
    try {
      await handler(ctx);
    } catch (error) {
      console.error(`Command execution failure on ${command}:`, error);
    }
  }
}
