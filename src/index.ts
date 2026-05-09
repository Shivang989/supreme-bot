// ╭━━━━━━━━━━━━━━━✪
// │ 🧠 THE MANAGER (INDEX / ROUTER)
// ╰━━━━━━━━━━━━━━━✪
// Ye humare bot ka main darwaza hai. Telegram ka har message yahan aayega,
// aur ye Manager us message ko padh kar 'game.ts' (Arena) mein bhej dega.

import { GAME } from './game';
import { CONFIG } from './config';
import { CloudflareEnv } from './types';

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();

        // Agar message aur text exist karta hai tabhi aage badho
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text: string = update.message.text.trim();

          // ✉️ Telegram ko reply bhejne ka engine
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

          // ⚡ CLOUDFLARE MAGIC: ctx.waitUntil()
          // Ye command script ko background mein chala degi bina response ko block kiye.
          // Isse bot ki speed 10x fast ho jayegi!
          ctx.waitUntil(GAME.processCommand(text, update, env, sendMessage));
        }
        
        // Telegram ko instantly OK bhej do (0.001ms) taaki webhook hang na ho
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Critical Router Error:", error);
        return new Response("Error processing request", { status: 500 });
      }
    }

    // Agar koi browser mein link kholega toh ye dikhega
    return new Response("🚀 Supreme Engine is ONLINE and 100% Modular!", { status: 200 });
  },
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
