import { calculateMarketPrice, simulateMarket } from './engine';

export interface Env {
  DB: D1Database;
}

// Black Market Inventory Data
const MARKET_ITEMS: Record<string, { base: number, vol: number, emoji: string }> = {
    "cheap_watch": { base: 100, vol: 0.3, emoji: "⌚" },
    "stolen_phone": { base: 500, vol: 0.4, emoji: "📱" },
    "gold_chain": { base: 1000, vol: 0.5, emoji: "⛓️" },
    "crypto_wallet": { base: 5000, vol: 0.8, emoji: "💻" },
    "classified_documents": { base: 10000, vol: 0.9, emoji: "📁" }
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text: string = update.message.text.trim();
          const args = text.split(" ").slice(1); // /invest 5000 me se 5000 nikalne ke liye
          const firstName = update.message.from.first_name || "Agent";
          const botToken = "8322009620:AAG7rLte-1Q8-CjKiJqxEppPwjsVFJyvc6U"; // Tumhara Token

          const sendMessage = async (msg: string) => {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" })
            });
          };

          // Auto-Save User to DB on any command
          await env.DB.prepare(
            "INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)"
          ).bind(chatId).run();

          // 🚀 COMMAND: /start
          if (text === "/start") {
            await sendMessage(`👑 Welcome to the Underworld, ${firstName}!\n\nTumhara account Cloud Vault (D1) mein safely create ho gaya hai.`);
          }
          
          // 💳 COMMAND: /profile
          else if (text.startsWith("/profile") || text.startsWith("/me")) {
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
            }
          }

          // 🏪 COMMAND: /market (Live Prices)
          else if (text.startsWith("/market")) {
            const currentTime = Math.floor(Date.now() / 1000); // Current Time in seconds
            let marketText = `╭━━━━━━━━━━━━━━━✪\n│ 📈 <b>𝐔𝐍𝐃𝐄𝐑𝐖𝐎𝐑𝐋𝐃 𝐌𝐀𝐑𝐊𝐄𝐓</b>\n╰━━━━━━━━━━━━━━━✪\n\n`;
            
            for (const [item, data] of Object.entries(MARKET_ITEMS)) {
                // Engine se instant calculation
                const currentPrice = calculateMarketPrice(data.base, data.vol, currentTime);
                const nameDisplay = item.replace("_", " ").toUpperCase();
                marketText += `╭━⟮ ✦ ${data.emoji} ${nameDisplay} ✦ ⟯\n│ 💰 𝐂𝐔𝐑𝐑𝐄𝐍𝐓 𝐏𝐑𝐈𝐂𝐄: ₹${currentPrice}\n╰━━━━━━━━━━━━━━━✪\n`;
            }
            marketText += `\n💡 <i>Prices fluctuate based on the Supreme Engine!</i>`;
            await sendMessage(marketText);
          }

          // 📈 COMMAND: /invest (High-Frequency Trading)
          else if (text.startsWith("/invest")) {
            if (args.length === 0) {
              await sendMessage("❌ <b>Usage:</b> <code>/invest [amount]</code>\nExample: <code>/invest 500</code>");
              return new Response("OK", { status: 200 });
            }
            
            const investment = parseInt(args[0]);
            if (isNaN(investment) || investment <= 0) {
              await sendMessage("❌ Sahi amount daal bhai. Numbers only.");
              return new Response("OK", { status: 200 });
            }

            // DB se balance check karo
            const { results } = await env.DB.prepare("SELECT balance FROM users WHERE user_id = ?").bind(chatId).all();
            const currentBalance = (results[0] as any).balance;

            if (currentBalance < investment) {
              await sendMessage(`❌ You don't have enough funds. Your balance is ₹${currentBalance}.`);
              return new Response("OK", { status: 200 });
            }

            // ⚡ CALL THE ENGINE (Math execution in 0.001ms)
            const result = simulateMarket(investment);
            const netChange = result.payout - investment;
            const newBalance = currentBalance + netChange;

            // Update nayi DB value
            await env.DB.prepare("UPDATE users SET balance = ? WHERE user_id = ?").bind(newBalance, chatId).run();

            // Result Generate karo
            let investText = `╭━━━━━━━━━━━━━━━✪\n│ 📊 <b>T R A D I N G   T E R M I N A L</b>\n╰━━━━━━━━━━━━━━━✪\n\n`;
            investText += `💼 <b>Investment:</b> ₹${investment}\n📡 <b>Executing Algorithm...</b>\n\n`;
            investText += `╭━⟮ ${result.emoji} <b>${result.event}</b> ⟯\n│ ✖️ <b>Multiplier:</b> ${result.multiplier}x\n`;
            
            if (netChange > 0) investText += `│ 🟢 <b>Profit:</b> +₹${netChange}\n`;
            else if (netChange < 0) investText += `│ 🔴 <b>Loss:</b> -₹${Math.abs(netChange)}\n`;
            else investText += `│ ⚪ <b>Broke Even:</b> ₹0\n`;
            
            investText += `│ 🏦 <b>New Balance:</b> ₹${newBalance}\n╰━━━━━━━━━━━━━━━✪`;
            
            await sendMessage(investText);
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
