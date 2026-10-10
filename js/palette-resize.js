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

// Recipe versions must keep their historical behavior when algorithms change.
export const PALETTE_SORT_VERSION = 'color-sort-v1';
const SORT_METHODS = new Set(['luminance', 'zen-void', 'zig-zag', 'waves', 'outside-in',
    'biomes', 'center-out', 'reversed', 'hue', 'dark-rainbow', 'temperature']);
const clone = value => JSON.parse(JSON.stringify(value));
export function paletteFingerprint(colors) {
    let hash = 2166136261;
    for (const char of colors.join(',')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return `fnv1a:${hash.toString(16).padStart(8, '0')}`;
}
const baseId = name => `base:${name}`;

export function temporaryPaletteIcon(base, size) {
    // Existing native icons sometimes already have an HQ/HD/size label.
    const icon = (base.iconHTML || base.emoji || '').replace(/<text\b[^>]*>\s*(?:HQ|HD|64|264|512)\s*<\/text>/gi, '');
    const badge = size === 64 ? 'HQ' : size === 264 ? 'HD' : '512';
    return `<span class="temporary-palette-icon">${icon}<span class="temporary-palette-badge ${size === 64 ? 'badge-hq' : 'badge-hd'}">${badge}</span></span>`;
}

// The catalog retains its base entries. Temporary entries are appended, while
// groups and history identify them by stable IDs, never by their array positions.
export function createPaletteResizeState(palettes) {
    const bases = palettes.map(p => ({ ...p, id: baseId(p.originalName), originalColors: [...p.originalColors] }));
    if (new Set(bases.map(p => p.id)).size !== bases.length) throw new Error('Duplicate base palette identity');
    palettes.forEach((p, i) => { p.id = bases[i].id; });
    let recipes = [];
    let nextId = 1;
    const find = id => palettes.find(p => p.id === id);
    const allocateId = () => `temp:${nextId++}`;
    const reserveId = id => {
        const match = /^temp:(\d+)$/.exec(id);
        if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
    };
    const checkId = id => typeof id === 'string' && /^temp:[A-Za-z0-9-]+$/.test(id);
    const resolveRoot = source => bases.find(p => p.id === (source.basePaletteId || source.id));
    function build(recipe, source, sortMethod) {
        if (!checkId(recipe.id) || !source || !PALETTE_RESIZE_SIZES.includes(recipe.targetSize) ||
            recipe.targetSize <= source.originalColors.length) throw new Error('Invalid temporary palette recipe');
        const root = resolveRoot(source);
        if (!root || recipe.baseFingerprint !== paletteFingerprint(root.originalColors)) {
            throw new Error('The recipe base palette version is unavailable');
        }
        let result;
        if (recipe.legacy) {
            if (!validColors(recipe.originalColors) || !validColors(recipe.colors) ||
                recipe.originalColors.length !== recipe.targetSize || recipe.colors.length !== recipe.targetSize ||
                [...recipe.originalColors].sort().join() !== [...recipe.colors].sort().join()) {
                throw new Error('Invalid legacy palette snapshot');
            }
            result = { originalColors: [...recipe.originalColors] };
        } else {
            if (recipe.algorithmVersion !== PALETTE_RESIZE_VERSION || recipe.sortVersion !== PALETTE_SORT_VERSION ||
                !SORT_METHODS.has(recipe.sort)) throw new Error('Unsupported palette recipe version');
            const anchors = sortColorsArray(source.originalColors, recipe.sort);
            if (recipe.sourceFingerprint !== paletteFingerprint(anchors)) throw new Error('Palette recipe source mismatch');
            result = expandPalette(anchors, recipe.targetSize, recipe.sort);
            if (recipe.resultFingerprint !== paletteFingerprint(result.originalColors)) throw new Error('Palette recipe result mismatch');
        }
        const palette = {
            id: recipe.id, basePaletteId: root.id, isTemporary: true,
            originalName: `${root.originalName} · ${recipe.targetSize}`,
            name: `${find(root.id)?.name || root.name || root.originalName} · ${recipe.targetSize}`,
            emoji: root.emoji, iconHTML: temporaryPaletteIcon(root, recipe.targetSize), isArchived: false,
            originalColors: result.originalColors,
            colors: recipe.legacy && sortMethod === recipe.sort ? [...recipe.colors] : sortColorsArray(result.originalColors, sortMethod),
            legacySourceId: recipe.legacySourceId
        };
        return { palette, result };
    }
    return {
        indexOf(id) { return palettes.findIndex(p => p.id === id); },
        legacyIndex(name) {
            const sourceId = baseId(name);
            for (let i = palettes.length - 1; i >= bases.length; i--) {
                if (palettes[i].legacySourceId === sourceId) return i;
            }
            return palettes.findIndex(p => p.originalName === name || p.name === name);
        },
        prepare(sourceId, targetSize, sortMethod, recordedRecipe) {
            const source = find(sourceId);
            if (!source) throw new Error('Palette source does not exist');
            const result = expandPalette(source.colors, targetSize, sortMethod);
            const root = resolveRoot(source);
            const recipe = recordedRecipe ? clone(recordedRecipe) : {
                id: allocateId(), sourceId, targetSize, sort: sortMethod,
                algorithmVersion: PALETTE_RESIZE_VERSION, sortVersion: PALETTE_SORT_VERSION,
                baseFingerprint: paletteFingerprint(root.originalColors),
                sourceFingerprint: paletteFingerprint(source.colors),
                resultFingerprint: paletteFingerprint(result.originalColors)
            };
            if (find(recipe.id) || recipe.sourceId !== sourceId || recipe.targetSize !== targetSize || recipe.sort !== sortMethod) {
                throw new Error('Temporary palette identity or source mismatch');
            }
            const built = build(recipe, source, sortMethod);
            // Validate live order too, in case the source was modified outside sorting.
            if (!recipe.legacy && recipe.sourceFingerprint !== paletteFingerprint(source.colors)) throw new Error('Live palette source mismatch');
            return { recipe, palette: built.palette, result };
        },
        add(prepared) {
            if (find(prepared.recipe.id) || !find(prepared.recipe.sourceId)) throw new Error('Invalid temporary palette insertion');
            recipes.push(clone(prepared.recipe));
            palettes.push(prepared.palette);
            reserveId(prepared.recipe.id);
            return palettes.length - 1;
        },
        snapshot() { return clone(recipes); },
        restore(snapshot = [], sortMethod = 'luminance', legacyOverrides = [], activeId = null) {
            if (!Array.isArray(snapshot) || !Array.isArray(legacyOverrides)) throw new Error('Invalid palette collection');
            const incoming = clone(snapshot);
            // Import old in-place expansions as distinct temporary palettes. Only
            // this compatibility path carries colors already present in old files.
            legacyOverrides.forEach((entry, i) => {
                const source = bases.find(p => p.originalName === entry.paletteName);
                if (!source) throw new Error('Unknown legacy palette');
                incoming.push({ id: `temp:legacy-${i}`, sourceId: source.id, targetSize: entry.colors?.length,
                    sort: sortMethod, legacy: true, legacySourceId: source.id,
                    baseFingerprint: paletteFingerprint(source.originalColors),
                    originalColors: entry.originalColors, colors: entry.colors });
            });
            const collection = bases.map(p => ({ ...p, originalColors: [...p.originalColors], colors: sortColorsArray(p.originalColors, sortMethod) }));
            const seen = new Map(collection.map(p => [p.id, p]));
            // Build everything before changing live state; broken dependencies or
            // unknown versions leave both the catalog and active board untouched.
            incoming.forEach(recipe => {
                if (seen.has(recipe.id)) throw new Error('Duplicate temporary palette ID');
                const { palette } = build(recipe, seen.get(recipe.sourceId), sortMethod);
                collection.push(palette);
                seen.set(palette.id, palette);
            });
            if (activeId && !seen.has(activeId)) throw new Error('Active palette is missing from the saved collection');
            palettes.splice(0, palettes.length, ...collection);
            recipes = incoming;
            incoming.forEach(recipe => reserveId(recipe.id));
        }
    };
}
