
// ╭━━━━━━━━━━━━━━━✪
// │ 🎮 THE ARENA (GAME FEATURES)
// ╰━━━━━━━━━━━━━━━✪
// Yahan humare saare commands aur unka UI design rahega.
// Aage se jab koi naya feature aayega, hum bas use yahan neeche add karenge.


import { DB_MANAGER } from './db';
import { MUSCLE } from './muscle';
import { CONFIG, UI, EMOJIS, MARKET_ITEMS } from './config';
import { CloudflareEnv } from './types';
import { createStatusCard } from "./ui";


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
        
        // FLAWLESS FIX: Delete the admin's setup message so it doesn't clutter the group!
        try {
            await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/deleteMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, message_id: message.message_id })
            });
        } catch(e) {} // Ignore if bot lacks admin rights to delete
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


    // ==========================================
    // 👋 WELCOME NEW MEMBERS
    // ==========================================
    if (update.message?.new_chat_members && update.message.new_chat_members.length > 0) {
      for (const member of update.message.new_chat_members) {
        // Sanitize name for HTML parsing
        const safeName = member.first_name
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        // Clickable mention
        const mention = `<a href="tg://user?id=${member.id}">${safeName}</a>`;

        // Register new member into D1 database
        await DB_MANAGER.ensureUserExists(env.DB, member.id);

        await sendMessage(
          chatId,
          `Welcome, ${mention}. Type /help to explore.`
        );
      }
      return;
    }


