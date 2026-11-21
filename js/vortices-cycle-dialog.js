import {focusSettingsHeading} from './dialog-focus.js';
import {DEFAULT_VORTICES_CYCLE, VORTICES_MODES, VORTICES_SETTINGS_ENTRY_MODES} from './vortices-modes.js';

export function createVorticesCycleDialog({getModes, saveModes, getText, getLang, onLanguageChange}) {
    const dialog = document.createElement('dialog');
    dialog.id = 'vorticesCycleDialog';
    dialog.className = 'erosion-settings-dialog ink-settings-dialog vortices-cycle-dialog';
    dialog.setAttribute('aria-labelledby', 'vorticesCycleTitle');
    dialog.setAttribute('aria-describedby', 'vorticesCycleHint');
    dialog.innerHTML = `
        <form>
            <header><h2 id="vorticesCycleTitle"></h2></header>
            <p id="vorticesCycleHint"></p>
            <div class="vortices-cycle-options"></div>
            <footer>
                <button type="button" data-reset></button>
                <button type="button" data-cancel></button>
                <button type="submit"></button>
            </footer>
        </form>`;
    const options = dialog.querySelector('.vortices-cycle-options');
    const choices = Object.entries(VORTICES_MODES).map(([mode, {label}]) => {
        const row = document.createElement('label');
        const text = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = mode;
        row.append(text, input);
        options.append(row);
        return {mode, label, input, text};
    });
    const entryChoices = choices.filter(({mode}) => VORTICES_SETTINGS_ENTRY_MODES.includes(mode));

    function updateAvailability() {
        const checked = entryChoices.filter(({input}) => input.checked);
        for (const choice of entryChoices) {
            choice.input.disabled = checked.length === 1 && checked[0] === choice;
        }
    }

    function showModes(enabledModes) {
        for (const {mode, input} of choices) input.checked = enabledModes.includes(mode);
        updateAvailability();
    }

    function translate() {
        dialog.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelector('h2').textContent = getText('vortices_cycle_title');
        dialog.querySelector('p').textContent = getText('vortices_cycle_hint');
        dialog.querySelector('[data-reset]').textContent = getText('evolution_reset_default');
        dialog.querySelector('[data-cancel]').textContent = getText('gs_modal_cancel');
        dialog.querySelector('[type=submit]').textContent = getText('gs_modal_save_close');
        for (const {label, text} of choices) text.textContent = getText(label);
    }

    options.addEventListener('change', updateAvailability);
    dialog.querySelector('[data-reset]').onclick = () => showModes(DEFAULT_VORTICES_CYCLE);
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    dialog.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        if (!entryChoices.some(({input}) => input.checked)) return;
        const enabledModes = choices.filter(({input}) => input.checked).map(({mode}) => mode);
        if (saveModes(enabledModes) !== false) dialog.close();
    });
    onLanguageChange(() => { if (dialog.open) translate(); });
    document.body.append(dialog);

    return {
        open() {
            showModes(getModes());
            translate();
            dialog.showModal();
            focusSettingsHeading(dialog);
        }
    };
}
