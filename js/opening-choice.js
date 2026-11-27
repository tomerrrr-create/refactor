import { getCurrentLang, getText } from './i18n.js';
import { queueAppReset } from './app-reset.js';

const STORAGE_KEY = 'colorGridOpeningChoice';

export function initializeOpeningChoice(onEvolve) {
    const app = document.getElementById('appContainer');
    const toggle = document.getElementById('openingChoiceToggle');
    const gate = document.getElementById('openingChoiceGate');
    const dialog = document.getElementById('openingChoiceDialog');
    const eclipse = document.getElementById('openingEclipse');
    const continueButton = document.getElementById('openingContinue');
    const choices = dialog.querySelectorAll('[data-opening-choice]');
    const resetError = document.getElementById('openingEclipseError');
    const veil = document.getElementById('openingResetVeil');
    const switchIcon = document.querySelector('#btnToggleSimMode > svg');
    dialog.querySelector('.opening-choice-mark').append(switchIcon.cloneNode(true));
    let selectedMode = null;

    toggle.checked = true;
    try { toggle.checked = localStorage.getItem(STORAGE_KEY) !== 'false'; } catch {}
    toggle.addEventListener('change', () => {
        try { localStorage.setItem(STORAGE_KEY, String(toggle.checked)); } catch {}
    });

    gate.addEventListener('click', () => {
        gate.hidden = true;
        dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        const resetLabel = getText('opening_reset_label');
        continueButton.setAttribute('aria-label', getText('opening_choice_continue'));
        eclipse.setAttribute('aria-label', resetLabel);
        veil.setAttribute('aria-label', resetLabel);
        dialog.showModal();
        dialog.focus({ preventScroll: true });
    }, { once: true });

    function finish(mode) {
        app.inert = false;
        dialog.close();
        if (mode === 'evolve') onEvolve();
    }

    choices.forEach(button => {
        button.addEventListener('click', () => {
            selectedMode = button.dataset.openingChoice;
            choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
            continueButton.disabled = false;
            eclipse.disabled = false;
        });
    });
    continueButton.addEventListener('click', () => {
        if (selectedMode) finish(selectedMode);
    });
    dialog.addEventListener('close', () => { app.inert = false; });
    veil.addEventListener('cancel', event => event.preventDefault());
    eclipse.addEventListener('click', async () => {
        const mode = selectedMode;
        if (!mode || veil.open) return;
        resetError.hidden = true;
        veil.showModal();
        try {
            await Promise.all(veil.getAnimations().map(animation => animation.finished));
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
