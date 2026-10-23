// Device-local display preference: never part of a recipe, profile or history.
const KEY = 'colorGridInterfaceZoom';
export function normalizeInterfaceZoom(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 70 && number <= 120 ? Math.round(number) : 100;
}
export function loadInterfaceZoom(storage = globalThis.localStorage) {
    try { return normalizeInterfaceZoom(storage.getItem(KEY)); } catch { return 100; }
}
export function saveInterfaceZoom(value, storage = globalThis.localStorage) {
    const zoom = normalizeInterfaceZoom(value);
    try { storage.setItem(KEY, String(zoom)); } catch { /* Keep the session preference. */ }
    return zoom;
}
