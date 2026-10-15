import { erosionPaceEvents, resolveErosionEvents } from './erosion-settings.js';
import { onLanguageChange } from './i18n.js';

export function initializeErosionModal(app) {
    const dialog = document.getElementById('erosionSettingsDialog');
    const form = document.getElementById('erosionSettingsForm');
    const mode = document.getElementById('erosionMode');
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
        mode.value = draft.mode;
        settings.hidden = draft.mode === 'legacy';
        const count = resolveErosionEvents(app.getPaletteLength(), draft);
        const savedCount = !draft.erosionPace && Object.hasOwn(draft, 'erosionEvents');
        const keys = ['erosion_pace_original', 'erosion_pace_fast', 'erosion_pace_faster', 'erosion_pace_max'];
        // Preserve older absolute counts until the user actually moves the slider.
        const nearest = [0, 1, 2, 3].reduce((best, pace) =>
            Math.abs(erosionPaceEvents(app.getPaletteLength(), draft.mode, pace) - count) <
            Math.abs(erosionPaceEvents(app.getPaletteLength(), draft.mode, best) - count) ? pace : best, 0);
        slider.value = String(savedCount ? nearest : draft.erosionPace ?? 0);
        value.value = app.getText(savedCount ? 'erosion_pace_saved' : keys[Number(slider.value)]);
        const details = app.getText('erosion_events_count').replace('{n}', count);
        slider.setAttribute('aria-valuetext', `${value.value} — ${details}`);
        document.getElementById('erosionEventsLimit').textContent = details;
    }
    function close() { dialog.close(); }
    mode.addEventListener('change', () => { draft.mode = mode.value; render(); });
    slider.addEventListener('input', () => {
        const pace = Number(slider.value);
        delete draft.erosionEvents;
        if (pace === 0) delete draft.erosionPace;
        else draft.erosionPace = pace;
        render();
    });
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
