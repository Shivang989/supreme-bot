import { BotContext, CommandHandler, UserData } from "../types";
import { DB_MANAGER } from "../db";
import { createStatusCard } from "../ui";
import { sendMessage } from "../index";

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

export const combatHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 💥 /fire or /shoot - Engage Target
  // ==========================================
  "/fire": async (ctx: BotContext) => {
    const shooter = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!shooter) return;

    // Check if shooter is alive
    if (shooter.is_alive === 0) {
      await sendMessage(
        ctx.chatId,
        "💀 <b>Incapacitated:</b> You are eliminated. Use <code>/revive</code> before taking action."
      );
      return;
    }

    // Check ammo
    const currentAmmo = shooter.ammo ?? 0;
    if (currentAmmo <= 0) {
      const card = createStatusCard({
        title: "⚠️ OUT OF AMMUNITION",
        rows: [
          { label: "👤 SHOOTER", value: ctx.message.from.first_name },
          { label: "🔋 AMMO", value: "0 rounds" },
          { label: "💡 ACTION", value: "Reload needed" },
        ],
        footer: "💡 HINT • Purchase ammo rounds using /b [amount]",
      });
      await sendMessage(ctx.chatId, card);
      return;
    }

    // Resolve target
    const { targetId, targetName } = resolveTarget(ctx);
    if (!targetId) {
      await sendMessage(
        ctx.chatId,
        "🎯 <b>Target Required:</b> Reply to a target's message or specify their ID: <code>/fire [id]</code>"
      );
      return;
    }

    if (targetId === ctx.userId) {
      await sendMessage(ctx.chatId, "⚠️ You cannot target yourself.");
      return;
    }

    await DB_MANAGER.ensureUserExists(ctx.env.DB, targetId);
    const target = await DB_MANAGER.getUser(ctx.env.DB, targetId);
    if (!target) return;

    // Check if target is already down
    if (target.is_alive === 0) {
      await sendMessage(
        ctx.chatId,
        `⚠️ <b>Target Down:</b> ${targetName} is already eliminated.`
      );
      return;
    }

    // Check target shield
    const now = Math.floor(Date.now() / 1000);
    if (target.protected_until && target.protected_until > now) {
      const remainingSec = target.protected_until - now;
      const card = createStatusCard({
        title: "🛡️ SHIELD DEFLECTED",
        rows: [
          { label: "🎯 TARGET", value: targetName },
          { label: "🛡️ DEFENSE", value: "Active Barrier" },
          { label: "⏳ DURATION", value: `${remainingSec}s left` },
        ],
        footer: "❌ Bullet ricocheted! Target is protected under defense protocols.",
      });
      await sendMessage(ctx.chatId, card);
      return;
    }

    // Deduct 1 ammo round
    const remainingAmmo = currentAmmo - 1;
    await ctx.env.DB.prepare("UPDATE users SET ammo = ? WHERE user_id = ?")
      .bind(remainingAmmo, ctx.userId)
      .run();

    // Combat RNG resolution: 65% hit rate
    const roll = Math.random();
    const isHit = roll <= 0.65;

    if (!isHit) {
      const failCard = createStatusCard({
        title: "💨 SHOT MISSED",
        rows: [
          { label: "👤 SHOOTER", value: ctx.message.from.first_name },
          { label: "🎯 TARGET", value: targetName },
          { label: "🔋 AMMO LEFT", value: `${remainingAmmo} rounds` },
          { label: "🎲 ROLL", value: `${Math.round(roll * 100)} / 100` },
        ],
        footer: "❌ Shot went wide. Target escaped unharmed.",
      });
      await sendMessage(ctx.chatId, failCard);
      return;
    }

    // Successful hit: mark target eliminated & transfer bounty
    await DB_MANAGER.setAliveStatus(ctx.env.DB, targetId, 0);
    await DB_MANAGER.addKill(ctx.env.DB, ctx.userId);

    const bounty = Math.max(50, Math.floor((target.balance ?? 0) * 0.15));
    if (bounty > 0 && target.balance >= bounty) {
      await DB_MANAGER.updateBalance(ctx.env.DB, targetId, target.balance - bounty);
      await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, (shooter.balance ?? 0) + bounty);
    }

    const hitCard = createStatusCard({
      title: "💥 CONTRACT EXECUTED",
      rows: [
        { label: "👤 SHOOTER", value: ctx.message.from.first_name },
        { label: "🎯 TARGET", value: targetName },
        { label: "💀 STATUS", value: "ELIMINATED" },
        { label: "💰 BOUNTY", value: `+₹${bounty}` },
        { label: "🔋 AMMO LEFT", value: `${remainingAmmo} rounds` },
      ],
      footer: "⚡ Direct hit! Target has been eliminated.",
    });

    await sendMessage(ctx.chatId, hitCard);
  },

  // Alias for /fire
  "/shoot": async (ctx: BotContext) => {
    await combatHandlers["/fire"](ctx);
  },

  // ==========================================
  // 🛡️ /defend or /shield - Deploy Protection
  // ==========================================
  "/defend": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    if (user.is_alive === 0) {
      await sendMessage(
        ctx.chatId,
        "💀 You are eliminated. Revive first using <code>/revive</code>."
      );
      return;
    }

    const SHIELD_COST = 200;
    const SHIELD_DURATION_SEC = 300; // 5 minutes

    if ((user.balance ?? 0) < SHIELD_COST) {
      await sendMessage(
        ctx.chatId,
        `❌ Insufficient cash. Shield deployment costs <b>₹${SHIELD_COST}</b>.`
      );
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const expireTime = now + SHIELD_DURATION_SEC;

    await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, user.balance - SHIELD_COST);
    await DB_MANAGER.setProtection(ctx.env.DB, ctx.userId, expireTime);

    const card = createStatusCard({
      title: "🛡️ SHIELD DEPLOYED",
      rows: [
        { label: "👤 OPERATIVE", value: ctx.message.from.first_name },
        { label: "💰 COST", value: `₹${SHIELD_COST}` },
        { label: "⏳ DURATION", value: "5 Minutes" },
        { label: "💼 BALANCE", value: `₹${user.balance - SHIELD_COST}` },
      ],
      footer: "🟢 Active barrier prevents incoming strikes for 300 seconds.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // Alias for /defend
  "/shield": async (ctx: BotContext) => {
    await combatHandlers["/defend"](ctx);
  },

  // ==========================================
  // ❤️ /revive - Field Triage
  // ==========================================
  "/revive": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    if (user.is_alive === 1) {
      await sendMessage(
        ctx.chatId,
        "🟢 You are already operational and combat-ready."
      );
      return;
    }

    const REVIVE_COST = 100;
    if ((user.balance ?? 0) < REVIVE_COST) {
      await sendMessage(
        ctx.chatId,
        `❌ Field revive requires <b>₹${REVIVE_COST}</b>. Acquire funds or request a teammate to transfer via /pay.`
      );
      return;
    }

    await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, user.balance - REVIVE_COST);
    await DB_MANAGER.setAliveStatus(ctx.env.DB, ctx.userId, 1);

    const card = createStatusCard({
      title: "❤️ OPERATIVE REVIVED",
      rows: [
        { label: "👤 OPERATIVE", value: ctx.message.from.first_name },
        { label: "❤️ STATUS", value: "ALIVE" },
        { label: "💰 COST", value: `₹${REVIVE_COST}` },
        { label: "💼 BALANCE", value: `₹${user.balance - REVIVE_COST}` },
      ],
      footer: "⚡ Vital signs restored. You are back in the fray.",
    });

    await sendMessage(ctx.chatId, card);
  },
};
