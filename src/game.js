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
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var message, chatId, userId, firstName, session, currentTime, e_1, fileData, text, args, botUsername, replyMarkup, msg, user, status, profileText, currentTime_1, marketText, _i, _d, _e, itemKey, data, currentPrice, investment, user, result, netChange, newBalance, investText, invItems, invText, _f, invItems_1, row, itemData, emoji, nameDisplay, user, reviveCost, newBalance, msg, ammoMatch, bulletsToBuy, user, cost, now, tgShooter, messageId, replyTo, cleanText, parsedId, targetId, targetDisplay, shooter, remaining, mins, secs, timeSinceLast, newStrikes, lockUntil, targetDb, roll, reward, lootRoll, lootText, user, ammoCount, now, tgRaider, messageId, replyTo, cleanText, parts, parsedAmount, parsedId, amount, targetId, targetDisplay, raider, remaining, mins, secs, timeSinceLast, newStrikes, lockUntil, targetDb, cappedAmount, roll, fivePercent, penalty, brokeMsg, totalGain, itemToSell_1, itemData, invItems, userItem, user, currentTime_2, sellPrice, topPlayers, lbText, rank, _g, topPlayers_1, p, medal, user, playerLevel, hit, bossDefense, raidText, reward, idText, replyId, replyName, latency, targetId, targetName, user, amount, targetId, targetName, target, newBalance, action, symbol, amount, targetId, targetName, sender, target, user, currentSeconds, remaining, plan, cost, days, newProtectionTime, e_2, targetId, level, idArg, lvlArg, response, data, e_3, targetId, idArg, e_4, targetId, titleName, idArg, titleRes, titleData, e_5;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        message = update.message;
                        chatId = message.chat.id;
                        userId = message.from.id;
                        firstName = message.from.first_name || "Agent";
                        return [4 /*yield*/, db_1.DB_MANAGER.getSession(env.DB, userId)];
                    case 1:
                        session = _h.sent();
                        currentTime = Math.floor(Date.now() / 1000);
                        if (!(session && session.expires_at > currentTime)) return [3 /*break*/, 16];
                        if (!(session.step === 'awaiting_text' && message.text)) return [3 /*break*/, 9];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, session.chat_id, 'welcome_text', message.text)];
                    case 2:
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.setSession(env.DB, userId, session.chat_id, 'awaiting_media', currentTime + 1800)];
                    case 3:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "✅ <b>Text Saved!</b>\nNow send the Media (Photo, Video under 15s, or Sticker).\n<i>Send 'skip' if you only want text.</i>")];
                    case 4:
                        _h.sent();
                        _h.label = 5;
                    case 5:
                        _h.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/deleteMessage"), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, message_id: message.message_id })
                            })];
                    case 6:
                        _h.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_1 = _h.sent();
                        return [3 /*break*/, 8];
                    case 8: // Ignore if bot lacks admin rights to delete
                    return [2 /*return*/];
                    case 9:
                        if (!(session.step === 'awaiting_media')) return [3 /*break*/, 15];
                        fileData = "";
                        // Save the media type AND the cloud file_id
                        if (message.photo)
                            fileData = "photo:" + message.photo[message.photo.length - 1].file_id;
                        else if (message.video)
                            fileData = "video:" + message.video.file_id;
                        else if (message.animation)
                            fileData = "animation:" + message.animation.file_id;
                        else if (message.sticker)
                            fileData = "sticker:" + message.sticker.file_id;
                        else if (message.text && message.text.toLowerCase() === 'skip')
                            fileData = "none";
                        if (!fileData) return [3 /*break*/, 13];
                        return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, session.chat_id, 'welcome_media_id', fileData)];
                    case 10:
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.clearSession(env.DB, userId)];
                    case 11:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "🎉 <b>Welcome Setup Complete!</b>\nUse the 'See' button in settings to test it.")];
                    case 12:
                        _h.sent();
                        return [2 /*return*/];
                    case 13: return [4 /*yield*/, sendMessage(chatId, "❌ Invalid media. Send a Photo, Video, GIF, Sticker, or type 'skip'.")];
                    case 14:
                        _h.sent();
                        return [2 /*return*/];
                    case 15: return [3 /*break*/, 18];
                    case 16:
                        if (!(session && session.expires_at <= currentTime)) return [3 /*break*/, 18];
                        return [4 /*yield*/, db_1.DB_MANAGER.clearSession(env.DB, userId)];
                    case 17:
                        _h.sent(); // Cleanup expired session
                        _h.label = 18;
                    case 18:
                        text = message.text ? message.text.trim() : "";
                        args = text.split(" ").slice(1);
                        return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, userId)];
                    case 19:
                        _h.sent();
                        if (!text.startsWith("/start")) return [3 /*break*/, 21];
                        botUsername = "T_he_Main_Bot";
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "👤 My Profile", callback_data: "menu_profile" }],
                                [{ text: "➕ Add to Group", url: "https://t.me/".concat(botUsername, "?startgroup=true") }, { text: "⚙️ Settings", callback_data: "menu_settings" }]
                            ]
                        };
                        msg = "\uD83D\uDC51 <b>THE UNDERWORLD TERMINAL</b>\n\n<blockquote><b>Welcome back, ".concat(firstName, ".</b>\nConnection established. All systems are green. Select a option below to begin.</blockquote>");
                        return [4 /*yield*/, sendMessage(chatId, msg, replyMarkup)];
                    case 20:
                        _h.sent();
                        return [2 /*return*/];
                    case 21:
                        if (!(text.startsWith("/profile") || text.startsWith("/me"))) return [3 /*break*/, 24];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 22:
                        user = _h.sent();
                        if (!user)
                            return [2 /*return*/];
                        status = user.is_alive === 1 ? "".concat(config_1.EMOJIS.alive, " Alive") : "".concat(config_1.EMOJIS.dead, " Dead");
                        profileText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCB3 <b>U N D E R W O R L D   I D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n\uD83D\uDC64 <b>Name:</b> ").concat(firstName, "\n\uD83C\uDD94 <b>Citizen ID:</b> <code>").concat(userId, "</code>\n\uD83D\uDCB0 <b>Net Worth:</b> \u20B9").concat(user.balance, "\n\uD83D\uDD2A <b>Total Kills:</b> ").concat(user.kills, "\n\u2764\uFE0F <b>Status:</b> ").concat(status, "\n\n").concat(config_1.UI.BORDER_BOT);
                        return [4 /*yield*/, sendMessage(profileText)];
                    case 23:
                        _h.sent();
                        return [2 /*return*/];
                    case 24:
                        if (!text.startsWith("/market")) return [3 /*break*/, 26];
                        currentTime_1 = Math.floor(Date.now() / 1000);
                        marketText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCC8 <b>\uD835\uDC14\uD835\uDC0D\uD835\uDC03\uD835\uDC04\uD835\uDC11l\uD835\uDC16\uD835\uDC0E\uD835\uDC11\uD835\uDC0B\uD835\uDC03l \uD835\uDC0C\uD835\uDC00\uD835\uDC11\uD835\uDC0A\uD835\uDC04\uD835\uDC13</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        // CONFIG se items uthayenge aur MUSCLE se price calculate karwayenge
                        for (_i = 0, _d = Object.entries(config_1.MARKET_ITEMS); _i < _d.length; _i++) {
                            _e = _d[_i], itemKey = _e[0], data = _e[1];
                            currentPrice = muscle_1.MUSCLE.calculateMarketPrice(data.base_price, data.volatility, currentTime_1);
                            marketText += "\u256D\u2501\u27EE \u2726 ".concat(data.emoji, " ").concat(data.name.toUpperCase(), " \u2726 \u27EF\n\u2502 \uD83D\uDCB0 \uD835\uDC02\uD835\uDC14\uD835\uDC11\uD835\uDC11\uD835\uDC04\uD835\uDC0D\uD835\uDC13 \uD835\uDC0F\uD835\uDC11\uD835\uDC08\uD835\uDC02\uD835\uDC04: \u20B9").concat(currentPrice, "\n").concat(config_1.UI.BORDER_BOT, "\n");
                        }
                        marketText += "\n\uD83D\uDCA1 <i>Prices fluctuate based on the Supreme Engine!</i>";
                        return [4 /*yield*/, sendMessage(marketText)];
                    case 25:
                        _h.sent();
                        return [2 /*return*/];
                    case 26:
                        if (!text.startsWith("/invest")) return [3 /*break*/, 36];
                        if (!(args.length === 0)) return [3 /*break*/, 28];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Usage:</b> <code>/invest [amount]</code>"))];
                    case 27:
                        _h.sent();
                        return [2 /*return*/];
                    case 28:
                        investment = parseInt(args[0]);
                        if (!(isNaN(investment) || investment <= 0)) return [3 /*break*/, 30];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Sahi amount daal bhai."))];
                    case 29:
                        _h.sent();
                        return [2 /*return*/];
                    case 30: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 31:
                        user = _h.sent();
                        if (!(!user || user.balance < investment)) return [3 /*break*/, 33];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " You don't have enough funds. Balance: \u20B9").concat((user === null || user === void 0 ? void 0 : user.balance) || 0, "."))];
                    case 32:
                        _h.sent();
                        return [2 /*return*/];
                    case 33:
                        result = muscle_1.MUSCLE.simulateMarket(investment);
                        netChange = result.payout - investment;
                        newBalance = user.balance + netChange;
                        // The Clinic updates the Database
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, newBalance)];
                    case 34:
                        // The Clinic updates the Database
                        _h.sent();
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
                    case 35:
                        _h.sent();
                        return [2 /*return*/];
                    case 36:
                        if (!text.startsWith("/inv")) return [3 /*break*/, 39];
                        return [4 /*yield*/, db_1.DB_MANAGER.getInventory(env.DB, userId)];
                    case 37:
                        invItems = _h.sent();
                        invText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 ").concat(config_1.EMOJIS.vault, " <b>").concat(firstName.toUpperCase(), "'\uD835\uDC12 \uD835\uDC15\uD835\uDC00\uD835\uDC14\uD835\uDC0B\uD835\uDC13</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        if (!invItems || invItems.length === 0) {
                            invText += "".concat(config_1.EMOJIS.error, " <i>Vault is empty. Kill someone to get loot.</i>\n\n").concat(config_1.UI.BORDER_BOT);
                        }
                        else {
                            for (_f = 0, invItems_1 = invItems; _f < invItems_1.length; _f++) {
                                row = invItems_1[_f];
                                itemData = config_1.MARKET_ITEMS[row.item_name];
                                emoji = (itemData === null || itemData === void 0 ? void 0 : itemData.emoji) || "📦";
                                nameDisplay = (itemData === null || itemData === void 0 ? void 0 : itemData.name.toUpperCase()) || row.item_name.toUpperCase();
                                invText += "\u256D\u2501\u27EE \u2726 ".concat(emoji, " ").concat(nameDisplay, " \u2726 \u27EF\n\u2502 \uD83D\uDCE6 \uD835\uDC10\uD835\uDC14\uD835\uDC00\uD835\uDC0D\uD835\uDC13\uD835\uDC08\uD835\uDC13\uD835\uDC18: ").concat(row.quantity, "\n").concat(config_1.UI.BORDER_BOT, "\n");
                            }
                        }
                        return [4 /*yield*/, sendMessage(invText)];
                    case 38:
                        _h.sent();
                        return [2 /*return*/];
                    case 39:
                        if (!(text === "/revive" || text === "/heal")) return [3 /*break*/, 46];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 40:
                        user = _h.sent();
                        if (!user)
                            return [2 /*return*/];
                        if (!(user.is_alive === 1)) return [3 /*break*/, 42];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Tu pehle se zinda hai bhai. Jakar aish kar!"))];
                    case 41:
                        _h.sent();
                        return [2 /*return*/];
                    case 42:
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
                    case 43:
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, newBalance)];
                    case 44:
                        _h.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDFE2 <b>R E S U R R E C T I O N</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(msg, "\n\nWelcome back to the land of the living, ").concat(firstName, "!"))];
                    case 45:
                        _h.sent();
                        return [2 /*return*/];
                    case 46:
                        ammoMatch = text.match(/^\/(b|bullets|buy)[\s]*(\d+)/i);
                        if (!ammoMatch) return [3 /*break*/, 52];
                        bulletsToBuy = parseInt(ammoMatch[2], 10);
                        if (!(bulletsToBuy > 0)) return [3 /*break*/, 52];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 47:
                        user = _h.sent();
                        if (!user)
                            return [2 /*return*/];
                        cost = bulletsToBuy * 1;
                        if (!(user.balance < cost)) return [3 /*break*/, 49];
                        return [4 /*yield*/, sendMessage(chatId, "\u274C You need \u20B9".concat(cost, " to buy ").concat(bulletsToBuy, " bullets.\nYour Balance: \u20B9").concat(user.balance))];
                    case 48:
                        _h.sent();
                        return [2 /*return*/];
                    case 49: return [4 /*yield*/, env.DB.prepare("UPDATE users SET balance = balance - ?, ammo = ammo + ? WHERE user_id = ?").bind(cost, bulletsToBuy, userId).run()];
                    case 50:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDED2 <b>AMMO SECURED!</b>\n\nBought <b>".concat(bulletsToBuy, "</b> bullets for \u20B9").concat(cost, ".\nTotal Ammo: <b>").concat(user.ammo + bulletsToBuy || bulletsToBuy, "</b>"))];
                    case 51:
                        _h.sent();
                        return [2 /*return*/];
                    case 52:
                        if (!(text.startsWith("/fire") || text.startsWith("/f "))) return [3 /*break*/, 89];
                        now = Math.floor(Date.now() / 1000);
                        tgShooter = update.message.from;
                        messageId = update.message.message_id;
                        replyTo = update.message.reply_to_message;
                        cleanText = text.replace(/^\/fire(?:@\S+)?/i, "").replace(/^\/f(?:@\S+)?/i, "").trim();
                        parsedId = parseInt(cleanText, 10);
                        targetId = null;
                        targetDisplay = "";
                        if (!(replyTo && replyTo.from)) return [3 /*break*/, 53];
                        targetId = replyTo.from.id;
                        targetDisplay = replyTo.from.username ? "@".concat(replyTo.from.username) : replyTo.from.first_name;
                        return [3 /*break*/, 56];
                    case 53:
                        if (!(!isNaN(parsedId) && parsedId > 0)) return [3 /*break*/, 54];
                        targetId = parsedId;
                        targetDisplay = "ID: <code>".concat(parsedId, "</code>");
                        return [3 /*break*/, 56];
                    case 54: return [4 /*yield*/, sendMessage(chatId, "❌ <b>Usage:</b> <code>/fire [id]</code>\nOr reply to a user's message with <code>/fire</code>.")];
                    case 55:
                        _h.sent();
                        return [2 /*return*/];
                    case 56:
                        if (!(targetId === tgShooter.id)) return [3 /*break*/, 58];
                        return [4 /*yield*/, sendMessage(chatId, "❌ You cannot shoot yourself, Boss.")];
                    case 57:
                        _h.sent();
                        return [2 /*return*/];
                    case 58: 
                    // 2. Fetch Shooter & Initialize if needed
                    return [4 /*yield*/, env.DB.prepare("INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until) VALUES (?, 1000, 1, 0, 0, 0, 0, 0)").bind(tgShooter.id).run()];
                    case 59:
                        // 2. Fetch Shooter & Initialize if needed
                        _h.sent();
                        return [4 /*yield*/, env.DB.prepare("SELECT * FROM users WHERE user_id = ? LIMIT 1").bind(tgShooter.id).first()];
                    case 60:
                        shooter = _h.sent();
                        if (!(shooter.fire_lock_until > now)) return [3 /*break*/, 62];
                        remaining = shooter.fire_lock_until - now;
                        mins = Math.floor(remaining / 60);
                        secs = remaining % 60;
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDD12 <b>LOCKED OUT!</b>\nYou spammed /fire too fast. Wait <b>".concat(mins, "m ").concat(secs, "s</b>."))];
                    case 61:
                        _h.sent();
                        return [2 /*return*/];
                    case 62:
                        timeSinceLast = now - shooter.last_fire_time;
                        if (!(timeSinceLast < 2)) return [3 /*break*/, 69];
                        newStrikes = shooter.fire_spam_strikes + 1;
                        if (!(newStrikes >= 4)) return [3 /*break*/, 65];
                        lockUntil = now + 240;
                        return [4 /*yield*/, env.DB.prepare("UPDATE users SET fire_spam_strikes = 0, fire_lock_until = ? WHERE user_id = ?").bind(lockUntil, tgShooter.id).run()];
                    case 63:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\u26D4 <b>LOCKOUT TRIGGERED!</b>\nYou hit the spam limit. Banned from shooting for 4 minutes.")];
                    case 64:
                        _h.sent();
                        return [3 /*break*/, 68];
                    case 65: return [4 /*yield*/, env.DB.prepare("UPDATE users SET fire_spam_strikes = ? WHERE user_id = ?").bind(newStrikes, tgShooter.id).run()];
                    case 66:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\u26A0\uFE0F <b>Slow down!</b> Strike <b>".concat(newStrikes, "/4</b>. Hit 4 and your gun jams for 4 minutes."))];
                    case 67:
                        _h.sent();
                        _h.label = 68;
                    case 68: return [2 /*return*/];
                    case 69: 
                    // Update active time safely
                    return [4 /*yield*/, env.DB.prepare("UPDATE users SET fire_spam_strikes = 0, last_fire_time = ? WHERE user_id = ?").bind(now, tgShooter.id).run()];
                    case 70:
                        // Update active time safely
                        _h.sent();
                        if (!(shooter.ammo < 1)) return [3 /*break*/, 72];
                        return [4 /*yield*/, sendMessage(chatId, "❌ <b>OUT OF AMMO!</b>\nBuy bullets using <code>/b 10</code> or <code>/bullets 20</code>.")];
                    case 71:
                        _h.sent();
                        return [2 /*return*/];
                    case 72: return [4 /*yield*/, env.DB.prepare("SELECT * FROM users WHERE user_id = ? LIMIT 1").bind(targetId).first()];
                    case 73:
                        targetDb = _h.sent();
                        if (!!targetDb) return [3 /*break*/, 75];
                        return [4 /*yield*/, sendMessage(chatId, "❌ Target not found in the Underworld database.")];
                    case 74:
                        _h.sent();
                        return [2 /*return*/];
                    case 75:
                        if (!(targetDb.protection_until && targetDb.protection_until > now)) return [3 /*break*/, 77];
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDEE1\uFE0F <b>TARGET SHIELDED!</b>\nYour shot bounced off ".concat(targetDisplay, "'s protection field.\n<i>(refunded)</i>"))];
                    case 76:
                        _h.sent();
                        return [2 /*return*/];
                    case 77:
                        if (!(targetDb.is_alive === 0)) return [3 /*break*/, 80];
                        return [4 /*yield*/, env.DB.prepare("UPDATE users SET ammo = ammo - 1 WHERE user_id = ?").bind(tgShooter.id).run()];
                    case 78:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDC80 <b>WASTED AMMO!</b>\n".concat(targetDisplay, " is already dead."))];
                    case 79:
                        _h.sent();
                        return [2 /*return*/];
                    case 80:
                        roll = Math.random() * 100;
                        if (!(roll <= 95)) return [3 /*break*/, 85];
                        reward = Math.floor(Math.random() * (600 - 400 + 1)) + 400;
                        lootRoll = Math.random() < 0.10;
                        lootText = lootRoll ? "\n\n📦 <b>SECRET LOOT CRATE DROPPED!</b> <i>(Added to your vault)</i>" : "";
                        if (!lootRoll) return [3 /*break*/, 82];
                        return [4 /*yield*/, db_1.DB_MANAGER.addInventoryItem(env.DB, tgShooter.id, "gold_chain", 1)];
                    case 81:
                        _h.sent(); // Gives them a gold chain if it hits
                        _h.label = 82;
                    case 82: return [4 /*yield*/, env.DB.batch([
                            env.DB.prepare("UPDATE users SET is_alive = 0 WHERE user_id = ?").bind(targetId),
                            env.DB.prepare("UPDATE users SET balance = balance + ?, ammo = ammo - 1, kills = kills + 1 WHERE user_id = ?").bind(reward, tgShooter.id)
                        ])];
                    case 83:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDCA5 <b>TARGET ELIMINATED!</b>\n\n<blockquote>".concat(tgShooter.first_name, " fired a clean shot at ").concat(targetDisplay, ".\n\n\uD83D\uDCB0 <b>Bounty Claimed:</b> \u20B9").concat(reward).concat(lootText, "</blockquote>"))];
                    case 84:
                        _h.sent();
                        return [3 /*break*/, 88];
                    case 85: 
                    // MISSFIRE (5%)
                    return [4 /*yield*/, env.DB.prepare("UPDATE users SET ammo = ammo - 1 WHERE user_id = ?").bind(tgShooter.id).run()];
                    case 86:
                        // MISSFIRE (5%)
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDCA8 <b>MISFIRE!</b>\n\n<blockquote>Your weapon jammed! ".concat(targetDisplay, " escaped.\n<i>(You lost 1 bullet)</i></blockquote>"))];
                    case 87:
                        _h.sent();
                        _h.label = 88;
                    case 88: return [2 /*return*/];
                    case 89:
                        if (!(text.toLowerCase() === "/b" || text.toLowerCase() === "/bullets" || text.toLowerCase() === "/ammo")) return [3 /*break*/, 93];
                        // Ensure user exists in DB so we don't get a null error
                        return [4 /*yield*/, env.DB.prepare("INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills, ammo, last_fire_time, fire_spam_strikes, fire_lock_until) VALUES (?, 1000, 1, 0, 0, 0, 0, 0)").bind(userId).run()];
                    case 90:
                        // Ensure user exists in DB so we don't get a null error
                        _h.sent();
                        return [4 /*yield*/, env.DB.prepare("SELECT ammo FROM users WHERE user_id = ? LIMIT 1").bind(userId).first()];
                    case 91:
                        user = _h.sent();
                        ammoCount = user ? user.ammo : 0;
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDD2B <b>AMMO INVENTORY</b>\n\n<blockquote>Boss, you currently have <b>".concat(ammoCount, "</b> bullets left in your magazine.</blockquote>"))];
                    case 92:
                        _h.sent();
                        return [2 /*return*/];
                    case 93:
                        if (!text.startsWith("/rob")) return [3 /*break*/, 128];
                        now = Math.floor(Date.now() / 1000);
                        tgRaider = update.message.from;
                        messageId = update.message.message_id;
                        replyTo = update.message.reply_to_message;
                        cleanText = text.replace(/^\/rob(?:@\S+)?/i, "").trim();
                        parts = cleanText.split(/\s+/).filter(Boolean);
                        parsedAmount = parts[0] ? parseInt(parts[0], 10) : NaN;
                        parsedId = parts[1] ? parseInt(parts[1], 10) : NaN;
                        amount = (!isNaN(parsedAmount) && parsedAmount > 0) ? parsedAmount : 500;
                        targetId = null;
                        targetDisplay = "";
                        if (!(replyTo && replyTo.from)) return [3 /*break*/, 94];
                        targetId = replyTo.from.id;
                        targetDisplay = replyTo.from.username ? "@".concat(replyTo.from.username) : replyTo.from.first_name;
                        return [3 /*break*/, 97];
                    case 94:
                        if (!(!isNaN(parsedId) && parsedId > 0)) return [3 /*break*/, 95];
                        targetId = parsedId;
                        targetDisplay = "ID: <code>".concat(parsedId, "</code>");
                        return [3 /*break*/, 97];
                    case 95: return [4 /*yield*/, sendMessage(chatId, "❌ <b>Usage:</b> <code>/rob [amount] [id]</code>\nOr reply to a user's message with <code>/rob [amount]</code>.")];
                    case 96:
                        _h.sent();
                        return [2 /*return*/];
                    case 97:
                        if (!(targetId === tgRaider.id)) return [3 /*break*/, 99];
                        return [4 /*yield*/, sendMessage(chatId, "❌ Don't rob Yourself.")];
                    case 98:
                        _h.sent();
                        return [2 /*return*/];
                    case 99: 
                    // 2. Fetch/Upsert Raider
                    return [4 /*yield*/, env.DB.prepare("INSERT OR IGNORE INTO users (user_id, balance, last_raid_time, raid_spam_strikes, raid_lock_until) VALUES (?, 0, 0, 0, 0)").bind(tgRaider.id).run()];
                    case 100:
                        // 2. Fetch/Upsert Raider
                        _h.sent();
                        return [4 /*yield*/, env.DB.prepare("SELECT * FROM users WHERE user_id = ? LIMIT 1").bind(tgRaider.id).first()];
                    case 101:
                        raider = _h.sent();
                        if (!(raider.raid_lock_until > now)) return [3 /*break*/, 103];
                        remaining = raider.raid_lock_until - now;
                        mins = Math.floor(remaining / 60);
                        secs = remaining % 60;
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDD12 <b>LOCKED OUT!</b>\nYou spammed /rob too fast. Wait <b>".concat(mins, "m ").concat(secs, "s</b>."))];
                    case 102:
                        _h.sent();
                        return [2 /*return*/];
                    case 103:
                        timeSinceLast = now - raider.last_raid_time;
                        if (!(timeSinceLast < 2)) return [3 /*break*/, 110];
                        newStrikes = raider.raid_spam_strikes + 1;
                        if (!(newStrikes >= 4)) return [3 /*break*/, 106];
                        lockUntil = now + 240;
                        return [4 /*yield*/, env.DB.prepare("UPDATE users SET raid_spam_strikes = 0, raid_lock_until = ? WHERE user_id = ?").bind(lockUntil, tgRaider.id).run()];
                    case 104:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\u26D4 <b>LOCKOUT TRIGGERED!</b>\nYou hit the spam limit. You are banned from robbing for 4 minutes.")];
                    case 105:
                        _h.sent();
                        return [3 /*break*/, 109];
                    case 106: return [4 /*yield*/, env.DB.prepare("UPDATE users SET raid_spam_strikes = ? WHERE user_id = ?").bind(newStrikes, tgRaider.id).run()];
                    case 107:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\u26A0\uFE0F <b>Slow down!</b> Strike <b>".concat(newStrikes, "/4</b>. Hit 4 and you are locked out."))];
                    case 108:
                        _h.sent();
                        _h.label = 109;
                    case 109: return [2 /*return*/];
                    case 110: 
                    // Update last active time safely
                    return [4 /*yield*/, env.DB.prepare("UPDATE users SET raid_spam_strikes = 0, last_raid_time = ? WHERE user_id = ?").bind(now, tgRaider.id).run()];
                    case 111:
                        // Update last active time safely
                        _h.sent();
                        return [4 /*yield*/, env.DB.prepare("SELECT balance, protection_until FROM users WHERE user_id = ? LIMIT 1").bind(targetId).first()];
                    case 112:
                        targetDb = _h.sent();
                        if (!!targetDb) return [3 /*break*/, 114];
                        return [4 /*yield*/, sendMessage(chatId, "❌ Target not found in the Underworld database.")];
                    case 113:
                        _h.sent();
                        return [2 /*return*/];
                    case 114:
                        if (!(targetDb.protection_until && targetDb.protection_until > now)) return [3 /*break*/, 116];
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDEE1\uFE0F <b>TARGET SHIELDED!</b>\n\n<blockquote>".concat(targetDisplay, " has active Underworld Protection.\nYour robbery attempt was blocked by their security forces.</blockquote>"))];
                    case 115:
                        _h.sent();
                        return [2 /*return*/];
                    case 116:
                        if (!(targetDb.balance < 100)) return [3 /*break*/, 118];
                        return [4 /*yield*/, sendMessage(chatId, "\u274C <b>Target is too poor.</b> They only have \u20B9".concat(targetDb.balance, ". Not worth the risk."))];
                    case 117:
                        _h.sent();
                        return [2 /*return*/];
                    case 118:
                        cappedAmount = Math.min(amount, targetDb.balance);
                        roll = Math.random() * 100;
                        if (!(roll < 90)) return [3 /*break*/, 121];
                        // SUCCESS (90%)
                        return [4 /*yield*/, env.DB.batch([
                                env.DB.prepare("UPDATE users SET balance = balance - ? WHERE user_id = ?").bind(cappedAmount, targetId),
                                env.DB.prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?").bind(cappedAmount, tgRaider.id)
                            ])];
                    case 119:
                        // SUCCESS (90%)
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83C\uDFAD <b>HEIST SUCCESSFUL!</b>\n\n<blockquote>".concat(tgRaider.first_name, " slipped into the shadows and stole <b>\u20B9").concat(cappedAmount, "</b> from ").concat(targetDisplay, ".\n<i>Clean exit. No witnesses.</i></blockquote>"))];
                    case 120:
                        _h.sent();
                        return [3 /*break*/, 127];
                    case 121:
                        if (!(roll < 95)) return [3 /*break*/, 124];
                        fivePercent = Math.floor(raider.balance * 0.05);
                        penalty = fivePercent >= 100 ? fivePercent : 100;
                        return [4 /*yield*/, env.DB.prepare("UPDATE users SET balance = balance - ? WHERE user_id = ?").bind(penalty, tgRaider.id).run()];
                    case 122:
                        _h.sent();
                        brokeMsg = raider.balance < 100 ? "\n<i>You were already broke. Your account is now in negative debt!</i>" : "";
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDEA8 <b>BUSTED BY SECURITY!</b>\n\n<blockquote>".concat(tgRaider.first_name, " tripped the alarms trying to hit ").concat(targetDisplay, "!\n\n\uD83D\uDCB8 <b>Penalty:</b> \u20B9").concat(penalty, " burned to ash.").concat(brokeMsg, "</blockquote>"))];
                    case 123:
                        _h.sent();
                        return [3 /*break*/, 127];
                    case 124:
                        totalGain = cappedAmount + 2000;
                        return [4 /*yield*/, env.DB.batch([
                                env.DB.prepare("UPDATE users SET balance = balance - ? WHERE user_id = ?").bind(cappedAmount, targetId),
                                env.DB.prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?").bind(totalGain, tgRaider.id)
                            ])];
                    case 125:
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83D\uDC8E <b>JACKPOT HEIST!</b>\n\n<blockquote>".concat(tgRaider.first_name, " pulled off the raid of the century against ").concat(targetDisplay, "!\n\n\uD83D\uDCB0 Stolen: <b>\u20B9").concat(cappedAmount, "</b>\n\u2728 Bonus Minted: <b>\u20B92000</b>\n\uD83C\uDFC6 Total Haul: <b>\u20B9").concat(totalGain, "</b></blockquote>"))];
                    case 126:
                        _h.sent();
                        _h.label = 127;
                    case 127: return [2 /*return*/];
                    case 128:
                        if (!text.startsWith("/sell")) return [3 /*break*/, 140];
                        if (!(args.length === 0)) return [3 /*break*/, 130];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Kya bechna hai? Usage: <code>/sell [item_name]</code>\nExample: <code>/sell stolen_phone</code>"))];
                    case 129:
                        _h.sent();
                        return [2 /*return*/];
                    case 130:
                        itemToSell_1 = args[0].toLowerCase();
                        itemData = config_1.MARKET_ITEMS[itemToSell_1];
                        if (!!itemData) return [3 /*break*/, 132];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Ye kachra Underworld market me nahi bikta."))];
                    case 131:
                        _h.sent();
                        return [2 /*return*/];
                    case 132: return [4 /*yield*/, db_1.DB_MANAGER.getInventory(env.DB, userId)];
                    case 133:
                        invItems = _h.sent();
                        userItem = invItems.find(function (i) { return i.item_name === itemToSell_1; });
                        if (!(!userItem || userItem.quantity < 1)) return [3 /*break*/, 135];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Tere paas ye item nahi hai. Pehle /inv check kar."))];
                    case 134:
                        _h.sent();
                        return [2 /*return*/];
                    case 135: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 136:
                        user = _h.sent();
                        if (!user)
                            return [2 /*return*/];
                        currentTime_2 = Math.floor(Date.now() / 1000);
                        sellPrice = muscle_1.MUSCLE.calculateMarketPrice(itemData.base_price, itemData.volatility, currentTime_2);
                        // Clinic updates (Remove 1 item, Add money)
                        return [4 /*yield*/, db_1.DB_MANAGER.addInventoryItem(env.DB, userId, itemToSell_1, -1)];
                    case 137:
                        // Clinic updates (Remove 1 item, Add money)
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, user.balance + sellPrice)];
                    case 138:
                        _h.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83E\uDD1D <b>D E A L   D O N E</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> sold 1x <b>").concat(itemData.emoji, " ").concat(itemData.name.toUpperCase(), "</b>!\n\n\uD83D\uDCB0 <b>Earned:</b> \u20B9").concat(sellPrice, "\n\uD83C\uDFE6 <b>New Balance:</b> \u20B9").concat(user.balance + sellPrice))];
                    case 139:
                        _h.sent();
                        return [2 /*return*/];
                    case 140:
                        if (!(text === "/leaderboard" || text === "/top")) return [3 /*break*/, 143];
                        return [4 /*yield*/, db_1.DB_MANAGER.getTopPlayers(env.DB, 5)];
                    case 141:
                        topPlayers = _h.sent();
                        lbText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83C\uDFC6 <b>T O P   B O S S E S</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        if (!topPlayers || topPlayers.length === 0) {
                            lbText += "No players found in the Underworld.";
                        }
                        else {
                            rank = 1;
                            for (_g = 0, topPlayers_1 = topPlayers; _g < topPlayers_1.length; _g++) {
                                p = topPlayers_1[_g];
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
                    case 142:
                        _h.sent();
                        return [2 /*return*/];
                    case 143:
                        if (!(text === "/boss" || text === "/raid")) return [3 /*break*/, 152];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 144:
                        user = _h.sent();
                        if (!(!user || user.is_alive === 0)) return [3 /*break*/, 146];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.dead, " Murde Boss se nahi ladte. Pehle /revive kar aur apni aukaat bana!"))];
                    case 145:
                        _h.sent();
                        return [2 /*return*/];
                    case 146:
                        playerLevel = user.kills + 1;
                        hit = muscle_1.MUSCLE.rollBossDamage(playerLevel);
                        bossDefense = 200;
                        raidText = "".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDC79 <b>B O S S   R A I D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n");
                        raidText += "\u2694\uFE0F <b>".concat(firstName, "</b> (Lv. ").concat(playerLevel, ") attacked the Kingpin's Convoy!\n");
                        raidText += "\uD83D\uDCA5 <b>Damage Dealt:</b> ".concat(hit.damage, " ").concat(hit.is_crit ? "<b>(CRITICAL HIT! 🔥)</b>" : "", "\n\n");
                        if (!(hit.damage >= bossDefense)) return [3 /*break*/, 148];
                        reward = Math.floor(Math.random() * 5000) + 2000;
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, user.balance + reward)];
                    case 147:
                        _h.sent();
                        raidText += "\u2570\u2501\u27EE ".concat(config_1.EMOJIS.success, " <b>V I C T O R Y</b> \u27EF\n\u2502 You broke the convoy's defense!\n\u2502 \uD83D\uDCB0 <b>Reward:</b> +\u20B9").concat(reward, "\n");
                        return [3 /*break*/, 150];
                    case 148: 
                    // Defeat: Instant Death
                    return [4 /*yield*/, db_1.DB_MANAGER.setAliveStatus(env.DB, userId, 0)];
                    case 149:
                        // Defeat: Instant Death
                        _h.sent();
                        raidText += "\u2570\u2501\u27EE ".concat(config_1.EMOJIS.dead, " <b>D E F E A T</b> \u27EF\n\u2502 The Boss's guards overpowered you.\n\u2502 \uD83E\uDE78 You were killed in action. Use /revive.\n");
                        _h.label = 150;
                    case 150:
                        raidText += "".concat(config_1.UI.BORDER_BOT);
                        return [4 /*yield*/, sendMessage(raidText)];
                    case 151:
                        _h.sent();
                        return [2 /*return*/];
                    case 152:
                        if (!(text === "/id")) return [3 /*break*/, 154];
                        idText = "\uD83C\uDD94 <b>Your ID:</b> <code>".concat(userId, "</code>\n\uD83D\uDCAC <b>Chat ID:</b> <code>").concat(chatId, "</code>");
                        // Agar kisi ke message par reply kiya hai, toh uska ID bhi dikhao
                        if (update.message.reply_to_message) {
                            replyId = update.message.reply_to_message.from.id;
                            replyName = update.message.reply_to_message.from.first_name || "User";
                            idText += "\n\uD83D\uDC64 <b>".concat(replyName, "'s ID:</b> <code>").concat(replyId, "</code>");
                        }
                        return [4 /*yield*/, sendMessage(idText)];
                    case 153:
                        _h.sent();
                        return [2 /*return*/];
                    case 154:
                        if (!(text === "/ping")) return [3 /*break*/, 156];
                        latency = Date.now() - startTime;
                        return [4 /*yield*/, sendMessage("\uD83C\uDFD3 <b>Pong!</b>\n\u26A1 <b>Latency:</b> <code>".concat(latency, "ms</code>\n\uD83D\uDCE1 <b>Status:</b> <i>Stable & Operational</i>"))];
                    case 155:
                        _h.sent();
                        return [2 /*return*/];
                    case 156:
                        if (!text.startsWith("/bal")) return [3 /*break*/, 162];
                        targetId = userId;
                        targetName = firstName;
                        // Agar reply kiya hai toh dost ka balance dikhao
                        if (update.message.reply_to_message) {
                            targetId = update.message.reply_to_message.from.id;
                            targetName = update.message.reply_to_message.from.first_name || "User";
                        }
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 157:
                        user = _h.sent();
                        if (!user) return [3 /*break*/, 159];
                        return [4 /*yield*/, sendMessage("\uD83D\uDCB0 <b>".concat(targetName, "'s Balance:</b> \u20B9").concat(user.balance))];
                    case 158:
                        _h.sent();
                        return [3 /*break*/, 161];
                    case 159: return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Account not found."))];
                    case 160:
                        _h.sent();
                        _h.label = 161;
                    case 161: return [2 /*return*/];
                    case 162:
                        if (!text.startsWith("/transfer")) return [3 /*break*/, 170];
                        if (userId !== config_1.CONFIG.OWNER_ID)
                            return [2 /*return*/]; // Silent block for non-owners
                        if (!(!update.message.reply_to_message || args.length === 0)) return [3 /*break*/, 164];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Usage:</b> Reply + <code>/transfer [amount]</code>"))];
                    case 163:
                        _h.sent();
                        return [2 /*return*/];
                    case 164:
                        amount = parseInt(args[0]);
                        if (isNaN(amount))
                            return [2 /*return*/];
                        targetId = update.message.reply_to_message.from.id;
                        targetName = update.message.reply_to_message.from.first_name || "Agent";
                        return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, targetId)];
                    case 165:
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 166:
                        target = _h.sent();
                        if (!target) return [3 /*break*/, 169];
                        newBalance = target.balance + amount;
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, targetId, newBalance)];
                    case 167:
                        _h.sent();
                        action = amount > 0 ? "blessed" : "penalized";
                        symbol = amount > 0 ? "+" : "";
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDC51 <b>S U P R E M E   O R D E R</b>\n").concat(config_1.UI.BORDER_BOT, "\n\nBoss has ").concat(action, " <b>").concat(targetName, "</b>!\n\uD83D\uDCCA <b>Transaction:</b> ").concat(symbol).concat(amount, "\n\uD83C\uDFE6 <b>New Balance:</b> \u20B9").concat(newBalance, "\n").concat(config_1.UI.BORDER_BOT))];
                    case 168:
                        _h.sent();
                        _h.label = 169;
                    case 169: return [2 /*return*/];
                    case 170:
                        if (!(text.startsWith("/pay") || text.startsWith("/give"))) return [3 /*break*/, 190];
                        if (!!update.message.reply_to_message) return [3 /*break*/, 172];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Kisko paise dene hain? Reply to a player."))];
                    case 171:
                        _h.sent();
                        return [2 /*return*/];
                    case 172:
                        if (!(args.length === 0)) return [3 /*break*/, 174];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Usage:</b> <code>/pay [amount]</code>\nExample: <code>/pay 500</code>"))];
                    case 173:
                        _h.sent();
                        return [2 /*return*/];
                    case 174:
                        amount = parseInt(args[0]);
                        if (!(isNaN(amount) || amount <= 0)) return [3 /*break*/, 176];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Sahi amount daal bhai."))];
                    case 175:
                        _h.sent();
                        return [2 /*return*/];
                    case 176:
                        targetId = update.message.reply_to_message.from.id;
                        targetName = update.message.reply_to_message.from.first_name || "Agent";
                        if (!(userId === targetId)) return [3 /*break*/, 178];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Khud ko paise kyu de raha hai?"))];
                    case 177:
                        _h.sent();
                        return [2 /*return*/];
                    case 178:
                        if (!update.message.reply_to_message.from.is_bot) return [3 /*break*/, 180];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Bot moh-maya se door hai."))];
                    case 179:
                        _h.sent();
                        return [2 /*return*/];
                    case 180: return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 181:
                        sender = _h.sent();
                        if (!(!sender || sender.balance < amount)) return [3 /*break*/, 183];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Teri jeb me itne paise nahi hain. Balance: \u20B9").concat((sender === null || sender === void 0 ? void 0 : sender.balance) || 0))];
                    case 182:
                        _h.sent();
                        return [2 /*return*/];
                    case 183: 
                    // Ensure target exists
                    return [4 /*yield*/, db_1.DB_MANAGER.ensureUserExists(env.DB, targetId)];
                    case 184:
                        // Ensure target exists
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, targetId)];
                    case 185:
                        target = _h.sent();
                        if (!target) return [3 /*break*/, 189];
                        // Deduct from sender, Add to target
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, sender.balance - amount)];
                    case 186:
                        // Deduct from sender, Add to target
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, targetId, target.balance + amount)];
                    case 187:
                        _h.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDCB8 <b>M O N E Y   T R A N S F E R</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> ne <b>").concat(targetName, "</b> ko \u20B9").concat(amount, " diye!\n\n\uD83C\uDFE6 <b>Your New Balance:</b> \u20B9").concat(sender.balance - amount))];
                    case 188:
                        _h.sent();
                        _h.label = 189;
                    case 189: return [2 /*return*/];
                    case 190:
                        if (!(text.startsWith("/defend") || text.startsWith("/safe"))) return [3 /*break*/, 206];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 191:
                        user = _h.sent();
                        if (!user)
                            return [2 /*return*/];
                        currentSeconds = Math.floor(Date.now() / 1000);
                        if (!(user.protection_until && user.protection_until > currentSeconds)) return [3 /*break*/, 193];
                        remaining = Math.ceil((user.protection_until - currentSeconds) / 3600);
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " <b>Protection Active!</b>\nAapki security pehle se chalu hai.\n\u23F3 <b>Remaining:</b> ~").concat(remaining, " hours.\nKhatam hone ke baad hi naya plan le sakte hain."))];
                    case 192:
                        _h.sent();
                        return [2 /*return*/];
                    case 193:
                        if (!(args.length === 0)) return [3 /*break*/, 195];
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>B U Y   P R O T E C T I O N</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n<b>Plans:</b>\n\u251C <code>/defend 1d</code> \u2796 \u20B9400\n\u251C <code>/defend 2d</code> \u2796 \u20B9800\n\u2514 <code>/defend 3d</code> \u2796 \u20B91400"))];
                    case 194:
                        _h.sent();
                        return [2 /*return*/];
                    case 195:
                        plan = args[0].toLowerCase();
                        cost = 0;
                        days = 0;
                        if (!(plan === "1d")) return [3 /*break*/, 196];
                        cost = 400;
                        days = 1;
                        return [3 /*break*/, 200];
                    case 196:
                        if (!(plan === "2d")) return [3 /*break*/, 197];
                        cost = 800;
                        days = 2;
                        return [3 /*break*/, 200];
                    case 197:
                        if (!(plan === "3d")) return [3 /*break*/, 198];
                        cost = 1400;
                        days = 3;
                        return [3 /*break*/, 200];
                    case 198: return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Invalid plan (1d/2d/3d)."))];
                    case 199:
                        _h.sent();
                        return [2 /*return*/];
                    case 200:
                        if (!(user.balance < cost)) return [3 /*break*/, 202];
                        return [4 /*yield*/, sendMessage("".concat(config_1.EMOJIS.error, " Low balance! \u20B9").concat(cost, " required."))];
                    case 201:
                        _h.sent();
                        return [2 /*return*/];
                    case 202:
                        newProtectionTime = currentSeconds + (days * 86400);
                        return [4 /*yield*/, db_1.DB_MANAGER.updateBalance(env.DB, userId, user.balance - cost)];
                    case 203:
                        _h.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.setProtection(env.DB, userId, newProtectionTime)];
                    case 204:
                        _h.sent();
                        return [4 /*yield*/, sendMessage("".concat(config_1.UI.BORDER_TOP, "\n\u2502 \uD83D\uDEE1\uFE0F <b>G U A R D S   H I R E D</b>\n").concat(config_1.UI.BORDER_BOT, "\n\n").concat(config_1.EMOJIS.success, " <b>").concat(firstName, "</b> protected for <b>").concat(days, " Day(s)</b>!"))];
                    case 205:
                        _h.sent();
                        return [2 /*return*/];
                    case 206:
                        if (!(text === "/upgradedb")) return [3 /*break*/, 213];
                        if (userId !== config_1.CONFIG.OWNER_ID)
                            return [2 /*return*/];
                        _h.label = 207;
                    case 207:
                        _h.trys.push([207, 210, , 212]);
                        // Table for Group Admins
                        return [4 /*yield*/, env.DB.prepare("CREATE TABLE IF NOT EXISTS group_admins (chat_id INTEGER, user_id INTEGER, level INTEGER, title TEXT, PRIMARY KEY(chat_id, user_id))").run()];
                    case 208:
                        // Table for Group Admins
                        _h.sent();
                        return [4 /*yield*/, sendMessage("✅ <b>Database Upgraded!</b> Admin table created.")];
                    case 209:
                        _h.sent();
                        return [3 /*break*/, 212];
                    case 210:
                        e_2 = _h.sent();
                        return [4 /*yield*/, sendMessage("\u26A0\uFE0F Error: ".concat(e_2.message))];
                    case 211:
                        _h.sent();
                        return [3 /*break*/, 212];
                    case 212: return [2 /*return*/];
                    case 213:
                        if (!text.startsWith("/promote")) return [3 /*break*/, 225];
                        if (!isHighAdmin)
                            return [2 /*return*/];
                        targetId = (_a = update.message.reply_to_message) === null || _a === void 0 ? void 0 : _a.from.id;
                        level = 1;
                        idArg = args.find(function (a) { return !isNaN(parseInt(a)) && a.length > 7; });
                        lvlArg = args.find(function (a) { return ["1", "2", "3"].includes(a); });
                        if (idArg)
                            targetId = parseInt(idArg);
                        if (lvlArg)
                            level = parseInt(lvlArg);
                        if (!!targetId) return [3 /*break*/, 215];
                        return [4 /*yield*/, sendMessage(chatId, "❌ Reply to user or provide an ID.")];
                    case 214:
                        _h.sent();
                        return [2 /*return*/];
                    case 215:
                        _h.trys.push([215, 220, , 222]);
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/promoteChatMember"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    chat_id: chatId,
                                    user_id: targetId,
                                    can_manage_chat: true,
                                    can_delete_messages: true,
                                    can_invite_users: true,
                                    can_restrict_members: true,
                                    can_pin_messages: true,
                                    can_manage_video_chats: true
                                })
                            })];
                    case 216:
                        response = _h.sent();
                        return [4 /*yield*/, response.json()];
                    case 217:
                        data = _h.sent();
                        if (!!data.ok) return [3 /*break*/, 219];
                        return [4 /*yield*/, sendMessage(chatId, "\u274C <b>Telegram Error:</b> ".concat(data.description, "\n<i>(Ensure the bot has \"Add New Admins\" permission!)</i>"))];
                    case 218:
                        _h.sent();
                        return [2 /*return*/];
                    case 219: return [3 /*break*/, 222];
                    case 220:
                        e_3 = _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "❌ Failed to connect to Telegram API.")];
                    case 221:
                        _h.sent();
                        return [2 /*return*/];
                    case 222: 
                    // 2. Update Internal Database
                    return [4 /*yield*/, db_1.DB_MANAGER.setAdmin(env.DB, chatId, targetId, level, "Admin")];
                    case 223:
                        // 2. Update Internal Database
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\u2705 <b>PROMOTED!</b>\nUser <code>".concat(targetId, "</code> is now a Telegram Admin and a Level ").concat(level, " Underworld Admin."))];
                    case 224:
                        _h.sent();
                        return [2 /*return*/];
                    case 225:
                        if (!text.startsWith("/demote")) return [3 /*break*/, 232];
                        if (!isHighAdmin)
                            return [2 /*return*/];
                        targetId = (_b = update.message.reply_to_message) === null || _b === void 0 ? void 0 : _b.from.id;
                        idArg = args.find(function (a) { return !isNaN(parseInt(a)) && a.length > 7; });
                        if (idArg)
                            targetId = parseInt(idArg);
                        if (!targetId)
                            return [2 /*return*/];
                        _h.label = 226;
                    case 226:
                        _h.trys.push([226, 228, , 229]);
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/promoteChatMember"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    chat_id: chatId,
                                    user_id: targetId,
                                    can_manage_chat: false,
                                    can_change_info: false,
                                    can_delete_messages: false,
                                    can_invite_users: false,
                                    can_restrict_members: false,
                                    can_pin_messages: false,
                                    can_manage_video_chats: false,
                                    can_promote_members: false
                                })
                            })];
                    case 227:
                        _h.sent();
                        return [3 /*break*/, 229];
                    case 228:
                        e_4 = _h.sent();
                        return [3 /*break*/, 229];
                    case 229: 
                    // 2. Update Internal Database
                    return [4 /*yield*/, db_1.DB_MANAGER.removeAdmin(env.DB, chatId, targetId)];
                    case 230:
                        // 2. Update Internal Database
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\u274C <b>DEMOTED!</b>\nUser <code>".concat(targetId, "</code> stripped of all Admin rights."))];
                    case 231:
                        _h.sent();
                        return [2 /*return*/];
                    case 232:
                        if (!text.startsWith("/title")) return [3 /*break*/, 244];
                        if (!isHighAdmin)
                            return [2 /*return*/];
                        targetId = (_c = update.message.reply_to_message) === null || _c === void 0 ? void 0 : _c.from.id;
                        titleName = args.filter(function (a) { return isNaN(parseInt(a)) || a.length < 7; }).join(" ");
                        idArg = args.find(function (a) { return !isNaN(parseInt(a)) && a.length > 7; });
                        if (idArg)
                            targetId = parseInt(idArg);
                        if (!(!targetId || !titleName)) return [3 /*break*/, 234];
                        return [4 /*yield*/, sendMessage(chatId, "❌ Usage: /title [name] [id/reply]")];
                    case 233:
                        _h.sent();
                        return [2 /*return*/];
                    case 234:
                        _h.trys.push([234, 240, , 241]);
                        // Ensure they have base admin rights first
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/promoteChatMember"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, user_id: targetId, can_manage_chat: true })
                            })];
                    case 235:
                        // Ensure they have base admin rights first
                        _h.sent();
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/setChatAdministratorCustomTitle"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, user_id: targetId, custom_title: titleName })
                            })];
                    case 236:
                        titleRes = _h.sent();
                        return [4 /*yield*/, titleRes.json()];
                    case 237:
                        titleData = _h.sent();
                        if (!!titleData.ok) return [3 /*break*/, 239];
                        return [4 /*yield*/, sendMessage(chatId, "\u274C <b>Telegram Error:</b> ".concat(titleData.description, "\n<i>(Bot needs 'Add Admins' right!)</i>"))];
                    case 238:
                        _h.sent();
                        return [2 /*return*/];
                    case 239: return [3 /*break*/, 241];
                    case 240:
                        e_5 = _h.sent();
                        return [3 /*break*/, 241];
                    case 241: 
                    // 2. Update Internal Database
                    return [4 /*yield*/, db_1.DB_MANAGER.setAdmin(env.DB, chatId, targetId, 1, titleName)];
                    case 242:
                        // 2. Update Internal Database
                        _h.sent();
                        return [4 /*yield*/, sendMessage(chatId, "\uD83C\uDFF7\uFE0F <b>TITLE UPDATED!</b>\nTarget <code>".concat(targetId, "</code> is now officially tagged as: <b>").concat(titleName, "</b>"))];
                    case 243:
                        _h.sent();
                        return [2 /*return*/];
                    case 244: return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // ====================================================
    // ╭━━━━━━━━━━━━━━━✪
    // │ 🕹️ CALLBACK ROUTER (DYNAMIC UI & GHOST PROTOCOL)
    // ╰━━━━━━━━━━━━━━━✪
    processCallback: function (query, env, editMessageText, answerCallbackQuery) {
        return __awaiter(this, void 0, void 0, function () {
            var data, chatId, messageId, userId, messageDate, currentTime, botUsername, replyMarkup, msg, user, replyMarkup, msg, replyMarkup, msg, settings, isOn, statusText, replyMarkup, settings, backMarkup, settings, backMarkup, expiresAt, replyMarkup, settings, textTemplate, mediaData, finalMsg, _a, mediaType, fileId, endpoint, payload;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = query.data;
                        chatId = query.message.chat.id;
                        messageId = query.message.message_id;
                        userId = query.from.id;
                        messageDate = query.message.date;
                        currentTime = Math.floor(Date.now() / 1000);
                        if (!(messageDate && (currentTime - messageDate) > 3600)) return [3 /*break*/, 2];
                        // Menu is older than 1 hour. Kill it.
                        return [4 /*yield*/, answerCallbackQuery(query.id, "❌ This menu has expired (1 Hour). Type /start for a new terminal.", true)];
                    case 1:
                        // Menu is older than 1 hour. Kill it.
                        _b.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, answerCallbackQuery(query.id)];
                    case 3:
                        _b.sent(); // Stops the loading spinner
                        if (!(data === "menu_start")) return [3 /*break*/, 5];
                        botUsername = "T_he_Main_Bot";
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "👤 My Profile", callback_data: "menu_profile" }],
                                [{ text: "➕ Add to Group", url: "https://t.me/".concat(botUsername, "?startgroup=true") }, { text: "⚙️ Settings", callback_data: "menu_settings" }]
                            ]
                        };
                        msg = "\uD83D\uDC51 <b>THE UNDERWORLD TERMINAL</b>\n\n<blockquote><b>Welcome back, Agent.</b>\nConnection established. All systems are green. Select a module below to begin.</blockquote>";
                        return [4 /*yield*/, editMessageText(chatId, messageId, msg, replyMarkup)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 5:
                        if (!(data === "menu_profile")) return [3 /*break*/, 8];
                        return [4 /*yield*/, db_1.DB_MANAGER.getUser(env.DB, userId)];
                    case 6:
                        user = (_b.sent()) || { balance: 0, kills: 0 };
                        replyMarkup = { inline_keyboard: [[{ text: "🔙 Back to Hub", callback_data: "menu_start" }]] };
                        msg = "\uD83D\uDC64 <b>AGENT PROFILE</b>\n\n<blockquote><b>Name:</b> ".concat(query.from.first_name, "\n<b>ID:</b> <code>").concat(userId, "</code>\n<b>Bank Vault:</b> \u20B9").concat(user.balance, "\n<b>Hitman Kills:</b> ").concat(user.kills, "</blockquote>");
                        return [4 /*yield*/, editMessageText(chatId, messageId, msg, replyMarkup)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 8:
                        if (!(data === "menu_settings")) return [3 /*break*/, 10];
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "👋 Welcome", callback_data: "menu_welcome" }, { text: "My friend 🤫", url: "tg://settings" }],
                                [{ text: "Soon ⏳", callback_data: "alert_soon" }, { text: "Soon ⏳", callback_data: "alert_soon" }],
                                [{ text: "🔙 Back to Hub", callback_data: "menu_start" }]
                            ]
                        };
                        msg = "\u2699\uFE0F <b>SETTINGS MENU</b>\n\n<blockquote>Configure your Underworld experience and group rules below.</blockquote>";
                        return [4 /*yield*/, editMessageText(chatId, messageId, msg, replyMarkup)];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 10:
                        if (!(data === "menu_welcome")) return [3 /*break*/, 14];
                        // Clear any pending setup session if user clicks Back/Cancel
                        return [4 /*yield*/, db_1.DB_MANAGER.clearSession(env.DB, userId)];
                    case 11:
                        // Clear any pending setup session if user clicks Back/Cancel
                        _b.sent();
                        return [4 /*yield*/, db_1.DB_MANAGER.getGroupSettings(env.DB, chatId)];
                    case 12:
                        settings = _b.sent();
                        isOn = settings && settings.welcome_enabled === 1;
                        statusText = isOn ? "🟢 ON" : "🔴 OFF";
                        replyMarkup = {
                            inline_keyboard: [
                                [{ text: "🟢 On", callback_data: "wel_on" }, { text: "🔴 Off", callback_data: "wel_off" }],
                                [{ text: "📝 Set", callback_data: "wel_set" }, { text: "👁️ See", callback_data: "wel_see" }],
                                [{ text: "🔙 Back", callback_data: "menu_settings" }]
                            ]
                        };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "\uD83D\uDC4B <b>WELCOME SETTINGS</b>\n\nCurrent Status: <b>".concat(statusText, "</b>\nConfigure how new members are greeted:"), replyMarkup)];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 14:
                        if (!(data === "alert_soon")) return [3 /*break*/, 16];
                        return [4 /*yield*/, answerCallbackQuery(query.id, "⏳ Feature coming soon!", true)];
                    case 15:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 16:
                        if (!(data === "wel_on")) return [3 /*break*/, 22];
                        return [4 /*yield*/, db_1.DB_MANAGER.getGroupSettings(env.DB, chatId)];
                    case 17:
                        settings = _b.sent();
                        if (!(!settings || !settings.welcome_text)) return [3 /*break*/, 19];
                        return [4 /*yield*/, answerCallbackQuery(query.id, "❌ Please 'Set' a welcome message first!", true)];
                    case 18:
                        _b.sent();
                        return [2 /*return*/];
                    case 19: return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, chatId, 'welcome_enabled', 1)];
                    case 20:
                        _b.sent();
                        backMarkup = { inline_keyboard: [[{ text: "🔙 Back", callback_data: "menu_welcome" }]] };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "✅ <b>Welcome Messages: ON</b>\n\nNew members will now be greeted automatically.", backMarkup)];
                    case 21:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 22:
                        if (!(data === "wel_off")) return [3 /*break*/, 28];
                        return [4 /*yield*/, db_1.DB_MANAGER.getGroupSettings(env.DB, chatId)];
                    case 23:
                        settings = _b.sent();
                        if (!(!settings || !settings.welcome_text)) return [3 /*break*/, 25];
                        return [4 /*yield*/, answerCallbackQuery(query.id, "❌ Please 'Set' a welcome message first!", true)];
                    case 24:
                        _b.sent();
                        return [2 /*return*/];
                    case 25: return [4 /*yield*/, db_1.DB_MANAGER.updateGroupSetting(env.DB, chatId, 'welcome_enabled', 0)];
                    case 26:
                        _b.sent();
                        backMarkup = { inline_keyboard: [[{ text: "🔙 Back", callback_data: "menu_welcome" }]] };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "🔴 <b>Welcome Messages: OFF</b>\n\nGreetings are paused.", backMarkup)];
                    case 27:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 28:
                        if (!(data === "wel_set")) return [3 /*break*/, 31];
                        expiresAt = Math.floor(Date.now() / 1000) + 1800;
                        return [4 /*yield*/, db_1.DB_MANAGER.setSession(env.DB, userId, chatId, 'awaiting_text', expiresAt)];
                    case 29:
                        _b.sent();
                        replyMarkup = { inline_keyboard: [[{ text: "🔙 Cancel", callback_data: "menu_welcome" }]] };
                        return [4 /*yield*/, editMessageText(chatId, messageId, "📝 <b>WELCOME SETUP [Step 1/2]</b>\n\nSend me the <b>Text Message</b> you want to use for welcoming new members.\n<i>(You can use {name} and {id} in your text)</i>\n\n<i>You have 30 minutes.</i>", replyMarkup)];
                    case 30:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 31:
                        if (!(data === "wel_see")) return [3 /*break*/, 42];
                        return [4 /*yield*/, answerCallbackQuery(query.id)];
                    case 32:
                        _b.sent(); // Stop the loading spinner
                        return [4 /*yield*/, db_1.DB_MANAGER.getGroupSettings(env.DB, chatId)];
                    case 33:
                        settings = _b.sent();
                        textTemplate = (settings && settings.welcome_text) ? settings.welcome_text : "Welcome to the Underworld, {name}!";
                        mediaData = settings ? settings.welcome_media_id : null;
                        finalMsg = "👁️ <b>[WELCOME PREVIEW]</b>\n\n" + textTemplate.replace(/{name}/g, query.from.first_name).replace(/{id}/g, userId.toString());
                        if (!(!mediaData || mediaData === 'none' || !mediaData.includes(':'))) return [3 /*break*/, 35];
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/sendMessage"), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, text: finalMsg, parse_mode: "HTML" })
                            })];
                    case 34:
                        _b.sent();
                        return [3 /*break*/, 42];
                    case 35:
                        _a = mediaData.split(':'), mediaType = _a[0], fileId = _a[1];
                        endpoint = "";
                        payload = { chat_id: chatId, parse_mode: "HTML" };
                        if (!(mediaType === "photo")) return [3 /*break*/, 36];
                        endpoint = "sendPhoto";
                        payload.photo = fileId;
                        payload.caption = finalMsg;
                        return [3 /*break*/, 40];
                    case 36:
                        if (!(mediaType === "video")) return [3 /*break*/, 37];
                        endpoint = "sendVideo";
                        payload.video = fileId;
                        payload.caption = finalMsg;
                        return [3 /*break*/, 40];
                    case 37:
                        if (!(mediaType === "animation")) return [3 /*break*/, 38];
                        endpoint = "sendAnimation";
                        payload.animation = fileId;
                        payload.caption = finalMsg;
                        return [3 /*break*/, 40];
                    case 38:
                        if (!(mediaType === "sticker")) return [3 /*break*/, 40];
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/sendSticker"), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, sticker: fileId })
                            })];
                    case 39:
                        _b.sent();
                        endpoint = "sendMessage";
                        payload.text = finalMsg;
                        _b.label = 40;
                    case 40:
                        if (!endpoint) return [3 /*break*/, 42];
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/").concat(endpoint), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload)
                            })];
                    case 41:
                        _b.sent();
                        _b.label = 42;
                    case 42: return [2 /*return*/];
                }
            });
        });
    },
    // ╭━━━━━━━━━━━━━━━✪
    // │ 🚪 THE FLAWLESS GREETING PROTOCOL
    // ╰━━━━━━━━━━━━━━━✪
    processWelcomeFlawless: function (chatMemberUpdate, env) {
        return __awaiter(this, void 0, void 0, function () {
            var chatId, chatTitle, user, settings, textTemplate, mediaData, escapeHtml, safeFirst, safeLast, safeName, safeUsername, safeGroup, finalMsg, _a, mediaType, fileId, endpoint, payload;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        chatId = chatMemberUpdate.chat.id;
                        chatTitle = chatMemberUpdate.chat.title || "the group";
                        user = chatMemberUpdate.new_chat_member.user;
                        if (user.is_bot)
                            return [2 /*return*/]; // Do not welcome other bots
                        return [4 /*yield*/, db_1.DB_MANAGER.getGroupSettings(env.DB, chatId)];
                    case 1:
                        settings = _b.sent();
                        if (!settings || settings.welcome_enabled !== 1)
                            return [2 /*return*/];
                        textTemplate = settings.welcome_text || "Welcome {first} to {group}!";
                        mediaData = settings.welcome_media_id;
                        escapeHtml = function (str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
                        safeFirst = escapeHtml(user.first_name || "Agent");
                        safeLast = escapeHtml(user.last_name || "");
                        safeName = escapeHtml(("".concat(user.first_name || "", " ").concat(user.last_name || "")).trim() || "Agent");
                        safeUsername = user.username ? "@".concat(escapeHtml(user.username)) : safeFirst;
                        safeGroup = escapeHtml(chatTitle);
                        finalMsg = textTemplate
                            .replace(/{first}/gi, safeFirst)
                            .replace(/{last}/gi, safeLast)
                            .replace(/{name}/gi, safeName)
                            .replace(/{username}/gi, safeUsername)
                            .replace(/{id}/gi, user.id.toString())
                            .replace(/{group}/gi, safeGroup);
                        if (!(!mediaData || mediaData === 'none' || !mediaData.includes(':'))) return [3 /*break*/, 3];
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/sendMessage"), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, text: finalMsg, parse_mode: "HTML" })
                            })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 3:
                        _a = mediaData.split(':'), mediaType = _a[0], fileId = _a[1];
                        endpoint = "";
                        payload = { chat_id: chatId, parse_mode: "HTML" };
                        if (!(mediaType === "photo")) return [3 /*break*/, 4];
                        endpoint = "sendPhoto";
                        payload.photo = fileId;
                        payload.caption = finalMsg;
                        return [3 /*break*/, 8];
                    case 4:
                        if (!(mediaType === "video")) return [3 /*break*/, 5];
                        endpoint = "sendVideo";
                        payload.video = fileId;
                        payload.caption = finalMsg;
                        return [3 /*break*/, 8];
                    case 5:
                        if (!(mediaType === "animation")) return [3 /*break*/, 6];
                        endpoint = "sendAnimation";
                        payload.animation = fileId;
                        payload.caption = finalMsg;
                        return [3 /*break*/, 8];
                    case 6:
                        if (!(mediaType === "sticker")) return [3 /*break*/, 8];
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/sendSticker"), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chat_id: chatId, sticker: fileId })
                            })];
                    case 7:
                        _b.sent();
                        endpoint = "sendMessage";
                        payload.text = finalMsg;
                        _b.label = 8;
                    case 8:
                        if (!endpoint) return [3 /*break*/, 10];
                        return [4 /*yield*/, fetch("https://api.telegram.org/bot".concat(config_1.CONFIG.BOT_TOKEN, "/").concat(endpoint), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload)
                            })];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        });
    }
}; // <-- Closes the GAME object
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END OF GAME FILE
