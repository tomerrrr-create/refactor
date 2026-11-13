import { getLuminance } from './colors.js';

// Keep equal-luminance ties in the original palette order, as in Game of Life.
export function magnetAnchorIndex(palette, rules, originalPalette = palette) {
    if (rules.anchorColor !== 'luminance' || !palette?.length) return rules.anchorColorIndex ?? -1;
    const reference = originalPalette?.length ? originalPalette : palette;
    let darkest = reference[0];
    for (const color of reference) if (getLuminance(color) < getLuminance(darkest)) darkest = color;
    const index = palette.indexOf(darkest);
    if (index >= 0) return index;
    return palette.reduce((best, color, i) => getLuminance(color) < getLuminance(palette[best]) ? i : best, 0);
}
