import { getCurrentLang } from './i18n.js';

const STORAGE_KEY = 'colorGridOpeningChoice';

export function initializeOpeningChoice(onEvolve) {
    const app = document.getElementById('appContainer');
    const toggle = document.getElementById('openingChoiceToggle');
    const gate = document.getElementById('openingChoiceGate');
    const dialog = document.getElementById('openingChoiceDialog');
    const switchIcon = document.querySelector('#btnToggleSimMode > svg');
    dialog.querySelector('.opening-choice-mark').append(switchIcon.cloneNode(true));

    toggle.checked = true;
    try { toggle.checked = localStorage.getItem(STORAGE_KEY) !== 'false'; } catch {}
    toggle.addEventListener('change', () => {
        try { localStorage.setItem(STORAGE_KEY, String(toggle.checked)); } catch {}
    });

    gate.addEventListener('click', () => {
        gate.hidden = true;
        dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        dialog.showModal();
    }, { once: true });

    function finish(evolve) {
        app.inert = false;
        dialog.close();
        if (evolve) onEvolve();
    }

    dialog.querySelector('[data-opening-choice="create"]').addEventListener('click', () => finish(false));
    dialog.querySelector('[data-opening-choice="evolve"]').addEventListener('click', () => finish(true));
    dialog.addEventListener('close', () => { app.inert = false; });

    return () => {
        if (!toggle.checked) return;
        app.inert = true;
        gate.hidden = false;
    };
}
