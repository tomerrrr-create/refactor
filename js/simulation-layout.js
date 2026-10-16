const STORAGE_KEY = 'colorGridSimulationLayout';

export function normalizeSimulationLayout(value, defaults) {
    return Array.isArray(value) && value.length === defaults.length &&
        new Set(value).size === defaults.length && value.every(id => defaults.includes(id))
        ? [...value] : [...defaults];
}

export function loadSimulationLayout(defaults, storage) {
    try { return normalizeSimulationLayout(JSON.parse((storage ?? localStorage).getItem(STORAGE_KEY)), defaults); }
    catch { return [...defaults]; }
}

export function persistSimulationLayout(value, storage) {
    try { (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(value)); return true; }
    catch { return false; }
}

export function swapSimulationSlots(layout, first, second) {
    const next = [...layout];
    if ([first, second].every(index => Number.isInteger(index) && index >= 0 && index < next.length)) {
        [next[first], next[second]] = [next[second], next[first]];
    }
    return next;
}
