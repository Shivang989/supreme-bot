import { BotContext, CommandHandler } from "../types";
import { DB_MANAGER } from "../db";
import { createStatusCard } from "../ui";
import { sendMessage } from "../index";

export const entertainmentHandlers: Record<string, CommandHandler> = {
  // ==========================================
  // 🎲 /dice - Roll Against the Syndicate
  // ==========================================
  "/dice": async (ctx: BotContext) => {
    const user = await DB_MANAGER.getUser(ctx.env.DB, ctx.userId);
    if (!user) return;

    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const botRoll = Math.floor(Math.random() * 6) + 1;

    let result = "TIE";
    let footer = "🤝 Dead heat! Nobody takes the pot.";

    if (playerRoll > botRoll) {
      result = "VICTORY";
      const prize = 50;
      await DB_MANAGER.updateBalance(ctx.env.DB, ctx.userId, user.balance + prize);
      footer = `🎉 You won! +₹${prize} credited to your balance.`;
    } else if (playerRoll < botRoll) {
      result = "DEFEAT";
      footer = "💀 The house wins this round. Better luck next time!";
    }

    const card = createStatusCard({
      title: "🎲 DICE SHOWDOWN",
      rows: [
        { label: "👤 PLAYER", value: `${ctx.message.from.first_name} [${playerRoll}]` },
        { label: "🤖 DEALER", value: `Supreme AI [${botRoll}]` },
        { label: "🏆 RESULT", value: result },
        { label: "💼 BALANCE", value: `₹${result === "VICTORY" ? user.balance + 50 : user.balance}` },
      ],
      footer,
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // 🪙 /flip - Coin Toss
  // ==========================================
  "/flip": async (ctx: BotContext) => {
    const guess = ctx.args[0]?.toLowerCase();
    const outcomes = ["heads", "tails"];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    if (!guess || !outcomes.includes(guess)) {
      const card = createStatusCard({
        title: "🪙 COIN TOSS",
        rows: [
          { label: "👤 FLIPPER", value: ctx.message.from.first_name },
          { label: "🪙 RESULT", value: outcome.toUpperCase() },
        ],
        footer: "💡 HINT • Guess the outcome: /flip heads or /flip tails",
      });
      await sendMessage(ctx.chatId, card);
      return;
    }

    const won = guess === outcome;
    const card = createStatusCard({
      title: "🪙 COIN TOSS CALL",
      rows: [
        { label: "👤 CALL", value: guess.toUpperCase() },
        { label: "🪙 RESULT", value: outcome.toUpperCase() },
        { label: "🎯 VERDICT", value: won ? "MATCH" : "MISMATCH" },
      ],
      footer: won ? "🎉 Sharp call! You called it right." : "❌ Bad call! Gravity had other plans.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // ✂️ /rps - Rock, Paper, Scissors
  // ==========================================
  "/rps": async (ctx: BotContext) => {
    const playerMove = ctx.args[0]?.toLowerCase();
    const validMoves = ["rock", "paper", "scissors"];

    if (!playerMove || !validMoves.includes(playerMove)) {
      await sendMessage(
        ctx.chatId,
        "⚠️ <b>Usage:</b> <code>/rps [rock|paper|scissors]</code>"
      );
      return;
    }

    const botMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    let outcome = "TIE";

    if (playerMove === botMove) {
      outcome = "DRAW";
    } else if (
      (playerMove === "rock" && botMove === "scissors") ||
      (playerMove === "paper" && botMove === "rock") ||
      (playerMove === "scissors" && botMove === "paper")
    ) {
      outcome = "WIN";
    } else {
      outcome = "LOSS";
    }

    const card = createStatusCard({
      title: "✂️ ROCK-PAPER-SCISSORS",
      rows: [
        { label: "👤 YOU", value: playerMove.toUpperCase() },
        { label: "🤖 BOT", value: botMove.toUpperCase() },
        { label: "🏆 RESULT", value: outcome },
      ],
      footer:
        outcome === "WIN"
          ? "🎉 Clean read! You dismantled the machine."
          : outcome === "DRAW"
          ? "🤝 Parried! Both chose the exact same move."
          : "💀 Countered! The bot anticipated your strike.",
    });

    await sendMessage(ctx.chatId, card);
  },

  // ==========================================
  // 🎱 /8ball - Underworld Oracle
  // ==========================================
  "/8ball": async (ctx: BotContext) => {
    const question = ctx.args.join(" ").trim();
    if (!question) {
      await sendMessage(
        ctx.chatId,
        "⚠️ <b>Usage:</b> Ask a question: <code>/8ball Will we take the bounty?</code>"
      );
      return;
    }

    const responses = [
      "Definitely yes.",
      "Without a doubt.",
      "Outlook looks bright.",
      "Ask again after the next heist.",
      "Signals are hazy, try later.",
      "Do not count on it.",
      "My sources say negative.",
      "High probability of failure.",
    ];

    const reply = responses[Math.floor(Math.random() * responses.length)];

    const card = createStatusCard({
      title: "🎱 UNDERWORLD ORACLE",
      rows: [
        { label: "❓ QUERY", value: question.slice(0, 16) },
        { label: "🔮 ORACLE", value: reply.slice(0, 16) },
      ],
      footer: `Question: "${question}"`,
    });

    await sendMessage(ctx.chatId, card);
  },
};
