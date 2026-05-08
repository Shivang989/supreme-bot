export interface Env {
  // Ye bot ko batata hai ki DB kahan hai
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();
        
        // Agar kisi ne message bheja hai
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          const firstName = update.message.from.first_name || "Agent";

          // Agar user ne /start bheja
          if (text === "/start") {
            
            // 1. User ko D1 Database mein save karo (Agar pehle se nahi hai)
            await env.DB.prepare(
              "INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)"
            ).bind(chatId).run();

            // 2. Telegram ko wapas reply bhejo
            const botToken = "8322009620:AAG7rLte-1Q8-CjKiJqxEppPwjsVFJyvc6U"; // Tumhara Token
            const replyText = `👑 Welcome to the Underworld, ${firstName}!\n\nTumhara account Cloud Vault (D1) mein safely create ho gaya hai. Tumhara balance ₹1,000 hai.`;
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: replyText
              })
            });
          }
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
