"use strict";
// ╭━━━━━━━━━━━━━━━✪
// │ 🎮 THE ARENA (GAME FEATURES)
// ╰━━━━━━━━━━━━━━━✪
// Yahan humare saare commands aur unka UI design rahega.
// Aage se jab koi naya feature aayega, hum bas use yahan neeche add karenge.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME = void 0;
var db_1 = require("./db");
var muscle_1 = require("./muscle");
var config_1 = require("./config");
exports.GAME = {
    // Ye main function hai jisme index.ts saare messages bhejega
    processCommand: function (update, env, sendMessage, startTime) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var message, chatId, userId, firstName, session, currentTime, fileId, text, args, botUsername, replyMarkup, msg, user, status, profileText, currentTime_1, marketText, _i, _f, _g, itemKey, data, currentPrice, investment, user, result, netChange, newBalance, investText, invItems, invText, _h, invItems_1, row, itemData, emoji, nameDisplay, user, reviveCost, newBalance, msg, targetId, targetName, caller, target, currentSeconds, roll, STANDARD_DROPS, dropItem, itemDisplay, dropEmoji, targetId, targetName, robber, target, currentSeconds, roll, stealPercent, stolenAmount, fineAmount, itemToSell_1, itemData, invItems, userItem, user, currentTime_2, sellPrice, topPlayers, lbText, rank, _j, topPlayers_1, p, medal, user, playerLevel, hit, bossDefense, raidText, reward, idText, replyId, replyName, latency, targetId, targetName, user, amount, targetId, targetName, target, newBalance, action, symbol, amount, targetId, targetName, sender, target, user, currentSeconds, remaining, plan, cost, days, newProtectionTime, e_1, adminData, isOwner, isHighAdmin, targetId, level, idArg, lvlArg, targetId, idArg, targetId, titleName, idArg, e_2, allAdmins, list, _k, allAdmins_1, a;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        message = update.message;
                        chatId = message.chat.id;
                        userId = message.from.id;
                        firstName = message.from.first_name || "Agent";
                        return [4 /*yield*/, db_1.DB_MANAGER.getSession(env.DB, userId)];
                    case 1:
                        session = _l.sent();
                        currentTime = Math.floor(Date.now() / 1000);
                        if (!(session && session.expires_at > currentTime)) return [3 /*break*/, 12];
                        if (!(session.step === 'awaiting_text' && message.text)) return [3 /*break*/, 5];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, session.chat_id, 'welcome_text', message.text)];
                    case 2:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.setSession(env.DB, userId, session.chat_id, 'awaiting_media', currentTime + 1800)];
                    case 3:
                        _l.sent();
                        return [4 /*yield*/, sendMessage(chatId, "✅ <b>Text Saved!</b>\nNow send the Media (Photo, Video under 15s, or Sticker).\n<i>Send 'skip' if you only want text.</i>")];
                    case 4:
                        _l.sent();
                        return [2 /*return*/];
                    case 5:
                        if (!(session.step === 'awaiting_media')) return [3 /*break*/, 11];
                        fileId = "";
                        if (message.photo)
                            fileId = message.photo[message.photo.length - 1].file_id;
                        else if (message.video)
                            fileId = message.video.file_id;
                        else if (message.sticker)
                            fileId = message.sticker.file_id;
                        else if (message.text && message.text.toLowerCase() === 'skip')
                            fileId = "none";
                        if (!fileId) return [3 /*break*/, 9];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, session.chat_id, 'welcome_media_id', fileId)];
                    case 6:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.clearSession(env.DB, userId)];
                    case 7:
                        _l.sent();
                        return [4 /*yield*/, sendMessage(chatId, "🎉 <b>Welcome Setup Complete!</b>\nUse the 'See' button in settings to test it.")];
                    case 8:
                        _l.sent();
                        return [2 /*return*/];
                    case 9: return [4 /*yield*/, sendMessage(chatId, "❌ Invalid media. Send a Photo, Video, Sticker, or type 'skip'.")];
                    case 10:
                        _l.sent();
                        return [2 /*return*/];
                    case 11: return [3 /*break*/, 14];
                    case 12:
                        if (!(session && session.expires_at <= currentTime)) return [3 /*break*/, 14];
                        return [4 /*yield*/, db_1.DB_MANAGER.clearSession(env.DB, userId)];
                    case 13:
                        _l.sent(); // Cleanup expired session
                        _l.label = 14;
                    case 14:
                        text = message.text ? message.text.trim() : "";
                        args = text.split(" ").slice(1);
                        return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, userId)];
                    case 15:
                        _l.sent();
                        if (!text.startsWith("/start")) return [3 /*break*/, 17];
                        botUsername = "T_he_Main_Bot";
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "➕ Add me to your group", url: "https://t.me/".concat(botUsername, "?startgroup=true") }],
                                [{ text: "Start me 🎖️", url: "https://t.me/".concat(botUsername, "?start=start") }],
                                [{ text: "⚙️ Settings", callback_data: "menu_settings" }]
                            ]
                        };
                        msg = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDC51 <b>WELCOME TO THE UNDERWORLD</b>\n").concat(config_1.UI.BORDER_BOT, "\n\nGreetings, ").concat(firstName, "!\nYour account is secured in the Cloud Vault.");
                        return [4 /*yield*/, sendMessage(chatId, msg, replyMarkup)];
                    case 16:
                        _l.sent();
                        return [2 /*return*/];
                    case 17:
                        if (!(text.startsWith("/profile") || text.startsWith("/me"))) return [3 /*break*/, 20];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 18:
                        user = _l.sent();
                        if (!user)
                            return [2 /*return*/];
                        status = user.is_alive === 1 ? "".concat(config_1.EMOJIS.alive, " Alive") : "".concat(config_1.EMOJIS.dead, " Dead");
                        profileText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCB3 <b>U N D E R W O R L D   I D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n\uD83D\uDC64 <b>Name:</b> ").concat(firstName, "\n\uD83C\uDD94 <b>Citizen ID:</b> <code>").concat(userId, "</code>\n\uD83D\uDCB0 <b>Net Worth:</b> \u20B9").concat(user.balance, "\n\uD83D\uDD2A <b>Total Kills:</b> ").concat(user.kills, "\n\u2764\uFE0F <b>Status:</b> ").concat(status, "\n\n").concat(config_1.UI.BORDER_BOT);
                        return [4 /*yield*/, sendMessage(profileText)];
                    case 19:
                        _l.sent();
                        return [2 /*return*/];
                    case 20:
                        if (!text.startsWith("/market")) return [3 /*break*/, 22];
                        currentTime_1 = Math.floor(Date.now() / 1000);
                        marketText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCC8 <b>\uD835\uDC14\uD835\uDC0D\uD835\uDC03\uD835\uDC04\uD835\uDC11\uD835\uDC16\uD835\uDC0E\uD835\uDC11\uD835\uDC0B\uD835\uDC03 \uD835\uDC0C\uD835\uDC00\uD835\uDC11\uD835\uDC0A\uD835\uDC04\uD835\uDC13</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        // CONFIG se items uthayenge aur MUSCLE se price calculate karwayenge
                        for (_i = 0, _f = Object.entries(config_1.MARKET_ITEMS); _i < _f.length; _i++) {
                            _g = _f[_i], itemKey = _g[0], data = _g[1];
                            currentPrice = muscle_1.MUSCLE.calculateMarketPrice(data.base_price, data.volatility, currentTime_1);
                            marketText += "\u256D\u2501\u27EE \u2726 ".concat(data.emoji, " ").concat(data.name.toUpperCase(), " \u2726 \u27EF\n\u2502 \uD83D\uDCB0 \uD835\uDC02\uD835\uDC14\uD835\uDC11\uD835\uDC11\uD835\uDC04\uD835\uDC0D\uD835\uDC13 \uD835\uDC0F\uD835\uDC11\uD835\uDC08\uD835\uDC02\uD835\uDC04: \u20B9").concat(currentPrice, "\n").concat(config_1.UI.BORDER_BOT, "\n");
                        }
                        marketText += "\n\uD83D\uDCA1 <i>Prices fluctuate based on the Supreme Engine!</i>";
                        return [4 /*yield*/, sendMessage(marketText)];
                    case 21:
                        _l.sent();
                        return [2 /*return*/];
                    case 22:
                        if (!text.startsWith("/invest")) return [3 /*break*/, 32];
                        if (!(args.length === 0)) return [3 /*break*/, 24];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Usage:</b> <code>/invest [amount]</code>"))];
                    case 23:
                        _l.sent();
                        return [2 /*return*/];
                    case 24:
                        investment = parseInt(args[0]);
                        if (!(isNaN(investment) || investment <= 0)) return [3 /*break*/, 26];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Sahi amount daal bhai."))];
                    case 25:
                        _l.sent();
                        return [2 /*return*/];
                    case 26: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 27:
                        user = _l.sent();
                        if (!(!user || user.balance < investment)) return [3 /*break*/, 29];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " You don't have enough funds. Balance: \u20B9").concat((user === null || user === void 0 ? void 0 : user.balance) || 0, "."))];
                    case 28:
                        _l.sent();
                        return [2 /*return*/];
                    case 29:
                        result = muscle_1.MUSCLE.simulateMarket(investment);
                        netChange = result.payout - investment;
                        newBalance = user.balance + netChange;
                        // The Clinic updates the Database
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, newBalance)];
                    case 30:
                        // The Clinic updates the Database
                        _l.sent();
                        investText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCCA <b>T R A D I N G   T E R M I N A L</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        investText += "\uD83D\uDCBC <b>Investment:</b> \u20B9".concat(investment, "\n\uD83D\uDCE1 <b>Executing Algorithm...</b>\n\n");
                        investText += "\u256D\u2501\u27EE ".concat(result.emoji, " <b>").concat(result.event, "</b> \u27EF\n\u2502 \u2716\uFE0F <b>Multiplier:</b> ").concat(result.multiplier, "x\n");
                        if (netChange > 0)
                            investText += "\u2502 \uD83D\uDFE2 <b>Profit:</b> +\u20B9".concat(netChange, "\n");
                        else if (netChange < 0)
                            investText += "\u2502 \uD83D\uDD34 <b>Loss:</b> -\u20B9".concat(Math.abs(netChange), "\n");
                        else
                            investText += "\u2502 \u26AA <b>Broke Even:</b> \u20B90\n";
                        investText += "\u2502 \uD83C\uDFE6 <b>New Balance:</b> \u20B9".concat(newBalance, "\n").concat(config_1.UI.BORDER_BOT);
                        return [4 /*yield*/, sendMessage(investText)];
                    case 31:
                        _l.sent();
                        return [2 /*return*/];
                    case 32:
                        if (!text.startsWith("/inv")) return [3 /*break*/, 35];
                        return [4 /*yield*/, db_1.DB_MANAGER.getInventory(env.DB, userId)];
                    case 33:
                        invItems = _l.sent();
                        invText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 ").concat(config_1.EMOJIS.vault, " <b>").concat(firstName.toUpperCase(), "'\uD835\uDC12 \uD835\uDC15\uD835\uDC00\uD835\uDC14\uD835\uDC0B\uD835\uDC13</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        if (!invItems || invItems.length === 0) {
                            invText += "".concat(config_1.EMOJIS.error, " <i>Vault is empty. Kill someone to get loot.</i>\n\n").concat(config_1.UI.BORDER_BOT);
                        }
                        else {
                            for (_h = 0, invItems_1 = invItems; _h < invItems_1.length; _h++) {
                                row = invItems_1[_h];
                                itemData = config_1.MARKET_ITEMS[row.item_name];
                                emoji = (itemData === null || itemData === void 0 ? void 0 : itemData.emoji) || "📦";
                                nameDisplay = (itemData === null || itemData === void 0 ? void 0 : itemData.name.toUpperCase()) || row.item_name.toUpperCase();
                                invText += "\u256D\u2501\u27EE \u2726 ".concat(emoji, " ").concat(nameDisplay, " \u2726 \u27EF\n\u2502 \uD83D\uDCE6 \uD835\uDC10\uD835\uDC14\uD835\uDC00\uD835\uDC0D\uD835\uDC13\uD835\uDC08\uD835\uDC13\uD835\uDC18: ").concat(row.quantity, "\n").concat(config_1.UI.BORDER_BOT, "\n");
                            }
                        }
                        return [4 /*yield*/, sendMessage(invText)];
                    case 34:
                        _l.sent();
                        return [2 /*return*/];
                    case 35:
                        if (!(text === "/revive" || text === "/heal")) return [3 /*break*/, 42];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 36:
                        user = _l.sent();
                        if (!user)
                            return [2 /*return*/];
                        if (!(user.is_alive === 1)) return [3 /*break*/, 38];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Tu pehle se zinda hai bhai. Jakar aish kar!"))];
                    case 37:
                        _l.sent();
                        return [2 /*return*/];
                    case 38:
                        reviveCost = 500;
                        newBalance = user.balance;
                        msg = "";
                        // Agar paise hain toh Hospital ka bill katega, warna garib ko free ilaaj
                        if (user.balance >= reviveCost) {
                            newBalance -= reviveCost;
                            msg = "\uD83C\uDFE5 <b>HOSPITAL BILL PAID</b>\nDoctor ne \u20B9".concat(reviveCost, " liye aur tumhari jaan bacha li.");
                        }
                        else {
                            msg = "\uD83C\uDFE5 <b>CHARITY WARD</b>\nTumhare paas paise nahi the, par Underworld ke doctors ne tumhe muft mein zinda kar diya.";
                        }
                        return [4 /*yield*/, db_1.DB_MANAGER.setAliveStatus(env.DB, userId, 1)];
                    case 39:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, newBalance)];
                    case 40:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDFE2 <b>R E S U R R E C T I O N</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(msg, "\n\nWelcome back to the land of the living, ").concat(firstName, "!"))];
                    case 41:
                        _l.sent();
                        return [2 /*return*/];
                    case 42:
                        if (!(text.startsWith("/kill") || text.startsWith("/k "))) return [3 /*break*/, 65];
                        if (!!update.message.reply_to_message) return [3 /*break*/, 44];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Kisko tapkana hai? Reply to a player."))];
                    case 43:
                        _l.sent();
                        return [2 /*return*/];
                    case 44:
                        targetId = update.message.reply_to_message.from.id;
                        targetName = update.message.reply_to_message.from.first_name || "Agent";
                        if (!(userId === targetId)) return [3 /*break*/, 46];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Khud ko kyu maar raha hai bhai?"))];
                    case 45:
                        _l.sent();
                        return [2 /*return*/];
                    case 46:
                        if (!update.message.reply_to_message.from.is_bot) return [3 /*break*/, 48];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Bot pe goli nahi chalti."))];
                    case 47:
                        _l.sent();
                        return [2 /*return*/];
                    case 48: return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, targetId)];
                    case 49:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 50:
                        caller = _l.sent();
                        if (!(!caller || caller.is_alive === 0)) return [3 /*break*/, 52];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.dead, " Tu pehle hi mar chuka hai! Use /revive first."))];
                    case 51:
                        _l.sent();
                        return [2 /*return*/];
                    case 52: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 53:
                        target = _l.sent();
                        if (!(!target || target.is_alive === 0)) return [3 /*break*/, 55];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>").concat(targetName, "</b> pehle se mara hua hai."))];
                    case 54:
                        _l.sent();
                        return [2 /*return*/];
                    case 55:
                        currentSeconds = Math.floor(Date.now() / 1000);
                        if (!(target.protection_until && target.protection_until > currentSeconds)) return [3 /*break*/, 57];
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>A T T A C K   B L O C K E D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.error, " <b>").concat(targetName, "</b> is under Underworld Protection!\nGuard dogs chased you away."))];
                    case 56:
                        _l.sent();
                        return [2 /*return*/];
                    case 57:
                        roll = Math.floor(Math.random() * 100) + 1;
                        if (!(roll <= 50)) return [3 /*break*/, 62];
                        return [4 /*yield*/, db_1.DB_MANAGER.setAliveStatus(env.DB, targetId, 0)];
                    case 58:
                        _l.sent(); // Target Dead
                        return [4 /*yield*/, db_1.DB_MANAGER.addKill(env.DB, userId)];
                    case 59:
                        _l.sent(); // +1 Kill
                        STANDARD_DROPS = ["cheap_watch", "stolen_phone", "gold_chain"];
                        dropItem = STANDARD_DROPS[Math.floor(Math.random() * STANDARD_DROPS.length)];
                        return [4 /*yield*/, db_1.DB_MANAGER.addInventoryItem(env.DB, userId, dropItem, 1)];
                    case 60:
                        _l.sent();
                        itemDisplay = ((_a = config_1.MARKET_ITEMS[dropItem]) === null || _a === void 0 ? void 0 : _a.name.toUpperCase()) || dropItem.toUpperCase();
                        dropEmoji = ((_b = config_1.MARKET_ITEMS[dropItem]) === null || _b === void 0 ? void 0 : _b.emoji) || "📦";
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.gun, " <b>BRUTAL MURDER!</b>\n<b>").concat(firstName, "</b> eliminated <b>").concat(targetName, "</b> in cold blood!\n").concat(config_1.EMOJIS.vault, " Searched the body and found a <b>[").concat(dropEmoji, " ").concat(itemDisplay, "]</b>!"))];
                    case 61:
                        _l.sent();
                        return [3 /*break*/, 64];
                    case 62: // Miss
                    return [4 /*yield*/, sendMessage("\uD83D\uDCA8 <b>WEAPON JAMMED!</b>\n<b>".concat(firstName, "</b> aimed at <b>").concat(targetName, "</b> but missed the shot!\n\uD83C\uDFC3 The target escaped unharmed."))];
                    case 63:
                        _l.sent();
                        _l.label = 64;
                    case 64: return [2 /*return*/];
                    case 65:
                        if (!text.startsWith("/rob")) return [3 /*break*/, 91];
                        if (!!update.message.reply_to_message) return [3 /*break*/, 67];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Kisko lootna hai? Reply to their message."))];
                    case 66:
                        _l.sent();
                        return [2 /*return*/];
                    case 67:
                        targetId = update.message.reply_to_message.from.id;
                        targetName = update.message.reply_to_message.from.first_name || "Target";
                        if (userId === targetId)
                            return [2 /*return*/];
                        if (!update.message.reply_to_message.from.is_bot) return [3 /*break*/, 69];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Bot ki jeb khaali hoti hai."))];
                    case 68:
                        _l.sent();
                        return [2 /*return*/];
                    case 69: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 70:
                        robber = _l.sent();
                        if (!(!robber || robber.is_alive === 0)) return [3 /*break*/, 72];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.dead, " Bhoot chori nahi kar sakte. Pehle /revive use kar."))];
                    case 71:
                        _l.sent();
                        return [2 /*return*/];
                    case 72: return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, targetId)];
                    case 73:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 74:
                        target = _l.sent();
                        if (!(!target || target.is_alive === 0)) return [3 /*break*/, 76];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Murdo ke paas paise nahi hote bhai."))];
                    case 75:
                        _l.sent();
                        return [2 /*return*/];
                    case 76:
                        currentSeconds = Math.floor(Date.now() / 1000);
                        if (!(target.protection_until && target.protection_until > currentSeconds)) return [3 /*break*/, 78];
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>A T T A C K   B L O C K E D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.error, " <b>").concat(targetName, "</b> is under Underworld Protection!\nGuard dogs chased you away."))];
                    case 77:
                        _l.sent();
                        return [2 /*return*/];
                    case 78:
                        if (!(target.balance < 100)) return [3 /*break*/, 80];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>").concat(targetName, "</b> ke paas phooti kaudi nahi hai. Garib ko kya lootega?"))];
                    case 79:
                        _l.sent();
                        return [2 /*return*/];
                    case 80:
                        roll = Math.floor(Math.random() * 100) + 1;
                        if (!(roll <= 45)) return [3 /*break*/, 84];
                        stealPercent = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
                        stolenAmount = Math.floor(target.balance * (stealPercent / 100));
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, robber.balance + stolenAmount)];
                    case 81:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, targetId, target.balance - stolenAmount)];
                    case 82:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83E\uDDB9\u200D\u2642\uFE0F <b>H E I S T   S U C C E S S</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> ne <b>").concat(targetName, "</b> ki jeb kaat li!\n\n\uD83D\uDCB0 <b>Looted:</b> \u20B9").concat(stolenAmount, "\n\uD83C\uDFC3\u200D\u2642\uFE0F <i>Bhaag jaldi bhaag!</i>"))];
                    case 83:
                        _l.sent();
                        return [3 /*break*/, 90];
                    case 84:
                        fineAmount = Math.floor(robber.balance * 0.15);
                        if (!(fineAmount > 0)) return [3 /*break*/, 88];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, robber.balance - fineAmount)];
                    case 85:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, targetId, target.balance + fineAmount)];
                    case 86:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEA8 <b>B U S T E D !</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.error, " <b>").concat(firstName, "</b> chori karte hue pakda gaya!\n\n\uD83D\uDCB8 <b>Penalty Paid:</b> \u20B9").concat(fineAmount, " to ").concat(targetName, "\n\uD83D\uDC6E\u200D\u2642\uFE0F <i>Agli baar dhyan se!</i>"))];
                    case 87:
                        _l.sent();
                        return [3 /*break*/, 90];
                    case 88: return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEA8 <b>B U S T E D !</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.error, " <b>").concat(firstName, "</b> chori karte hue pakda gaya!\n\nLekin jeb khali hone ki wajah se bas pitayi kha ke chhut gaya."))];
                    case 89:
                        _l.sent();
                        _l.label = 90;
                    case 90: return [2 /*return*/];
                    case 91:
                        if (!text.startsWith("/sell")) return [3 /*break*/, 103];
                        if (!(args.length === 0)) return [3 /*break*/, 93];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Kya bechna hai? Usage: <code>/sell [item_name]</code>\nExample: <code>/sell stolen_phone</code>"))];
                    case 92:
                        _l.sent();
                        return [2 /*return*/];
                    case 93:
                        itemToSell_1 = args[0].toLowerCase();
                        itemData = config_1.MARKET_ITEMS[itemToSell_1];
                        if (!!itemData) return [3 /*break*/, 95];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Ye kachra Underworld market me nahi bikta."))];
                    case 94:
                        _l.sent();
                        return [2 /*return*/];
                    case 95: return [4 /*yield*/, db_1.DB_MANAGER.getInventory(env.DB, userId)];
                    case 96:
                        invItems = _l.sent();
                        userItem = invItems.find(function (i) { return i.item_name === itemToSell_1; });
                        if (!(!userItem || userItem.quantity < 1)) return [3 /*break*/, 98];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Tere paas ye item nahi hai. Pehle /inv check kar."))];
                    case 97:
                        _l.sent();
                        return [2 /*return*/];
                    case 98: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 99:
                        user = _l.sent();
                        if (!user)
                            return [2 /*return*/];
                        currentTime_2 = Math.floor(Date.now() / 1000);
                        sellPrice = muscle_1.MUSCLE.calculateMarketPrice(itemData.base_price, itemData.volatility, currentTime_2);
                        // Clinic updates (Remove 1 item, Add money)
                        return [4 /*yield*/, db_1.DB_MANAGER.addInventoryItem(env.DB, userId, itemToSell_1, -1)];
                    case 100:
                        // Clinic updates (Remove 1 item, Add money)
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, user.balance + sellPrice)];
                    case 101:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83E\uDD1D <b>D E A L   D O N E</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> sold 1x <b>").concat(itemData.emoji, " ").concat(itemData.name.toUpperCase(), "</b>!\n\n\uD83D\uDCB0 <b>Earned:</b> \u20B9").concat(sellPrice, "\n\uD83C\uDFE6 <b>New Balance:</b> \u20B9").concat(user.balance + sellPrice))];
                    case 102:
                        _l.sent();
                        return [2 /*return*/];
                    case 103:
                        if (!(text === "/leaderboard" || text === "/top")) return [3 /*break*/, 106];
                        return [4 /*yield*/, db_1.DB_MANAGER.getTopPlayers(env.DB, 5)];
                    case 104:
                        topPlayers = _l.sent();
                        lbText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83C\uDFC6 <b>T O P   B O S S E S</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        if (!topPlayers || topPlayers.length === 0) {
                            lbText += "No players found in the Underworld.";
                        }
                        else {
                            rank = 1;
                            for (_j = 0, topPlayers_1 = topPlayers; _j < topPlayers_1.length; _j++) {
                                p = topPlayers_1[_j];
                                medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";
                                lbText += "<b>".concat(medal, " Rank ").concat(rank, "</b>\n");
                                lbText += "\u251C \uD83C\uDD94 <code>".concat(p.user_id, "</code>\n");
                                lbText += "\u251C \uD83D\uDCB0 Net Worth: \u20B9".concat(p.balance, "\n");
                                lbText += "\u2514 \uD83D\uDD2A Kills: ".concat(p.kills, "\n\n");
                                rank++;
                            }
                        }
                        lbText += "".concat(config_1.UI.BORDER_BOT);
                        return [4 /*yield*/, sendMessage(lbText)];
                    case 105:
                        _l.sent();
                        return [2 /*return*/];
                    case 106:
                        if (!(text === "/boss" || text === "/raid")) return [3 /*break*/, 115];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 107:
                        user = _l.sent();
                        if (!(!user || user.is_alive === 0)) return [3 /*break*/, 109];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.dead, " Murde Boss se nahi ladte. Pehle /revive kar aur apni aukaat bana!"))];
                    case 108:
                        _l.sent();
                        return [2 /*return*/];
                    case 109:
                        playerLevel = user.kills + 1;
                        hit = muscle_1.MUSCLE.rollBossDamage(playerLevel);
                        bossDefense = 200;
                        raidText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDC79 <b>B O S S   R A I D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        raidText += "\u2694\uFE0F <b>".concat(firstName, "</b> (Lv. ").concat(playerLevel, ") attacked the Kingpin's Convoy!\n");
                        raidText += "\uD83D\uDCA5 <b>Damage Dealt:</b> ".concat(hit.damage, " ").concat(hit.is_crit ? "<b>(CRITICAL HIT! 🔥)</b>" : "", "\n\n");
                        if (!(hit.damage >= bossDefense)) return [3 /*break*/, 111];
                        reward = Math.floor(Math.random() * 5000) + 2000;
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, user.balance + reward)];
                    case 110:
                        _l.sent();
                        raidText += "\u2570\u2501\u27EE ".concat(config_1.EMOJIS.success, " <b>V I C T O R Y</b> \u27EF\n\u2502 You broke the convoy's defense!\n\u2502 \uD83D\uDCB0 <b>Reward:</b> +\u20B9").concat(reward, "\n");
                        return [3 /*break*/, 113];
                    case 111: 
                    // Defeat: Instant Death
                    return [4 /*yield*/, db_1.DB_MANAGER.setAliveStatus(env.DB, userId, 0)];
                    case 112:
                        // Defeat: Instant Death
                        _l.sent();
                        raidText += "\u2570\u2501\u27EE ".concat(config_1.EMOJIS.dead, " <b>D E F E A T</b> \u27EF\n\u2502 The Boss's guards overpowered you.\n\u2502 \uD83E\uDE78 You were killed in action. Use /revive.\n");
                        _l.label = 113;
                    case 113:
                        raidText += "".concat(config_1.UI.BORDER_BOT);
                        return [4 /*yield*/, sendMessage(raidText)];
                    case 114:
                        _l.sent();
                        return [2 /*return*/];
                    case 115:
                        if (!(text === "/id")) return [3 /*break*/, 117];
                        idText = "\uD83C\uDD94 <b>Your ID:</b> <code>".concat(userId, "</code>\n\uD83D\uDCAC <b>Chat ID:</b> <code>").concat(chatId, "</code>");
                        // Agar kisi ke message par reply kiya hai, toh uska ID bhi dikhao
                        if (update.message.reply_to_message) {
                            replyId = update.message.reply_to_message.from.id;
                            replyName = update.message.reply_to_message.from.first_name || "User";
                            idText += "\n\uD83D\uDC64 <b>".concat(replyName, "'s ID:</b> <code>").concat(replyId, "</code>");
                        }
                        return [4 /*yield*/, sendMessage(idText)];
                    case 116:
                        _l.sent();
                        return [2 /*return*/];
                    case 117:
                        if (!(text === "/ping")) return [3 /*break*/, 119];
                        latency = Date.now() - startTime;
                        return [4 /*yield*/, sendMessage("\uD83C\uDFD3 <b>Pong!</b>\n\u26A1 <b>Latency:</b> <code>".concat(latency, "ms</code>\n\uD83D\uDCE1 <b>Status:</b> <i>Stable & Operational</i>"))];
                    case 118:
                        _l.sent();
                        return [2 /*return*/];
                    case 119:
                        if (!text.startsWith("/bal")) return [3 /*break*/, 125];
                        targetId = userId;
                        targetName = firstName;
                        // Agar reply kiya hai toh dost ka balance dikhao
                        if (update.message.reply_to_message) {
                            targetId = update.message.reply_to_message.from.id;
                            targetName = update.message.reply_to_message.from.first_name || "User";
                        }
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 120:
                        user = _l.sent();
                        if (!user) return [3 /*break*/, 122];
                        return [4 /*yield*/, sendMessage("\uD83D\uDCB0 <b>".concat(targetName, "'s Balance:</b> \u20B9").concat(user.balance))];
                    case 121:
                        _l.sent();
                        return [3 /*break*/, 124];
                    case 122: return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Account not found."))];
                    case 123:
                        _l.sent();
                        _l.label = 124;
                    case 124: return [2 /*return*/];
                    case 125:
                        if (!text.startsWith("/transfer")) return [3 /*break*/, 133];
                        if (userId !== config_1.CONFIG.OWNER_ID)
                            return [2 /*return*/]; // Silent block for non-owners
                        if (!(!update.message.reply_to_message || args.length === 0)) return [3 /*break*/, 127];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Usage:</b> Reply + <code>/transfer [amount]</code>"))];
                    case 126:
                        _l.sent();
                        return [2 /*return*/];
                    case 127:
                        amount = parseInt(args[0]);
                        if (isNaN(amount))
                            return [2 /*return*/];
                        targetId = update.message.reply_to_message.from.id;
                        targetName = update.message.reply_to_message.from.first_name || "Agent";
                        return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, targetId)];
                    case 128:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 129:
                        target = _l.sent();
                        if (!target) return [3 /*break*/, 132];
                        newBalance = target.balance + amount;
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, targetId, newBalance)];
                    case 130:
                        _l.sent();
                        action = amount > 0 ? "blessed" : "penalized";
                        symbol = amount > 0 ? "+" : "";
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDC51 <b>S U P R E M E   O R D E R</b>\n").concat(config_1.UI.BORDER_BOT, "\n\nBoss has ").concat(action, " <b>").concat(targetName, "</b>!\n\uD83D\uDCCA <b>Transaction:</b> ").concat(symbol).concat(amount, "\n\uD83C\uDFE6 <b>New Balance:</b> \u20B9").concat(newBalance, "\n").concat(config_1.UI.BORDER_BOT))];
                    case 131:
                        _l.sent();
                        _l.label = 132;
                    case 132: return [2 /*return*/];
                    case 133:
                        if (!(text.startsWith("/pay") || text.startsWith("/give"))) return [3 /*break*/, 153];
                        if (!!update.message.reply_to_message) return [3 /*break*/, 135];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Kisko paise dene hain? Reply to a player."))];
                    case 134:
                        _l.sent();
                        return [2 /*return*/];
                    case 135:
                        if (!(args.length === 0)) return [3 /*break*/, 137];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Usage:</b> <code>/pay [amount]</code>\nExample: <code>/pay 500</code>"))];
                    case 136:
                        _l.sent();
                        return [2 /*return*/];
                    case 137:
                        amount = parseInt(args[0]);
                        if (!(isNaN(amount) || amount <= 0)) return [3 /*break*/, 139];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Sahi amount daal bhai."))];
                    case 138:
                        _l.sent();
                        return [2 /*return*/];
                    case 139:
                        targetId = update.message.reply_to_message.from.id;
                        targetName = update.message.reply_to_message.from.first_name || "Agent";
                        if (!(userId === targetId)) return [3 /*break*/, 141];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Khud ko paise kyu de raha hai?"))];
                    case 140:
                        _l.sent();
                        return [2 /*return*/];
                    case 141:
                        if (!update.message.reply_to_message.from.is_bot) return [3 /*break*/, 143];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Bot moh-maya se door hai."))];
                    case 142:
                        _l.sent();
                        return [2 /*return*/];
                    case 143: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 144:
                        sender = _l.sent();
                        if (!(!sender || sender.balance < amount)) return [3 /*break*/, 146];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Teri jeb me itne paise nahi hain. Balance: \u20B9").concat((sender === null || sender === void 0 ? void 0 : sender.balance) || 0))];
                    case 145:
                        _l.sent();
                        return [2 /*return*/];
                    case 146: 
                    // Ensure target exists
                    return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, targetId)];
                    case 147:
                        // Ensure target exists
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 148:
                        target = _l.sent();
                        if (!target) return [3 /*break*/, 152];
                        // Deduct from sender, Add to target
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, sender.balance - amount)];
                    case 149:
                        // Deduct from sender, Add to target
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, targetId, target.balance + amount)];
                    case 150:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCB8 <b>M O N E Y   T R A N S F E R</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> ne <b>").concat(targetName, "</b> ko \u20B9").concat(amount, " diye!\n\n\uD83C\uDFE6 <b>Your New Balance:</b> \u20B9").concat(sender.balance - amount))];
                    case 151:
                        _l.sent();
                        _l.label = 152;
                    case 152: return [2 /*return*/];
                    case 153:
                        if (!(text.startsWith("/defend") || text.startsWith("/safe"))) return [3 /*break*/, 169];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 154:
                        user = _l.sent();
                        if (!user)
                            return [2 /*return*/];
                        currentSeconds = Math.floor(Date.now() / 1000);
                        if (!(user.protection_until && user.protection_until > currentSeconds)) return [3 /*break*/, 156];
                        remaining = Math.ceil((user.protection_until - currentSeconds) / 3600);
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Protection Active!</b>\nAapki security pehle se chalu hai.\n\u23F3 <b>Remaining:</b> ~").concat(remaining, " hours.\nKhatam hone ke baad hi naya plan le sakte hain."))];
                    case 155:
                        _l.sent();
                        return [2 /*return*/];
                    case 156:
                        if (!(args.length === 0)) return [3 /*break*/, 158];
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>B U Y   P R O T E C T I O N</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n<b>Plans:</b>\n\u251C <code>/defend 1d</code> \u2796 \u20B9400\n\u251C <code>/defend 2d</code> \u2796 \u20B9800\n\u2514 <code>/defend 3d</code> \u2796 \u20B91400"))];
                    case 157:
                        _l.sent();
                        return [2 /*return*/];
                    case 158:
                        plan = args[0].toLowerCase();
                        cost = 0;
                        days = 0;
                        if (!(plan === "1d")) return [3 /*break*/, 159];
                        cost = 400;
                        days = 1;
                        return [3 /*break*/, 163];
                    case 159:
                        if (!(plan === "2d")) return [3 /*break*/, 160];
                        cost = 800;
                        days = 2;
                        return [3 /*break*/, 163];
                    case 160:
                        if (!(plan === "3d")) return [3 /*break*/, 161];
                        cost = 1400;
                        days = 3;
                        return [3 /*break*/, 163];
                    case 161: return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Invalid plan (1d/2d/3d)."))];
                    case 162:
                        _l.sent();
                        return [2 /*return*/];
                    case 163:
                        if (!(user.balance < cost)) return [3 /*break*/, 165];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Low balance! \u20B9").concat(cost, " required."))];
                    case 164:
                        _l.sent();
                        return [2 /*return*/];
                    case 165:
                        newProtectionTime = currentSeconds + (days * 86400);
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, user.balance - cost)];
                    case 166:
                        _l.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.setProtection(env.DB, userId, newProtectionTime)];
                    case 167:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>G U A R D S   H I R E D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> protected for <b>").concat(days, " Day(s)</b>!"))];
                    case 168:
                        _l.sent();
                        return [2 /*return*/];
                    case 169:
                        if (!(text === "/upgradedb")) return [3 /*break*/, 176];
                        if (userId !== config_1.CONFIG.OWNER_ID)
                            return [2 /*return*/];
                        _l.label = 170;
                    case 170:
                        _l.trys.push([170, 173, , 175]);
                        // Table for Group Admins
                        return [4 /*yield*/, env.DB.prepare("CREATE TABLE IF NOT EXISTS group_admins (chat_id INTEGER, user_id INTEGER, level INTEGER, title TEXT, PRIMARY KEY(chat_id, user_id))").run()];
                    case 171:
                        // Table for Group Admins
                        _l.sent();
                        return [4 /*yield*/, sendMessage("✅ <b>Database Upgraded!</b> Admin table created.")];
                    case 172:
                        _l.sent();
                        return [3 /*break*/, 175];
                    case 173:
                        e_1 = _l.sent();
                        return [4 /*yield*/, sendMessage("\u26A0\uFE0F Error: ".concat(e_1.message))];
                    case 174:
                        _l.sent();
                        return [3 /*break*/, 175];
                    case 175: return [2 /*return*/];
                    case 176: return [4 /*yield*/, db_1.DB_MANAGER.getAdmin(env.DB, chatId, userId)];
                    case 177:
                        adminData = _l.sent();
                        isOwner = userId === config_1.CONFIG.OWNER_ID;
                        isHighAdmin = (adminData && adminData.level === 3) || isOwner;
                        if (!text.startsWith("/promote")) return [3 /*break*/, 182];
                        if (!isHighAdmin)
                            return [2 /*return*/];
                        targetId = (_c = update.message.reply_to_message) === null || _c === void 0 ? void 0 : _c.from.id;
                        level = 1;
                        idArg = args.find(function (a) { return !isNaN(parseInt(a)) && a.length > 7; });
                        lvlArg = args.find(function (a) { return ["1", "2", "3"].includes(a); });
                        if (idArg)
                            targetId = parseInt(idArg);
                        if (lvlArg)
                            level = parseInt(lvlArg);
                        if (!!targetId) return [3 /*break*/, 179];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Reply to user or provide an ID."))];
                    case 178:
                        _l.sent();
                        return [2 /*return*/];
                    case 179: return [4 /*yield*/, db_1.DB_MANAGER.setAdmin(env.DB, chatId, targetId, level, "Member")];
                    case 180:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("\u2705 <b>PROMOTED!</b>\nUser <code>".concat(targetId, "</code> is now a <b>Level ").concat(level, " Admin</b> in this group."))];
                    case 181:
                        _l.sent();
                        return [2 /*return*/];
                    case 182:
                        if (!text.startsWith("/demote")) return [3 /*break*/, 185];
                        if (!isHighAdmin)
                            return [2 /*return*/];
                        targetId = (_d = update.message.reply_to_message) === null || _d === void 0 ? void 0 : _d.from.id;
                        idArg = args.find(function (a) { return !isNaN(parseInt(a)) && a.length > 7; });
                        if (idArg)
                            targetId = parseInt(idArg);
                        if (!targetId)
                            return [2 /*return*/];
                        return [4 /*yield*/, db_1.DB_MANAGER.removeAdmin(env.DB, chatId, targetId)];
                    case 183:
                        _l.sent();
                        return [4 /*yield*/, sendMessage("\u274C <b>DEMOTED!</b>\nUser <code>".concat(targetId, "</code> removed from Admin list."))];
                    case 184:
                        _l.sent();
                        return [2 /*return*/];
                    case 185:
                        if (!text.startsWith("/title")) return [3 /*break*/, 195];
                        if (!isHighAdmin)
                            return [2 /*return*/];
                        targetId = (_e = update.message.reply_to_message) === null || _e === void 0 ? void 0 : _e.from.id;
                        titleName = args.filter(function (a) { return isNaN(parseInt(a)) || a.length < 7; }).join(" ");
                        idArg = args.find(function (a) { return !isNaN(parseInt(a)) && a.length > 7; });
                        if (idArg)
                            targetId = parseInt(idArg);
                        if (!(!targetId || !titleName)) return [3 /*break*/, 187];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Usage: /title [name] [id/reply]"))];
                    case 186:
                        _l.sent();
                        return [2 /*return*/];
                    case 187: return [4 /*yield*/, db_1.DB_MANAGER.setAdmin(env.DB, chatId, targetId, 1, titleName)];
                    case 188:
                        _l.sent();
                        _l.label = 189;
                    case 189:
                        _l.trys.push([189, 192, , 193]);
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/promoteChatMember"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, user_id: targetId, can_manage_chat: true })
                            })];
                    case 190:
                        _l.sent();
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/setChatAdministratorCustomTitle"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, user_id: targetId, custom_title: titleName })
                            })];
                    case 191:
                        _l.sent();
                        return [3 /*break*/, 193];
                    case 192:
                        e_2 = _l.sent();
                        return [3 /*break*/, 193];
                    case 193: return [4 /*yield*/, sendMessage("\uD83C\uDFF7\uFE0F <b>TITLE UPDATED!</b>\nTarget <code>".concat(targetId, "</code> is now tagged as: <b>").concat(titleName, "</b>"))];
                    case 194:
                        _l.sent();
                        return [2 /*return*/];
                    case 195:
                        if (!(text === "/admins")) return [3 /*break*/, 198];
                        return [4 /*yield*/, db_1.DB_MANAGER.getAllAdmins(env.DB, chatId)];
                    case 196:
                        allAdmins = _l.sent();
                        list = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>G R O U P   A D M I N S</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        if (allAdmins.length === 0)
                            list += "No custom admins registered.";
                        else {
                            for (_k = 0, allAdmins_1 = allAdmins; _k < allAdmins_1.length; _k++) {
                                a = allAdmins_1[_k];
                                list += "\uD83D\uDC64 <code>".concat(a.user_id, "</code>\n\u2514 \uD83C\uDF96\uFE0F <b>Lvl ").concat(a.level, "</b> | \uD83C\uDFF7\uFE0F <i>").concat(a.title, "</i>\n\n");
                            }
                        }
                        return [4 /*yield*/, sendMessage(chatId, list + config_1.UI.BORDER_BOT)];
                    case 197:
                        _l.sent();
                        return [2 /*return*/];
                    case 198: return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // ====================================================
    // ╭━━━━━━━━━━━━━━━✪
    // │ 🕹️ CALLBACK ROUTER (BUTTON CLICKS)
    // ╰━━━━━━━━━━━━━━━✪
    processCallback: function (query, env, editMessageText, answerCallbackQuery) {
        return __awaiter(this, void 0, void 0, function () {
            var data, chatId, messageId, userId, botUsername, replyMarkup, replyMarkup, replyMarkup, expiresAt, replyMarkup, settings, preview, mediaStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = query.data;
                        chatId = query.message.chat.id;
                        messageId = query.message.message_id;
                        userId = query.from.id;
                        return [4 /*yield*/, answerCallbackQuery(query.id)];
                    case 1:
                        _a.sent(); // Stops the loading spinner
                        if (!(data === "menu_start")) return [3 /*break*/, 3];
                        botUsername = "YOUR_BOT_USERNAME";
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "➕ Add me to your group", url: "https://t.me/".concat(botUsername, "?startgroup=true") }],
                                [{ text: "Start me 🎖️", url: "https://t.me/".concat(botUsername, "?start=start") }],
                                [{ text: "⚙️ Settings", callback_data: "menu_settings" }]
                            ]
                        };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "👑 <b>WELCOME TO THE UNDERWORLD</b>\nChoose an option:", replyMarkup)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 3:
                        if (!(data === "menu_settings")) return [3 /*break*/, 5];
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "👋 Welcome", callback_data: "menu_welcome" }, { text: "My friend 🤫", url: "tg://settings" }],
                                [{ text: "Soon ⏳", callback_data: "alert_soon" }, { text: "Soon ⏳", callback_data: "alert_soon" }],
                                [{ text: "🔙 Back", callback_data: "menu_start" }]
                            ]
                        };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "⚙️ <b>SETTINGS MENU</b>\nConfigure your Underworld experience:", replyMarkup)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 5:
                        if (!(data === "menu_welcome")) return [3 /*break*/, 7];
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "🟢 On", callback_data: "wel_on" }, { text: "🔴 Off", callback_data: "wel_off" }],
                                [{ text: "📝 Set", callback_data: "wel_set" }, { text: "👁️ See", callback_data: "wel_see" }],
                                [{ text: "🔙 Back", callback_data: "menu_settings" }]
                            ]
                        };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "👋 <b>WELCOME SETTINGS</b>\nConfigure how new members are greeted:", replyMarkup)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 7:
                        if (!(data === "alert_soon")) return [3 /*break*/, 9];
                        return [4 /*yield*/, answerCallbackQuery(query.id, "⏳ Feature coming soon!", true)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 9:
                        if (!(data === "wel_on")) return [3 /*break*/, 12];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, chatId, 'welcome_enabled', 1)];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, answerCallbackQuery(query.id, "✅ Welcome messages turned ON", true)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 12:
                        if (!(data === "wel_off")) return [3 /*break*/, 15];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, chatId, 'welcome_enabled', 0)];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, answerCallbackQuery(query.id, "🔴 Welcome messages turned OFF", true)];
                    case 14:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 15:
                        if (!(data === "wel_set")) return [3 /*break*/, 18];
                        expiresAt = Math.floor(Date.now() / 1000) + 1800;
                        return [4 /*yield*/, db_1.DB_MANAGER.setSession(env.DB, userId, chatId, 'awaiting_text', expiresAt)];
                    case 16:
                        _a.sent();
                        replyMarkup = { inline_keyboard: [[{ text: "🔙 Cancel", callback_data: "menu_welcome" }]] };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "📝 <b>WELCOME SETUP [Step 1/2]</b>\n\nSend me the <b>Text Message</b> you want to use for welcoming new members.\n\n<i>You have 30 minutes.</i>", replyMarkup)];
                    case 17:
                        _a.sent();
                        return [3 /*break*/, 21];
                    case 18:
                        if (!(data === "wel_see")) return [3 /*break*/, 21];
                        return [4 /*yield*/, db_1.DB_MANAGER.getGroupSettings(env.DB, chatId)];
                    case 19:
                        settings = _a.sent();
                        preview = settings && settings.welcome_text ? settings.welcome_text : "<i>No custom welcome text set. Default will be used.</i>";
                        mediaStatus = settings && settings.welcome_media_id && settings.welcome_media_id !== 'none' ? "✅ Media Attached" : "❌ No Media";
                        return [4 /*yield*/, answerCallbackQuery(query.id, "PREVIEW:\n".concat(preview, "\n\nMedia: ").concat(mediaStatus), true)];
                    case 20:
                        _a.sent();
                        _a.label = 21;
                    case 21: return [2 /*return*/];
                }
            });
        });
    }
}; // <--- PROPERLY CLOSES THE 'GAME' OBJECT
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END OF GAME FILE
