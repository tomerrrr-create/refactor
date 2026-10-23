import { maximumSeparatorWidth } from './separator-cycle.js';
import { PALETTES, SIZES, SEPARATORS, SYMMETRY_MODES } from './constants.js';
import { SORT_MODES } from './colors.js';

export const RANDOM_STARTUP_PALETTE = '@random';
const LAST_RANDOM_PALETTE_KEY = 'colorGridLastRandomStartupPalette';

export const STARTUP_STORAGE_KEY = 'colorGridStartup';
export const DEFAULT_STARTUP = Object.freeze({
    paletteName: 'Hearts', boardSize: 7, separatorPx: 2, sortMethod: 'luminance',
    fill: 'random', brushSize: 1, brushMode: 'continuous', brushColor: 'none',
    symmetry: 'off', interfaceMode: 'creative'
});

// Each field falls back independently so removed palettes or older preferences
// do not discard the user's other choices. Palette names are stable identities.
export function normalizeStartup(settings) {
    const value = settings && typeof settings === 'object' ? settings : {};
    const allowed = {
        paletteName: [RANDOM_STARTUP_PALETTE, ...PALETTES.filter(p => !p.isArchived).map(p => p.originalName)],
        boardSize: SIZES, separatorPx: SEPARATORS,
        sortMethod: SORT_MODES.map(mode => mode.method),
        fill: ['random', 'dark', 'light', 'seed'],
        brushSize: [1, 3, 5, 7, 9, 11, 13, 15],
        brushMode: ['paint', 'continuous', 'copy'],
        brushColor: ['first', 'none', 'darkest', 'lightest', 'rainbow'],
        symmetry: SYMMETRY_MODES, interfaceMode: ['creative', 'simulation']
    };
    return Object.fromEntries(Object.entries(allowed).map(([key, options]) =>
        [key, options.includes(value[key]) ? value[key] : DEFAULT_STARTUP[key]]));
}

export function loadStartup(storage) {
    try {
        return normalizeStartup(JSON.parse((storage || localStorage).getItem(STARTUP_STORAGE_KEY)));
    } catch {
        return { ...DEFAULT_STARTUP };
    }
}

export function persistStartup(settings, storage) {
    const normalized = normalizeStartup(settings);
    try {
        (storage || localStorage).setItem(STARTUP_STORAGE_KEY, JSON.stringify(normalized));
        return true;
    } catch {
        return false;
    }
}

// Preserve at least one pixel per tile when opening on a narrower screen.
export function fitStartupSeparator(boardSize, separatorPx, width, candidates = SEPARATORS) {
    const maximum = maximumSeparatorWidth(boardSize, width);
    if (separatorPx === 0 || separatorPx <= maximum) return separatorPx;
    return Math.max(0, ...candidates.filter(gap => gap <= separatorPx && gap <= maximum));
}

// Resolve once per app opening. Keep the preference random; recordings receive
// the concrete runtime palette index. Avoid consecutive repeats when storage works.
export function resolveStartupPaletteIndex(paletteName, { palettes = PALETTES, storage, random = Math.random } = {}) {
    const fixed = palettes.findIndex(p => p.originalName === paletteName && !p.isArchived);
    if (paletteName !== RANDOM_STARTUP_PALETTE && fixed >= 0) return fixed;
    const active = palettes.map((palette, index) => ({ palette, index })).filter(({ palette }) => !palette.isArchived);
    if (!active.length) throw new Error('No startup palettes available');
    let previous;
    try { storage ??= globalThis.localStorage; previous = storage?.getItem(LAST_RANDOM_PALETTE_KEY); } catch {}
    const alternatives = active.filter(({ palette }) => palette.originalName !== previous);
    const pool = alternatives.length ? alternatives : active;
    const choice = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
    try { storage?.setItem(LAST_RANDOM_PALETTE_KEY, choice.palette.originalName); } catch {}
    return choice.index;
}
