import { calculateMarketPrice, simulateMarket } from './engine';

export interface Env {
  DB: D1Database;
}

const MARKET_ITEMS: Record<string, { base: number, vol: number, emoji: string }> = {
    "cheap_watch": { base: 100, vol: 0.3, emoji: "⌚" },
    "stolen_phone": { base: 500, vol: 0.4, emoji: "📱" },
    "gold_chain": { base: 1000, vol: 0.5, emoji: "⛓️" },
    "crypto_wallet": { base: 5000, vol: 0.8, emoji: "💻" },
    "classified_documents": { base: 10000, vol: 0.9, emoji: "📁" }
};

const STANDARD_DROPS = ["cheap_watch", "stolen_phone", "gold_chain"];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      try {
        const update: any = await request.json();
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text: string = update.message.text.trim();
          const args = text.split(" ").slice(1);
          const userId = update.message.from.id;
          const firstName = update.message.from.first_name || "Agent";
          const botToken = "8322009620:AAG7rLte-1Q8-CjKiJqxEppPwjsVFJyvc6U"; // Tumhara Token

          const sendMessage = async (msg: string) => {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" })
            });
          };

          // 1. Ensure user exists in DB
          await env.DB.prepare("INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)").bind(userId).run();

          // 🚀 COMMAND: /start
          if (text === "/start") {
            await sendMessage(`👑 Welcome to the Underworld, ${firstName}!\n\nTumhara account Cloud Vault (D1) mein safely create ho gaya hai.`);
          }
          
          // 💳 COMMAND: /profile
          else if (text.startsWith("/profile") || text.startsWith("/me")) {
            const { results } = await env.DB.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).all();
            if (results && results.length > 0) {
              const user: any = results[0];
              const status = user.is_alive === 1 ? "🟢 Alive" : "💀 Dead";
              const profileText = `╭━━━━━━━━━━━━━━━✪\n│ 💳 <b>U N D E R W O R L D   I D</b>\n╰━━━━━━━━━━━━━━━✪\n\n👤 <b>Name:</b> ${firstName}\n🆔 <b>Citizen ID:</b> <code>${userId}</code>\n💰 <b>Net Worth:</b> ₹${user.balance}\n🔪 <b>Total Kills:</b> ${user.kills}\n❤️ <b>Status:</b> ${status}\n\n╰━━━━━━━━━━━━━━━✪`;
              await sendMessage(profileText);
            }
          }

          // 🏪 COMMAND: /market
          else if (text.startsWith("/market")) {
            const currentTime = Math.floor(Date.now() / 1000);
            let marketText = `╭━━━━━━━━━━━━━━━✪\n│ 📈 <b>𝐔𝐍𝐃𝐄𝐑𝐖𝐎𝐑𝐋𝐃 𝐌𝐀𝐑𝐊𝐄𝐓</b>\n╰━━━━━━━━━━━━━━━✪\n\n`;
            for (const [item, data] of Object.entries(MARKET_ITEMS)) {
                const currentPrice = calculateMarketPrice(data.base, data.vol, currentTime);
                const nameDisplay = item.replace("_", " ").toUpperCase();
                marketText += `╭━⟮ ✦ ${data.emoji} ${nameDisplay} ✦ ⟯\n│ 💰 𝐂𝐔𝐑𝐑𝐄𝐍𝐓 𝐏𝐑𝐈𝐂𝐄: ₹${currentPrice}\n╰━━━━━━━━━━━━━━━✪\n`;
            }
            marketText += `\n💡 <i>Prices fluctuate based on the Supreme Engine!</i>`;
            await sendMessage(marketText);
          }

          // 📈 COMMAND: /invest
          else if (text.startsWith("/invest")) {
            if (args.length === 0) return await sendMessage("❌ <b>Usage:</b> <code>/invest [amount]</code>"), new Response("OK", { status: 200 });
            const investment = parseInt(args[0]);
            if (isNaN(investment) || investment <= 0) return await sendMessage("❌ Sahi amount daal bhai."), new Response("OK", { status: 200 });

            const { results } = await env.DB.prepare("SELECT balance FROM users WHERE user_id = ?").bind(userId).all();
            const currentBalance = (results[0] as any).balance;

            if (currentBalance < investment) return await sendMessage(`❌ You don't have enough funds. Your balance is ₹${currentBalance}.`), new Response("OK", { status: 200 });

            const result = simulateMarket(investment);
            const netChange = result.payout - investment;
            const newBalance = currentBalance + netChange;

            await env.DB.prepare("UPDATE users SET balance = ? WHERE user_id = ?").bind(newBalance, userId).run();

            let investText = `╭━━━━━━━━━━━━━━━✪\n│ 📊 <b>T R A D I N G   T E R M I N A L</b>\n╰━━━━━━━━━━━━━━━✪\n\n💼 <b>Investment:</b> ₹${investment}\n📡 <b>Executing Algorithm...</b>\n\n╭━⟮ ${result.emoji} <b>${result.event}</b> ⟯\n│ ✖️ <b>Multiplier:</b> ${result.multiplier}x\n`;
            if (netChange > 0) investText += `│ 🟢 <b>Profit:</b> +₹${netChange}\n`;
            else if (netChange < 0) investText += `│ 🔴 <b>Loss:</b> -₹${Math.abs(netChange)}\n`;
            else investText += `│ ⚪ <b>Broke Even:</b> ₹0\n`;
            investText += `│ 🏦 <b>New Balance:</b> ₹${newBalance}\n╰━━━━━━━━━━━━━━━✪`;
            await sendMessage(investText);
          }

          // 🔪 COMMAND: /kill
          else if (text.startsWith("/kill") || text.startsWith("/k ")) {
            if (!update.message.reply_to_message) {
              await sendMessage("❌ Kisko tapkana hai? Reply to a player.");
              return new Response("OK", { status: 200 });
            }

            const targetId = update.message.reply_to_message.from.id;
            const targetName = update.message.reply_to_message.from.first_name;

            if (userId === targetId) return await sendMessage("❌ Khud ko kyu maar raha hai bhai?"), new Response("OK", { status: 200 });
            if (update.message.reply_to_message.from.is_bot) return await sendMessage("❌ Bot pe goli nahi chalti."), new Response("OK", { status: 200 });

            // Ensure target exists in DB
            await env.DB.prepare("INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)").bind(targetId).run();

            const { results: callerResults } = await env.DB.prepare("SELECT is_alive FROM users WHERE user_id = ?").bind(userId).all();
            if ((callerResults[0] as any).is_alive === 0) return await sendMessage("👻 Tu pehle hi mar chuka hai! Use /revive first."), new Response("OK", { status: 200 });

            // The 50/50 RNG Math
            const roll = Math.floor(Math.random() * 100) + 1;

            if (roll <= 50) { // Success
              // Target Dies, Killer gets +1 Kill
              await env.DB.prepare("UPDATE users SET is_alive = 0 WHERE user_id = ?").bind(targetId).run();
              await env.DB.prepare("UPDATE users SET kills = kills + 1 WHERE user_id = ?").bind(userId).run();

              // Loot Item
              const dropItem = STANDARD_DROPS[Math.floor(Math.random() * STANDARD_DROPS.length)];
              await env.DB.prepare(`
                INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)
                ON CONFLICT(user_id, item_name) DO UPDATE SET quantity = quantity + 1
              `).bind(userId, dropItem).run();

              await sendMessage(`🔪 <b>BRUTAL MURDER!</b>\n<b>${firstName}</b> eliminated <b>${targetName}</b> in cold blood!\n🎒 Searched the body and found a <b>[📦 ${dropItem.replace('_', ' ').toUpperCase()}]</b>!`);
            } else { // Miss
              await sendMessage(`💨 <b>WEAPON JAMMED!</b>\n<b>${firstName}</b> aimed at <b>${targetName}</b> but missed the shot!\n🏃 The target escaped unharmed.`);
            }
          }

          // 🎒 COMMAND: /inv
          else if (text.startsWith("/inv")) {
            const { results } = await env.DB.prepare("SELECT item_name, quantity FROM inventory WHERE user_id = ? AND quantity > 0").bind(userId).all();
            
            let invText = `╭━━━━━━━━━━━━━━━✪\n│ 🎒 <b>${firstName.toUpperCase()}'𝐒 𝐕𝐀𝐔𝐋𝐓</b>\n╰━━━━━━━━━━━━━━━✪\n\n`;
            
            if (!results || results.length === 0) {
              invText += "❌ <i>Vault is empty. Kill someone to get loot.</i>";
            } else {
              for (const row of results as any[]) {
                const emoji = MARKET_ITEMS[row.item_name]?.emoji || "📦";
                const nameDisplay = row.item_name.replace("_", " ").toUpperCase();
                invText += `╭━⟮ ✦ ${emoji} ${nameDisplay} ✦ ⟯\n│ 📦 𝐐𝐔𝐀𝐍𝐓𝐈𝐓𝐘: ${row.quantity}\n╰━━━━━━━━━━━━━━━✪\n`;
              }
            }
            await sendMessage(invText);
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
