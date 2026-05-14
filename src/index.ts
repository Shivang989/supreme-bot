// ╭━━━━━━━━━━━━━━━✪
// │ 🧠 THE MANAGER (INDEX / ROUTER)
// ╰━━━━━━━━━━━━━━━✪
import { GAME } from './game';
import { CONFIG } from './config';
import { CloudflareEnv } from './types';

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();
        const startTime = Date.now();

        // Ensure new DB tables exist
        await import('./db').then(m => m.DB_MANAGER.initSettings(env.DB));

        // UTILITY: Send Message
        const sendMessage = async (chatId: number, msg: string, reply_markup?: any) => {
          const payload: any = { chat_id: chatId, text: msg, parse_mode: "HTML" };
          if (reply_markup) payload.reply_markup = reply_markup;
          return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
        };

        // UTILITY: Edit Button Message
        const editMessageText = async (chatId: number, messageId: number, text: string, reply_markup?: any) => {
          const payload: any = { chat_id: chatId, message_id: messageId, text: text, parse_mode: "HTML" };
          if (reply_markup) payload.reply_markup = reply_markup;
          return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/editMessageText`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
        };

        // UTILITY: Stop Button Loading Spinner
        const answerCallbackQuery = async (callbackQueryId: string, text: string = "", showAlert: boolean = false) => {
          return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
          });
        };

        // ROUTE 1: BUTTON CLICKS (CALLBACKS)
        if (update.callback_query) {
          ctx.waitUntil(GAME.processCallback(update.callback_query, env, editMessageText, answerCallbackQuery));
          return new Response("OK", { status: 200 });
        }

        // ROUTE 2: NORMAL MESSAGES & MEDIA
        if (update.message) {
          // Pass the entire update to GAME so it can intercept text OR media
          ctx.waitUntil(GAME.processCommand(update, env, sendMessage, startTime));
        }
        
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Critical Router Error:", error);
        return new Response("OK", { status: 200 }); // Always return OK to Telegram so it doesn't retry
      }
    }
    return new Response("🚀 Supreme Engine UI is ONLINE!", { status: 200 });
  }
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
