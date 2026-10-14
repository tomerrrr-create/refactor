export function getAutoChiReach(paletteSize) {
    return Math.max(2, Math.floor(paletteSize / 6));
}

export function resolveChiReach(rules, paletteSize) {
    const auto = getAutoChiReach(paletteSize);
    if (Number.isInteger(rules.reachOffset)) {
        const offset = Math.max(-10, Math.min(10, rules.reachOffset));
        return Math.max(1, Math.min(Math.max(1, paletteSize - 1), auto + offset));
    }
    // Existing recordings retain their absolute reach (0 still means Auto).
    return rules.reach === 0 ? auto : rules.reach;
}
