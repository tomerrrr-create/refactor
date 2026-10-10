import { hexToRgb, sortColorsArray } from './colors.js';

export const PALETTE_RESIZE_SIZES = Object.freeze([64, 264, 512]);
export const PALETTE_RESIZE_VERSION = 'rgb-anchors-v1';
const validColors = colors => Array.isArray(colors) && colors.length > 0 &&
    colors.length <= 512 && colors.every(c => /^#[0-9a-f]{6}$/i.test(c));

// Allocate intermediate colors by RGB distance, keeping every anchor (including
// duplicates). Largest remainders and index tie-breaking make allocation stable.
export function expandPalette(anchors, targetSize, sortMethod) {
    if (!validColors(anchors) || !PALETTE_RESIZE_SIZES.includes(targetSize) || targetSize <= anchors.length) {
        throw new Error('Invalid palette expansion');
    }
    const rgb = anchors.map(hexToRgb);
    const weights = rgb.slice(1).map((c, i) => Math.hypot(...c.map((v, j) => v - rgb[i][j])));
    const extra = targetSize - anchors.length;
    const sum = weights.reduce((a, b) => a + b, 0);
    const quotas = weights.map(w => extra * (sum ? w / sum : 1 / weights.length));
    const counts = quotas.map(Math.floor);
    const remaining = extra - counts.reduce((a, b) => a + b, 0);
    quotas.map((q, i) => ({ i, fraction: q - counts[i] }))
        .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
        .slice(0, remaining).forEach(({ i }) => counts[i]++);

    const originalColors = [], anchorPositions = [];
    anchors.forEach((color, i) => {
        anchorPositions.push(originalColors.length);
        originalColors.push(color);
        for (let j = 1; j <= (counts[i] || 0); j++) {
            const t = j / (counts[i] + 1);
            originalColors.push('#' + rgb[i].map((v, c) =>
                Math.round(v + (rgb[i + 1][c] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase());
        }
    });
    // Single-color palettes still expand to the requested length.
    while (originalColors.length < targetSize) originalColors.push(anchors[0]);
    const colors = sortColorsArray(originalColors, sortMethod);
    const positions = new Map();
    colors.forEach((color, i) => {
        if (!positions.has(color)) positions.set(color, []);
        positions.get(color).push(i);
    });
    const used = new Map();
    const sortedPositions = originalColors.map(color => {
        const occurrence = used.get(color) || 0;
        used.set(color, occurrence + 1);
        return positions.get(color)[occurrence];
    });
    return { originalColors, colors, indexMap: anchorPositions.map(i => sortedPositions[i]) };
}

// Keep static palette data separate from session expansions. Snapshot both the
// sorting input and exact active order: replay never depends on recalculation.
export function createPaletteResizeState(palettes) {
    const base = palettes.map(p => [...p.originalColors]);
    let expanded = new Set();
    return {
        set(index, result) {
            palettes[index].originalColors = [...result.originalColors];
            palettes[index].colors = [...result.colors];
            expanded.add(index);
        },
        snapshot() {
            return [...expanded].sort((a, b) => a - b).map(index => ({
                paletteName: palettes[index].originalName,
                originalColors: [...palettes[index].originalColors],
                colors: [...palettes[index].colors]
            }));
        },
        restore(snapshot = [], sortMethod) {
            if (!Array.isArray(snapshot)) throw new Error('Invalid palette snapshot');
            const seen = new Set();
            const entries = snapshot.map(entry => {
                const index = palettes.findIndex(p => p.originalName === entry.paletteName);
                if (index < 0 || seen.has(index) || !validColors(entry.originalColors) || !validColors(entry.colors) ||
                    !PALETTE_RESIZE_SIZES.includes(entry.colors.length) || entry.colors.length <= base[index].length ||
                    entry.colors.length !== entry.originalColors.length ||
                    [...entry.colors].sort().join() !== [...entry.originalColors].sort().join()) {
                    throw new Error('Invalid expanded palette snapshot');
                }
                seen.add(index);
                return { index, ...entry };
            });
            palettes.forEach((p, index) => {
                p.originalColors = [...base[index]];
                p.colors = sortColorsArray(p.originalColors, sortMethod);
            });
            expanded = new Set();
            entries.forEach(entry => this.set(entry.index, entry));
        }
    };
}
