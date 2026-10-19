import { DEFAULT_EVOLUTION_TUNING, EVOLUTION_TUNING_LIMITS } from './evolution-tuning.js';
import { onLanguageChange } from './i18n.js';

const definitions = {
    brightnessEvo: { title: 'tuning_brightness_title', button: 'btnBrightnessEvo',
        modes: ['brightness', 'contrast'], fields: ['smoothing', 'contrast'] },
    breathe: { title: 'tuning_breathe_title', button: 'btnShowBreatheMenu',
        modes: ['solo', 'group', 'random-cell', 'random-color'], fields: ['speed', 'depth'] },
    islands: { title: 'tuning_islands_title', button: 'btnIslands', fields: ['activity'] },
    dla: { title: 'dla_modal_title', button: 'btnDla', modes: ['genetics', 'no-genetics'], fields: ['batchSize'] }
};
const breatheModeIcons = { solo: 'iconBreatheSolo', group: 'iconBreatheGroup', 'random-cell': 'iconBreatheRandomCell', 'random-color': 'iconBreatheRandomColor' };
const percentage = value => `${Math.round(value * 100)}%`;
const format = (field, value) => field === 'batchSize' ? String(value) : percentage(value);

export function initializeEvolutionTuningModals(app) {
    const openers = {};
    for (const [simulation, definition] of Object.entries(definitions)) {
        const dialog = document.createElement('dialog');
        dialog.id = `${simulation}TuningDialog`;
        dialog.className = 'erosion-settings-dialog evolution-tuning-dialog';
        dialog.setAttribute('aria-labelledby', `${simulation}TuningTitle`);
        // Static structure only; all labels and values use textContent.
        dialog.innerHTML = `<form>
            <button type="button" class="modal-dismiss" data-close><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
            <div class="tuning-heading-icon" aria-hidden="true"></div>
            <h2 id="${simulation}TuningTitle"></h2>
            <div class="tuning-modes" role="group"></div>
            <div class="tuning-fields"></div>
            <div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div>
        </form>`;
        document.body.append(dialog);
        let draft = null, mode;
        const modeGroup = dialog.querySelector('.tuning-modes');
        const fields = new Map();
        function render() {
            dialog.dir = app.getCurrentLang() === 'he' ? 'rtl' : 'ltr';
            dialog.querySelector('h2').textContent = app.getText(definition.title);
            dialog.querySelector('[data-close]').setAttribute('aria-label', app.getText('saveModal_close'));
            dialog.querySelector('[data-reset]').textContent = app.getText('evolution_reset_default');
            dialog.querySelector('[data-cancel]').textContent = app.getText('gs_modal_cancel');
            dialog.querySelector('[type=submit]').textContent = app.getText('gs_modal_save_close');
            modeGroup.setAttribute('aria-label', app.getText('tuning_mode'));
            for (const button of modeGroup.children) {
                const label = app.getText('tuning_mode_' + button.dataset.mode);
                if (simulation === 'breathe') {
                    button.title = label; button.setAttribute('aria-label', label);
                } else button.textContent = label;
                button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
            }
            for (const [field, { label, note, input, output }] of fields) {
                label.textContent = app.getText('tuning_' + field);
                note.textContent = app.getText('tuning_' + field + '_note');
                if (!draft) continue;
                input.value = draft[field];
                output.value = format(field, draft[field]);
                input.setAttribute('aria-valuetext', output.value);
            }
        }
        for (const value of definition.modes ?? []) {
            const button = document.createElement('button');
            button.type = 'button'; button.dataset.mode = value;
            if (simulation === 'breathe') {
                const icon = document.getElementById(breatheModeIcons[value]).cloneNode(true);
                icon.removeAttribute('id'); icon.style.display = 'block';
                icon.setAttribute('aria-hidden', 'true');
                button.append(icon);
            }
            button.addEventListener('click', () => { mode = value; render(); });
            modeGroup.append(button);
        }
        modeGroup.classList.toggle('breathe-mode-icons', simulation === 'breathe');
        modeGroup.hidden = !definition.modes;
        for (const field of definition.fields) {
            const row = document.createElement('div'); row.className = 'tuning-field';
            const id = `${simulation}Tuning_${field}`;
            row.innerHTML = `<label for="${id}"></label><output for="${id}"></output><input id="${id}" type="range"/><p id="${id}Note"></p>`;
            const [min, max, step] = EVOLUTION_TUNING_LIMITS[simulation][field];
            const input = row.querySelector('input');
            Object.assign(input, { min, max, step });
            input.setAttribute('aria-describedby', `${id}Note`);
            const nodes = { input, label: row.querySelector('label'), output: row.querySelector('output'), note: row.querySelector('p') };
            fields.set(field, nodes);
            input.addEventListener('input', () => { if (draft) { draft[field] = Number(input.value); render(); } });
            dialog.querySelector('.tuning-fields').append(row);
        }
        const close = () => dialog.close();
        dialog.querySelector('[data-close]').addEventListener('click', close);
        dialog.querySelector('[data-cancel]').addEventListener('click', close);
        dialog.querySelector('[data-reset]').addEventListener('click', () => {
            draft = { ...DEFAULT_EVOLUTION_TUNING[simulation] }; render();
        });
        dialog.querySelector('form').addEventListener('submit', event => {
            event.preventDefault();
            if (draft && app.saveEvolutionTuning(simulation, draft, mode)) close();
        });
        dialog.addEventListener('close', () => {
            if (!dialog.open) draft = null;
            app.resetWasLongPress();
        });
        const outside = event => {
            const box = dialog.getBoundingClientRect();
            return event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
        };
        let startedOutside = false;
        dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
        dialog.addEventListener('click', event => { if (startedOutside && outside(event)) close(); startedOutside = false; });
        onLanguageChange(render);
        openers[simulation] = () => {
            if (!app.canEditEvolutionTuning(simulation) || dialog.open) return;
            draft = { ...app.getEvolutionTuning()[simulation] };
            mode = app.getEvolutionTuningMode(simulation);
            const icon = document.getElementById(definition.button)?.querySelector('svg')?.cloneNode(true);
            // Strip IDs to avoid duplicate SVG references in the document.
            if (icon) {
                icon.removeAttribute('id');
                icon.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
            }
            dialog.querySelector('.tuning-heading-icon').dataset.islandsMode = document.getElementById(definition.button).classList.contains('mode-proximity') ? 'proximity' : 'classic';
            dialog.querySelector('.tuning-heading-icon').replaceChildren(...(icon ? [icon] : []));
            render(); dialog.showModal();
            dialog.querySelector('input').focus();
        };
    }
    return {
        openBrightnessSettingsModal: openers.brightnessEvo,
        openBreatheSettingsModal: openers.breathe,
        openIslandsSettingsModal: openers.islands,
        openDlaSettingsModal: openers.dla
    };
}
