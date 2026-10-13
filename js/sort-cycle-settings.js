import { SORT_MODES } from './colors.js';

export const DEFAULT_SORT_CYCLE = Object.freeze(['luminance', 'dark-rainbow', 'reversed', 'center-out', 'temperature', 'outside-in']);
const STORAGE_KEY = 'colorGridSortCycle';

export function normalizeSortCycle(value) {
    const available = new Set(SORT_MODES.map(mode => mode.method));
    const selected = Array.isArray(value) ? [...new Set(value.filter(method => available.has(method)))] : [];
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
    // A loaded or excluded mode enters the user's cycle at its first method.
    return methods[(methods.indexOf(current) + 1) % methods.length];
}

export function moveSortMethod(selected, method, target) {
    const methods = normalizeSortCycle(selected);
    const index = methods.indexOf(method);
    if (!Number.isInteger(target) || index < 0 || target < 0 || target >= methods.length || index === target) return methods;
    methods.splice(index, 1);
    methods.splice(target, 0, method);
    return methods;
}
