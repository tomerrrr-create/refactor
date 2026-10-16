// Session-only rendering experiment. Values are logical levels, not stored preferences.
export const RELATIVE_SEPARATOR_LEVELS = Object.freeze([5, 3, 1, 0]);
export function relativeSeparatorLevel(value) {
    return RELATIVE_SEPARATOR_LEVELS.find(level => level <= value) ?? 0;
}
export function relativeSeparatorWidth(size, width, level) {
    if (!(size > 0) || !(width > 0)) return 0;
    const thick = Math.min(5, width / size * .25);
    return thick * ({ 5: 1, 3: .6, 1: .2, 0: 0 }[relativeSeparatorLevel(level)]);
}
