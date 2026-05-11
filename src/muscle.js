"use strict";
// ╭━━━━━━━━━━━━━━━✪
// │ 💪 THE HEAVY WORKER (MUSCLE / ENGINE)
// ╰━━━━━━━━━━━━━━━✪
// Yahan sirf Math, RNG aur Logic calculations hongi. 
// Ye file V8 Engine ki maximum speed ka use karti hai.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MUSCLE = void 0;
exports.MUSCLE = {
    // ====================================================
    // 1. Market Price Calculator (Based on time & volatility)
    calculateMarketPrice: function (basePrice, volatility, currentTimestamp) {
        var timeFactor = currentTimestamp / 300.0; // 5 minute cycles
        var fluctuation = Math.sin(timeFactor);
        var finalPrice = basePrice + (basePrice * volatility * fluctuation);
        // Price kabhi base price ke 10% se neeche nahi jani chahiye
        if (finalPrice < (basePrice * 0.1)) {
            finalPrice = basePrice * 0.1;
        }
        return Math.floor(finalPrice);
    },
    // ====================================================
    // 2. High-Frequency Trading RNG (/invest)
    simulateMarket: function (investment) {
        var roll = Math.floor(Math.random() * 100) + 1;
        var multiplier = 0.0;
        var eventName = "";
        var emoji = "";
        if (roll <= 40) { // 40% chance: Bear Market
            multiplier = 0.5;
            eventName = "BEAR MARKET";
            emoji = "📉";
        }
        else if (roll <= 70) { // 30% chance: Bull Market
            multiplier = 1.5;
            eventName = "BULL MARKET";
            emoji = "📈";
        }
        else if (roll <= 85) { // 15% chance: Market Crash
            multiplier = 0.0;
            eventName = "MARKET CRASH";
            emoji = "💥";
        }
        else if (roll <= 98) { // 13% chance: Insider Trading
            multiplier = 3.0;
            eventName = "INSIDER TRADING";
            emoji = "🕵️‍♂️";
        }
        else { // 2% chance: To The Moon!
            multiplier = 10.0;
            eventName = "TO THE MOON";
            emoji = "🚀";
        }
        var payout = Math.floor(investment * multiplier);
        return { payout: payout, multiplier: multiplier, event: eventName, emoji: emoji }; // <--- FIXED HERE
    },
    // ====================================================
    // 3. Combat & Boss Damage RNG
    rollBossDamage: function (playerLevel) {
        // 15 to 35 base damage multiplier
        var dmgDist = Math.floor(Math.random() * (35 - 15 + 1)) + 15;
        var baseDmg = playerLevel * dmgDist;
        // 15% chance for Critical Hit (3x damage)
        var isCrit = (Math.random() * 100) <= 15;
        if (isCrit) {
            baseDmg *= 3;
        }
        return { damage: baseDmg, is_crit: isCrit };
    }
    // ====================================================
};
// ​█▬█ █ ▀█▀ ︻︻╦̵̵͇̿╤── END
