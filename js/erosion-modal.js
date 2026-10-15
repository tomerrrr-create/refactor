import { erosionEarthSpan } from './erosion-settings.js';
import { onLanguageChange } from './i18n.js';

export function initializeErosionModal(app) {
    const dialog = document.getElementById('erosionSettingsDialog');
    const form = document.getElementById('erosionSettingsForm');
    const mode = document.getElementById('erosionMode');
    const original = document.getElementById('erosionOriginal');
    const slider = document.getElementById('erosionEvents');
    const value = document.getElementById('erosionEventsValue');
    const settings = document.getElementById('erosionEventsSettings');
    let draft;

    function render() {
        dialog.dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelectorAll('[data-erosion-text]').forEach(node => {
            node.textContent = app.getText(node.dataset.erosionText);
        });
        document.getElementById('btnErosionClose').setAttribute('aria-label', app.getText('saveModal_close'));
        if (!draft) return;
        const span = erosionEarthSpan(app.getPaletteLength(), draft.mode);
        mode.value = draft.mode;
        original.checked = !Object.hasOwn(draft, 'erosionEvents');
        settings.hidden = draft.mode === 'legacy';
        slider.max = String(Math.max(1, span));
        slider.value = String(Math.min(span, draft.erosionEvents ?? Math.min(5, span)));
        slider.disabled = original.checked;
        value.value = original.checked ? app.getText('erosion_original') : slider.value;
        slider.setAttribute('aria-valuetext', value.value);
        document.getElementById('erosionEventsLimit').textContent = app.getText('erosion_events_limit')
            .replace('{n}', span);
    }
    function close() { dialog.close(); }
    mode.addEventListener('change', () => { draft.mode = mode.value; render(); });
    original.addEventListener('change', () => {
        if (original.checked) delete draft.erosionEvents;
        else draft.erosionEvents = Number(slider.value);
        render();
    });
    slider.addEventListener('input', () => { draft.erosionEvents = Number(slider.value); render(); });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (draft && app.saveErosionRules(draft)) close();
    });
    document.getElementById('btnErosionClose').addEventListener('click', close);
    document.getElementById('btnErosionCancel').addEventListener('click', close);
    dialog.addEventListener('close', () => {
        // Native close events are queued; a quick reopen may already have a new draft.
        if (!dialog.open) draft = null;
        app.resetWasLongPress();
    });
    const outside = event => {
        const r = dialog.getBoundingClientRect();
        return event.target === dialog && (event.clientX < r.left || event.clientX > r.right
            || event.clientY < r.top || event.clientY > r.bottom);
    };
    let startedOutside = false;
    dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    dialog.addEventListener('click', event => { if (startedOutside && outside(event)) close(); startedOutside = false; });
    onLanguageChange(render);
    return function openErosionSettingsModal() {
        if (!app.canEditErosion() || dialog.open) return;
        draft = app.getErosionRules();
        render();
        dialog.showModal();
        mode.focus();
    };
}
