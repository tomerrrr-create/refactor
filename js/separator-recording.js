// Accept historical whole-pixel widths and new fractional snapshots without truncation.
export function parseSeparatorWidth(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    const width = Number(value);
    return Number.isFinite(width) && width >= 0 ? width : null;
}
