export const DEFAULT_SMOOTH_RENDERING = true;
export const SMOOTH_RENDERING_STORAGE_KEY = 'colorGridSmoothRendering';

export function loadSmoothRendering(fallback = DEFAULT_SMOOTH_RENDERING, storage = localStorage) {
    try {
        const value = storage.getItem(SMOOTH_RENDERING_STORAGE_KEY);
        if (value === 'true') return true;
        if (value === 'false') return false;
    } catch { /* Use the saved workspace value or default when storage is unavailable. */ }
    return fallback;
}

export function persistSmoothRendering(value, storage = localStorage) {
    try {
        storage.setItem(SMOOTH_RENDERING_STORAGE_KEY, String(Boolean(value)));
        return true;
    } catch { return false; }
}

// Display restriction only; never changes the stored preference or PNG export.
export function isSmoothDisplayAvailable(size, separatorWidth) {
    return size >= 149 || separatorWidth !== 0;
}
