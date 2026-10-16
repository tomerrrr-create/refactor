import { maximumSeparatorWidth } from './separator-cycle.js';
import { PALETTES, SIZES, SEPARATORS, SYMMETRY_MODES } from './constants.js';
import { SORT_MODES } from './colors.js';

export const STARTUP_STORAGE_KEY = 'colorGridStartup';
export const DEFAULT_STARTUP = Object.freeze({
    paletteName: 'Journey', boardSize: 7, separatorPx: 2, sortMethod: 'luminance',
    fill: 'random', brushSize: 1, brushMode: 'continuous', brushColor: 'none',
    symmetry: 'off', interfaceMode: 'creative'
});

// Each field falls back independently so removed palettes or older preferences
// do not discard the user's other choices. Palette names are stable identities.
export function normalizeStartup(settings) {
    const value = settings && typeof settings === 'object' ? settings : {};
    const allowed = {
        paletteName: PALETTES.filter(p => !p.isArchived).map(p => p.originalName),
        boardSize: SIZES, separatorPx: SEPARATORS,
        sortMethod: SORT_MODES.map(mode => mode.method),
        fill: ['random', 'dark', 'light', 'seed'],
        brushSize: [1, 3, 5, 7, 9, 11, 13, 15],
        brushMode: ['paint', 'continuous', 'copy'],
        brushColor: ['none', 'darkest', 'lightest', 'rainbow'],
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
