// The Supreme Engine (TypeScript Port for Maximum V8 Speed)

export function calculateMarketPrice(basePrice: number, volatility: number, currentTimestamp: number): number {
    const timeFactor = currentTimestamp / 300.0;
    const fluctuation = Math.sin(timeFactor);
    let finalPrice = basePrice + (basePrice * volatility * fluctuation);
    if (finalPrice < (basePrice * 0.1)) {
        finalPrice = basePrice * 0.1;
    }
    return Math.floor(finalPrice);
}

export function rollBossDamage(playerLevel: number): { damage: number, is_crit: boolean } {
    // RNG between 15 and 35
    const dmgDist = Math.floor(Math.random() * (35 - 15 + 1)) + 15;
    let baseDmg = playerLevel * dmgDist;
    
    // 15% chance for Critical Hit
    const isCrit = (Math.random() * 100) <= 15;
    if (isCrit) {
        baseDmg *= 3;
    }
    
    return { damage: baseDmg, is_crit: isCrit };
}

export function simulateMarket(investment: number): { payout: number, multiplier: number, event: string, emoji: string } {
    const roll = Math.floor(Math.random() * 100) + 1;
    let multiplier = 0.0;
    let eventName = "";
    let emoji = "";

    if (roll <= 40) { // 40% chance: Bear Market
        multiplier = 0.5; 
        eventName = "BEAR MARKET";
        emoji = "📉";
    } else if (roll <= 70) { // 30% chance: Bull Market
        multiplier = 1.5;
        eventName = "BULL MARKET";
        emoji = "📈";
    } else if (roll <= 85) { // 15% chance: Market Crash
        multiplier = 0.0;
        eventName = "MARKET CRASH";
        emoji = "💥";
    } else if (roll <= 98) { // 13% chance: Insider Trading
        multiplier = 3.0;
        eventName = "INSIDER TRADING";
        emoji = "🕵️‍♂️";
    } else { // 2% chance: To The Moon!
        multiplier = 10.0;
        eventName = "TO THE MOON";
        emoji = "🚀";
    }

    const payout = Math.floor(investment * multiplier);
    return { payout, multiplier, event: eventName, emoji };
}
