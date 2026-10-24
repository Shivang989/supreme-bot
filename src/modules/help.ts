import { BotContext, CommandHandler } from "../types";
import { toCustomFont } from "../ui";
import { sendMessage } from "../index";

export const helpHandlers: Record<string, CommandHandler> = {
  "/help": async (ctx: BotContext) => {
    const header = toCustomFont("ALOO COMMAND DIRECTORY");
    const subheader = toCustomFont("Select a category or use the triggers below:");

    const body =
      `👑 <b>${header}</b>\n\n` +
      `<blockquote>${subheader}</blockquote>\n\n` +
      `💼 <b>${toCustomFont("Economy & Vault")}</b>\n` +
      `• <code>/b</code> <i>— ${toCustomFont("Check ammo magazine & balance")}</i>\n` +
      `• <code>/pay</code> <i>— ${toCustomFont("Send cash to an operative")}</i>\n` +
      `• <code>/rob</code> <i>— ${toCustomFont("Execute an underworld heist")}</i>\n` +
      `• <code>/daily</code> <i>— ${toCustomFont("Claim 24h syndicate allowance")}</i>\n` +
      `• <code>/market</code> <i>— ${toCustomFont("Inspect dynamic contraband prices")}</i>\n` +
      `• <code>/sell</code> <i>— ${toCustomFont("Liquidate owned commodities")}</i>\n\n` +
      `💥 <b>${toCustomFont("Combat & Defense")}</b>\n` +
      `• <code>/fire</code> <i>— ${toCustomFont("Engage target with munitions")}</i>\n` +
      `• <code>/defend</code> <i>— ${toCustomFont("Deploy a temporary 5m shield")}</i>\n` +
      `• <code>/revive</code> <i>— ${toCustomFont("Recover life after elimination")}</i>\n\n` +
      `🎲 <b>${toCustomFont("Arcade & Games")}</b>\n` +
      `• <code>/dice</code>, <code>/flip</code>, <code>/rps</code>, <code>/8ball</code>\n\n` +
      `🛡️ <b>${toCustomFont("Management & Staff")}</b>\n` +
      `• <code>/me</code>, <code>/top</code>, <code>/admins</code>, <code>/promote</code>, <code>/demote</code>, <code>/title</code>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: toCustomFont("Add to Group"), url: "https://t.me/Myaloobot?startgroup=true" },
          { text: toCustomFont("Direct DM"), url: "https://t.me/Myaloobot?start=true" }
        ]
      ]
    };

    await sendMessage(ctx.chatId, body, inlineKeyboard);
  },
};
