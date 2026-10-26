import { sortColorsArray } from './colors.js';

// Preview policy uses stable catalogue identifiers, independent of translated
// names, group/color count, or the sort currently used by the board. These
// palettes have an authored tonal/gradient path worth preserving. Interpolated
// colour collections such as Focus/Ancient still use the rainbow preview.
const gradientPalettes = new Set([
    'Hearts', 'Amazon Rainforest', 'Icelandic Winter', 'Magma Flow', 'Sky', 'Deep Sea', 'Golden Midnight',
    'Monochrome', 'Serene Sky', 'Electric Dreams', 'Desert Sunrise', 'Cherry Blossom',
    'Mono', 'Serenety', 'Golden Midnight Extended', 'Electric Dreams Extended',
    'Amethyst Dream', 'Amethyst Dream 264', 'Night Rainbow', 'Night Rainbow 264',
    'Earth & Spirit', 'Air', 'Ancient Mythos 64', 'Ancient Mythos 264',
    'Lilac Noir', 'Brown Noise', 'Behind Eyelids', 'Golden, Silver, Blue',
    'Obsidian Soul', 'Golden & Silver ENH', 'Ice & Fire 64', 'Opaline Trance 264',
    'Bioluminescent Abyss 264', 'Blue Hypnosis 264', 'Glacier Pulse 264', 'Mystic Void 264',
    'Heartglow', 'Northern Lights HD', 'Baby First Gaze', 'Silent Enigma',
    'Autumn into Winter 264', 'זוהר הגלסיות', 'Jade Tides 264',
    'Tibetan Turquoise Gold 264', 'Rose 264'
]);
const previews = new WeakMap();

export function getPalettePreviewSort(palette) {
    return gradientPalettes.has(palette.originalName) ? 'original' : 'dark-rainbow';
}

export function getPalettePreviewColors(palette) {
    const source = palette.originalColors ?? palette.colors;
    const cached = previews.get(palette);
    if (cached?.source === source) return cached.colors;
    const colors = Object.freeze(getPalettePreviewSort(palette) === 'original'
        ? [...source] : sortColorsArray(source, 'dark-rainbow'));
    previews.set(palette, { source, colors });
    return colors;
}
