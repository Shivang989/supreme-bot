import { BotContext, CommandHandler, MarketItem } from "../types";
import { DB_MANAGER } from "../db";
import { CONFIG, MARKET_ITEMS } from "../config";
import { MUSCLE } from "../muscle";
import { createStatusCard } from "../ui";
import { sendMessage } from "../index";

const BULLET_PRICE = 10; // Cost per ammo round in ₹

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

export const vaultHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 🔫 /b or /bullets - Check Ammo & Purchase
  // ==========================================
  "/b": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    const requestedAmount = parseInt(ctx.args[0]);

    // View current ammo magazine
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

    // Purchase rounds
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
  // 🎁 /daily - Claim Daily Operative Allowance
  // ==========================================
  "/daily": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    if (user.is_alive === 0) {
      await sendMessage(
        ctx.chatId,
        "💀 You are eliminated. Revive first using <code>/revive</code> before claiming funds."
      );
      return;
    }

    const DAILY_REWARD = 250;
    const COOLDOWN_SECONDS = 86400; // 24 hours
    const now = Math.floor(Date.now() / 1000);
    const lastDaily = user.last_daily ?? 0;

    if (now - lastDaily < COOLDOWN_SECONDS) {
      const remainingSeconds = COOLDOWN_SECONDS - (now - lastDaily);
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);

      const card = createStatusCard({
        title: "⏳ DAILY ON COOLDOWN",
        rows: [
          { label: "👤 OPERATIVE", value: ctx.message.from.first_name },
          { label: "⏳ REMAINING", value: `${hours}h ${minutes}m` },
          { label: "💰 REWARD", value: `₹${DAILY_REWARD}` },
          { label: "💼 CASH", value: `₹${user.balance}` },
        ],
        footer: "⏰ Cooldown active • Come back tomorrow for your allowance.",
      });

      await sendMessage(ctx.chatId, card);
      return;
    }

    const newBalance = user.balance + DAILY_REWARD;
    await ctx.env.DB.prepare("UPDATE users SET balance = ?, last_daily = ? WHERE user_id = ?")
      .bind(newBalance, now, ctx.userId)
      .run();

    const card = createStatusCard({
      title: "🎁 DAILY ALLOWANCE",
      rows: [
        { label: "👤 OPERATIVE", value: ctx.message.from.first_name },
        { label: "💰 REWARD", value: `+₹${DAILY_REWARD}` },
        { label: "💼 NEW CASH", value: `₹${newBalance}` },
        { label: "🔋 AMMO", value: `${user.ammo ?? 0} rounds` },
      ],
      footer: "⚡ Allowance collected. Next claim available in 24 hours.",
    });

    await sendMessage(ctx.chatId, card);
  },


  // ==========================================
  // 👤 /me or /profile - Underworld Dossier
  // ==========================================
  "/me": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    const card = createStatusCard({
      title: "👤 UNDERWORLD DOSSIER",
      rows: [
        { label: "👤 PLAYER", value: ctx.message.from.first_name },
        { label: "🆔 UID", value: ctx.userId },
        { label: "💰 CASH", value: `₹${user.balance}` },
        { label: "🔫 AMMO", value: `${user.ammo ?? 0} rounds` },
        { label: "💀 KILLS", value: user.kills ?? 0 },
        { label: "❤️ STATUS", value: user.is_alive === 0 ? "ELIMINATED" : "ALIVE" },
      ],
      footer: user.is_alive === 0
        ? "💀 STATUS • Knocked out. Use /revive to rejoin."
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

    // Execute transfer
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
  // 🎭 /rob - Underworld Heist
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

    if (target.balance < 50) {
      await sendMessage(ctx.chatId, `⚠️ ${targetName} doesn't have enough cash to steal (Min ₹50).`);
      return;
    }

    // Shield verification
    const now = Math.floor(Date.now() / 1000);
    if (target.protected_until && target.protected_until > now) {
      const remainingSec = target.protected_until - now;
      const card = createStatusCard({
        title: "🛡️ VAULT DEFENDED",
        rows: [
          { label: "🎯 TARGET", value: targetName },
          { label: "🛡️ SECURITY", value: "Reinforced Shield" },
          { label: "⏳ EXPIRY", value: `${remainingSec}s left` },
        ],
        footer: "❌ Alarm tripped! Target vault is secured under lock & key.",
      });
      await sendMessage(ctx.chatId, card);
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

    // Deduct 1 item quantity and credit user balance
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
