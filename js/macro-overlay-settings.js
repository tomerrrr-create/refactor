// Device-local debug appearance only; never part of artwork, profiles or recipes.
const STORAGE_KEY = 'colorGridMacroControlDimming';
const DEFAULT_DIMMING = 80;
function normalized(value) {
    const number = Number(value);
    return value !== null && String(value).trim() !== '' && Number.isFinite(number) && number >= 0 && number <= 100
        ? Math.round(number) : DEFAULT_DIMMING;
}
export function initializeMacroOverlaySettings({ input, output, root = document.documentElement }) {
    let initial = DEFAULT_DIMMING;
    try { initial = normalized(localStorage.getItem(STORAGE_KEY)); } catch { /* Use default if storage is unavailable. */ }
    function apply(value) {
        const percent = normalized(value);
        input.value = String(percent);
        output.value = percent + '%';
        input.setAttribute('aria-valuetext', percent + '%');
        root.style.setProperty('--macro-control-dimming', String(percent / 100));
        return percent;
    }
    apply(initial);
    input.addEventListener('input', () => apply(input.value));
    input.addEventListener('change', () => {
        const percent = apply(input.value);
        try { localStorage.setItem(STORAGE_KEY, String(percent)); } catch { /* Keep the current appearance usable. */ }
    });
}
