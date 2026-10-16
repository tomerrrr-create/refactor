import { erosionStageEvents, EROSION_STAGE_SYMBOLS, resolveErosionEvents, restoreErosionRules } from './erosion-settings.js';
import { onLanguageChange } from './i18n.js';

export function initializeErosionModal(app) {
    const dialog = document.getElementById('erosionSettingsDialog');
    const form = document.getElementById('erosionSettingsForm');
    const mode = document.getElementById('erosionMode');
    const modeButtons = [...mode.querySelectorAll('[data-erosion-mode]')];
    const slider = document.getElementById('erosionEvents');
    const value = document.getElementById('erosionEventsValue');
    const settings = document.getElementById('erosionEventsSettings');
    const reset = document.getElementById('btnErosionReset');
    let draft;

    function render() {
        dialog.dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelectorAll('[data-erosion-text]').forEach(node => {
            node.textContent = app.getText(node.dataset.erosionText);
        });
        document.getElementById('btnErosionClose').setAttribute('aria-label', app.getText('saveModal_close'));
        reset.title = app.getText('evolution_reset_default');
        reset.setAttribute('aria-label', reset.title);
        mode.setAttribute('aria-label', app.getText('erosion_mode_label'));
        modeButtons.forEach(button => {
            const label = app.getText(button.dataset.erosionLabel);
            button.title = label;
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(button.dataset.erosionMode === draft?.mode));
        });
        if (!draft) return;
        const selected = modeButtons.find(button => button.dataset.erosionMode === draft.mode);
        document.getElementById('erosionModeName').textContent = selected.title;
        const inactive = draft.mode === 'legacy';
        settings.classList.toggle('erosion-settings-inactive', inactive);
        settings.setAttribute('aria-disabled', String(inactive));
        slider.disabled = inactive;
        const count = resolveErosionEvents(app.getPaletteLength(), draft);
        const stage = draft.erosionStages?.[draft.mode];
        const savedCount = stage === undefined && (draft.erosionPace || Object.hasOwn(draft, 'erosionEvents'));
        // Old shared/absolute settings remain exact until this mode is edited.
        const nearest = [0, 1, 2, 3, 4].reduce((best, next) =>
            Math.abs(erosionStageEvents(app.getPaletteLength(), draft.mode, next) - count) <
            Math.abs(erosionStageEvents(app.getPaletteLength(), draft.mode, best) - count) ? next : best, 0);
        slider.value = String(inactive ? 0 : stage ?? (savedCount ? nearest : 0));
        value.value = !inactive && savedCount ? app.getText('erosion_pace_saved') : EROSION_STAGE_SYMBOLS[Number(slider.value)];
        value.classList.toggle('erosion-saved-value', Boolean(!inactive && savedCount));
        const details = inactive ? app.getText('erosion_pace_inactive')
            : app.getText('erosion_events_count').replace('{n}', count);
        slider.setAttribute('aria-valuetext', `${value.value} — ${details}`);
    }
    function close() { dialog.close(); }
    reset.addEventListener('click', () => {
        if (!draft) return;
        // Reset both channel rates in the draft, retaining the selected mode.
        draft = { ...app.getDefaultErosionRules(), mode: draft.mode };
        render();
    });
    modeButtons.forEach(button => button.addEventListener('click', () => {
        if (!draft) return;
        draft.mode = button.dataset.erosionMode;
        render();
    }));
    slider.addEventListener('input', () => {
        if (!draft || draft.mode === 'legacy') return;
        draft.erosionStages = { ...draft.erosionStages, [draft.mode]: Number(slider.value) };
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
        draft = restoreErosionRules(app.getErosionRules());
        render();
        dialog.showModal();
        modeButtons.find(button => button.dataset.erosionMode === draft.mode).focus();
    };
}
