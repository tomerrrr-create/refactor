import { firstLuminanceIndex } from './colors.js';

export function magnetAnchorIndex(palette, rules, originalPalette = palette) {
    if (rules.anchorColor !== 'luminance' || !palette?.length) return rules.anchorColorIndex ?? -1;
    return firstLuminanceIndex(palette, originalPalette);
}
