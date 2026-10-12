import { SORT_MODES } from './colors.js';

export const DEFAULT_SORT_CYCLE = Object.freeze(['luminance', 'dark-rainbow', 'reversed', 'center-out', 'temperature', 'outside-in']);
const STORAGE_KEY = 'colorGridSortCycle';

export function normalizeSortCycle(value) {
    const selected = Array.isArray(value) ? SORT_MODES.filter(mode => value.includes(mode.method)).map(mode => mode.method) : [];
    return selected.length ? selected : [...DEFAULT_SORT_CYCLE];
}

export function loadSortCycle(storage = localStorage) {
    try { return normalizeSortCycle(JSON.parse(storage.getItem(STORAGE_KEY))); }
    catch { return [...DEFAULT_SORT_CYCLE]; }
}

export function persistSortCycle(value, storage = localStorage) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(normalizeSortCycle(value))); return true; }
    catch { return false; }
}

export function nextSortMethod(current, selected) {
    const methods = normalizeSortCycle(selected);
    // An excluded method may still be active after a project load or settings
    // change. Continue in catalog order instead of silently changing that state.
    const currentIndex = SORT_MODES.findIndex(mode => mode.method === current);
    for (let step = 1; step <= SORT_MODES.length; step++) {
        const method = SORT_MODES[(currentIndex + step) % SORT_MODES.length].method;
        if (methods.includes(method)) return method;
    }
}
