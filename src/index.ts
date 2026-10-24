import { TelegramUpdate, CloudflareEnv } from "./types";
import { handleMessage } from "./router";
import { CONFIG } from "./config";

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
