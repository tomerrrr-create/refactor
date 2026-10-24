import { hexToRgb, findClosestColorIndex } from './colors.js';

export const isGameOfLifeDeadColor = color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);

// Store a color, never a sorted index: sorting cannot change the chosen anchor.
// A palette without that color resolves to its nearest RGB match. Missing fields
// deliberately retain index 0 for old settings and recordings.
export function resolveGameOfLifeDeadIndex(rules, palette) {
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
