import { getCurrentLang, getText } from './i18n.js';
import { queueAppReset } from './app-reset.js';

const STORAGE_KEY = 'colorGridOpeningChoice';
const UPDATE_RESUME_KEY = 'colorGridOpeningUpdateResume';

export function takeOpeningUpdateMode() {
    try {
        const mode = sessionStorage.getItem(UPDATE_RESUME_KEY);
        sessionStorage.removeItem(UPDATE_RESUME_KEY);
        return mode === 'create' || mode === 'evolve' ? mode : null;
    } catch {
        return null;
    }
}

export function initializeOpeningChoice(onEvolve) {
    const app = document.getElementById('appContainer');
    const toggle = document.getElementById('openingChoiceToggle');
    const gate = document.getElementById('openingChoiceGate');
    const dialog = document.getElementById('openingChoiceDialog');
    const eclipse = document.getElementById('openingEclipse');
    const continueButton = document.getElementById('openingContinue');
    const actions = dialog.querySelector('.opening-choice-actions');
    const choices = dialog.querySelectorAll('[data-opening-choice]');
    const update = document.getElementById('openingUpdate');
    const updateStatus = document.getElementById('openingUpdateStatus');
    const resetError = document.getElementById('openingEclipseError');
    const veil = document.getElementById('openingResetVeil');
    const switchIcon = document.querySelector('#btnToggleSimMode > svg').cloneNode(true);
    switchIcon.style.removeProperty('transform');
    dialog.querySelector('.opening-choice-mark').append(switchIcon);
    const gravityIcon = document.getElementById('iconGsUp').cloneNode(true);
    gravityIcon.removeAttribute('id');
    dialog.querySelector('[data-opening-choice="evolve"] .opening-choice-icon').append(gravityIcon);
    let selectedMode = null;
    let updating = false;

    toggle.checked = true;
    try { toggle.checked = localStorage.getItem(STORAGE_KEY) !== 'false'; } catch {}
    toggle.addEventListener('change', () => {
        try { localStorage.setItem(STORAGE_KEY, String(toggle.checked)); } catch {}
    });

    gate.addEventListener('click', () => {
        gate.hidden = true;
        dialog.dir = getCurrentLang() === 'he' ? 'rtl' : 'ltr';
        veil.setAttribute('aria-label', getText('opening_reset_label'));
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
            update.disabled = false;
            actions.inert = false;
        });
    });
    continueButton.addEventListener('click', () => {
        if (selectedMode) finish(selectedMode);
    });
    const updateControls = [...choices, continueButton, eclipse, update];
    dialog.addEventListener('cancel', event => { if (updating) event.preventDefault(); });
    update.addEventListener('click', async () => {
        const mode = selectedMode;
        if (!mode || updating) return;
        updating = true;
        updateControls.forEach(button => { button.disabled = true; });
        updateStatus.textContent = getText('pwa_update_checking');
        updateStatus.hidden = false;
        try {
            const { applyLatestVersion } = await import('./pwa.js');
            if (await applyLatestVersion(() => sessionStorage.setItem(UPDATE_RESUME_KEY, mode))) {
                window.location.reload();
            } else {
                finish(mode);
            }
        } catch {
            takeOpeningUpdateMode();
            updateStatus.textContent = getText('pwa_update_unavailable');
            updating = false;
            updateControls.forEach(button => { button.disabled = false; });
            update.focus({ preventScroll: true });
        }
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
