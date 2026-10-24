import { hexToRgb, findClosestColorIndex, SORT_MODES, sortColorsArray } from './colors.js';

export const isGameOfLifeAnchorSort = method => SORT_MODES.some(mode => mode.method === method);
const rootsBySource = new WeakMap();

export const isGameOfLifeDeadColor = color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);

// Current mode follows rank 0. A fixed method derives its root from each
// original palette. Legacy explicit colors retain their RGB/nearest behavior,
// while absent fields preserve the original index-0 rules.
export function resolveGameOfLifeDeadIndex(rules, palette, source = palette) {
    if (!palette.length) return 0;
    if (isGameOfLifeAnchorSort(rules.deadSortMethod)) {
        // Sorting is cached by original palette and method, never repeated per cell
        // or generation. Original order also makes tied sorts deterministic.
        let roots = rootsBySource.get(source);
        if (!roots) { roots = new Map(); rootsBySource.set(source, roots); }
        if (!roots.has(rules.deadSortMethod)) roots.set(rules.deadSortMethod, sortColorsArray(source, rules.deadSortMethod)[0]);
        const color = roots.get(rules.deadSortMethod)?.toLowerCase();
        const index = palette.findIndex(entry => entry.toLowerCase() === color);
        return index < 0 ? 0 : index;
    }
    if (!isGameOfLifeDeadColor(rules.deadColor) || !palette.length) return 0;
    const color = rules.deadColor.toLowerCase();
    const exact = palette.findIndex(entry => entry.toLowerCase() === color);
    if (exact !== -1) return exact;
    return findClosestColorIndex(`rgb(${hexToRgb(color).join(',')})`, palette);
}

// Only used with an explicit dead color. Legacy RGB births retain their original
// nearest-color calculation, including its historical treatment of index 0.
export function closestLivingGameOfLifeColor(target, palette, deadRanks, deadIndex) {
    const rgb = target.match(/\d+/g).map(Number);
    let index = deadIndex, distance = Infinity;
    palette.forEach((color, i) => {
        if (deadRanks[i]) return;
        const candidate = hexToRgb(color);
        const d = candidate.reduce((sum, channel, c) => sum + (channel - rgb[c]) ** 2, 0);
        if (d < distance) { distance = d; index = i; }
    });
    return index;
}

// Root locking is session-only; presets and profile files store no anchor state.
export function stripGameOfLifeAnchor(rules) {
    const copy = { ...rules };
    delete copy.deadColor;
    delete copy.deadSortMethod;
    return copy;
}
