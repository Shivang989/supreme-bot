// ╭━━━━━━━━━━━━━━━✪
// │ 🧠 THE MANAGER (INDEX / ROUTER)
// ╰━━━━━━━━━━━━━━━✪
import { GAME } from './game';
import { CONFIG } from './config';
import { DB_MANAGER } from './db'; // <--- FIXED: Static Import (No more silent crashes)
import { CloudflareEnv } from './types';

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();
        const startTime = Date.now();

        // Safe Database Initialization
        await DB_MANAGER.initSettings(env.DB);

        // 🛡️ FOOLPROOF SEND MESSAGE (Handles both New and Old commands perfectly)
        const sendMessage = async (arg1: any, arg2?: any, arg3?: any) => {
          const isOldFormat = typeof arg1 === "string";
          const targetChatId = isOldFormat ? (update.message?.chat.id || update.callback_query?.message.chat.id) : arg1;
          const text = isOldFormat ? arg1 : arg2;
          const markup = isOldFormat ? arg2 : arg3;

          const payload: any = { chat_id: targetChatId, text: text, parse_mode: "HTML" };
          if (markup) payload.reply_markup = markup;
          
          return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
        };

        const editMessageText = async (chatId: number, messageId: number, text: string, reply_markup?: any) => {
          const payload: any = { chat_id: chatId, message_id: messageId, text: text, parse_mode: "HTML" };
          if (reply_markup) payload.reply_markup = reply_markup;
          return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/editMessageText`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
        };

        const answerCallbackQuery = async (callbackQueryId: string, text: string = "", showAlert: boolean = false) => {
          return fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
          });
        };

        // ROUTE 1: BUTTON CLICKS
        if (update.callback_query) {
          ctx.waitUntil(GAME.processCallback(update.callback_query, env, editMessageText, answerCallbackQuery));
          return new Response("OK", { status: 200 });
        }

        // ROUTE 2: THE FLAWLESS WELCOME TRIGGER (chat_member)
        if (update.chat_member) {
          const oldStatus = update.chat_member.old_chat_member?.status;
          const newStatus = update.chat_member.new_chat_member?.status;
          if ((oldStatus === "left" || oldStatus === "kicked") && (newStatus === "member" || newStatus === "restricted")) {
            ctx.waitUntil(GAME.processWelcomeFlawless(update.chat_member, env));
          }
          return new Response("OK", { status: 200 });
        }

        // ROUTE 3: NORMAL MESSAGES
        if (update.message) {
          ctx.waitUntil(GAME.processCommand(update, env, sendMessage, startTime));
        }
        
        return new Response("OK", { status: 200 });

      } catch (error) { 
        console.error("Critical Router Error:", error);
        return new Response("OK", { status: 200 }); 
      }
    }
    return new Response("🚀 Supreme Engine UI is ONLINE!", { status: 200 });
  }
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
