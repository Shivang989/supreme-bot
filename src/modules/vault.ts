import { BotContext, CommandHandler, MarketItem, CloudflareEnv } from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG, MARKET_ITEMS } from "../config";
import { MUSCLE } from "../muscle";
import { createStatusCard } from "../ui";
import { sendMessage, answerCallbackQuery } from "../index";

const BULLET_PRICE = 10; // Cost per ammo round in ₹

export const SAFE_PLANS: Record<number, number> = {
  1: 300, // 1 Day -> ₹300
  2: 400, // 2 Days -> ₹400
  3: 600, // 3 Days -> ₹600
};

export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || (d === 0 && h === 0)) parts.push(`${m}m`);
  if (d === 0 && h === 0 && m === 0) parts.push(`${s}s`);

  return parts.join(" ") || "a few seconds";
}

function resolveTarget(ctx: BotContext): { targetId: number | null; targetName: string } {
  if (ctx.reply && ctx.reply.from) {
    return {
      targetId: ctx.reply.from.id,
      targetName: ctx.reply.from.first_name,
    };
  }

  const idArg = ctx.args.find((a: string) => !isNaN(parseInt(a)) && a.length > 6);
  if (idArg) {
    return {
      targetId: parseInt(idArg),
      targetName: `Operative (${idArg})`,
    };
  }

  return { targetId: null, targetName: "Unknown" };
}

/**
 * Core business logic for purchasing / extending safe protection
 */
export async function processSafePurchase(
  env: CloudflareEnv,
  userId: number,
  userName: string,
  days: number
): Promise<{ ok: boolean; message: string; receiptCard?: string }> {
  await DB_MANAGER.ensureUserExists(env.DB, userId);
  const user = await DB_MANAGER.getUser(env.DB, userId);
  if (!user) return { ok: false, message: "⚠️ Operative profile not found." };

  if (user.is_alive === 0) {
    return { ok: false, message: "💀 You are eliminated. Revive first using <code>/revive</code>." };
  }

  const cost = SAFE_PLANS[days];
  if (!cost) {
    return { ok: false, message: "⚠️ Invalid safe duration. Choose 1d, 2d, or 3d." };
  }

  const now = Math.floor(Date.now() / 1000);
  const activeRemaining = user.protected_until && user.protected_until > now
    ? user.protected_until - now
    : 0;

  const durationSec = days * 86400;
  const MAX_SAFE_SECONDS = 3 * 86400; // 3 Days Max

  if (activeRemaining + durationSec > MAX_SAFE_SECONDS) {
    return {
      ok: false,
      message:
        `⚠️ <b>Max Safe Limit Exceeded:</b> Maximum total protection allowed is 3 days (72h).\n` +
        `You currently have <b>${formatRemainingTime(activeRemaining)}</b> remaining.`,
    };
  }

  if (user.balance < cost) {
    return {
      ok: false,
      message: `❌ Insufficient funds. <b>${days}d</b> protection costs <b>₹${cost}</b>, but you have <b>₹${user.balance}</b>.`,
    };
  }

  const newBalance = user.balance - cost;
  const baseTime = activeRemaining > 0 ? user.protected_until! : now;
  const newProtectedUntil = baseTime + durationSec;

  try {
    await env.DB.prepare(
      "UPDATE users SET balance = ?, protected_until = ? WHERE user_id = ?"
    )
      .bind(newBalance, newProtectedUntil, userId)
      .run();
  } catch {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN protected_until INTEGER DEFAULT 0").run();
    await env.DB.prepare(
      "UPDATE users SET balance = ?, protected_until = ? WHERE user_id = ?"
    )
      .bind(newBalance, newProtectedUntil, userId)
      .run();
  }

  const totalRemaining = newProtectedUntil - now;
  const receiptCard = createStatusCard({
    title: "🛡️ SAFE ACTIVATED",
    rows: [
      { label: "👤 PLAYER", value: userName },
      { label: "⏱️ DURATION", value: `${days} Day${days > 1 ? "s" : ""}` },
      { label: "💰 COST", value: `₹${cost}` },
      { label: "⏳ SECURED", value: formatRemainingTime(totalRemaining) },
      { label: "💼 CASH LEFT", value: `₹${newBalance}` },
    ],
    footer: "🔒 100% immune to /rob. Thieves will be charged ₹10 compensation to you.",
  });

  return { ok: true, message: "Safe activated successfully!", receiptCard };
}

