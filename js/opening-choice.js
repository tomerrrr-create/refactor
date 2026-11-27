import { getCurrentLang, getText } from './i18n.js';
import { queueAppReset, readLastOpeningMode, rememberOpeningMode } from './app-reset.js';

const STORAGE_KEY = 'colorGridOpeningChoice';

export function initializeOpeningChoice(onEvolve) {
    const app = document.getElementById('appContainer');
    const toggle = document.getElementById('openingChoiceToggle');
    const gate = document.getElementById('openingChoiceGate');
    const dialog = document.getElementById('openingChoiceDialog');
    const eclipse = document.getElementById('openingEclipse');
    const resetError = document.getElementById('openingEclipseError');
    const veil = document.getElementById('openingResetVeil');
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
        const resetLabel = getText('opening_reset_label');
        eclipse.setAttribute('aria-label', resetLabel);
        eclipse.title = resetLabel;
        veil.setAttribute('aria-label', resetLabel);
        eclipse.disabled = !readLastOpeningMode();
        dialog.showModal();
    }, { once: true });

    function finish(mode) {
        rememberOpeningMode(mode);
        app.inert = false;
        dialog.close();
        if (mode === 'evolve') onEvolve();
    }

    dialog.querySelectorAll('[data-opening-choice]').forEach(button => {
        button.addEventListener('click', () => finish(button.dataset.openingChoice));
    });
    dialog.addEventListener('close', () => { app.inert = false; });
    veil.addEventListener('cancel', event => event.preventDefault());
    eclipse.addEventListener('click', async () => {
        const mode = readLastOpeningMode();
        if (!mode || veil.open) return;
        resetError.hidden = true;
        veil.showModal();
        try {
            await Promise.all(veil.getAnimations({ subtree: true }).map(animation => animation.finished));
            queueAppReset(mode);
            window.location.reload();
        } catch {
            veil.close();
            resetError.hidden = false;
        }
    });

    return () => {
        if (!toggle.checked) return;
        app.inert = true;
        gate.hidden = false;
    };
}
