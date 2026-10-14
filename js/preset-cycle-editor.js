import { cloneCycleRules } from './evolution-cycle-settings.js';

// Modal-local rules only. Saving uses the existing evolution snapshot API.
export function createCycleEditorDraft(state, defaults, defaultSources) {
    const draft = {
        slots: state.slots.map(cloneCycleRules), sources: [...state.sources],
        yoursRules: cloneCycleRules(state.yoursRules),
        index: state.index >= 0 && state.index < 3 ? state.index : 0,
        target: null,
        assign(rules, source) {
            const index = this.target ?? 0;
            this.slots[index] = cloneCycleRules(rules);
            this.sources[index] = source;
            this.index = index;
        },
        manualChange(rules) {
            this.yoursRules = cloneCycleRules(rules);
            this.assign(rules, 'yours');
        },
        reset() {
            this.slots = [cloneCycleRules(this.yoursRules), ...defaults.slice(1).map(cloneCycleRules)];
            this.sources = [...defaultSources];
            this.index = 0;
            this.target = null;
        }
    };
    return draft;
}

export function bindPresetCycleEditor({ toolbar, presets, iconButton, state, defaults, defaultSources, readRules, writeRules, save, getText }) {
    const draft = createCycleEditorDraft(state, defaults, defaultSources);
    toolbar.replaceChildren();
    const buttons = [];
    const picker = document.createElement('div');
    picker.className = 'cycle-slot-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'group');
    let picking = null;
    const grid = presets[0].button.parentElement;
    grid.querySelector('[data-cycle-yours]')?.remove();
    const yoursButton = document.createElement('button');
    yoursButton.type = 'button';
    yoursButton.className = 'gol-preset-btn';
    yoursButton.dataset.cycleYours = '';
    yoursButton.textContent = getText('cycle_custom');
    grid.prepend(yoursButton);

    function refresh() {
        buttons.forEach((button, index) => {
            button.setAttribute('aria-pressed', String((picking ?? draft.target) === index));
            button.setAttribute('aria-expanded', String(!picker.hidden && picking === index));
            const preset = presets.find(p => (p.source || p.button.id) === draft.sources[index]);
            const name = draft.sources[index] === 'yours' ? getText('cycle_custom') : preset?.button.textContent || getText('cycle_manual');
            button.title = `${getText('cycle_position')} ${index + 1}: ${name}`;
            button.setAttribute('aria-label', button.title);
        });
        presets.forEach(preset => preset.button.classList.toggle('active',
            draft.sources[draft.index] === (preset.source || preset.button.id) && JSON.stringify(readRules()) === JSON.stringify(preset.rules)));
        yoursButton.classList.toggle('active', draft.sources[draft.index] === 'yours' && JSON.stringify(readRules()) === JSON.stringify(draft.yoursRules));
    }
    function selectPreset(source, rules) {
        if (picking !== null) draft.target = picking;
        draft.assign(rules, source);
        picking = null;
        picker.hidden = true;
        writeRules(cloneCycleRules(rules));
        refresh();
    }
    yoursButton.onclick = () => selectPreset('yours', draft.yoursRules);
    function openPicker(index) {
        picking = index;
        picker.setAttribute('aria-label', `${getText('cycle_position')} ${index + 1}`);
        picker.replaceChildren();
        const choices = [
            { label: getText('cycle_manual'), source: 'manual' },
            { label: getText('cycle_custom'), source: 'yours', rules: draft.yoursRules },
            ...presets.map(p => ({ label: p.button.textContent, source: p.source || p.button.id, rules: p.rules }))
        ];
        for (const choice of choices) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'gol-preset-btn';
            button.textContent = choice.label;
            button.dataset.cycleChoice = choice.source;
            button.onclick = () => {
                draft.target = index;
                if (choice.source === 'manual') {
                    const rules = cloneCycleRules(draft.slots[index]);
                    draft.manualChange(rules);
                    picking = null;
                    picker.hidden = true;
                    writeRules(rules);
                    refresh();
                    toolbar.closest('.retro-evolution-panel').querySelector('.gol-chip-btn')?.focus();
                } else selectPreset(choice.source, choice.rules);
            };
            picker.append(button);
        }
        picker.hidden = false;
        refresh();
    }
    for (let index = 0; index < 3; index++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cycle-slot-button';
        button.dataset.cycleSlot = String(index);
        button.setAttribute('aria-haspopup', 'true');
        const svg = iconButton.querySelector('svg').cloneNode(true);
        svg.removeAttribute('id');
        svg.setAttribute('aria-hidden', 'true');
        svg.querySelectorAll('[data-gol-star], [data-chi-star]').forEach((star, i) => {
            star.style.display = '';
            star.style.opacity = i < index ? '1' : '0';
        });
        button.append(svg);
        button.onclick = () => {
            if (!picker.hidden && picking === index) { picker.hidden = true; picking = null; refresh(); }
            else openPicker(index);
        };
        buttons.push(button);
        toolbar.append(button);
    }
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'cycle-reset-dot';
    reset.title = getText('cycle_reset');
    reset.setAttribute('aria-label', reset.title);
    reset.onclick = () => {
        draft.reset();
        picking = null;
        picker.hidden = true;
        writeRules(cloneCycleRules(draft.slots[0]));
        refresh();
    };
    toolbar.append(reset, picker);
    toolbar.onkeydown = event => {
        if (event.key === 'Escape' && !picker.hidden) {
            event.stopPropagation();
            const index = picking;
            picking = null;
            picker.hidden = true;
            refresh();
            buttons[index]?.focus();
        }
    };
    refresh();
    return {
        refresh, selectPreset,
        manualChange() { draft.manualChange(readRules()); refresh(); },
        commit() { save(draft.slots.map(cloneCycleRules), draft.index, [...draft.sources], cloneCycleRules(draft.yoursRules)); return true; }
    };
}
