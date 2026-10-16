// Session-only POC: the settings/profile format and recorded absolute widths stay unchanged.
export const DEFAULT_SEPARATOR_CYCLE = Object.freeze([6, 5, 3, 2, 0]);
export function normalizeSeparatorCycle(values) {
    if (!Array.isArray(values) || !values.length || values.some(value => !Number.isInteger(value) || value < 0 || value > 6)) return null;
    return [...new Set(values)].sort((a, b) => b - a);
}
export function nextSeparatorWidth(current, selected) {
    const cycle = normalizeSeparatorCycle(selected) ?? DEFAULT_SEPARATOR_CYCLE;
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}
