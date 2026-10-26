import { TelegramUpdate, CloudflareEnv } from "./types";
import { handleMessage } from "./router";
import { CONFIG } from "./config";

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

  return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/editMessageText`, {
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
  return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/editMessageReplyMarkup`, {
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

  return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendPhoto`, {
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

  return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendVideo`, {
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

  return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
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
  return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update = (await request.json()) as TelegramUpdate;
        await handleMessage(update, env);
      } catch (err) {
        console.error("Router intake error:", err);
      }
      return new Response("OK", { status: 200 });
    }
    return new Response("🚀 Supreme Engine is ONLINE!", { status: 200 });
  },
};

// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
