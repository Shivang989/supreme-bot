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
 
  async processCommand(update: any, env: CloudflareEnv, sendMessage: any, startTime: number) {
    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name || "Agent";
    
    // Check if user is in a "Setup Session" (State Machine)
    const session = await DB_MANAGER.getSession(env.DB, userId);
    const currentTime = Math.floor(Date.now() / 1000);

    if (session && session.expires_at > currentTime) {
      if (session.step === 'awaiting_text' && message.text) {
        await DB_MANAGER.updateGroupSetting(env.DB, session.chat_id, 'welcome_text', message.text);
        await DB_MANAGER.setSession(env.DB, userId, session.chat_id, 'awaiting_media', currentTime + 1800);
        await sendMessage(chatId, "✅ <b>Text Saved!</b>\nNow send the Media (Photo, Video under 15s, or Sticker).\n<i>Send 'skip' if you only want text.</i>");
        return;
      }
      if (session.step === 'awaiting_media') {
        let fileData = "";
        // Save the media type AND the cloud file_id
        if (message.photo) fileData = "photo:" + message.photo[message.photo.length - 1].file_id;
        else if (message.video) fileData = "video:" + message.video.file_id;
        else if (message.animation) fileData = "animation:" + message.animation.file_id;
        else if (message.sticker) fileData = "sticker:" + message.sticker.file_id;
        else if (message.text && message.text.toLowerCase() === 'skip') fileData = "none";

        if (fileData) {
          await DB_MANAGER.updateGroupSetting(env.DB, session.chat_id, 'welcome_media_id', fileData);
          await DB_MANAGER.clearSession(env.DB, userId);
          await sendMessage(chatId, "🎉 <b>Welcome Setup Complete!</b>\nUse the 'See' button in settings to test it.");
          return;
        } else {
          await sendMessage(chatId, "❌ Invalid media. Send a Photo, Video, GIF, Sticker, or type 'skip'.");
          return;
        }
      }

    } else if (session && session.expires_at <= currentTime) {
       await DB_MANAGER.clearSession(env.DB, userId); // Cleanup expired session
    }

    // Normal command parsing...
    const text = message.text ? message.text.trim() : "";
    const args = text.split(" ").slice(1);
    await DB_MANAGER.ensureUserExists(env.DB, userId);



//=====================================================
   // ╭━━━━━━━━━━━━━━━✪ [START FEATURE]
    if (text.startsWith("/start")) {
      const botUsername = "T_he_Main_Bot"; // <-- CHANGE THIS
      
      const replyMarkup = {
        inline_keyboard: [
          [{ text: "➕ Add me to your group", url: `https://t.me/${botUsername}?startgroup=true` }],
          [{ text: "Start me 🎖️", url: `https://t.me/${botUsername}?start=start` }],
          [{ text: "⚙️ Settings", callback_data: "menu_settings" }]
        ]
      };

      const msg = `${UI.BORDER_TOP}\n│ 👑 <b>WELCOME TO THE UNDERWORLD</b>\n${UI.BORDER_BOT}\n\nGreetings, ${firstName}!\nYour account is secured in the Cloud Vault.`;
      
      await sendMessage(chatId, msg, replyMarkup);
      return;
    }

    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
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


// ====================================================
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


// ====================================================
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


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [REVIVE FEATURE]
    if (text === "/revive" || text === "/heal") {
      const user = await DB_MANAGER.getUser(env.DB, userId);
      if (!user) return;

      if (user.is_alive === 1) {
        await sendMessage(`${EMOJIS.error} Tu pehle se zinda hai bhai. Jakar aish kar!`);
        return;
      }

      const reviveCost = 500;
      let newBalance = user.balance;
      let msg = "";

      // Agar paise hain toh Hospital ka bill katega, warna garib ko free ilaaj
      if (user.balance >= reviveCost) {
        newBalance -= reviveCost;
        msg = `🏥 <b>HOSPITAL BILL PAID</b>\nDoctor ne ₹${reviveCost} liye aur tumhari jaan bacha li.`;
      } else {
        msg = `🏥 <b>CHARITY WARD</b>\nTumhare paas paise nahi the, par Underworld ke doctors ne tumhe muft mein zinda kar diya.`;
      }

      await DB_MANAGER.setAliveStatus(env.DB, userId, 1);
      await DB_MANAGER.updateBalance(env.DB, userId, newBalance);

      await sendMessage(`${UI.BORDER_TOP}\n│ 🟢 <b>R E S U R R E C T I O N</b>\n${UI.BORDER_BOT}\n\n${msg}\n\nWelcome back to the land of the living, ${firstName}!`);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
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

      await DB_MANAGER.ensureUserExists(env.DB, targetId);

      const caller = await DB_MANAGER.getUser(env.DB, userId);
      if (!caller || caller.is_alive === 0) {
        await sendMessage(`${EMOJIS.dead} Tu pehle hi mar chuka hai! Use /revive first.`);
        return;
      }

      const target = await DB_MANAGER.getUser(env.DB, targetId);
      if (!target || target.is_alive === 0) {
        await sendMessage(`${EMOJIS.error} <b>${targetName}</b> pehle se mara hua hai.`);
        return;
      }

      // 🛡️ SHIELD CHECK FOR KILL
      const currentSeconds = Math.floor(Date.now() / 1000);
      if (target.protection_until && target.protection_until > currentSeconds) {
        await sendMessage(`${UI.BORDER_TOP}\n│ 🛡️ <b>A T T A C K   B L O C K E D</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.error} <b>${targetName}</b> is under Underworld Protection!\nGuard dogs chased you away.`);
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


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [ROB FEATURE]
    if (text.startsWith("/rob")) {
      if (!update.message.reply_to_message) {
        await sendMessage(`${EMOJIS.error} Kisko lootna hai? Reply to their message.`);
        return;
      }

      const targetId = update.message.reply_to_message.from.id;
      const targetName = update.message.reply_to_message.from.first_name || "Target";

      if (userId === targetId) return;
      if (update.message.reply_to_message.from.is_bot) {
         await sendMessage(`${EMOJIS.error} Bot ki jeb khaali hoti hai.`);
         return;
      }

      const robber = await DB_MANAGER.getUser(env.DB, userId);
      if (!robber || robber.is_alive === 0) {
        await sendMessage(`${EMOJIS.dead} Bhoot chori nahi kar sakte. Pehle /revive use kar.`);
        return;
      }

      await DB_MANAGER.ensureUserExists(env.DB, targetId);
      const target = await DB_MANAGER.getUser(env.DB, targetId);
      
      if (!target || target.is_alive === 0) {
        await sendMessage(`${EMOJIS.error} Murdo ke paas paise nahi hote bhai.`);
        return;
      }

      // 🛡️ SHIELD CHECK FOR ROBBERY
      const currentSeconds = Math.floor(Date.now() / 1000);
      if (target.protection_until && target.protection_until > currentSeconds) {
        await sendMessage(`${UI.BORDER_TOP}\n│ 🛡️ <b>A T T A C K   B L O C K E D</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.error} <b>${targetName}</b> is under Underworld Protection!\nGuard dogs chased you away.`);
        return;
      }

      if (target.balance < 100) {
        await sendMessage(`${EMOJIS.error} <b>${targetName}</b> ke paas phooti kaudi nahi hai. Garib ko kya lootega?`);
        return;
      }

      // RNG for Robbery (45% Success Chance)
      const roll = Math.floor(Math.random() * 100) + 1;
      
      if (roll <= 45) { // Success
        const stealPercent = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        const stolenAmount = Math.floor(target.balance * (stealPercent / 100));

        await DB_MANAGER.updateBalance(env.DB, userId, robber.balance + stolenAmount);
        await DB_MANAGER.updateBalance(env.DB, targetId, target.balance - stolenAmount);

        await sendMessage(`${UI.BORDER_TOP}\n│ 🦹‍♂️ <b>H E I S T   S U C C E S S</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.success} <b>${firstName}</b> ne <b>${targetName}</b> ki jeb kaat li!\n\n💰 <b>Looted:</b> ₹${stolenAmount}\n🏃‍♂️ <i>Bhaag jaldi bhaag!</i>`);
      } else { // Fail - Pay 15% fine to the target
        const fineAmount = Math.floor(robber.balance * 0.15); 
        if (fineAmount > 0) {
          await DB_MANAGER.updateBalance(env.DB, userId, robber.balance - fineAmount);
          await DB_MANAGER.updateBalance(env.DB, targetId, target.balance + fineAmount);
          await sendMessage(`${UI.BORDER_TOP}\n│ 🚨 <b>B U S T E D !</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.error} <b>${firstName}</b> chori karte hue pakda gaya!\n\n💸 <b>Penalty Paid:</b> ₹${fineAmount} to ${targetName}\n👮‍♂️ <i>Agli baar dhyan se!</i>`);
        } else {
          await sendMessage(`${UI.BORDER_TOP}\n│ 🚨 <b>B U S T E D !</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.error} <b>${firstName}</b> chori karte hue pakda gaya!\n\nLekin jeb khali hone ki wajah se bas pitayi kha ke chhut gaya.`);
        }
      }
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [SELL FEATURE]
    if (text.startsWith("/sell")) {
      if (args.length === 0) {
        await sendMessage(`${EMOJIS.error} Kya bechna hai? Usage: <code>/sell [item_name]</code>\nExample: <code>/sell stolen_phone</code>`);
        return;
      }

      const itemToSell = args[0].toLowerCase();
      const itemData = MARKET_ITEMS[itemToSell];

      if (!itemData) {
        await sendMessage(`${EMOJIS.error} Ye kachra Underworld market me nahi bikta.`);
        return;
      }

      const invItems = await DB_MANAGER.getInventory(env.DB, userId);
      const userItem = invItems.find((i) => i.item_name === itemToSell);

      if (!userItem || userItem.quantity < 1) {
        await sendMessage(`${EMOJIS.error} Tere paas ye item nahi hai. Pehle /inv check kar.`);
        return;
      }

      const user = await DB_MANAGER.getUser(env.DB, userId);
      if (!user) return;

      // Calculate current live price from Muscle
      const currentTime = Math.floor(Date.now() / 1000);
      const sellPrice = MUSCLE.calculateMarketPrice(itemData.base_price, itemData.volatility, currentTime);

      // Clinic updates (Remove 1 item, Add money)
      await DB_MANAGER.addInventoryItem(env.DB, userId, itemToSell, -1);
      await DB_MANAGER.updateBalance(env.DB, userId, user.balance + sellPrice);

      await sendMessage(`${UI.BORDER_TOP}\n│ 🤝 <b>D E A L   D O N E</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.success} <b>${firstName}</b> sold 1x <b>${itemData.emoji} ${itemData.name.toUpperCase()}</b>!\n\n💰 <b>Earned:</b> ₹${sellPrice}\n🏦 <b>New Balance:</b> ₹${user.balance + sellPrice}`);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [LEADERBOARD FEATURE]
    if (text === "/leaderboard" || text === "/top") {
      const topPlayers = await DB_MANAGER.getTopPlayers(env.DB, 5);
      
      let lbText = `${UI.BORDER_TOP}\n│ 🏆 <b>T O P   B O S S E S</b>\n${UI.BORDER_BOT}\n\n`;
      
      if (!topPlayers || topPlayers.length === 0) {
        lbText += "No players found in the Underworld.";
      } else {
        let rank = 1;
        for (const p of topPlayers) {
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";
          lbText += `<b>${medal} Rank ${rank}</b>\n`;
          lbText += `├ 🆔 <code>${p.user_id}</code>\n`;
          lbText += `├ 💰 Net Worth: ₹${p.balance}\n`;
          lbText += `└ 🔪 Kills: ${p.kills}\n\n`;
          rank++;
        }
      }
      lbText += `${UI.BORDER_BOT}`;
      await sendMessage(lbText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [BOSS RAID FEATURE]
    if (text === "/boss" || text === "/raid") {
      const user = await DB_MANAGER.getUser(env.DB, userId);
      
      if (!user || user.is_alive === 0) {
        await sendMessage(`${EMOJIS.dead} Murde Boss se nahi ladte. Pehle /revive kar aur apni aukaat bana!`);
        return;
      }

      // Player Level = Kills + 1 (Base level 1)
      const playerLevel = user.kills + 1;
      
      // Call The Muscle to calculate Damage
      const hit = MUSCLE.rollBossDamage(playerLevel);
      
      // Boss Defense Threshold (High level danger)
      const bossDefense = 200; 

      let raidText = `${UI.BORDER_TOP}\n│ 👹 <b>B O S S   R A I D</b>\n${UI.BORDER_BOT}\n\n`;
      raidText += `⚔️ <b>${firstName}</b> (Lv. ${playerLevel}) attacked the Kingpin's Convoy!\n`;
      raidText += `💥 <b>Damage Dealt:</b> ${hit.damage} ${hit.is_crit ? "<b>(CRITICAL HIT! 🔥)</b>" : ""}\n\n`;

      // Combat Result
      if (hit.damage >= bossDefense) {
        // Victory: Huge Payout (₹2000 to ₹7000)
        const reward = Math.floor(Math.random() * 5000) + 2000; 
        await DB_MANAGER.updateBalance(env.DB, userId, user.balance + reward);
        
        raidText += `╰━⟮ ${EMOJIS.success} <b>V I C T O R Y</b> ⟯\n│ You broke the convoy's defense!\n│ 💰 <b>Reward:</b> +₹${reward}\n`;
      } else {
        // Defeat: Instant Death
        await DB_MANAGER.setAliveStatus(env.DB, userId, 0);
        
        raidText += `╰━⟮ ${EMOJIS.dead} <b>D E F E A T</b> ⟯\n│ The Boss's guards overpowered you.\n│ 🩸 You were killed in action. Use /revive.\n`;
      }
      
      raidText += `${UI.BORDER_BOT}`;
      await sendMessage(raidText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [ID FEATURE]
    if (text === "/id") {
      let idText = `🆔 <b>Your ID:</b> <code>${userId}</code>\n💬 <b>Chat ID:</b> <code>${chatId}</code>`;
      
      // Agar kisi ke message par reply kiya hai, toh uska ID bhi dikhao
      if (update.message.reply_to_message) {
        const replyId = update.message.reply_to_message.from.id;
        const replyName = update.message.reply_to_message.from.first_name || "User";
        idText += `\n👤 <b>${replyName}'s ID:</b> <code>${replyId}</code>`;
      }
      
      await sendMessage(idText);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [PING FEATURE]
    if (text === "/ping") {
      const latency = Date.now() - startTime;
      await sendMessage(`🏓 <b>Pong!</b>\n⚡ <b>Latency:</b> <code>${latency}ms</code>\n📡 <b>Status:</b> <i>Stable & Operational</i>`);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [BALANCE FEATURE]
    if (text.startsWith("/bal")) {
      let targetId = userId;
      let targetName = firstName;

      // Agar reply kiya hai toh dost ka balance dikhao
      if (update.message.reply_to_message) {
        targetId = update.message.reply_to_message.from.id;
        targetName = update.message.reply_to_message.from.first_name || "User";
      }

      const user = await DB_MANAGER.getUser(env.DB, targetId);
      if (user) {
        await sendMessage(`💰 <b>${targetName}'s Balance:</b> ₹${user.balance}`);
      } else {
        await sendMessage(`${EMOJIS.error} Account not found.`);
      }
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


    // ===============================================
    // ===============================================
    // 👑 G O D   M O D E   S E C T I O N
    // ===============================================
    // ===============================================
    // Warning: Only accessible by Supreme Owner.

    // ╭━━━━━━━━━━━━━━━✪ [GOD: TRANSFER/DEDUCT]
    if (text.startsWith("/transfer")) {
      if (userId !== CONFIG.OWNER_ID) return; // Silent block for non-owners

      if (!update.message.reply_to_message || args.length === 0) {
        await sendMessage(`${EMOJIS.error} <b>Usage:</b> Reply + <code>/transfer [amount]</code>`);
        return;
      }

      const amount = parseInt(args[0]); // negative amount allowed automatically
      if (isNaN(amount)) return;

      const targetId = update.message.reply_to_message.from.id;
      const targetName = update.message.reply_to_message.from.first_name || "Agent";

      await DB_MANAGER.ensureUserExists(env.DB, targetId);
      const target = await DB_MANAGER.getUser(env.DB, targetId);
      
      if (target) {
        const newBalance = target.balance + amount;
        await DB_MANAGER.updateBalance(env.DB, targetId, newBalance);
        
        const action = amount > 0 ? "blessed" : "penalized";
        const symbol = amount > 0 ? "+" : "";

        await sendMessage(`${UI.BORDER_TOP}\n│ 👑 <b>S U P R E M E   O R D E R</b>\n${UI.BORDER_BOT}\n\nBoss has ${action} <b>${targetName}</b>!\n📊 <b>Transaction:</b> ${symbol}${amount}\n🏦 <b>New Balance:</b> ₹${newBalance}\n${UI.BORDER_BOT}`);
      }
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ==============================================
    // 👑 G O D   M O D E   E N D 
    // ==============================================

    
// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [PAY/GIVE FEATURE]
    if (text.startsWith("/pay") || text.startsWith("/give")) {
      if (!update.message.reply_to_message) {
        await sendMessage(`${EMOJIS.error} Kisko paise dene hain? Reply to a player.`);
        return;
      }

      if (args.length === 0) {
        await sendMessage(`${EMOJIS.error} <b>Usage:</b> <code>/pay [amount]</code>\nExample: <code>/pay 500</code>`);
        return;
      }

      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) {
        await sendMessage(`${EMOJIS.error} Sahi amount daal bhai.`);
        return;
      }

      const targetId = update.message.reply_to_message.from.id;
      const targetName = update.message.reply_to_message.from.first_name || "Agent";

      if (userId === targetId) {
        await sendMessage(`${EMOJIS.error} Khud ko paise kyu de raha hai?`);
        return;
      }

      if (update.message.reply_to_message.from.is_bot) {
        await sendMessage(`${EMOJIS.error} Bot moh-maya se door hai.`);
        return;
      }

      const sender = await DB_MANAGER.getUser(env.DB, userId);
      if (!sender || sender.balance < amount) {
        await sendMessage(`${EMOJIS.error} Teri jeb me itne paise nahi hain. Balance: ₹${sender?.balance || 0}`);
        return;
      }

      // Ensure target exists
      await DB_MANAGER.ensureUserExists(env.DB, targetId);
      const target = await DB_MANAGER.getUser(env.DB, targetId);

      if (target) {
        // Deduct from sender, Add to target
        await DB_MANAGER.updateBalance(env.DB, userId, sender.balance - amount);
        await DB_MANAGER.updateBalance(env.DB, targetId, target.balance + amount);

        await sendMessage(`${UI.BORDER_TOP}\n│ 💸 <b>M O N E Y   T R A N S F E R</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.success} <b>${firstName}</b> ne <b>${targetName}</b> ko ₹${amount} diye!\n\n🏦 <b>Your New Balance:</b> ₹${sender.balance - amount}`);
      }
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [FIXED DEFEND FEATURE]
    if (text.startsWith("/defend") || text.startsWith("/safe")) {
      const user = await DB_MANAGER.getUser(env.DB, userId);
      if (!user) return;

      const currentSeconds = Math.floor(Date.now() / 1000);
      
      // LOOPHOLE FIX: Agar protection active hai toh naya nahi kharid sakte
      if (user.protection_until && user.protection_until > currentSeconds) {
        const remaining = Math.ceil((user.protection_until - currentSeconds) / 3600);
        await sendMessage(`${EMOJIS.error} <b>Protection Active!</b>\nAapki security pehle se chalu hai.\n⏳ <b>Remaining:</b> ~${remaining} hours.\nKhatam hone ke baad hi naya plan le sakte hain.`);
        return;
      }

      if (args.length === 0) {
        await sendMessage(`${UI.BORDER_TOP}\n│ 🛡️ <b>B U Y   P R O T E C T I O N</b>\n${UI.BORDER_BOT}\n\n<b>Plans:</b>\n├ <code>/defend 1d</code> ➖ ₹400\n├ <code>/defend 2d</code> ➖ ₹800\n└ <code>/defend 3d</code> ➖ ₹1400`);
        return;
      }

      const plan = args[0].toLowerCase();
      let cost = 0; let days = 0;
      if (plan === "1d") { cost = 400; days = 1; }
      else if (plan === "2d") { cost = 800; days = 2; }
      else if (plan === "3d") { cost = 1400; days = 3; }
      else { await sendMessage(`${EMOJIS.error} Invalid plan (1d/2d/3d).`); return; }

      if (user.balance < cost) {
        await sendMessage(`${EMOJIS.error} Low balance! ₹${cost} required.`);
        return;
      }

      const newProtectionTime = currentSeconds + (days * 86400);
      await DB_MANAGER.updateBalance(env.DB, userId, user.balance - cost);
      await DB_MANAGER.setProtection(env.DB, userId, newProtectionTime);

      await sendMessage(`${UI.BORDER_TOP}\n│ 🛡️ <b>G U A R D S   H I R E D</b>\n${UI.BORDER_BOT}\n\n${EMOJIS.success} <b>${firstName}</b> protected for <b>${days} Day(s)</b>!`);
      return;
    }


    // ╭━━━━━━━━━━━━━━━✪ [GOD MODE: DB UPGRADE]
        if (text === "/upgradedb") {
      if (userId !== CONFIG.OWNER_ID) return;
      try {
        // Table for Group Admins
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS group_admins (chat_id INTEGER, user_id INTEGER, level INTEGER, title TEXT, PRIMARY KEY(chat_id, user_id))`).run();
        await sendMessage("✅ <b>Database Upgraded!</b> Admin table created.");
      } catch (e: any) { await sendMessage(`⚠️ Error: ${e.message}`); }
      return;
    }

    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
// ==================== A D M I N =====================
// ====================================================
   
    // ╭━━━━━━━━━━━━━━━✪ [ADMIN MANAGEMENT: PROMOTE/DEMOTE/TITLE/ADMINS]
    
    // Check if caller is Admin or Owner
    const adminData = await DB_MANAGER.getAdmin(env.DB, chatId, userId);
    const isOwner = userId === CONFIG.OWNER_ID;
    const isHighAdmin = (adminData && adminData.level === 3) || isOwner;

// ====================================================
    // --- PROMOTE ---
    if (text.startsWith("/promote")) {
      if (!isHighAdmin) return;
      
      let targetId = update.message.reply_to_message?.from.id;
      let level = 1;

      // Priority Logic: Check if ID is given in args
      const idArg = args.find(a => !isNaN(parseInt(a)) && a.length > 7);
      const lvlArg = args.find(a => ["1","2","3"].includes(a));
      
      if (idArg) targetId = parseInt(idArg);
      if (lvlArg) level = parseInt(lvlArg);

      if (!targetId) {
        await sendMessage(`${EMOJIS.error} Reply to user or provide an ID.`);
        return;
      }

      await DB_MANAGER.setAdmin(env.DB, chatId, targetId, level, "Member");
      await sendMessage(`✅ <b>PROMOTED!</b>\nUser <code>${targetId}</code> is now a <b>Level ${level} Admin</b> in this group.`);
      return;
    }

// ====================================================
    // --- DEMOTE ---
    if (text.startsWith("/demote")) {
      if (!isHighAdmin) return;
      let targetId = update.message.reply_to_message?.from.id;
      const idArg = args.find(a => !isNaN(parseInt(a)) && a.length > 7);
      if (idArg) targetId = parseInt(idArg);

      if (!targetId) return;
      await DB_MANAGER.removeAdmin(env.DB, chatId, targetId);
      await sendMessage(`❌ <b>DEMOTED!</b>\nUser <code>${targetId}</code> removed from Admin list.`);
      return;
    }

    // --- TITLE ---
    if (text.startsWith("/title")) {
      if (!isHighAdmin) return;
      let targetId = update.message.reply_to_message?.from.id;
      let titleName = args.filter(a => isNaN(parseInt(a)) || a.length < 7).join(" ");
      const idArg = args.find(a => !isNaN(parseInt(a)) && a.length > 7);
      if (idArg) targetId = parseInt(idArg);

      if (!targetId || !titleName) {
        await sendMessage(`${EMOJIS.error} Usage: /title [name] [id/reply]`);
        return;
      }

      await DB_MANAGER.setAdmin(env.DB, chatId, targetId, 1, titleName);

      // Telegram API Call to set Tag (Bot must have 'Add Admin' rights)
      try {
        await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, user_id: targetId, can_manage_chat: true })
        });
        await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setChatAdministratorCustomTitle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, user_id: targetId, custom_title: titleName })
        });
      } catch (e) {}

      await sendMessage(`🏷️ <b>TITLE UPDATED!</b>\nTarget <code>${targetId}</code> is now tagged as: <b>${titleName}</b>`);
      return;
    }

// ====================================================
    // --- ADMINS LIST ---
    if (text === "/admins") {
      const allAdmins = await DB_MANAGER.getAllAdmins(env.DB, chatId);
      let list = `${UI.BORDER_TOP}\n│ 🛡️ <b>G R O U P   A D M I N S</b>\n${UI.BORDER_BOT}\n\n`;
      if (allAdmins.length === 0) list += "No custom admins registered.";
      else {
        for (const a of allAdmins) {
          list += `👤 <code>${a.user_id}</code>\n└ 🎖️ <b>Lvl ${a.level}</b> | 🏷️ <i>${a.title}</i>\n\n`;
        }
      }
      await sendMessage(chatId, list + UI.BORDER_BOT);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
    
  }, // <--- ⚠️ THIS IS THE MAGIC COMMA THAT FIXES THE CRASH ⚠️
  
  // ====================================================
  // ====================================================
  // ╭━━━━━━━━━━━━━━━✪
  // │ 🕹️ CALLBACK ROUTER (BUTTON CLICKS)
  // ╰━━━━━━━━━━━━━━━✪
  async processCallback(query: any, env: CloudflareEnv, editMessageText: any, answerCallbackQuery: any) {
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;

    await answerCallbackQuery(query.id); // Stops the loading spinner

    if (data === "menu_start") {
      const botUsername = "YOUR_BOT_USERNAME"; // <-- DON'T FORGET TO CHANGE THIS
      const replyMarkup = {
        inline_keyboard: [
          [{ text: "➕ Add me to your group", url: `https://t.me/${botUsername}?startgroup=true` }],
          [{ text: "Start me 🎖️", url: `https://t.me/${botUsername}?start=start` }],
          [{ text: "⚙️ Settings", callback_data: "menu_settings" }]
        ]
      };
      await editMessageText(chatId, messageId, "👑 <b>WELCOME TO THE UNDERWORLD</b>\nChoose an option:", replyMarkup);
    }

    else if (data === "menu_settings") {
      const replyMarkup = {
        inline_keyboard: [
          [{ text: "👋 Welcome", callback_data: "menu_welcome" }, { text: "My friend 🤫", url: "tg://settings" }],
          [{ text: "Soon ⏳", callback_data: "alert_soon" }, { text: "Soon ⏳", callback_data: "alert_soon" }],
          [{ text: "🔙 Back", callback_data: "menu_start" }]
        ]
      };
      await editMessageText(chatId, messageId, "⚙️ <b>SETTINGS MENU</b>\nConfigure your Underworld experience:", replyMarkup);
    }

       else if (data === "menu_welcome") {
      // Clear any pending setup session if user clicks Back/Cancel
      await DB_MANAGER.clearSession(env.DB, userId);

      const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
      const isOn = settings && settings.welcome_enabled === 1;
      const statusText = isOn ? "🟢 ON" : "🔴 OFF";
      
      const replyMarkup = {
        inline_keyboard: [
          [{ text: "🟢 On", callback_data: "wel_on" }, { text: "🔴 Off", callback_data: "wel_off" }],
          [{ text: "📝 Set", callback_data: "wel_set" }, { text: "👁️ See", callback_data: "wel_see" }],
          [{ text: "🔙 Back", callback_data: "menu_settings" }]
        ]
      };
      await editMessageText(chatId, messageId, `👋 <b>WELCOME SETTINGS</b>\n\nCurrent Status: <b>${statusText}</b>\nConfigure how new members are greeted:`, replyMarkup);
    }

    else if (data === "alert_soon") {
      await answerCallbackQuery(query.id, "⏳ Feature coming soon!", true);
    }

    else if (data === "wel_on") {
      const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
      if (!settings || !settings.welcome_text) {
        await answerCallbackQuery(query.id, "❌ Please 'Set' a welcome message first!", true);
        return;
      }
      await DB_MANAGER.updateGroupSetting(env.DB, chatId, 'welcome_enabled', 1);
      const backMarkup = { inline_keyboard: [[{ text: "🔙 Back", callback_data: "menu_welcome" }]] };
      await editMessageText(chatId, messageId, "✅ <b>Welcome Messages: ON</b>\n\nNew members will now be greeted automatically.", backMarkup);
    }

    else if (data === "wel_off") {
      const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
      if (!settings || !settings.welcome_text) {
        await answerCallbackQuery(query.id, "❌ Please 'Set' a welcome message first!", true);
        return;
      }
      await DB_MANAGER.updateGroupSetting(env.DB, chatId, 'welcome_enabled', 0);
      const backMarkup = { inline_keyboard: [[{ text: "🔙 Back", callback_data: "menu_welcome" }]] };
      await editMessageText(chatId, messageId, "🔴 <b>Welcome Messages: OFF</b>\n\nGreetings are paused.", backMarkup);
    }

    else if (data === "wel_set") {
      const expiresAt = Math.floor(Date.now() / 1000) + 1800; // 30 mins limit
      await DB_MANAGER.setSession(env.DB, userId, chatId, 'awaiting_text', expiresAt);
      
      const replyMarkup = { inline_keyboard: [[{ text: "🔙 Cancel", callback_data: "menu_welcome" }]] };
      await editMessageText(chatId, messageId, "📝 <b>WELCOME SETUP [Step 1/2]</b>\n\nSend me the <b>Text Message</b> you want to use for welcoming new members.\n<i>(You can use {name} and {id} in your text)</i>\n\n<i>You have 30 minutes.</i>", replyMarkup);
    }

    else if (data === "wel_see") {
      const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
      if (!settings || !settings.welcome_text) {
        await answerCallbackQuery(query.id, "❌ Nothing to see! Please 'Set' a welcome message first.", true);
        return;
      }
      
      await answerCallbackQuery(query.id); // Stop loading spinner
      
      let textTemplate = settings.welcome_text;
      const mediaData = settings.welcome_media_id; 
      let finalMsg = textTemplate.replace(/{name}/g, user.first_name).replace(/{id}/g, user.id.toString());
      finalMsg = "👁️ <b>PREVIEW MODE:</b>\n\n" + finalMsg;

      const backMarkup = { inline_keyboard: [[{ text: "🔙 Back to Settings", callback_data: "menu_welcome" }]] };

      // No Media? Just edit the text.
      if (!mediaData || mediaData === 'none' || !mediaData.includes(':')) {
        await editMessageText(chatId, messageId, finalMsg, backMarkup);
      } 
      // Has Media? We must send a new message with the image/video.
      else {
        // Delete old menu message so it doesn't clutter the chat
        await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/deleteMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        });
        
        const [mediaType, fileId] = mediaData.split(':');
        let endpoint = "";
        let payload: any = { chat_id: chatId, parse_mode: "HTML", reply_markup: backMarkup };

        if (mediaType === "photo") { endpoint = "sendPhoto"; payload.photo = fileId; payload.caption = finalMsg; }
        else if (mediaType === "video") { endpoint = "sendVideo"; payload.video = fileId; payload.caption = finalMsg; }
        else if (mediaType === "animation") { endpoint = "sendAnimation"; payload.animation = fileId; payload.caption = finalMsg; }
        else if (mediaType === "sticker") { 
          // Stickers can't have captions. Send sticker, then send text with back button
          await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendSticker`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, sticker: fileId })
          });
          endpoint = "sendMessage"; 
          payload.text = finalMsg;
        }

        if (endpoint) {
          await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/${endpoint}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
      }
    }
  }, // <--- Closes processCallback

  // ╭━━━━━━━━━━━━━━━✪
  // │ 🚪 THE GREETING PROTOCOL (NEW MEMBERS)
  // ╰━━━━━━━━━━━━━━━✪
  async processNewMember(update: any, env: CloudflareEnv) {
    const message = update.message;
    const chatId = message.chat.id;
    const newMembers = message.new_chat_members;

    // Check if the group has Welcomes turned ON
    const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
    if (!settings || settings.welcome_enabled !== 1) return;

    let textTemplate = settings.welcome_text || "Welcome to the Underworld, {name}!";
    const mediaData = settings.welcome_media_id; 

    for (const member of newMembers) {
      if (member.is_bot) continue; // Don't welcome other bots

      const name = member.first_name || "Agent";
      // Auto-replace {name} and {id} with the real user's details
      let finalMsg = textTemplate.replace(/{name}/g, name).replace(/{id}/g, member.id.toString());

      // No media? Just send text.
      if (!mediaData || mediaData === 'none' || !mediaData.includes(':')) {
        await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: finalMsg, parse_mode: "HTML" })
        });
      } 
      // Has Media? Send media with the text as a caption!
      else {
        const [mediaType, fileId] = mediaData.split(':');
        let endpoint = "";
        let payload: any = { chat_id: chatId, parse_mode: "HTML" };

        if (mediaType === "photo") { endpoint = "sendPhoto"; payload.photo = fileId; payload.caption = finalMsg; }
        else if (mediaType === "video") { endpoint = "sendVideo"; payload.video = fileId; payload.caption = finalMsg; }
        else if (mediaType === "animation") { endpoint = "sendAnimation"; payload.animation = fileId; payload.caption = finalMsg; }
        else if (mediaType === "sticker") { 
          // Stickers can't have captions. Send sticker, then send the text message separately.
          await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendSticker`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, sticker: fileId })
          });
          endpoint = "sendMessage"; 
          payload.text = finalMsg;
        }

        if (endpoint) {
          await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/${endpoint}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
      }
    }
  } // <-- Closes processNewMember
}; // <-- Closes the GAME object
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END OF GAME FILE
