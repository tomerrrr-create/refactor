import { DEFAULT_SEPARATOR_CYCLE } from './separator-cycle.js';

export function initializeSeparatorCycleModal(app) {
    const dialog = document.getElementById('separatorCycleDialog');
    const form = document.getElementById('separatorCycleForm');
    const options = document.getElementById('separatorCycleOptions');
    const status = document.getElementById('separatorCycleStatus');
    const save = document.getElementById('btnSaveSeparatorCycle');
    let draft = [];
    function render() {
        options.querySelectorAll('button').forEach(button => {
            button.setAttribute('aria-pressed', String(draft.includes(Number(button.dataset.width))));
        });
        save.disabled = draft.length === 0;
        status.dataset.debugText = draft.length ? '' : 'separator_cycle_required';
        status.textContent = draft.length ? '' : app.getText('separator_cycle_required');
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
    document.getElementById('btnResetSeparatorCycle').addEventListener('click', () => { draft = [...DEFAULT_SEPARATOR_CYCLE]; render(); });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (app.setSeparatorCycle(draft)) close();
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
    dialog.addEventListener('close', () => { app.resetWasLongPress(); app.dom.btnGap.focus(); });
    return function openSeparatorCycleModal() {
        draft = app.getSeparatorCycle(); render(); dialog.showModal();
        options.querySelector('[aria-pressed="true"]')?.focus();
    };
}
