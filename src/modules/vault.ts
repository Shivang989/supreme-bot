import { BotContext, CommandHandler, CloudflareEnv } from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG, MARKET_ITEMS } from "../config";
import { MUSCLE } from "../muscle";
import { createStatusCard } from "../ui";
import { sendMessage, answerCallbackQuery } from "../index";

const BULLET_PRICE = 10; // Cost per ammo round in ₹

export const SAFE_CONFIG: Record<number, { durationSec: number; price: number; label: string }> = {
  1: { durationSec: 86400, price: 300, label: "1 day" },
  2: { durationSec: 172800, price: 400, label: "2 days" },
  3: { durationSec: 259200, price: 600, label: "3 days" },
};

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || (d === 0 && h === 0)) parts.push(`${m}m`);

  return parts.join(" ") || "1m";
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
 * Unified Safe Protection Activation Service
 */
export async function activateSafeProtection(
  env: CloudflareEnv,
  userId: number,
  durationDays: number
): Promise<{ ok: boolean; message: string }> {
  const plan = SAFE_CONFIG[durationDays];
  if (!plan) {
    return {
      ok: false,
      message:
        "🛡️ <b>Safe Protection</b>\n\n" +
        "Usage:\n" +
        '<code>/safe 1</code> — 1 day (₹300)\n' +
        '<code>/safe 2</code> — 2 days (₹400)\n' +
        '<code>/safe 3</code> — 3 days (₹600)\n\n' +
        "Protection prevents robbery while active.",
    };
  }

  await DB_MANAGER.ensureUserExists(env.DB, userId);
  const user = await DB_MANAGER.getUser(env.DB, userId);
  if (!user) return { ok: false, message: "⚠️ User profile not found." };

  const now = Math.floor(Date.now() / 1000);

  // Check if protection is already active (No stacking)
  if (user.protected_until && user.protected_until > now) {
    const remaining = formatRemainingTime(user.protected_until - now);
    return {
      ok: false,
      message:
        `🛡️ <b>Protection Already Active</b>\n\n` +
        `Time remaining: ${remaining}\n\n` +
        `No additional payment was taken.`,
    };
  }

  // Check balance
  if (user.balance < plan.price) {
    return {
      ok: false,
      message:
        `❌ <b>Insufficient balance</b>\n\n` +
        `Required: ₹${plan.price}\n` +
        `Your balance: ₹${user.balance}\n\n` +
        `Earn more money and try again.`,
    };
  }

  const expiryTimestamp = now + plan.durationSec;

  // Atomic database update
  try {
    const result = await env.DB.prepare(
      `UPDATE users 
       SET balance = balance - ?, protected_until = ? 
       WHERE user_id = ? AND balance >= ? AND (protected_until IS NULL OR protected_until <= ?)`
    )
      .bind(plan.price, expiryTimestamp, userId, plan.price, now)
      .run();

    const changes = result.meta?.changes ?? result.meta?.rows_written ?? 0;
    if (changes === 0) {
      return {
        ok: false,
        message: "⚠️ Transaction failed or protection already active. Please try again.",
      };
    }
  } catch {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN protected_until INTEGER DEFAULT 0").run();
    await env.DB.prepare(
      `UPDATE users 
       SET balance = balance - ?, protected_until = ? 
       WHERE user_id = ? AND balance >= ? AND (protected_until IS NULL OR protected_until <= ?)`
    )
      .bind(plan.price, expiryTimestamp, userId, plan.price, now)
      .run();
  }

  const expiryDate = new Date(expiryTimestamp * 1000).toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    ok: true,
    message:
      `🛡️ <b>Protection Activated</b>\n\n` +
      `Duration: ${plan.label}\n` +
      `Paid: ₹${plan.price}\n` +
      `Expires: ${expiryDate} IST\n\n` +
      `Your balance is now protected from robbery.`,
  };
}

/**
 * Handle Inline Button Callbacks for /safe in DM
 */
export async function handleSafeCallback(env: CloudflareEnv, cq: any): Promise<boolean> {
  const data: string = cq.data || "";
  if (!data.startsWith("safe:")) return false;

  const days = parseInt(data.replace("safe:", ""));
  const userId = cq.from?.id;
  const chatId = cq.message?.chat?.id;

  if (!userId || !chatId || !days) return false;

  await answerCallbackQuery(cq.id);

  const res = await activateSafeProtection(env, userId, days);
  await sendMessage(chatId, res.message);
  return true;
}

export const vaultHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 🛡️ /safe - Immunity Protection from /rob
  // ==========================================
  "/safe": async (ctx: BotContext) => {
    try {
      const rawArg = (ctx.args[0] || "").toLowerCase().trim().replace("d", "");
      const isPrivate = ctx.message.chat.type === "private" || ctx.chatId > 0;

      // Complete command provided: /safe 1, /safe 2, /safe 3
      if (rawArg === "1" || rawArg === "2" || rawArg === "3") {
        const days = parseInt(rawArg);
        const res = await activateSafeProtection(ctx.env, ctx.userId, days);
        await sendMessage(ctx.chatId, res.message, undefined, ctx.message.message_id);
        return;
      }

      // No argument provided:
      if (isPrivate) {
        // DM: Short explanation + 3 Duration Buttons
        const dmText =
          `🛡️ <b>Safe Protection</b>\n\n` +
          `Choose your protection duration:\n\n` +
          `• 1 day — ₹300\n` +
          `• 2 days — ₹400\n` +
          `• 3 days — ₹600`;

        const dmKb = {
          inline_keyboard: [
            [
              { text: "1 Day", callback_data: "safe:1" },
              { text: "2 Days", callback_data: "safe:2" },
              { text: "3 Days", callback_data: "safe:3" },
            ],
          ],
        };

        await sendMessage(ctx.chatId, dmText, dmKb, ctx.message.message_id);
      } else {
        // Groups: Plain text guidance
        const groupText =
          `🛡️ <b>Safe Protection</b>\n\n` +
          `Usage:\n` +
          `<code>/safe 1</code> — 1 day (₹300)\n` +
          `<code>/safe 2</code> — 2 days (₹400)\n` +
          `<code>/safe 3</code> — 3 days (₹600)\n\n` +
          `Protection prevents robbery while active.`;

        await sendMessage(ctx.chatId, groupText, undefined, ctx.message.message_id);
      }
    } catch (err: any) {
      console.error("Safe command error:", err);
      await sendMessage(ctx.chatId, `⚠️ <code>${err?.message || "Execution error"}</code>`);
    }
  },

  // ==========================================
  // 🎭 /rob - Underworld Heist (Enforces Safe Immunity + ₹10 Compensation)
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

    // Critical: Timestamp-based Protection Check
    const now = Math.floor(Date.now() / 1000);
    if (target.protected_until && target.protected_until > now) {
      const penalty = 10;
      const deducted = Math.min(raider.balance, penalty);

      if (deducted > 0) {
        await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, raider.balance - deducted);
      }
      await DB_MANAGER.updateBalance(ctx.env.DB, targetId, target.balance + penalty);

      await sendMessage(
        ctx.chatId,
        `🛡️ <b>${targetName} is protected from robbery!</b>\n\n` +
          `₹${penalty} compensation fee was deducted from your balance and paid to ${targetName}.`,
        undefined,
        ctx.message.message_id
      );
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
  // 🔫 /bal or /bullets - Check Ammo & Restock
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
        { label: "🔫 AMMO", value: `${user.ammo ?? 0} rounds` },
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
