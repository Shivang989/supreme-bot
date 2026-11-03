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
};

export async function handleMessage(update: TelegramUpdate, env: CloudflareEnv): Promise<void> {
  // 1. Handle bot membership updates (promotions, kicks, channel additions)
  if ((update as any).my_chat_member) {
    await BROADCAST_REGISTRY.handleChatMemberUpdated(env.DB, update);
    return;
  }

  // 2. Handle Inline Button Callbacks
  if (update.callback_query) {
    const cq = update.callback_query;
    const data: string = cq.data || "";

    // Execute bot commands triggered by custom buttons
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

    // Check Broadcast Wizard callbacks
    if (await handleBroadcastCallback(env, cq)) return;

    // Check DMUI callbacks
    if (await handleDMUICallback(env, cq)) return;
  }

  // 3. Handle Chat Member Updates (Supergroup direct additions)
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

  // Track chat and user destinations in the broadcast registry
  await BROADCAST_REGISTRY.trackDestination(env.DB, message.chat);
  if (message.chat.type === "private") {
    await BROADCAST_REGISTRY.trackUser(env.DB, message.from);
  } else {
    await BROADCAST_REGISTRY.trackGroupMember(env.DB, chatId, message.from);
  }

  await DB_MANAGER.ensureUserExists(env.DB, userId);

  // 4. Handle Service Message joins and member additions
  const newMembers =
    message.new_chat_members ||
    ((message as any).new_chat_participant ? [(message as any).new_chat_participant] : []);
  if (newMembers.length > 0) {
    await handleWelcome(env, message, newMembers);
    return;
  }

  // Construct standard BotContext
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

  // 5. Intercept Owner inputs for wizards (Broadcast & DMUI)
  if (await handleBroadcastMessageInput(ctx)) return;

  if (message.photo || message.video) {
    if (await handleDMUIMediaInput(ctx)) return;
  }

  const rawText = message.text?.trim();
  if (!rawText) return;

  if (await handleDMUITextInput(ctx)) return;

  // 6. Standard Command Execution
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

  // 7. Advance active broadcast queues in background
  await BROADCAST_ENGINE.processBatch(env.DB, 15);
}
