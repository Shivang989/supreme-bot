// ╭━━━━━━━━━━━━━━━✪
// │ 🎮 THE ARENA (GAME FEATURES)
// ╰━━━━━━━━━━━━━━━✪
// Yahan humare saare commands aur unka UI design rahega.
// Aage se jab koi naya feature aayega, hum bas use yahan neeche add karenge.

import { DB_MANAGER } from './db';
import { MUSCLE } from './muscle';
import { CONFIG, UI, EMOJIS, MARKET_ITEMS } from './config';
import { CloudflareEnv } from './types';

export const GAME = {
  // Ye main function hai jisme index.ts saare messages bhejega
  async processCommand(text: string, update: any, env: CloudflareEnv, sendMessage: (msg: string) => Promise<void>) {
    const chatId = update.message.chat.id;
    const userId = update.message.from.id;
    const firstName = update.message.from.first_name || "Agent";
    const args = text.split(" ").slice(1);

    // 1. Ensure user database me hai ya nahi
    await DB_MANAGER.ensureUserExists(env.DB, userId);

    // ╭━━━━━━━━━━━━━━━✪ [START FEATURE]
    if (text === "/start") {
      const msg = `${UI.BORDER_TOP}\n│ 👑 <b>WELCOME TO THE UNDERWORLD</b>\n${UI.BORDER_BOT}\n\nGreetings, ${firstName}!\nYour account is secured in the Cloud Vault.\nUse /profile to check your status.`;
      await sendMessage(msg);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [PROFILE FEATURE]
    if (text.startsWith("/profile") || text.startsWith("/me")) {
      const user = await DB_MANAGER.getUser(env.DB, userId);
      if (!user) return;
      
      const status = user.is_alive === 1 ? `${EMOJIS.alive} Alive` : `${EMOJIS.dead} Dead`;
      const profileText = 
`${UI.BORDER_TOP}
│ 💳 <b>U N D E R W O R L D   I D</b>
${UI.BORDER_BOT}

👤 <b>Name:</b> ${firstName}
🆔 <b>Citizen ID:</b> <code>${userId}</code>
💰 <b>Net Worth:</b> ₹${user.balance}
🔪 <b>Total Kills:</b> ${user.kills}
❤️ <b>Status:</b> ${status}

${UI.BORDER_BOT}`;
      await sendMessage(profileText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [MARKET FEATURE]
    if (text.startsWith("/market")) {
      const currentTime = Math.floor(Date.now() / 1000);
      let marketText = `${UI.BORDER_TOP}\n│ 📈 <b>𝐔𝐍𝐃𝐄𝐑𝐖𝐎𝐑𝐋𝐃 𝐌𝐀𝐑𝐊𝐄𝐓</b>\n${UI.BORDER_BOT}\n\n`;
      
      // CONFIG se items uthayenge aur MUSCLE se price calculate karwayenge
      for (const [itemKey, data] of Object.entries(MARKET_ITEMS)) {
          const currentPrice = MUSCLE.calculateMarketPrice(data.base_price, data.volatility, currentTime);
          marketText += `╭━⟮ ✦ ${data.emoji} ${data.name.toUpperCase()} ✦ ⟯\n│ 💰 𝐂𝐔𝐑𝐑𝐄𝐍𝐓 𝐏𝐑𝐈𝐂𝐄: ₹${currentPrice}\n${UI.BORDER_BOT}\n`;
      }
      marketText += `\n💡 <i>Prices fluctuate based on the Supreme Engine!</i>`;
      await sendMessage(marketText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [INVEST FEATURE]
    if (text.startsWith("/invest")) {
      if (args.length === 0) {
        await sendMessage(`${EMOJIS.error} <b>Usage:</b> <code>/invest [amount]</code>`);
        return;
      }
      const investment = parseInt(args[0]);
      if (isNaN(investment) || investment <= 0) {
        await sendMessage(`${EMOJIS.error} Sahi amount daal bhai.`);
        return;
      }

      const user = await DB_MANAGER.getUser(env.DB, userId);
      if (!user || user.balance < investment) {
        await sendMessage(`${EMOJIS.error} You don't have enough funds. Balance: ₹${user?.balance || 0}.`);
        return;
      }

      // The Muscle executes the math
      const result = MUSCLE.simulateMarket(investment);
      const netChange = result.payout - investment;
      const newBalance = user.balance + netChange;

      // The Clinic updates the Database
      await DB_MANAGER.updateBalance(env.DB, userId, newBalance);

      let investText = `${UI.BORDER_TOP}\n│ 📊 <b>T R A D I N G   T E R M I N A L</b>\n${UI.BORDER_BOT}\n\n`;
      investText += `💼 <b>Investment:</b> ₹${investment}\n📡 <b>Executing Algorithm...</b>\n\n`;
      investText += `╭━⟮ ${result.emoji} <b>${result.event}</b> ⟯\n│ ✖️ <b>Multiplier:</b> ${result.multiplier}x\n`;
      
      if (netChange > 0) investText += `│ 🟢 <b>Profit:</b> +₹${netChange}\n`;
      else if (netChange < 0) investText += `│ 🔴 <b>Loss:</b> -₹${Math.abs(netChange)}\n`;
      else investText += `│ ⚪ <b>Broke Even:</b> ₹0\n`;
      
      investText += `│ 🏦 <b>New Balance:</b> ₹${newBalance}\n${UI.BORDER_BOT}`;
      await sendMessage(investText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [KILL FEATURE]
    if (text.startsWith("/kill") || text.startsWith("/k ")) {
      if (!update.message.reply_to_message) {
        await sendMessage(`${EMOJIS.error} Kisko tapkana hai? Reply to a player.`);
        return;
      }

      const targetId = update.message.reply_to_message.from.id;
      const targetName = update.message.reply_to_message.from.first_name || "Agent";

      if (userId === targetId) {
        await sendMessage(`${EMOJIS.error} Khud ko kyu maar raha hai bhai?`);
        return;
      }
      if (update.message.reply_to_message.from.is_bot) {
        await sendMessage(`${EMOJIS.error} Bot pe goli nahi chalti.`);
        return;
      }

      // Ensure target exists in DB
      await DB_MANAGER.ensureUserExists(env.DB, targetId);

      const caller = await DB_MANAGER.getUser(env.DB, userId);
      if (!caller || caller.is_alive === 0) {
        await sendMessage(`${EMOJIS.dead} Tu pehle hi mar chuka hai! Use /revive first.`);
        return;
      }

      // The 50/50 RNG Math
      const roll = Math.floor(Math.random() * 100) + 1;

      if (roll <= 50) { // Success
        await DB_MANAGER.setAliveStatus(env.DB, targetId, 0); // Target Dead
        await DB_MANAGER.addKill(env.DB, userId); // +1 Kill

        // Loot Item
        const STANDARD_DROPS = ["cheap_watch", "stolen_phone", "gold_chain"];
        const dropItem = STANDARD_DROPS[Math.floor(Math.random() * STANDARD_DROPS.length)];
        
        await DB_MANAGER.addInventoryItem(env.DB, userId, dropItem, 1);

        const itemDisplay = MARKET_ITEMS[dropItem]?.name.toUpperCase() || dropItem.toUpperCase();
        const dropEmoji = MARKET_ITEMS[dropItem]?.emoji || "📦";

        await sendMessage(`${EMOJIS.gun} <b>BRUTAL MURDER!</b>\n<b>${firstName}</b> eliminated <b>${targetName}</b> in cold blood!\n${EMOJIS.vault} Searched the body and found a <b>[${dropEmoji} ${itemDisplay}]</b>!`);
      } else { // Miss
        await sendMessage(`💨 <b>WEAPON JAMMED!</b>\n<b>${firstName}</b> aimed at <b>${targetName}</b> but missed the shot!\n🏃 The target escaped unharmed.`);
      }
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [INVENTORY FEATURE]
    if (text.startsWith("/inv")) {
      const invItems = await DB_MANAGER.getInventory(env.DB, userId);
      
      let invText = `${UI.BORDER_TOP}\n│ ${EMOJIS.vault} <b>${firstName.toUpperCase()}'𝐒 𝐕𝐀𝐔𝐋𝐓</b>\n${UI.BORDER_BOT}\n\n`;
      
      if (!invItems || invItems.length === 0) {
        invText += `${EMOJIS.error} <i>Vault is empty. Kill someone to get loot.</i>\n\n${UI.BORDER_BOT}`;
      } else {
        for (const row of invItems) {
          const itemData = MARKET_ITEMS[row.item_name];
          const emoji = itemData?.emoji || "📦";
          const nameDisplay = itemData?.name.toUpperCase() || row.item_name.toUpperCase();
          invText += `╭━⟮ ✦ ${emoji} ${nameDisplay} ✦ ⟯\n│ 📦 𝐐𝐔𝐀𝐍𝐓𝐈𝐓𝐘: ${row.quantity}\n${UI.BORDER_BOT}\n`;
        }
      }
      await sendMessage(invText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


  }
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END OF GAME FILE
