const STORAGE_KEY = 'colorGridPrecisionIconsV1';

export function initializePrecisionIcons(toggle) {
    const root = document.documentElement;
    try {
        toggle.checked = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        toggle.checked = false;
    }
    root.toggleAttribute('data-precision-icons', toggle.checked);
    toggle.addEventListener('change', () => {
        root.toggleAttribute('data-precision-icons', toggle.checked);
        try {
            localStorage.setItem(STORAGE_KEY, String(toggle.checked));
        } catch { /* Keep the preview active for this visit. */ }
    });
}
