export const CHI_REACH_PERCENTAGES = Object.freeze([50, 75, 100, 125, 150, 200, 300, 400]);

export function getAutoChiReach(paletteSize) {
    return Math.max(2, Math.floor(paletteSize / 6));
}

export function resolveChiReach(rules, paletteSize) {
    const auto = getAutoChiReach(paletteSize);
    if (CHI_REACH_PERCENTAGES.includes(rules.reachPercent)) {
        return Math.max(1, Math.min(Math.max(1, paletteSize - 1), Math.round(auto * rules.reachPercent / 100)));
    }
    if (Number.isInteger(rules.reachOffset)) {
        const offset = Math.max(-10, Math.min(10, rules.reachOffset));
        return Math.max(1, Math.min(Math.max(1, paletteSize - 1), auto + offset));
    }
    // Existing recordings retain their absolute reach (0 still means Auto).
    return rules.reach === 0 ? auto : rules.reach;
}
