export const EROSION_MODES = ['legacy', 'channels-solid', 'channels'];

export function erosionEarthSpan(paletteLength, mode) {
    return mode === 'channels'
        ? Math.floor(paletteLength * .8) - Math.floor(paletteLength * .2)
        : Math.floor(paletteLength * .2);
}

// Missing fields in old recordings must reset new options, not inherit preferences.
export function restoreErosionRules(value) {
    return {
        mode: EROSION_MODES.includes(value.mode) ? value.mode : 'legacy',
        erosionStrength: typeof value.erosionStrength === 'number' && Number.isFinite(value.erosionStrength)
            && value.erosionStrength >= 0 && value.erosionStrength <= 1 ? value.erosionStrength : .1,
        ...(Number.isSafeInteger(value.erosionEvents) && value.erosionEvents > 0
            ? { erosionEvents: value.erosionEvents } : {})
    };
}

export function erodedIndex(index, paletteLength, rules) {
    const forward = rules.mode === 'channels-solid';
    if (!Number.isSafeInteger(rules.erosionEvents) || rules.erosionEvents < 1) {
        return forward ? index + 1 : Math.max(0, index - 1);
    }
    const span = erosionEarthSpan(paletteLength, rules.mode);
    if (span < 1) return index;
    const events = Math.min(span, rules.erosionEvents);
    const earthEnd = Math.floor(paletteLength * .8);
    const progress = forward ? index : earthEnd - 1 - index;
    // Partition the soil range into events equal-sized stages, rounded to colors.
    // No per-cell counters or extra random draws; partial erosion uses fewer stages.
    const next = Math.min(span, Math.ceil((Math.floor(progress * events / span) + 1) * span / events));
    return forward ? next : earthEnd - 1 - next;
}