//=====================================================
   // ╭━━━━━━━━━━━━━━━✪ [START FEATURE]
    if (text.startsWith("/start")) {
      const botUsername = "T_he_Main_Bot"; 
      
        const replyMarkup = {
        inline_keyboard: [
          [{ text: "👤 My Profile", callback_data: "menu_profile" }], // <--- Stats removed, Profile is now wide!
          [{ text: "➕ Add to Group", url: `https://t.me/${botUsername}?startgroup=true` }, { text: "⚙️ Settings", callback_data: "menu_settings" }]
        ]
      };


      // Using Telegram's <blockquote> for that premium, shaded UI look
      const msg = `👑 <b>THE UNDERWORLD TERMINAL</b>\n\n<blockquote><b>Welcome back, ${firstName}.</b>\nConnection established. All systems are green. Select a option below to begin.</blockquote>`;
      
      await sendMessage(chatId, msg, replyMarkup);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


// ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [PROFILE FEATURE]

if (text === "/me" || text === "/profile") {
  const user = await DB_MANAGER.getUser(env.DB, userId);
  if (!user) return;

  const card = createStatusCard({
    title: "👤 UNDERWORLD DOSSIER",
    rows: [
      { label: "👤 PLAYER", value: update.message.from.first_name },
      { label: "🆔 UID", value: userId },
      { label: "💰 CASH", value: `₹${user.balance}` },
      { label: "🔫 AMMO", value: `${(user as any).ammo || 0} rounds` },
      { label: "💀 KILLS", value: user.kills || 0 },
      { label: "❤️ STATUS", value: user.is_alive ? "ALIVE" : "ELIMINATED" },
    ],
    footer: user.is_alive
      ? "🟢 STATUS • Operational and armed"
      : "💀 STATUS • Knocked out. Use /revive to rejoin.",
  });

  await sendMessage(chatId, card);
  return;
}

    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ╭━━━━━━━━━━━━━━━✪ [MARKET FEATURE]
    if (text.startsWith("/market")) {
      const currentTime = Math.floor(Date.now() / 1000);
      let marketText = `${UI.BORDER_TOP}\n│ 📈 <b>𝐔𝐍𝐃𝐄𝐑l𝐖𝐎𝐑𝐋𝐃l 𝐌𝐀𝐑𝐊𝐄𝐓</b>\n${UI.BORDER_BOT}\n\n`;
      
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
    // ╭━━━━━━━━━━━━━━━✪ [AMMO SHOP FEATURE]
    const ammoMatch = text.match(/^\/(b|bullets|buy)[\s]*(\d+)/i);
    if (ammoMatch) {
      const bulletsToBuy = parseInt(ammoMatch[2], 10);
      if (bulletsToBuy > 0) {
        const user = await DB_MANAGER.getUser(env.DB, userId);
        if (!user) return;
        const cost = bulletsToBuy * 1; // ₹1 per bullet
        
        if (user.balance < cost) {
          await sendMessage(chatId, `❌ You need ₹${cost} to buy ${bulletsToBuy} bullets.\nYour Balance: ₹${user.balance}`);
          return;
        }
        
        await env.DB.prepare(`UPDATE users SET balance = balance - ?, ammo = ammo + ? WHERE user_id = ?`).bind(cost, bulletsToBuy, userId).run();
        await sendMessage(chatId, `🛒 <b>AMMO SECURED!</b>\n\nBought <b>${bulletsToBuy}</b> bullets for ₹${cost}.\nTotal Ammo: <b>${(user as any).ammo + bulletsToBuy || bulletsToBuy}</b>`);
        return;
      }
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END

    // ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [THE FIRE / HITMAN MECHANIC]

    // =========================================================================
    // ╭━━━━━━━━━━━━━━━✪ [AMMO SYSTEM: /b, /bullets, /ammo, /buy]
    // =========================================================================
    const lowerText = text.toLowerCase().trim();
    const isAmmoCmd = lowerText === "/b" || 
                      lowerText === "/bullets" || 
                      lowerText === "/ammo" || 
                      lowerText.startsWith("/b ") || 
                      lowerText.startsWith("/bullets ") || 
                      lowerText.startsWith("/buy ");

    if (isAmmoCmd) {
      // Ensure user entry exists
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until) 
         VALUES (?, 1000, 1, 0, 0, 0, 0, 0)`
      ).bind(userId).run();

      const user = await env.DB.prepare(
        `SELECT balance, ammo FROM users WHERE user_id = ? LIMIT 1`
      ).bind(userId).first<any>();

      const currentAmmo = user ? user.ammo : 0;
      const currentBalance = user ? user.balance : 0;

      // Extract requested count if provided (e.g. "/b 10", "/buy 5 bullets")
      let purchaseQty: number | null = null;
      const parts = text.trim().split(/\s+/);

      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const parsed = parseInt(parts[i], 10);
          if (!isNaN(parsed) && parsed > 0) {
            purchaseQty = parsed;
            break;
          }
        }
      }

      // CASE 1: Query only (No quantity provided)
      if (purchaseQty === null) {
        const card = createStatusCard({
          title: "🔫 AMMO INVENTORY",
          rows: [
            { label: "👤 PLAYER", value: update.message.from.first_name || "Unknown" },
            { label: "🆔 UID", value: userId },
            { label: "🔋 AMMO", value: `${currentAmmo} rounds` },
            { label: "💰 CASH", value: `₹${currentBalance}` },
          ],
          footer: "💡 HINT • Buy rounds at ₹1/bullet using /b [amount]",
        });
        await sendMessage(chatId, card);
        return;
      }

      // CASE 2: Ammo Purchase (Rate: ₹1 per bullet)
      const cost = purchaseQty * 1;
      if (currentBalance < cost) {
        const card = createStatusCard({
          title: "❌ PURCHASE FAILED",
          rows: [
            { label: "👤 BUYER", value: update.message.from.first_name || "Unknown" },
            { label: "🛒 ORDER", value: `${purchaseQty} bullets` },
            { label: "🏷️ PRICE", value: `₹${cost}` },
            { label: "💰 WALLET", value: `₹${currentBalance}` },
          ],
          footer: "⚠️ ERROR • Insufficient funds in your account.",
        });
        await sendMessage(chatId, card);
        return;
      }

      // Execute transaction
      await env.DB.prepare(
        `UPDATE users SET balance = balance - ?, ammo = ammo + ? WHERE user_id = ?`
      ).bind(cost, purchaseQty, userId).run();

      const card = createStatusCard({
        title: "🛒 AMMO ACQUIRED",
        rows: [
          { label: "👤 BUYER", value: update.message.from.first_name || "Unknown" },
          { label: "📦 BOUGHT", value: `+${purchaseQty} rounds` },
          { label: "🔋 TOTAL", value: `${currentAmmo + purchaseQty} rounds` },
          { label: "💰 CASH", value: `₹${currentBalance - cost}` },
        ],
        footer: `✅ RECEIPT • Expended ₹${cost} (₹1/bullet)`,
      });
      await sendMessage(chatId, card);
      return;
    }

    // =========================================================================
    // ╭━━━━━━━━━━━━━━━✪ [COMBAT SYSTEM: /fire, /f]
    // =========================================================================
    if (lowerText.startsWith("/fire") || lowerText.startsWith("/f")) {
      const now = Math.floor(Date.now() / 1000);

      // Ensure shooter exists in DB
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until) 
         VALUES (?, 1000, 1, 0, 0, 0, 0, 0)`
      ).bind(userId).run();

      const shooter = await env.DB.prepare(
        `SELECT balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until 
         FROM users WHERE user_id = ? LIMIT 1`
      ).bind(userId).first<any>();

      // 1. Lockout and Cooldown Verification
      if (shooter.fire_lock_until && shooter.fire_lock_until > now) {
        const remaining = shooter.fire_lock_until - now;
        const card = createStatusCard({
          title: "🚨 WEAPON JAMMED",
          rows: [
            { label: "👤 SHOOTER", value: update.message.from.first_name || "Unknown" },
            { label: "⚠️ STATUS", value: "LOCKED OUT" },
            { label: "⏳ TIME", value: `${remaining}s remaining` },
          ],
          footer: "🛑 ANTI-SPAM • 4-minute lockout for spamming triggers.",
        });
        await sendMessage(chatId, card);
        return;
      }

      // Check spam velocity (less than 2s between triggers)
      const lastFire = shooter.last_fire_time || 0;
      let strikes = shooter.fire_spam_strikes || 0;
      if (now - lastFire < 2) {
        strikes += 1;
        if (strikes >= 4) {
          const lockTime = now + 240; // 4-minute penalty
          await env.DB.prepare(
            `UPDATE users SET fire_spam_strikes = 0, fire_lock_until = ?, last_fire_time = ? WHERE user_id = ?`
          ).bind(lockTime, now, userId).run();

          const card = createStatusCard({
            title: "🚨 TRIGGER LOCK ENGAGED",
            rows: [
              { label: "👤 SHOOTER", value: update.message.from.first_name || "Unknown" },
              { label: "⚠️ VIOLATION", value: "Spam threshold reached" },
              { label: "⏳ LOCKOUT", value: "240s penalty" },
            ],
            footer: "🛑 ENFORCEMENT • Trigger disabled for 4 minutes.",
          });
          await sendMessage(chatId, card);
          return;
        } else {
          await env.DB.prepare(
            `UPDATE users SET fire_spam_strikes = ?, last_fire_time = ? WHERE user_id = ?`
          ).bind(strikes, now, userId).run();

          const card = createStatusCard({
            title: "⚠️ COOLDOWN ACTIVE",
            rows: [
              { label: "👤 SHOOTER", value: update.message.from.first_name || "Unknown" },
              { label: "⚠️ STRIKES", value: `${strikes} / 4` },
              { label: "⏱️ DELAY", value: "2s required" },
            ],
            footer: "⏰ WARNING • Fast clicks will result in a 4-minute lock.",
          });
          await sendMessage(chatId, card);
          return;
        }
      } else {
        // Reset strikes upon valid cooldown interval
        strikes = 0;
      }

      // 2. Shooter Status & Ammo Verification
      if (!shooter.is_alive) {
        const card = createStatusCard({
          title: "💀 ACTION DENIED",
          rows: [
            { label: "👤 STATUS", value: "KNOCKED OUT" },
            { label: "🆔 UID", value: userId },
          ],
          footer: "💡 HINT • You are dead. Use /revive to re-enter combat.",
        });
        await sendMessage(chatId, card);
        return;
      }

      if ((shooter.ammo || 0) < 1) {
        const card = createStatusCard({
          title: "🚫 CLICK... CLICK...",
          rows: [
            { label: "👤 SHOOTER", value: update.message.from.first_name || "Unknown" },
            { label: "🔋 AMMO", value: "0 rounds" },
          ],
          footer: "💡 HINT • Chamber empty. Purchase bullets with /b [amount].",
        });
        await sendMessage(chatId, card);
        return;
      }

      // 3. Resolve Combat Target
      let targetId: number | null = update.message.reply_to_message?.from?.id || null;
      let targetName: string = update.message.reply_to_message?.from?.first_name || "Target";

      if (!targetId && args.length > 0) {
        const parsedTarget = parseInt(args[0], 10);
        if (!isNaN(parsedTarget)) {
          targetId = parsedTarget;
          targetName = `Target_${targetId}`;
        }
      }

      if (!targetId) {
        await sendMessage(
          chatId,
          "❌ <b>Target required.</b> Reply to an enemy message or supply their numeric ID (e.g. <code>/fire 123456789</code>)."
        );
        return;
      }

      if (targetId === userId) {
        await sendMessage(chatId, "❌ You cannot pull the trigger on yourself.");
        return;
      }

      // 4. Target Verification & Active Shield Check
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until) 
         VALUES (?, 1000, 1, 0, 0, 0, 0, 0)`
      ).bind(targetId).run();

      const target = await env.DB.prepare(
        `SELECT balance, is_alive, protection_until FROM users WHERE user_id = ? LIMIT 1`
      ).bind(targetId).first<any>();

      if (!target || !target.is_alive) {
        await sendMessage(chatId, `❌ <b>Target already down.</b> ${targetName} is already eliminated.`);
        return;
      }

      // Shield defense check
      if (target.protection_until && target.protection_until > now) {
        // Safe encounter: refund ammo, update cooldown timestamp
        await env.DB.prepare(
          `UPDATE users SET last_fire_time = ?, fire_spam_strikes = 0 WHERE user_id = ?`
        ).bind(now, userId).run();

        const card = createStatusCard({
          title: "🛡️ TARGET DEFENDED",
          rows: [
            { label: "🔫 SHOOTER", value: update.message.from.first_name || "Unknown" },
            { label: "🎯 TARGET", value: targetName },
            { label: "🛡️ SHIELD", value: "ACTIVE" },
            { label: "🔋 AMMO", value: "Preserved (100%)" },
          ],
          footer: "🛡️ DEFENSE • Shot deflected by Underworld protection.",
        });
        await sendMessage(chatId, card);
        return;
      }

      // 5. Consume 1 Round & Execute RNG Hit Calculation (95% Success, 5% Misfire)
      const roll = Math.random() * 100;
      const isMisfire = roll < 5;

      if (isMisfire) {
        await env.DB.prepare(
          `UPDATE users SET ammo = ammo - 1, last_fire_time = ?, fire_spam_strikes = 0 WHERE user_id = ?`
        ).bind(now, userId).run();

        const card = createStatusCard({
          title: "💨 MISFIRE!",
          rows: [
            { label: "🔫 SHOOTER", value: update.message.from.first_name || "Unknown" },
            { label: "🎯 TARGET", value: targetName },
            { label: "🎲 RNG ROLL", value: `${roll.toFixed(1)}% (Misfire)` },
            { label: "🔋 AMMO", value: `${shooter.ammo - 1} left` },
          ],
          footer: "⚠️ MALFUNCTION • Round jammed in the chamber. Target escapes.",
        });
        await sendMessage(chatId, card);
        return;
      }

      // 6. Successful Elimination & Loot Calculation
      // Reward: 20% of target balance (min ₹100, max ₹5,000)
      const stolenCash = Math.min(Math.max(Math.floor((target.balance || 0) * 0.2), 100), 5000);

      await env.DB.batch([
        // Shooter: -1 ammo, +1 kill, +stolenCash, update timer
        env.DB.prepare(
          `UPDATE users SET ammo = ammo - 1, kills = kills + 1, balance = balance + ?, last_fire_time = ?, fire_spam_strikes = 0 WHERE user_id = ?`
        ).bind(stolenCash, now, userId),
        // Target: knocked out, lose stolenCash
        env.DB.prepare(
          `UPDATE users SET is_alive = 0, balance = MAX(0, balance - ?) WHERE user_id = ?`
        ).bind(stolenCash, targetId),
      ]);

      const card = createStatusCard({
        title: "💥 CONTRACT EXECUTED",
        rows: [
          { label: "🔫 SHOOTER", value: update.message.from.first_name || "Unknown" },
          { label: "🎯 TARGET", value: targetName },
          { label: "💀 STATUS", value: "ELIMINATED" },
          { label: "💰 LOOT", value: `+₹${stolenCash}` },
          { label: "🔋 AMMO", value: `${shooter.ammo - 1} left` },
        ],
        footer: "⏰ COOLDOWN • 2s active • 1 round expended",
      });
      await sendMessage(chatId, card);
      return;
    }


    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END


    // ====================================================
    // ╭━━━━━━━━━━━━━━━✪ [ROB COMMAND HANDLER]
    // ====================================================

    if (text.startsWith("/rob")) {
      const now = Math.floor(Date.now() / 1000);

      // 1. Identify Target (Reply or ID Argument)
      let targetId: number | null = update.message.reply_to_message?.from?.id || null;
      let targetDisplay: string = update.message.reply_to_message?.from?.first_name || "Unknown";

const idArg = args.find((a: string) => !isNaN(parseInt(a)) && a.length > 6);
      if (idArg) {
        targetId = parseInt(idArg);
        targetDisplay = `Target [${targetId}]`;
      }

      if (!targetId) {
        await sendMessage(
          chatId,
          "❌ <b>Target Required</b>\n\n<blockquote>Reply to a player's message or specify their user ID to rob them.\nUsage: <code>/rob [id]</code> or reply with <code>/rob</code></blockquote>"
        );
        return;
      }

      // 2. Prevent Self-Robbery
      if (targetId === userId) {
        await sendMessage(chatId, "❌ You cannot rob yourself.");
        return;
      }

      // 3. Ensure Raider Exists & Is Alive
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until, protection_until)
         VALUES (?, 1000, 1, 0, 0, 0, 0, 0, 0)`
      ).bind(userId).run();

      const raider = await env.DB.prepare(
        `SELECT balance, is_alive FROM users WHERE user_id = ? LIMIT 1`
      ).bind(userId).first<any>();

      if (!raider || !raider.is_alive) {
        await sendMessage(
          chatId,
          "💀 <b>KNOCKED OUT</b>\n\n<blockquote>You are currently incapacitated. Use /revive before committing crimes.</blockquote>"
        );
        return;
      }

      // 4. Fetch Target & Enforce Shield Check
      const targetDb = await env.DB.prepare(
        `SELECT balance, is_alive, protection_until FROM users WHERE user_id = ? LIMIT 1`
      ).bind(targetId).first<any>();

      if (!targetDb) {
        await sendMessage(chatId, "❌ Target not found in the Underworld database.");
        return;
      }

      // Active Shield Check
      if (targetDb.protection_until && targetDb.protection_until > now) {
        const remainingMinutes = Math.ceil((targetDb.protection_until - now) / 60);
        await sendMessage(
          chatId,
          `🛡️ <b>TARGET PROTECTED</b>\n\n<blockquote>${targetDisplay} has active Underworld Protection.\nRobbery blocked by their private security (${remainingMinutes}m remaining).</blockquote>`
        );
        return;
      }

      // Check Target Minimum Funds
      if (targetDb.balance < 100) {
        await sendMessage(
          chatId,
          `❌ <b>Pockets Empty</b>\n\n<blockquote>Target only has ₹${targetDb.balance}. Not worth the risk.</blockquote>`
        );
        return;
      }

      // 5. Robbery RNG & Calculation (65% Success Rate)
      const isSuccess = Math.random() < 0.65;
      const raiderName = update.message.from.first_name || "Raider";

      if (!isSuccess) {
        // Robbery Failed: Small penalty fine of ₹50
        const penalty = Math.min(50, raider.balance);
        await env.DB.prepare(
          `UPDATE users SET balance = MAX(0, balance - ?) WHERE user_id = ?`
        ).bind(penalty, userId).run();

        const failCard = createStatusCard({
          title: "🚨 HEIST FAILED",
          rows: [
            { label: "👤 RAIDER", value: raiderName },
            { label: "🎯 TARGET", value: targetDisplay.replace(/<[^>]*>/g, "") },
            { label: "⚠️ RESULT", value: "Busted by Cops" },
            { label: "💸 PENALTY", value: `-₹${penalty}` },
            { label: "💼 WALLET", value: `₹${Math.max(0, raider.balance - penalty)}` },
          ],
          footer: "⏰ COOLDOWN • Security alarms triggered • Be cautious",
        });

        await sendMessage(chatId, failCard);
        return;
      }

      // Robbery Succeeded: Steal 15% to 30% of target balance (Capped at ₹5,000 per attempt)
      const stealPercentage = 0.15 + Math.random() * 0.15;
      const stolenAmount = Math.min(5000, Math.max(10, Math.floor(targetDb.balance * stealPercentage)));

      // 6. Atomic Ledger Balance Updates
      await env.DB.batch([
        env.DB.prepare(`UPDATE users SET balance = balance - ? WHERE user_id = ?`).bind(stolenAmount, targetId),
        env.DB.prepare(`UPDATE users SET balance = balance + ? WHERE user_id = ?`).bind(stolenAmount, userId),
      ]);

      const successCard = createStatusCard({
        title: "🎭 HEIST SUCCESSFUL",
        rows: [
          { label: "👤 RAIDER", value: raiderName },
          { label: "🎯 TARGET", value: targetDisplay.replace(/<[^>]*>/g, "") },
          { label: "💰 STOLEN", value: `₹${stolenAmount}` },
          { label: "💼 WALLET", value: `₹${raider.balance + stolenAmount}` },
        ],
        footer: "⏰ ESCAPE • Clean getaway • No evidence left behind",
      });

      await sendMessage(chatId, successCard);
      return;
    }
    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END ROB COMMAND

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
    
