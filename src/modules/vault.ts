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

// Converts ASCII alphanumeric text into Mathematical Sans-Serif Bold fancy text
function toFancy(text: string): string {
  const fancyMap: Record<string, string> = {
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
    K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
    U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
    a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
    k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
    u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
    0: "𝟬", 1: "𝟭", 2: "𝟮", 3: "𝟯", 4: "𝟰", 5: "𝟱", 6: "𝟲", 7: "𝟳", 8: "𝟴", 9: "𝟵",
  };
  return text.split("").map((c) => fancyMap[c] || c).join("");
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
        "<code>/safe 1</code> — 1 day (₹300)\n" +
        "<code>/safe 2</code> — 2 days (₹400)\n" +
        "<code>/safe 3</code> — 3 days (₹600)\n\n" +
        "Protection prevents robbery while active.",
    };
  }

  await DB_MANAGER.ensureUserExists(env.DB, userId);
  const user = await DB_MANAGER.getUser(env.DB, userId);
  if (!user) return { ok: false, message: "⚠️ Operative profile not found." };

  const now = Math.floor(Date.now() / 1000);

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

      if (rawArg === "1" || rawArg === "2" || rawArg === "3") {
        const days = parseInt(rawArg);
        const res = await activateSafeProtection(ctx.env, ctx.userId, days);
        await sendMessage(ctx.chatId, res.message, undefined, ctx.message.message_id);
        return;
      }

      if (isPrivate) {
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
  // 🎭 /rob - Underworld Robbery
  // ==========================================
  "/rob": async (ctx: BotContext) => {
    try {
      const reply = ctx.reply;

      // ----------------------------------------------------
      // Behaviour C: No reply -> Show short usage guide
      // ----------------------------------------------------
      if (!reply) {
        const guideText =
          `💰 <b>Robbery Usage</b>\n\n` +
          `Reply to another player's message with:\n\n` +
          `<code>/rob</code> — Rob ₹1,000\n` +
          `<code>/rob 250</code> — Rob ₹250`;

        await sendMessage(ctx.chatId, guideText, undefined, ctx.message?.message_id);
        return;
      }

      // ----------------------------------------------------
      // Reply Target Validation
      // ----------------------------------------------------
      if (!reply.from || reply.from.is_bot) {
        await sendMessage(
          ctx.chatId,
          "❌ Unable to identify this player.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      const targetId = reply.from.id;

      if (targetId === ctx.userId) {
        await sendMessage(
          ctx.chatId,
          "❌ You cannot rob yourself.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // ----------------------------------------------------
      // Parse & Validate Amount
      // ----------------------------------------------------
      let amount = 1000; // Default amount if omitted
      if (ctx.args.length > 0) {
        const rawAmount = ctx.args[0].trim();
        const parsed = parseInt(rawAmount, 10);
        if (isNaN(parsed) || parsed <= 0 || !/^\d+$/.test(rawAmount)) {
          await sendMessage(
            ctx.chatId,
            '❌ Invalid amount. Use "/rob" or "/rob <amount>".',
            undefined,
            ctx.message?.message_id
          );
          return;
        }
        amount = parsed;
      }

      // ----------------------------------------------------
      // Attacker Profile & Status Check
      // ----------------------------------------------------
      await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);
      const attacker = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
      if (!attacker) return;

      if (attacker.is_alive === 0) {
        await sendMessage(
          ctx.chatId,
          "💀 You are eliminated. Revive first using <code>/revive</code>.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // ----------------------------------------------------
      // Target Profile & Protection Check
      // ----------------------------------------------------
      const target = await DB_MANAGER.getUser(ctx.env.DB, targetId);
      if (!target) {
        await sendMessage(
          ctx.chatId,
          "❌ Player profile not found.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      const targetName = (reply.from.first_name || "Player")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const now = Math.floor(Date.now() / 1000);

      // Case 2: Target has active protection
      if (target.protected_until && target.protected_until > now) {
        // Credit ₹10 compensation to the attacker
        await ctx.env.DB.prepare(
          "UPDATE users SET balance = balance + 10 WHERE user_id = ?"
        )
          .bind(ctx.userId)
          .run();

        const blockedText =
          `🛡️ <b>Robbery Blocked</b>\n\n` +
          `You received ₹10 compensation.\n` +
          `The target is protected.`;

        await sendMessage(ctx.chatId, blockedText, undefined, ctx.message?.message_id);
        return;
      }

      // Case 1: Target is not protected -> Check available balance
      if ((target.balance ?? 0) < amount) {
        await sendMessage(
          ctx.chatId,
          `❌ Target does not have enough money.`,
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // Atomic Balance Transfer
      const deductResult = await ctx.env.DB.prepare(
        "UPDATE users SET balance = balance - ? WHERE user_id = ? AND balance >= ?"
      )
        .bind(amount, targetId, amount)
        .run();

      const changes = deductResult.meta?.changes ?? deductResult.meta?.rows_written ?? 0;
      if (changes === 0) {
        await sendMessage(
          ctx.chatId,
          `❌ Target does not have enough money.`,
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // Credit the attacker
      await ctx.env.DB.prepare(
        "UPDATE users SET balance = balance + ? WHERE user_id = ?"
      )
        .bind(amount, ctx.userId)
        .run();

      const successText =
        `💰 <b>Robbery Successful</b>\n\n` +
        `Target: ${targetName}\n` +
        `Robbed: ₹${amount}`;

      await sendMessage(ctx.chatId, successText, undefined, ctx.message?.message_id);
    } catch (err: any) {
      console.error("Rob command error:", err);
      await sendMessage(
        ctx.chatId,
        `⚠️ <code>${err?.message || "Execution error"}</code>`,
        undefined,
        ctx.message?.message_id
      );
    }
  },

  // ==========================================
  // 💰 /bal or /balance - Compact Fancy Profile
  // ==========================================
  "/bal": async (ctx: BotContext) => {
    try {
      const reply = ctx.reply;

      // Behaviour B: Replying to another player's message
      if (reply) {
        if (!reply.from || reply.from.is_bot) {
          await sendMessage(
            ctx.chatId,
            "❌ Unable to identify this player.",
            undefined,
            ctx.message?.message_id
          );
          return;
        }

        const targetId = reply.from.id;

        if (targetId !== ctx.userId) {
          const targetUser = await DB_MANAGER.getUser(ctx.env.DB, targetId);

          if (!targetUser) {
            await sendMessage(
              ctx.chatId,
              "❌ Player profile not found.",
              undefined,
              ctx.message?.message_id
            );
            return;
          }

          const targetName = (reply.from.first_name || "Player")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          const targetMention = `<a href="tg://user?id=${targetId}">${targetName}</a>`;
          const isAlive = (targetUser.is_alive ?? 1) !== 0;
          const status = toFancy(isAlive ? "(Alive)" : "(Dead)");

          const balance = toFancy(`₹${targetUser.balance ?? 0}`);
          const kills = toFancy(String(targetUser.kills ?? 0));

          const text =
            `👤 ${targetMention} ${status}\n` +
            `💵 ${toFancy("Balance:")} ${balance}\n` +
            `☠️ ${toFancy("Kills:")} ${kills}`;

          await sendMessage(ctx.chatId, text, undefined, ctx.message?.message_id);
          return;
        }
      }

      // Behaviour A: Own profile (independent or self-reply)
      await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);
      const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);

      const senderName = (ctx.message.from.first_name || "Player")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const mention = `<a href="tg://user?id=${ctx.userId}">${senderName}</a>`;
      const isAlive = (user?.is_alive ?? 1) !== 0;
      const status = toFancy(isAlive ? "(Alive)" : "(Dead)");

      const balance = toFancy(`₹${user?.balance ?? 0}`);
      const kills = toFancy(String(user?.kills ?? 0));
      const bullets = toFancy(String(user?.ammo ?? 0));

      const text =
        `👤 ${mention} ${status}\n` +
        `💵 ${toFancy("Balance:")} ${balance}\n` +
        `☠️ ${toFancy("Kills:")} ${kills}\n` +
        `🔫 ${toFancy("Bullets:")} ${bullets}`;

      await sendMessage(ctx.chatId, text, undefined, ctx.message?.message_id);
    } catch (err: any) {
      console.error("Error executing /bal:", err);
      await sendMessage(
        ctx.chatId,
        `⚠️ <code>${err?.message || "Execution error"}</code>`,
        undefined,
        ctx.message?.message_id
      );
    }
  },

  "/balance": async (ctx: BotContext) => {
    await vaultHandlers["/bal"](ctx);
  },

  // ==========================================
  // 🔫 /b or /bullets - Check Ammo & Purchase
  // ==========================================
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
