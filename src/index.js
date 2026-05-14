// ╭━━━━━━━━━━━━━━━✪
// │ 🧠 THE MANAGER (INDEX / ROUTER)
// ╰━━━━━━━━━━━━━━━✪  
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
async;
fetch(request, Request, env, CloudflareEnv, ctx, ExecutionContext);
Promise < Response > {
    if: function (request) { },
    : .method === "POST"
};
{
    try {
        var update = await request.json();
        var startTime = Date.now();
        // Ensure new DB tables exist
        await Promise.resolve().then(function () { return require('./db'); }).then(function (m) { return m.DB_MANAGER.initSettings(env.DB); });
        // UTILITY: Send Message
        var sendMessage = function (chatId, msg, reply_markup) { return __awaiter(void 0, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                payload = { chat_id: chatId, text: msg, parse_mode: "HTML" };
                if (reply_markup)
                    payload.reply_markup = reply_markup;
                return [2 /*return*/, fetch("https://api.telegram.org/bot".concat(CONFIG.BOT_TOKEN, "/sendMessage"), {
                        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
                    })];
            });
        }); };
        // UTILITY: Edit Button Message
        var editMessageText = function (chatId, messageId, text, reply_markup) { return __awaiter(void 0, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                payload = { chat_id: chatId, message_id: messageId, text: text, parse_mode: "HTML" };
                if (reply_markup)
                    payload.reply_markup = reply_markup;
                return [2 /*return*/, fetch("https://api.telegram.org/bot".concat(CONFIG.BOT_TOKEN, "/editMessageText"), {
                        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
                    })];
            });
        }); };
        // UTILITY: Stop Button Loading Spinner
        var answerCallbackQuery = function (callbackQueryId, text, showAlert) {
            if (text === void 0) { text = ""; }
            if (showAlert === void 0) { showAlert = false; }
            return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, fetch("https://api.telegram.org/bot".concat(CONFIG.BOT_TOKEN, "/answerCallbackQuery"), {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
                        })];
                });
            });
        };
        // ROUTE 1: BUTTON CLICKS (CALLBACKS)
        if (update.callback_query) {
            ctx.waitUntil(GAME.processCallback(update.callback_query, env, editMessageText, answerCallbackQuery));
            return new Response("OK", { status: 200 });
        }
        // ROUTE 2: NORMAL MESSAGES & MEDIA
        if (update.message) {
            // Pass the entire update to GAME so it can intercept text OR media
            ctx.waitUntil(GAME.processCommand(update, env, sendMessage, startTime));
        }
        return new Response("OK", { status: 200 });
    }
    catch (error) {
        console.error("Critical Router Error:", error);
        return new Response("OK", { status: 200 }); // Always return OK to Telegram so it doesn't retry
    }
}
return new Response("🚀 Supreme Engine UI is ONLINE!", { status: 200 });
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
