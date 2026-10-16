// Preferred button cycle; the board and macro keep their absolute separator width.
export const DEFAULT_SEPARATOR_CYCLE = Object.freeze([5, 3, 1, 0]);
export function normalizeSeparatorCycle(values) {
    if (!Array.isArray(values) || !values.length || values.some(value => !Number.isInteger(value) || value < 0 || value > 6)) return null;
    return [...new Set(values)].sort((a, b) => b - a);
}
export function nextSeparatorWidth(current, selected) {
    const cycle = normalizeSeparatorCycle(selected) ?? DEFAULT_SEPARATOR_CYCLE;
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

// Same one-CSS-pixel minimum used by startup; zero remains valid even on very dense boards.
export function maximumSeparatorWidth(boardSize, width) {
    if (boardSize <= 1) return Infinity;
    return Math.max(0, (width - boardSize) / (boardSize - 1));
}
export function availableSeparatorCycle(boardSize, width, selected = DEFAULT_SEPARATOR_CYCLE) {
    const maximum = maximumSeparatorWidth(boardSize, width);
    const available = (normalizeSeparatorCycle(selected) ?? DEFAULT_SEPARATOR_CYCLE)
        .filter(gap => gap === 0 || gap <= maximum);
    return available.length ? available : [0];
}
