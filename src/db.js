"use strict";
// ╭━━━━━━━━━━━━━━━✪
// │ 🏥 THE CLINIC (DATABASE MANAGER)
// ╰━━━━━━━━━━━━━━━✪
// Yahan sirf D1 Database se baat karne ke functions honge.
// Koi bhi dusri file direct DB ko nahi chhuegi, sab is clinic ke through aayenge.
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
exports.DB_MANAGER = void 0;
exports.DB_MANAGER = {
    // ====================================================
    // 1. Naya user create karna (Agar pehle se nahi hai)
    ensureUserExists: function (db, userId) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("INSERT OR IGNORE INTO users (user_id, balance, is_alive, kills) VALUES (?, 1000, 1, 0)").bind(userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // 1.5. Database Upgrades for Settings & Sessions
    initSettings: function (db) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("\n      CREATE TABLE IF NOT EXISTS group_settings (\n        chat_id INTEGER PRIMARY KEY,\n        welcome_enabled INTEGER DEFAULT 0,\n        welcome_text TEXT DEFAULT '',\n        welcome_media_id TEXT DEFAULT ''\n      )\n    ").run()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, db.prepare("\n      CREATE TABLE IF NOT EXISTS setup_sessions (\n        user_id INTEGER PRIMARY KEY,\n        chat_id INTEGER,\n        step TEXT,\n        expires_at INTEGER\n      )\n    ").run()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // Session State Machine Helpers
    setSession: function (db, userId, chatId, step, expiresAt) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("INSERT INTO setup_sessions (user_id, chat_id, step, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET step=?, expires_at=?")
                            .bind(userId, chatId, step, expiresAt, step, expiresAt).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    getSession: function (db, userId) {
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT * FROM setup_sessions WHERE user_id = ?").bind(userId).all()];
                    case 1:
                        results = (_a.sent()).results;
                        return [2 /*return*/, results.length > 0 ? results[0] : null];
                }
            });
        });
    },
    clearSession: function (db, userId) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("DELETE FROM setup_sessions WHERE user_id = ?").bind(userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // Group Settings Helpers
    getGroupSettings: function (db, chatId) {
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT * FROM group_settings WHERE chat_id = ?").bind(chatId).all()];
                    case 1:
                        results = (_a.sent()).results;
                        return [2 /*return*/, results.length > 0 ? results[0] : null];
                }
            });
        });
    },
    updateGroupSetting: function (db, chatId, column, value) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Upsert logic for settings
                    return [4 /*yield*/, db.prepare("INSERT OR IGNORE INTO group_settings (chat_id) VALUES (?)").bind(chatId).run()];
                    case 1:
                        // Upsert logic for settings
                        _a.sent();
                        return [4 /*yield*/, db.prepare("UPDATE group_settings SET ".concat(column, " = ? WHERE chat_id = ?")).bind(value, chatId).run()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 2. User ka pura data nikalna
    getUser: function (db, userId) {
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).all()];
                    case 1:
                        results = (_a.sent()).results;
                        if (results && results.length > 0) {
                            return [2 /*return*/, results[0]];
                        }
                        return [2 /*return*/, null];
                }
            });
        });
    },
    // ====================================================
    // 3. User ka balance update karna
    updateBalance: function (db, userId, newBalance) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("UPDATE users SET balance = ? WHERE user_id = ?").bind(newBalance, userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 4. User ka status (Alive/Dead) update karna
    setAliveStatus: function (db, userId, status) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("UPDATE users SET is_alive = ? WHERE user_id = ?").bind(status, userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 5. Kills ka counter badhana
    addKill: function (db, userId) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("UPDATE users SET kills = kills + 1 WHERE user_id = ?").bind(userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 6. Inventory me naya item add karna ya quantity badhana
    addInventoryItem: function (db, userId, itemName, quantity) {
        if (quantity === void 0) { quantity = 1; }
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("\n      INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?)\n      ON CONFLICT(user_id, item_name) DO UPDATE SET quantity = quantity + ?\n    ").bind(userId, itemName, quantity, quantity).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 7. Pura inventory bag check karna
    getInventory: function (db, userId) {
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT item_name, quantity FROM inventory WHERE user_id = ? AND quantity > 0").bind(userId).all()];
                    case 1:
                        results = (_a.sent()).results;
                        return [2 /*return*/, (results || [])];
                }
            });
        });
    },
    // ====================================================
    // 8. Top players nikalna (Leaderboard ke liye)
    getTopPlayers: function (db, limit) {
        if (limit === void 0) { limit = 10; }
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT * FROM users ORDER BY balance DESC LIMIT ".concat(limit)).all()];
                    case 1:
                        results = (_a.sent()).results;
                        return [2 /*return*/, (results || [])];
                }
            });
        });
    },
    // ====================================================
    // 9. Shield/Protection Timer Update karna
    setProtection: function (db, userId, timestamp) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("UPDATE users SET protection_until = ? WHERE user_id = ?").bind(timestamp, userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 10. Admin Level & Title Set karna
    setAdmin: function (db, chatId, userId, level, title) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("\n      INSERT INTO group_admins (chat_id, user_id, level, title) VALUES (?, ?, ?, ?)\n      ON CONFLICT(chat_id, user_id) DO UPDATE SET level = ?, title = ?\n    ").bind(chatId, userId, level, title, level, title).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 11. Admin Check karna
    getAdmin: function (db, chatId, userId) {
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT level, title FROM group_admins WHERE chat_id = ? AND user_id = ?").bind(chatId, userId).all()];
                    case 1:
                        results = (_a.sent()).results;
                        return [2 /*return*/, (results && results.length > 0) ? results[0] : null];
                }
            });
        });
    },
    // ====================================================
    // 12. Admin Remove karna
    removeAdmin: function (db, chatId, userId) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("DELETE FROM group_admins WHERE chat_id = ? AND user_id = ?").bind(chatId, userId).run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    // ====================================================
    // 13. Group ke saare admins ki list
    getAllAdmins: function (db, chatId) {
        return __awaiter(this, void 0, Promise, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.prepare("SELECT user_id, level, title FROM group_admins WHERE chat_id = ? ORDER BY level DESC").bind(chatId).all()];
                    case 1:
                        results = (_a.sent()).results;
                        return [2 /*return*/, results || []];
                }
            });
        });
    }
    // ====================================================
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
