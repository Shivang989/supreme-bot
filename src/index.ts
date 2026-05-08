export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();
          const firstName = update.message.from.first_name || "Agent";
          const botToken = "8322009620:AAG7rLte-1Q8-CjKiJqxEppPwjsVFJyvc6U"; // Tumhara Token

          // ✉️ Message bhejne ka shortcut function
          const sendMessage = async (msg: string) => {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" })
            });
          };

          // 🚀 COMMAND: /start
          if (text === "/start") {
            await env.DB.prepare(
              "INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)"
            ).bind(chatId).run();
            await sendMessage(`👑 Welcome to the Underworld, ${firstName}!\n\nTumhara account Cloud Vault (D1) mein safely create ho gaya hai.`);
          }
          
          // 💳 COMMAND: /profile
          else if (text.startsWith("/profile") || text.startsWith("/me")) {
            // Database se user ka data nikalo
            const { results } = await env.DB.prepare("SELECT * FROM users WHERE user_id = ?").bind(chatId).all();
            
            if (results && results.length > 0) {
              const user: any = results[0];
              const status = user.is_alive === 1 ? "🟢 Alive" : "💀 Dead";
              
              const profileText = 
`╭━━━━━━━━━━━━━━━✪
│ 💳 <b>U N D E R W O R L D   I D</b>
╰━━━━━━━━━━━━━━━✪

👤 <b>Name:</b> ${firstName}
🆔 <b>Citizen ID:</b> <code>${chatId}</code>
💰 <b>Net Worth:</b> ₹${user.balance}
🔪 <b>Total Kills:</b> ${user.kills}
❤️ <b>Status:</b> ${status}

╰━━━━━━━━━━━━━━━✪`;
              await sendMessage(profileText);
            } else {
              await sendMessage("❌ Tumhara account nahi mila. Pehle /start dabao.");
            }
          }

          // Yahan hum aage /rob, /kill add karenge...
        }
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error:", error);
        return new Response("Error processing request", { status: 500 });
      }
    }

    return new Response("🚀 Supreme Engine is ONLINE!", { status: 200 });
  },
};
