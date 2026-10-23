// Device-local display preference: never part of a recipe, profile or history.
const KEY = 'colorGridInterfaceZoom';
export const DEFAULT_INTERFACE_ZOOM = 84;
export function normalizeInterfaceZoom(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 70 && number <= 120 ? Math.round(number) : DEFAULT_INTERFACE_ZOOM;
}
export function loadInterfaceZoom(storage = globalThis.localStorage) {
    try { return normalizeInterfaceZoom(storage.getItem(KEY)); } catch { return DEFAULT_INTERFACE_ZOOM; }
}
export function saveInterfaceZoom(value, storage = globalThis.localStorage) {
    const zoom = normalizeInterfaceZoom(value);
    try { storage.setItem(KEY, String(zoom)); } catch { /* Keep the session preference. */ }
    return zoom;
}