// ====================================================
    // --- PROMOTE ---

    if (text.startsWith("/promote")) {
      // 1. Permission Gatekeeper
      const isOwner = userId === Number(CONFIG.OWNER_ID);
      const callerAdmin = await DB_MANAGER.getAdmin(env.DB, chatId, userId);
      const isHighAdmin = isOwner || (callerAdmin !== null && callerAdmin.level >= 3);
      const reply = update.message?.reply_to_message;

      if (!isHighAdmin) {
        await sendMessage(chatId, "❌ <b>Access Denied:</b> Only Owner and Level 3 Admins can promote users.");
        return;
      }

      // 2. Resolve Target User and Level
      let targetUserId: number | null = null;
      let targetName = "User";

      if (update.message?.reply_to_message?.from) {
        targetUserId = update.message.reply_to_message.from.id;
        targetName = update.message.reply_to_message.from.first_name || "User";
      }

      const idArg = args.find((a: string) => !isNaN(parseInt(a)) && a.length > 7);
      const lvlArg = args.find((a: string) => ["1", "2", "3"].includes(a));

      if (idArg) {
        targetUserId = parseInt(idArg);
        targetName = `ID:${targetUserId}`;
      }

      if (!targetUserId) {
        await sendMessage(
          chatId,
          "⚠️ <b>Usage:</b> Reply to a user with <code>/promote [1|2|3]</code> or provide an ID: <code>/promote [id] [1|2|3]</code>"
        );
        return;
      }

      const targetLevel = lvlArg ? parseInt(lvlArg) : 1;

      // 3. Telegram API Sync
      const response = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: targetUserId,
          can_manage_chat: true,
          can_delete_messages: true,
          can_manage_video_chats: true,
          can_restrict_members: targetLevel >= 2,
          can_promote_members: targetLevel >= 3,
          can_change_info: targetLevel >= 2,
          can_invite_users: true,
          can_pin_messages: true,
        }),
      });

      const data = (await response.json()) as any;

      if (!data.ok) {
        await sendMessage(
          chatId,
          `❌ <b>Telegram Error:</b> ${data.description}\n<i>(Ensure the bot has "Add New Admins" permission!)</i>`
        );
        return;
      }

      // 4. Database Sync
      await DB_MANAGER.setAdmin(env.DB, chatId, targetUserId, targetLevel, `Level ${targetLevel} Admin`);

      // 5. Standardized UI Output
      const card = createStatusCard({
        title: "⭐ PROMOTION SUCCESSFUL",
        rows: [
          { label: "👤 ADMIN", value: targetName },
          { label: "🆔 UID", value: targetUserId },
          { label: "🔰 LEVEL", value: `Level ${targetLevel}` },
          {
            label: "🛡️ PERMS",
            value: targetLevel === 3 ? "Full Admin" : targetLevel === 2 ? "Moderator" : "Junior Admin",
          },
        ],
        footer: "👑 SYSTEM • Privileges synchronized with Telegram API",
      });

      await sendMessage(chatId, card);
      return;
    }

