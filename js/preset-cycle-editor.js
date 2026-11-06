import { cloneCycleRules } from './evolution-cycle-settings.js';

// Auto Reach and its explicit 100% spelling represent the same setting.
export function sameEditorRules(a, b) {
    const canonical = rules => {
        const value = cloneCycleRules(rules);
        if (Number.isInteger(value.reachPercent)) {
            value.reach = 0;
            delete value.reachOffset;
            if (value.reachPercent === 100) delete value.reachPercent;
        } else if (Number.isInteger(value.reachOffset)) {
            value.reach = 0;
            if (value.reachOffset === 0) delete value.reachOffset;
        }
        return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))));
    };
    return canonical(a) === canonical(b);
}

// Modal-local rules only. Saving uses the existing evolution snapshot API.
export function createCycleEditorDraft(state, defaults, defaultSources) {
    return {
        slots: state.slots.map(cloneCycleRules), sources: [...state.sources],
        // Retain the recording API's personal snapshot for backward compatibility.
        yoursRules: cloneCycleRules(state.yoursRules),
        index: state.index >= 0 && state.index < 3 ? state.index : 0,
        assigning: false,
        selectSlot(index) {
            if (Number.isInteger(index) && index >= 0 && index < 3) { this.index = index; this.assigning = true; }
        },
        assign(rules, source) {
            this.slots[this.index] = cloneCycleRules(rules);
            this.sources[this.index] = source;
        },
        manualChange(rules) {
            this.yoursRules = cloneCycleRules(rules);
            if (this.assigning) this.assign(rules, 'custom-' + this.index);
        },
        reset() {
            this.slots = defaults.map(cloneCycleRules);
            this.sources = [...defaultSources];
        }
    };
}

export function bindPresetCycleEditor({ toolbar, presets, iconButton, state, defaults, defaultSources, readRules, writeRules, save, getText }) {
    const draft = createCycleEditorDraft(state, defaults, defaultSources);
    const initialRules = cloneCycleRules(readRules());
    toolbar.replaceChildren();
    const buttons = [];
    function refresh() {
        const reset = toolbar.querySelector('.cycle-reset-dot');
        if (reset) {
            reset.title = getText('cycle_reset');
            reset.setAttribute('aria-label', reset.title);
        }
        buttons.forEach((button, index) => {
            const matches = sameEditorRules(readRules(), draft.slots[index]);
            button.setAttribute('aria-pressed', String(draft.index === index && (draft.assigning || matches)));
            const preset = presets.find(p => (p.source || p.button.id) === draft.sources[index]) ||
                presets.find(p => JSON.stringify(p.rules) === JSON.stringify(draft.slots[index]));
            const name = preset?.button.textContent || getText('cycle_manual');
            button.title = `${getText('cycle_position')} ${index + 1}: ${name}\n${getText('cycle_assign_hint')}`;
            button.setAttribute('aria-label', button.title);
        });
    }
    function selectPreset(source, rules) {
        if (draft.assigning) draft.assign(rules, source);
        writeRules(cloneCycleRules(rules));
        refresh();
    }
    for (let index = 0; index < 3; index++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cycle-slot-button';
        button.dataset.cycleSlot = String(index);
        const svg = iconButton.querySelector('svg').cloneNode(true);
        svg.removeAttribute('id');
        svg.setAttribute('aria-hidden', 'true');
        svg.querySelectorAll('[data-gol-star], [data-chi-star]').forEach((star, i) => {
            star.style.display = '';
            star.style.opacity = i < index ? '1' : '0';
        });
        button.append(svg);
        button.onclick = () => {
            draft.selectSlot(index);
            writeRules(cloneCycleRules(draft.slots[index]));
            refresh();
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
        writeRules(cloneCycleRules(draft.slots[draft.index]));
        refresh();
    };
    toolbar.append(reset);
    refresh();
    return {
        refresh, selectPreset,
        manualChange() { draft.manualChange(readRules()); refresh(); },
        commit() {
            const rules = readRules();
            let activeRules = sameEditorRules(rules, initialRules) ? (state.activeRules || rules) : rules;
            if (draft.assigning && sameEditorRules(activeRules, draft.slots[draft.index])) activeRules = draft.slots[draft.index];
            save(draft.slots.map(cloneCycleRules), draft.index, [...draft.sources], cloneCycleRules(draft.yoursRules), cloneCycleRules(activeRules));
            return true;
        }
    };
}
