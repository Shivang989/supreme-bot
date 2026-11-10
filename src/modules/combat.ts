import { BotContext, CommandHandler } from "../types";
import { DB_MANAGER } from "../db";
import { createStatusCard } from "../ui";
import { sendMessage } from "../index";

export const combatHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 💥 /fire or /shoot - Engage Target
  // ==========================================
  "/fire": async (ctx: BotContext) => {
    try {
      const reply = ctx.reply;

      // ----------------------------------------------------
      // Behaviour A: /fire without reply -> Show inventory & guide
      // ----------------------------------------------------
      if (!reply) {
        await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);
        const shooter = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
        const bulletsLeft = shooter?.ammo ?? 0;

        const guideText =
          `🔫 <b>Fire</b>\n\n` +
          `Bullets left: ${bulletsLeft}\n\n` +
          `Reply to a player's message with "/fire" to attack and eliminate them.`;

        await sendMessage(ctx.chatId, guideText, undefined, ctx.message?.message_id);
        return;
      }

      // ----------------------------------------------------
      // Behaviour B: Reply to another player -> Target Validation
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
          "❌ You cannot target yourself.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // Attacker status check
      await DB_MANAGER.ensureUserExists(ctx.env.DB, ctx.userId);
      const attacker = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
      if (!attacker) return;

      if (attacker.is_alive === 0) {
        await sendMessage(
          ctx.chatId,
          "💀 <b>Incapacitated:</b> You are eliminated. Use <code>/revive</code> before taking action.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      if ((attacker.ammo ?? 0) <= 0) {
        await sendMessage(
          ctx.chatId,
          "❌ <b>No Bullets Left</b>\n\nYou have no bullets remaining.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // Target status check
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

      const targetName = (reply.from.first_name || "Target")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const attackerName = (ctx.message.from.first_name || "Attacker")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      if (target.is_alive === 0) {
        await sendMessage(
          ctx.chatId,
          `⚠️ <b>Target Down:</b> ${targetName} is already eliminated.`,
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // Check active /safe protection
      const now = Math.floor(Date.now() / 1000);
      if (target.protected_until && target.protected_until > now) {
        await sendMessage(
          ctx.chatId,
          `🛡️ <b>Attack Blocked</b>\n\n${targetName} is protected by safe immunity.`,
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // ----------------------------------------------------
      // Atomic Execution: Deduct bullet, Eliminate, & Reward
      // ----------------------------------------------------
      // 1. Consume exactly one bullet atomically
      const bulletDeductResult = await ctx.env.DB.prepare(
        "UPDATE users SET ammo = ammo - 1 WHERE user_id = ? AND ammo >= 1"
      )
        .bind(ctx.userId)
        .run();

      const bulletDeducted =
        (bulletDeductResult.meta?.changes ?? bulletDeductResult.meta?.rows_written ?? 0) > 0;

      if (!bulletDeducted) {
        await sendMessage(
          ctx.chatId,
          "❌ <b>No Bullets Left</b>\n\nYou have no bullets remaining.",
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // 2. Eliminate target (ensures no race condition with another shooter)
      const eliminateResult = await ctx.env.DB.prepare(
        "UPDATE users SET is_alive = 0 WHERE user_id = ? AND is_alive = 1"
      )
        .bind(targetId)
        .run();

      const targetEliminated =
        (eliminateResult.meta?.changes ?? eliminateResult.meta?.rows_written ?? 0) > 0;

      if (!targetEliminated) {
        // Rollback bullet deduction if target was already eliminated in a concurrent command
        await ctx.env.DB.prepare(
          "UPDATE users SET ammo = ammo + 1 WHERE user_id = ?"
        )
          .bind(ctx.userId)
          .run();

        await sendMessage(
          ctx.chatId,
          `⚠️ <b>Target Down:</b> ${targetName} is already eliminated.`,
          undefined,
          ctx.message?.message_id
        );
        return;
      }

      // 3. Generate random integer reward between ₹200 and ₹300 (inclusive)
      const reward = Math.floor(Math.random() * (300 - 200 + 1)) + 200;

      // 4. Credit reward and increment kills
      await ctx.env.DB.prepare(
        "UPDATE users SET balance = balance + ?, kills = kills + 1 WHERE user_id = ?"
      )
        .bind(reward, ctx.userId)
        .run();

      const remainingBullets = Math.max(0, (attacker.ammo ?? 0) - 1);

      const resultText =
        `🔫 <b>Target Eliminated</b>\n\n` +
        `Attacker: ${attackerName}\n` +
        `Target: ${targetName}\n` +
        `Reward: ₹${reward}\n` +
        `Bullets left: ${remainingBullets}`;

      await sendMessage(ctx.chatId, resultText, undefined, ctx.message?.message_id);
    } catch (err: any) {
      console.error("Fire command error:", err);
      await sendMessage(
        ctx.chatId,
        `⚠️ <code>${err?.message || "Execution error"}</code>`,
        undefined,
        ctx.message?.message_id
      );
    }
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
