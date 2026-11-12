import { TelegramUpdate, CloudflareEnv } from "./types";
import { handleMessage } from "./router";
import { CONFIG } from "./config";
import { BROADCAST_ENGINE } from "./modules/broadcastEngine";

let runtimeBotToken = "";

export function setRuntimeBotToken(token: string): void {
  if (token) runtimeBotToken = token;
}

function getBotToken(): string {
  return (
    runtimeBotToken ||
    (typeof process !== "undefined" ? process.env?.BOT_TOKEN || "" : "") ||
    CONFIG.BOT_TOKEN
  );
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, any>
): Promise<Response> {
  const payload: Record<string, any> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(`https://api.telegram.org/bot${getBotToken()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function editMessageReplyMarkup(
  chatId: number,
  messageId: number,
  replyMarkup?: Record<string, any>
): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${getBotToken()}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),
  });
}

export async function sendPhoto(
  chatId: number,
  photoFileId: string,
  caption?: string,
  replyMarkup?: Record<string, any>
): Promise<Response> {
  const payload: Record<string, any> = {
    chat_id: chatId,
    photo: photoFileId,
    parse_mode: "HTML",
  };
  if (caption) payload.caption = caption;
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(`https://api.telegram.org/bot${getBotToken()}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function sendVideo(
  chatId: number,
  videoFileId: string,
  caption?: string,
  replyMarkup?: Record<string, any>
): Promise<Response> {
  const payload: Record<string, any> = {
    chat_id: chatId,
    video: videoFileId,
    parse_mode: "HTML",
  };
  if (caption) payload.caption = caption;
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(`https://api.telegram.org/bot${getBotToken()}/sendVideo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, any>,
  replyToMessageId?: number
): Promise<Response> {
  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  if (replyToMessageId) {
    payload.reply_parameters = { message_id: replyToMessageId };
  }

  return fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${getBotToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

// Cloudflare Worker Entrypoint (Preserved for safe cutover & instant rollback)
export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    if (env.BOT_TOKEN) setRuntimeBotToken(env.BOT_TOKEN);

    if (request.method === "POST") {
      try {
        const update = (await request.json()) as TelegramUpdate;
        ctx.waitUntil(handleMessage(update, env));
        return new Response("OK", { status: 200 });
      } catch (err) {
        console.error("Webhook processing error:", err);
        return new Response("Error", { status: 500 });
      }
    }
    return new Response("Aloo Bot Worker Active", { status: 200 });
  },

  async scheduled(event: ScheduledEvent, env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    if (env.BOT_TOKEN) setRuntimeBotToken(env.BOT_TOKEN);
    ctx.waitUntil(BROADCAST_ENGINE.runContinuousWorker(env.DB, 25000));
  },
};
