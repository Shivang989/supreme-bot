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

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text: string = update.message.text.trim();
          
          // STEP 1: Pehle time record karo
          const startTime = Date.now();

          // STEP 2: Phir sendMessage tool (function) banao
          const sendMessage = async (msg: string) => {
            await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                chat_id: chatId, 
                text: msg, 
                parse_mode: "HTML" 
              })
            });
          };

          // STEP 3: Sabse end mein Engine ko call karo, jab sab ready ho
          ctx.waitUntil(GAME.processCommand(text, update, env, sendMessage, startTime));
        }
        
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Critical Router Error:", error);
        return new Response("Error processing request", { status: 500 });
      }
    }

    return new Response("🚀 Supreme Engine is ONLINE and 100% Modular!", { status: 200 });
  },
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