/**
 * Handle DM Button Clicks for /safe
 */
export async function handleSafeCallback(env: CloudflareEnv, cq: any): Promise<boolean> {
  const data: string = cq.data || "";
  if (!data.startsWith("safe_buy:")) return false;

  const days = parseInt(data.replace("safe_buy:", ""));
  const userId = cq.from?.id;
  const chatId = cq.message?.chat?.id;

  if (!userId || !chatId || !days) return false;

  const result = await processSafePurchase(env, userId, cq.from?.first_name || "Player", days);

  if (!result.ok) {
    await answerCallbackQuery(cq.id, result.message.replace(/<[^>]*>/g, ""), true);
    return true;
  }

  await answerCallbackQuery(cq.id, `✅ ${days} Day Safe Protection Activated!`);
  if (result.receiptCard) {
    await sendMessage(chatId, result.receiptCard);
  }
  return true;
}

export const vaultHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 🛡️ /safe - Immunity Protection from /rob
  // ==========================================
  "/safe": async (ctx: BotContext) => {
    try {
      await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);
      const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
      if (!user) return;

      const now = Math.floor(Date.now() / 1000);
      const activeRemaining = user.protected_until && user.protected_until > now
        ? user.protected_until - now
        : 0;

      const rawPlan = (ctx.args[0] || "").toLowerCase().trim().replace("d", "");
      const days = parseInt(rawPlan);

      // Direct text command executed: /safe 1d, /safe 2d, /safe 3d
      if (days && SAFE_PLANS[days]) {
        const result = await processSafePurchase(
          ctx.env,
          ctx.userId,
          ctx.message.from.first_name,
          days
        );
        
        if (!result.ok) {
          await sendMessage(ctx.chatId, result.message, undefined, ctx.message?.message_id);
          return;
        }

        if (result.receiptCard) {
          await sendMessage(ctx.chatId, result.receiptCard, undefined, ctx.message?.message_id);
        }
        return;
      }

      // No argument provided: Construct the status & text guide
      let statusText = "⚪ <b>Status:</b> Not protected (Vulnerable to /rob)\n";
      if (activeRemaining > 0) {
        statusText = `🟢 <b>Status:</b> Protected (<b>${formatRemainingTime(activeRemaining)}</b> remaining)\n`;
      }

      const isPrivate = ctx.message.chat.type === "private" || ctx.chatId > 0;

      if (isPrivate) {
        // DM: Text Guide + Interactive Purchase Buttons
        const dmGuide =
          `🛡️ <b>SAFE VAULT PROTECTION</b>\n\n` +
          `Protect your money with 100% immunity from <code>/rob</code> attacks!\n` +
          `Anyone who attempts to rob your vault is penalized a <b>₹10 compensation fee</b> credited straight to you.\n\n` +
          `${statusText}\n` +
          `📋 <b>Protection Rates:</b>\n` +
          `• <b>1 Day (1d):</b> ₹300\n` +
          `• <b>2 Days (2d):</b> ₹400\n` +
          `• <b>3 Days (3d):</b> ₹600\n\n` +
          `Tap a button below to activate safe protection:`;

        const dmKb = {
          inline_keyboard: [
            [
              { text: "🛡️ 1 Day (₹300)", callback_data: "safe_buy:1" },
              { text: "🛡️ 2 Days (₹400)", callback_data: "safe_buy:2" },
            ],
            [
              { text: "🛡️ 3 Days (₹600)", callback_data: "safe_buy:3" },
            ],
          ],
        };

        await sendMessage(ctx.chatId, dmGuide, dmKb, ctx.message?.message_id);
      } else {
        // Group: Informative Text Guide with Command Instructions
        const groupGuide =
          `🛡️ <b>SAFE VAULT PROTECTION</b>\n\n` +
          `Protect your money with 100% immunity from <code>/rob</code> attacks!\n` +
          `Anyone who attempts to rob your vault is penalized a <b>₹10 compensation fee</b> credited straight to you.\n\n` +
          `${statusText}\n` +
          `📋 <b>Protection Rates & Commands:</b>\n` +
          `• <code>/safe 1d</code> — 1 Day (₹300)\n` +
          `• <code>/safe 2d</code> — 2 Days (₹400)\n` +
          `• <code>/safe 3d</code> — 3 Days (₹600)\n\n` +
          `💡 <i>Maximum protection cap is 3 days.</i>`;

        await sendMessage(ctx.chatId, groupGuide, undefined, ctx.message?.message_id);
      }
    } catch (err: any) {
      console.error("Safe handler failure:", err);
      await sendMessage(
        ctx.chatId,
        `⚠️ <b>Error processing safe:</b> <code>${err?.message || "Internal error"}</code>`
      );
    }
  },

  // ==========================================
  // 🔫 /b or /bullets - Check Ammo & Purchase
  // ==========================================
  "/bal": async (ctx: BotContext) => {
    await vaultHandlers["/b"](ctx);
  },
  "/balance": async (ctx: BotContext) => {
    await vaultHandlers["/b"](ctx);
  },

  "/b": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    const requestedAmount = parseInt(ctx.args[0]);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      const card = createStatusCard({
        title: "🔫 AMMO MAGAZINE",
        rows: [
          { label: "👤 PLAYER", value: ctx.message.from.first_name },
          { label: "🔋 AMMO", value: `${user.ammo ?? 0} rounds` },
          { label: "💰 CASH", value: `₹${user.balance}` },
          { label: "🏷️ UNIT PRICE", value: `₹${BULLET_PRICE} / round` },
        ],
        footer: "💡 HINT • Purchase rounds using /b [amount]",
      });

      await sendMessage(ctx.chatId, card);
      return;
    }

    const totalCost = requestedAmount * BULLET_PRICE;
    if (user.balance < totalCost) {
      await sendMessage(
        ctx.chatId,
        `❌ Insufficient funds. <b>${requestedAmount}</b> rounds cost <b>₹${totalCost}</b>, but you have <b>₹${user.balance}</b>.`
      );
      return;
    }

    const updatedBalance = user.balance - totalCost;
    const updatedAmmo = (user.ammo ?? 0) + requestedAmount;

    await ctx.env.DB.prepare("UPDATE users SET balance = ?, ammo = ? WHERE user_id = ?")
      .bind(updatedBalance, updatedAmmo, ctx.userId)
      .run();

    const receiptCard = createStatusCard({
      title: "📦 AMMO RESTOCKED",
      rows: [
        { label: "👤 BUYER", value: ctx.message.from.first_name },
        { label: "📦 PURCHASED", value: `+${requestedAmount} rounds` },
        { label: "💰 TOTAL COST", value: `₹${totalCost}` },
        { label: "🔋 NEW AMMO", value: `${updatedAmmo} rounds` },
        { label: "💼 CASH REMAINING", value: `₹${updatedBalance}` },
      ],
      footer: "⚡ Munitions loaded into primary magazine.",
    });

    await sendMessage(ctx.chatId, receiptCard);
  },

  "/bullets": async (ctx: BotContext) => {
    await vaultHandlers["/b"](ctx);
  },

  // ==========================================
  // 🎁 /daily - Claim Daily Allowance (₹1,000)
  // ==========================================
  "/daily": async (ctx: BotContext) => {
    try {
      await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);

      const REWARD = 1000;
      const COOLDOWN_SECONDS = 86400;
      const now = Math.floor(Date.now() / 1000);
      const threshold = now - COOLDOWN_SECONDS;

      const updateResult = await ctx.env.DB.prepare(
        `UPDATE users
         SET balance = balance + ?, last_daily = ?
         WHERE user_id = ? AND (last_daily IS NULL OR last_daily = 0 OR last_daily <= ?)`
      )
        .bind(REWARD, now, ctx.userId, threshold)
        .run();

      const changes = updateResult.meta?.changes ?? updateResult.meta?.rows_written ?? 0;

      if (changes > 0) {
        const successText =
          `🎁 <b>Daily Reward Claimed!</b>\n\n` +
          `💰 You received ₹1,000.\n\n` +
          `Come back after 24 hours for your next reward!`;

        await sendMessage(ctx.chatId, successText, undefined, ctx.message?.message_id);
        return;
      }

      const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
      const lastDaily = user?.last_daily ?? 0;
      const elapsed = now - lastDaily;
      const remainingSeconds = Math.max(0, COOLDOWN_SECONDS - elapsed);

      const cooldownText =
        `⏳ <b>You've already claimed your daily reward.</b>\n\n` +
        `Next reward available in: "${formatRemainingTime(remainingSeconds)}"`;

      await sendMessage(ctx.chatId, cooldownText, undefined, ctx.message?.message_id);
    } catch (err: any) {
      console.error("Daily handler failure:", err);
      await sendMessage(
        ctx.chatId,
        `⚠️ <b>Error processing daily:</b> <code>${err?.message || "Internal error"}</code>`
      );
    }
  },

  // ==========================================
  // 👤 /me or /profile - Underworld Dossier
  // ==========================================
  "/me": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    const now = Math.floor(Date.now() / 1000);
    const isSafe = user.protected_until && user.protected_until > now;

    const card = createStatusCard({
      title: "👤 UNDERWORLD DOSSIER",
      rows: [
        { label: "👤 PLAYER", value: ctx.message.from.first_name },
        { label: "🆔 UID", value: ctx.userId },
        { label: "💰 CASH", value: `₹${user.balance}` },
        { label: "🔋 AMMO", value: `${user.ammo ?? 0} rounds` },
        { label: "💀 KILLS", value: user.kills ?? 0 },
        { label: "🛡️ SAFE VAULT", value: isSafe ? formatRemainingTime(user.protected_until! - now) : "INACTIVE" },
        { label: "❤️ STATUS", value: user.is_alive === 0 ? "ELIMINATED" : "ALIVE" },
      ],
      footer: user.is_alive === 0
        ? "💀 STATUS • Knocked out. Use /revive to rejoin."
        : isSafe
        ? "🛡️ STATUS • Safe active. Immune to all /rob attempts."
        : "🟢 STATUS • Operational and armed.",
    });

    await sendMessage(ctx.chatId, card);
  },

  "/profile": async (ctx: BotContext) => {
    await vaultHandlers["/me"](ctx);
  },

  // ==========================================
  // 💸 /pay - Transfer Funds
  // ==========================================
  "/pay": async (ctx: BotContext) => {
    const sender = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!sender) return;

    if (sender.is_alive === 0) {
      await sendMessage(ctx.chatId, "💀 You are eliminated. Revive first using <code>/revive</code>.");
      return;
    }

    const amountArg = ctx.args.find((a: string) => !isNaN(parseInt(a)) && parseInt(a) > 0 && a.length <= 6);
    const amount = amountArg ? parseInt(amountArg) : null;

    if (!amount) {
      await sendMessage(
        ctx.chatId,
        "⚠️ <b>Usage:</b> Reply to a player or provide an ID: <code>/pay [amount]</code>"
      );
      return;
    }

    if (sender.balance < amount) {
      await sendMessage(ctx.chatId, `❌ Insufficient balance to transfer <b>₹${amount}</b>.`);
      return;
    }

    const { targetId, targetName } = resolveTarget(ctx);
    if (!targetId) {
      await sendMessage(ctx.chatId, "🎯 <b>Recipient Required:</b> Reply to a message or supply an ID.");
      return;
    }

    if (targetId === ctx.userId) {
      await sendMessage(ctx.chatId, "⚠️ You cannot transfer funds to yourself.");
      return;
    }

    await DB_MANAGER.ensureUserExists(ctx.env.DB, targetId);
    const recipient = await DB_MANAGER.getUser(ctx.env.DB, targetId);
    if (!recipient) return;

    await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, sender.balance - amount);
    await DB_MANAGER.updateBalance(ctx.env.DB, targetId, recipient.balance + amount);

    const transferCard = createStatusCard({
      title: "💸 WIRE TRANSFER",
      rows: [
        { label: "👤 SENDER", value: ctx.message.from.first_name },
        { label: "🎯 RECIPIENT", value: targetName },
        { label: "💰 AMOUNT", value: `₹${amount}` },
        { label: "💼 NEW BALANCE", value: `₹${sender.balance - amount}` },
      ],
      footer: "⚡ Direct transfer verified and recorded on ledger.",
    });

    await sendMessage(ctx.chatId, transferCard);
  },

  // ==========================================
  // 🎭 /rob - Underworld Heist (100% Block + ₹10 Compensation)
  // ==========================================
  "/rob": async (ctx: BotContext) => {
    const raider = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!raider) return;

    if (raider.is_alive === 0) {
      await sendMessage(ctx.chatId, "💀 You are eliminated. Revive first using <code>/revive</code>.");
      return;
    }

    const { targetId, targetName } = resolveTarget(ctx);
    if (!targetId) {
      await sendMessage(
        ctx.chatId,
        "🎯 <b>Target Required:</b> Reply to a target's message or specify an ID: <code>/rob [id]</code>"
      );
      return;
    }

    if (targetId === ctx.userId) {
      await sendMessage(ctx.chatId, "⚠️ You cannot rob yourself.");
      return;
    }

    await DB_MANAGER.ensureUserExists(ctx.env.DB, targetId);
    const target = await DB_MANAGER.getUser(ctx.env.DB, targetId);
    if (!target) return;

    if (target.is_alive === 0) {
      await sendMessage(ctx.chatId, `⚠️ ${targetName} is already eliminated.`);
      return;
    }

    // Safe Vault Verification & ₹10 Compensation Transfer
    const now = Math.floor(Date.now() / 1000);
    if (target.protected_until && target.protected_until > now) {
      const remainingSec = target.protected_until - now;
      const penaltyAmount = 10;
      const deducted = Math.min(raider.balance, penaltyAmount);

      // Charge penalty to raider
      if (deducted > 0) {
        await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, raider.balance - deducted);
      }
      // Credit full compensation to safe target
      await DB_MANAGER.updateBalance(ctx.env.DB, targetId, target.balance + penaltyAmount);

      const card = createStatusCard({
        title: "🛡️ SAFE IMMUNITY TRIGGERED",
        rows: [
          { label: "🎯 TARGET", value: targetName },
          { label: "🛡️ STATUS", value: "100% Safe Immune" },
          { label: "⏳ SAFE LEFT", value: formatRemainingTime(remainingSec) },
          { label: "💸 PENALTY", value: `-₹${penaltyAmount} Fee` },
          { label: "💼 YOUR CASH", value: `₹${Math.max(0, raider.balance - penaltyAmount)}` },
        ],
        footer: `🚨 Alarm tripped! Target vault is immune. ₹${penaltyAmount} penalty was transferred to ${targetName} as compensation.`,
      });

      await sendMessage(ctx.chatId, card);
      return;
    }

    if (target.balance < 50) {
      await sendMessage(ctx.chatId, `⚠️ ${targetName} doesn't have enough cash to steal (Min ₹50).`);
      return;
    }

    // Heist resolution: 45% success rate
    const roll = Math.random();
    const success = roll <= 0.45;

    if (!success) {
      const fine = Math.min(raider.balance, 75);
      if (fine > 0) {
        await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, raider.balance - fine);
      }

      const failCard = createStatusCard({
        title: "🚨 HEIST FAILED",
        rows: [
          { label: "👤 RAIDER", value: ctx.message.from.first_name },
          { label: "🎯 TARGET", value: targetName },
          { label: "👮 PENALTY", value: `-₹${fine}` },
          { label: "💼 BALANCE", value: `₹${raider.balance - fine}` },
        ],
        footer: "❌ Busted by local enforcers! Escaped with a fine.",
      });

      await sendMessage(ctx.chatId, failCard);
      return;
    }

    // Success: loot 15% to 30% of target cash (capped at ₹500)
    const stealPercent = 0.15 + Math.random() * 0.15;
    const stolenAmount = Math.min(500, Math.max(25, Math.floor(target.balance * stealPercent)));

    await DB_MANAGER.updateBalance(ctx.env.DB, targetId, target.balance - stolenAmount);
    await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, raider.balance + stolenAmount);

    const successCard = createStatusCard({
      title: "🎭 HEIST SUCCESSFUL",
      rows: [
        { label: "👤 RAIDER", value: ctx.message.from.first_name },
        { label: "🎯 TARGET", value: targetName },
        { label: "💰 STOLEN", value: `₹${stolenAmount}` },
        { label: "💼 NEW BALANCE", value: `₹${raider.balance + stolenAmount}` },
      ],
      footer: "⚡ Clean getaway. Loot safely stashed in the vault.",
    });

    await sendMessage(ctx.chatId, successCard);
  },

  // ==========================================
  // 🎒 /inv or /inventory - Inventory Check
  // ==========================================
  "/inv": async (ctx: BotContext) => {
    const items = await DB_MANAGER.getInventory(ctx.env.DB, ctx.userId);

    if (!items || items.length === 0) {
      await sendMessage(ctx.chatId, "🎒 <b>Inventory Empty:</b> You have no commodities stashed.");
      return;
    }

    const rows = items.slice(0, 6).map((item) => ({
      label: item.item_name.toUpperCase().slice(0, 10),
      value: `x${item.quantity}`,
    }));

    const card = createStatusCard({
      title: "🎒 CONTRABAND STASH",
      rows,
      footer: "💡 Sell items using /sell [item_name]",
    });

    await sendMessage(ctx.chatId, card);
  },

  "/inventory": async (ctx: BotContext) => {
    await vaultHandlers["/inv"](ctx);
  },

  // ==========================================
  // 📊 /market - Black Market Prices
  // ==========================================
  "/market": async (ctx: BotContext) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const marketEntries = Object.entries(MARKET_ITEMS);

    const rows = marketEntries.slice(0, 6).map(([key, item]) => {
      const currentPrice = MUSCLE.calculateMarketPrice(
        item.base_price,
        item.volatility ?? 0,
        currentTime
      );
      return {
        label: `${item.emoji ?? "📦"} ${item.name}`.slice(0, 10),
        value: `₹${currentPrice}`,
      };
    });

    const card = createStatusCard({
      title: "📊 BLACK MARKET COMMODITIES",
      rows,
      footer: "📈 Prices fluctuate dynamically with global volatility.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // 💰 /sell - Liquidate Commodities
  // ==========================================
  "/sell": async (ctx: BotContext) => {
    const rawItem = ctx.args.join("_").toLowerCase().trim();
    if (!rawItem) {
      await sendMessage(ctx.chatId, "⚠️ <b>Usage:</b> <code>/sell [item_name]</code> (e.g., /sell cheap_watch)");
      return;
    }

    const marketItem = MARKET_ITEMS[rawItem];
    if (!marketItem) {
      await sendMessage(ctx.chatId, "❌ Item not traded on the black market.");
      return;
    }

    const inventory = await DB_MANAGER.getInventory(ctx.env.DB, ctx.userId);
    const userItem = inventory.find((i) => i.item_name.toLowerCase() === rawItem);

    if (!userItem || userItem.quantity <= 0) {
      await sendMessage(ctx.chatId, `❌ You don't own any <b>${marketItem.name}</b>.`);
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const sellPrice = MUSCLE.calculateMarketPrice(
      marketItem.base_price,
      marketItem.volatility ?? 0,
      currentTime
    );

    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    await ctx.env.DB.prepare("UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_name = ?")
      .bind(ctx.userId, rawItem)
      .run();

    await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, user.balance + sellPrice);

    const card = createStatusCard({
      title: "💰 ASSET LIQUIDATED",
      rows: [
        { label: "📦 ITEM", value: marketItem.name },
        { label: "💰 SOLD FOR", value: `₹${sellPrice}` },
        { label: "💼 NEW BALANCE", value: `₹${user.balance + sellPrice}` },
      ],
      footer: "⚡ Transaction settled. Cash transferred to vault.",
    });

    await sendMessage(ctx.chatId, card);
  },
};
