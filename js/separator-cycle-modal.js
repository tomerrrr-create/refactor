import { RELATIVE_SEPARATOR_LEVELS } from './relative-separators.js';
import { DEFAULT_SEPARATOR_CYCLE } from './separator-cycle.js';

export function initializeSeparatorCycleModal(app) {
    const dialog = document.getElementById('separatorCycleDialog');
    const form = document.getElementById('separatorCycleForm');
    const options = document.getElementById('separatorCycleOptions');
    const status = document.getElementById('separatorCycleStatus');
    const save = document.getElementById('btnSaveSeparatorCycle');
    const relativeToggle = document.getElementById('relativeSeparatorToggle');
    const relativeOptions = document.getElementById('relativeSeparatorOptions');
    let draft = [], relativeDraft = false, relativeLevel = 0;
    relativeToggle.addEventListener('change', () => { relativeDraft = relativeToggle.checked; render(); });
    const relativeKeys = ['separator_thick', 'separator_medium', 'separator_thin', 'separator_none'];
    RELATIVE_SEPARATOR_LEVELS.forEach((level, index) => {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.level = String(level);
        button.addEventListener('click', () => { relativeLevel = level; render(); });
        relativeOptions.appendChild(button);
    });
    function render() {
        relativeToggle.checked = relativeDraft;
        options.hidden = relativeDraft;
        relativeOptions.hidden = !relativeDraft;
        const noteKey = relativeDraft ? 'separator_relative_note' : 'separator_cycle_note';
        document.getElementById('separatorCycleNote').dataset.debugText = noteKey;
        document.getElementById('separatorCycleNote').textContent = app.getText(noteKey);
        const widths = app.getRelativeSeparatorWidths();
        relativeOptions.querySelectorAll('button').forEach((button, index) => {
            button.replaceChildren();
            const name = document.createElement('span'), value = document.createElement('small');
            name.textContent = app.getText(relativeKeys[index]);
            value.textContent = `${Number(widths[index].toFixed(2))} px`;
            button.append(name, value);
            button.setAttribute('aria-pressed', String(Number(button.dataset.level) === relativeLevel));
        });
        const available = app.getAvailableSeparatorWidths();
        options.querySelectorAll('button').forEach(button => {
            button.disabled = !available.includes(Number(button.dataset.width));
            button.setAttribute('aria-pressed', String(draft.includes(Number(button.dataset.width))));
        });
        save.disabled = !relativeDraft && draft.length === 0;
        status.dataset.debugText = relativeDraft || draft.length ? '' : 'separator_cycle_required';
        status.textContent = relativeDraft || draft.length ? '' : app.getText('separator_cycle_required');
    }
    for (let width = 0; width <= 6; width++) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.width = String(width); button.textContent = String(width);
        button.addEventListener('click', () => {
            draft = draft.includes(width) ? draft.filter(value => value !== width) : [...draft, width];
            render();
        });
        options.appendChild(button);
    }
    const close = () => dialog.close();
    document.getElementById('btnSeparatorCycleClose').addEventListener('click', close);
    document.getElementById('btnCancelSeparatorCycle').addEventListener('click', close);
    document.getElementById('btnResetSeparatorCycle').addEventListener('click', () => { draft = [...DEFAULT_SEPARATOR_CYCLE]; relativeDraft = false; render(); });
    form.addEventListener('submit', event => {
        event.preventDefault();
        const applied = relativeDraft
            ? app.setRelativeSeparatorMode(true, relativeLevel)
            : app.setSeparatorCycle(draft) && app.setRelativeSeparatorMode(false);
        if (applied) close();
        else {
            status.dataset.debugText = draft.length ? 'profile_replay_busy' : 'separator_cycle_required';
            status.textContent = app.getText(status.dataset.debugText);
        }
    });
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    window.addEventListener('resize', () => { if (dialog.open) requestAnimationFrame(render); });
    dialog.addEventListener('close', () => { app.resetWasLongPress(); app.dom.btnGap.focus(); });
    return function openSeparatorCycleModal() {
        draft = app.getSeparatorCycle();
        relativeDraft = app.getRelativeSeparatorMode(); relativeLevel = app.getRelativeSeparatorLevel();
        render(); dialog.showModal();
        const activeOptions = relativeDraft ? relativeOptions : options;
        (activeOptions.querySelector('[aria-pressed="true"]:not(:disabled)') ?? activeOptions.querySelector('button:not(:disabled)'))?.focus();
    };
}