// ====================================================

    // ==========================================
    // 🛡️ ADMIN: /demote
    // ==========================================
    if (text.startsWith("/demote")) {
      const isOwner = userId === Number(CONFIG.OWNER_ID);
      const callerAdmin = await DB_MANAGER.getAdmin(env.DB, chatId, userId);
      const isHighAdmin = isOwner || (callerAdmin !== null && callerAdmin.level >= 3);
      const reply = update.message?.reply_to_message;

      if (!isHighAdmin) return;

      const idArg = args.find((a: string) => !isNaN(parseInt(a)) && a.length > 7);
      let targetUserId: number | null = null;
      let targetName = "Player";

      if (reply) {
        targetUserId = reply.from.id;
        targetName = reply.from.first_name;
      } else if (idArg) {
        targetUserId = parseInt(idArg);
        targetName = `User (${idArg})`;
      }

      if (!targetUserId) {
        await sendMessage(chatId, "⚠️ <b>Usage:</b> Reply to a user with <code>/demote</code> or specify an ID: <code>/demote [id]</code>");
        return;
      }

      // Revoke all permissions on Telegram
      const response = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: targetUserId,
          can_manage_chat: false,
          can_change_info: false,
          can_post_messages: false,
          can_edit_messages: false,
          can_delete_messages: false,
          can_invite_users: false,
          can_restrict_members: false,
          can_pin_messages: false,
          can_promote_members: false,
          can_manage_video_chats: false,
          can_manage_voice_chats: false,
          is_anonymous: false,
        }),
      });

      const data = (await response.json()) as any;

      if (!data.ok) {
        await sendMessage(chatId, `❌ <b>Telegram Error:</b> ${data.description}\n<i>(Ensure the bot has permission to manage administrators!)</i>`);
        return;
      }

      // Remove admin privileges from database
      await DB_MANAGER.removeAdmin(env.DB, chatId, targetUserId);

      const card = createStatusCard({
        title: "🛡️ ADMIN DEMOTED",
        rows: [
          { label: "👤 TARGET", value: targetName },
          { label: "🆔 UID", value: targetUserId },
          { label: "🎖️ RANK", value: "Revoked" },
          { label: "👮 BY", value: update.message.from.first_name },
        ],
        footer: "⚡ STATUS • Privileges stripped successfully",
      });

      await sendMessage(chatId, card);
      return;
    }

    // ==========================================
    // 🏷️ ADMIN: /title
    // ==========================================
    if (text.startsWith("/title")) {
      const isOwner = userId === Number(CONFIG.OWNER_ID);
      const callerAdmin = await DB_MANAGER.getAdmin(env.DB, chatId, userId);
      const isHighAdmin = isOwner || (callerAdmin !== null && callerAdmin.level >= 3);
      const reply = update.message?.reply_to_message;

      if (!isHighAdmin) return;

      let titleName = args.filter((a: string) => isNaN(parseInt(a)) || a.length < 7).join(" ");
      const idArg = args.find((a: string) => !isNaN(parseInt(a)) && a.length > 7);

      let targetUserId: number | null = null;
      let targetName = "Player";

      if (reply) {
        targetUserId = reply.from.id;
        targetName = reply.from.first_name;
      } else if (idArg) {
        targetUserId = parseInt(idArg);
        targetName = `User (${idArg})`;
      }

      if (!targetUserId || !titleName.trim()) {
        await sendMessage(chatId, "⚠️ <b>Usage:</b> Reply to an admin with <code>/title [Custom Title]</code> or <code>/title [Custom Title] [id]</code>");
        return;
      }

      // Truncate custom title to 16 characters (Telegram API limit)
      titleName = titleName.trim().slice(0, 16);

      // Verify the member is promoted first
      await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/promoteChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: targetUserId,
          can_manage_chat: true,
        }),
      });

      // Assign the custom badge/title
      const titleRes = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setChatAdministratorCustomTitle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: targetUserId,
          custom_title: titleName,
        }),
      });

      const titleData = (await titleRes.json()) as any;

      if (!titleData.ok) {
        await sendMessage(chatId, `❌ <b>Telegram Error:</b> ${titleData.description}\n<i>(Bot needs 'Add Admins' right!)</i>`);
        return;
      }

      // Sync updated title to database
      const existingAdmin = await DB_MANAGER.getAdmin(env.DB, chatId, targetUserId);
      const currentLevel = existingAdmin ? existingAdmin.level : 1;
      await DB_MANAGER.setAdmin(env.DB, chatId, targetUserId, currentLevel, titleName);

      const card = createStatusCard({
        title: "🏷️ TITLE UPDATED",
        rows: [
          { label: "👤 TARGET", value: targetName },
          { label: "🆔 UID", value: targetUserId },
          { label: "🏷️ TITLE", value: titleName },
          { label: "👮 BY", value: update.message.from.first_name },
        ],
        footer: "⚡ STATUS • Telegram badge synced successfully",
      });

      await sendMessage(chatId, card);
      return;
    }

    // ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
    
  }, // <--- ⚠️ THIS IS THE MAGIC COMMA THAT FIXES THE CRASH ⚠️
  
  // ====================================================
  // ====================================================
  // ╭━━━━━━━━━━━━━━━✪
  // │ 🕹️ CALLBACK ROUTER (DYNAMIC UI & GHOST PROTOCOL)
  // ╰━━━━━━━━━━━━━━━✪
  async processCallback(query: any, env: CloudflareEnv, editMessageText: any, answerCallbackQuery: any) {
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const messageDate = query.message.date; // When the menu was created

    // ⏳ UPGRADE 2: THE 1-HOUR GHOST PROTOCOL
    const currentTime = Math.floor(Date.now() / 1000);
    if (messageDate && (currentTime - messageDate) > 3600) {
      // Menu is older than 1 hour. Kill it.
      await answerCallbackQuery(query.id, "❌ This menu has expired (1 Hour). Type /start for a new terminal.", true);
      return; 
    }

    await answerCallbackQuery(query.id); // Stops the loading spinner

    // 🖥️ MAIN MENU HUB
    if (data === "menu_start") {
      const botUsername = "T_he_Main_Bot";
         const replyMarkup = {
        inline_keyboard: [
          [{ text: "👤 My Profile", callback_data: "menu_profile" }], // <--- Stats removed here too!
          [{ text: "➕ Add to Group", url: `https://t.me/${botUsername}?startgroup=true` }, { text: "⚙️ Settings", callback_data: "menu_settings" }]
        ]
      };

      const msg = `👑 <b>THE UNDERWORLD TERMINAL</b>\n\n<blockquote><b>Welcome back, Agent.</b>\nConnection established. All systems are green. Select a module below to begin.</blockquote>`;
      await editMessageText(chatId, messageId, msg, replyMarkup);
    }

    // 👤 DYNAMIC PROFILE SCREEN
    else if (data === "menu_profile") {
      // Fetch fresh stats from the Vault
      const user = await DB_MANAGER.getUser(env.DB, userId) || { balance: 0, kills: 0 };
      
      const replyMarkup = { inline_keyboard: [[{ text: "🔙 Back to Hub", callback_data: "menu_start" }]] };
      
      const msg = `👤 <b>AGENT PROFILE</b>\n\n<blockquote><b>Name:</b> ${query.from.first_name}\n<b>ID:</b> <code>${userId}</code>\n<b>Bank Vault:</b> ₹${user.balance}\n<b>Hitman Kills:</b> ${user.kills}</blockquote>`;
      
      await editMessageText(chatId, messageId, msg, replyMarkup);
    }

    // ⚙️ SETTINGS MENU
    else if (data === "menu_settings") {
      const replyMarkup = {
        inline_keyboard: [
          [{ text: "👋 Welcome", callback_data: "menu_welcome" }, { text: "My friend 🤫", url: "tg://settings" }],
          [{ text: "Soon ⏳", callback_data: "alert_soon" }, { text: "Soon ⏳", callback_data: "alert_soon" }],
          [{ text: "🔙 Back to Hub", callback_data: "menu_start" }]
        ]
      };
      const msg = `⚙️ <b>SETTINGS MENU</b>\n\n<blockquote>Configure your Underworld experience and group rules below.</blockquote>`;
      await editMessageText(chatId, messageId, msg, replyMarkup);
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
      await answerCallbackQuery(query.id); // Stop the loading spinner
      
      const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
      let textTemplate = (settings && settings.welcome_text) ? settings.welcome_text : "Welcome to the Underworld, {name}!";
      const mediaData = settings ? settings.welcome_media_id : null;
      
      // Replace placeholders with the Admin's name so they can see how it looks
      let finalMsg = "👁️ <b>[WELCOME PREVIEW]</b>\n\n" + textTemplate.replace(/{name}/g, query.from.first_name).replace(/{id}/g, userId.toString());

      // No media? Just send text preview.
      if (!mediaData || mediaData === 'none' || !mediaData.includes(':')) {
        await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: finalMsg, parse_mode: "HTML" })
        });
      } 
      // Has Media? Send the actual media with the text as a caption!
      else {
        const [mediaType, fileId] = mediaData.split(':');
        let endpoint = "";
        let payload: any = { chat_id: chatId, parse_mode: "HTML" };

        if (mediaType === "photo") { endpoint = "sendPhoto"; payload.photo = fileId; payload.caption = finalMsg; }
        else if (mediaType === "video") { endpoint = "sendVideo"; payload.video = fileId; payload.caption = finalMsg; }
        else if (mediaType === "animation") { endpoint = "sendAnimation"; payload.animation = fileId; payload.caption = finalMsg; }
        else if (mediaType === "sticker") { 
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
  // │ 🚪 THE FLAWLESS GREETING PROTOCOL
  // ╰━━━━━━━━━━━━━━━✪
  async processWelcomeFlawless(chatMemberUpdate: any, env: CloudflareEnv) {
    const chatId = chatMemberUpdate.chat.id;
    const chatTitle = chatMemberUpdate.chat.title || "the group";
    const user = chatMemberUpdate.new_chat_member.user;

    if (user.is_bot) return; // Do not welcome other bots

    // Check if the group has Welcomes turned ON
    const settings = await DB_MANAGER.getGroupSettings(env.DB, chatId);
    if (!settings || settings.welcome_enabled !== 1) return;

    let textTemplate = settings.welcome_text || "Welcome {first} to {group}!";
    const mediaData = settings.welcome_media_id; 

    // --- SECURITY SHIELD (Prevents HTML Crashes) ---
    const escapeHtml = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    
    const safeFirst = escapeHtml(user.first_name || "Agent");
    const safeLast = escapeHtml(user.last_name || "");
    const safeName = escapeHtml((`${user.first_name || ""} ${user.last_name || ""}`).trim() || "Agent");
    const safeUsername = user.username ? `@${escapeHtml(user.username)}` : safeFirst;
    const safeGroup = escapeHtml(chatTitle);

    // --- BEGINNER-FRIENDLY DECORATION REPLACER ---
    let finalMsg = textTemplate
      .replace(/{first}/gi, safeFirst)
      .replace(/{last}/gi, safeLast)
      .replace(/{name}/gi, safeName)
      .replace(/{username}/gi, safeUsername)
      .replace(/{id}/gi, user.id.toString())
      .replace(/{group}/gi, safeGroup);


    // --- SENDING LOGIC (Using Free Telegram Cloud Storage) ---
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
}; // <-- Closes the GAME object
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END OF GAME FILE
