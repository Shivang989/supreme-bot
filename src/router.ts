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
import {
  broadcastHandlers,
  handleBroadcastCallback,
  handleBroadcastMessageInput,
} from "./modules/broadcastWizard";
import {
  forceSubHandlers,
  handleForceSubCheck,
  handleJoinRequest,
} from "./modules/forceSub";
import { BROADCAST_REGISTRY } from "./modules/broadcastRegistry";
import { BROADCAST_ENGINE } from "./modules/broadcastEngine";
import { answerCallbackQuery } from "./index";

const commandRegistry: Record<string, CommandHandler> = {
  ...systemHandlers,
  ...helpHandlers,
  ...vaultHandlers,
  ...combatHandlers,
  ...adminHandlers,
  ...entertainmentHandlers,
  ...dmuiHandlers,
  ...broadcastHandlers,
  ...forceSubHandlers, // /add, /approved, /empty
};

export async function handleMessage(update: TelegramUpdate, env: CloudflareEnv): Promise<void> {
  // 1. Bot membership changes in groups and channels
  if ((update as any).my_chat_member) {
    await BROADCAST_REGISTRY.handleChatMemberUpdated(env.DB, update);
    return;
  }

  // 2. Track Join Requests for Force Join verification
  if ((update as any).chat_join_request) {
    await handleJoinRequest(update, env.DB);
    return;
  }

  // 3. Callback Queries from inline buttons
  if (update.callback_query) {
    const cq = update.callback_query;
    const data: string = cq.data || "";

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

    if (await handleBroadcastCallback(env, cq)) return;
    if (await handleDMUICallback(env, cq)) return;
  }

  const message = update.message;
  if (!message || !message.from) return;

  const chatId = message.chat.id;
  const userId = message.from.id;

  // 4. Registry tracking for broadcasts
  await BROADCAST_REGISTRY.trackDestination(env.DB, message.chat);
  if (message.chat.type === "private") {
    await BROADCAST_REGISTRY.trackUser(env.DB, message.from);
  } else {
    await BROADCAST_REGISTRY.trackGroupMember(env.DB, chatId, message.from);
  }

  // Ensure user exists in core database
  await DB_MANAGER.ensureUserExists(env.DB, userId);

  // 5. Welcome new members in groups
  const newMembers =
    message.new_chat_members ||
    ((message as any).new_chat_participant ? [(message as any).new_chat_participant] : []);
  if (newMembers.length > 0) {
    await handleWelcome(env, message, newMembers);
    return;
  }

  const ctx: BotContext = {
    env,
    update,
    message,
    chatId,
    userId,
    text: message.text || message.caption || "",
    command: "",
    args: [],
    reply: message.reply_to_message,
  };

  // 6. Force-Join Interceptor
  // Allow /add, /approved, and /empty to bypass check so authorized admins can configure rules
  const cleanText = (ctx.text || "").trim().toLowerCase();
  const isSetupCommand =
    cleanText.startsWith("/add") ||
    cleanText.startsWith("/approved") ||
    cleanText.startsWith("/empty");

  if (!isSetupCommand) {
    if (await handleForceSubCheck(ctx)) return;
  }

  // 7. Intercept owner inputs for broadcast content creation
  if (await handleBroadcastMessageInput(ctx)) return;

  // 8. Intercept media inputs for DMUI (Photos, Videos, GIFs, and Animation documents)
  const rawMsg = message as any;
  const isGifDocument =
    rawMsg.document &&
    (rawMsg.document.mime_type === "image/gif" ||
      (rawMsg.document.file_name && rawMsg.document.file_name.toLowerCase().endsWith(".gif")));

  if (rawMsg.photo || rawMsg.video || rawMsg.animation || isGifDocument) {
    if (await handleDMUIMediaInput(ctx)) return;
  }

  const rawText = message.text?.trim();
  if (!rawText) return;

  // 9. Intercept DMUI text setup
  if (await handleDMUITextInput(ctx)) return;

  // 10. Command Dispatcher
  if (rawText.startsWith("/")) {
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

  // 11. Run background broadcast queue processing
  await BROADCAST_ENGINE.runContinuousWorker(env.DB, 8000);
}
