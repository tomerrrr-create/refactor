import { cloneCycleRules } from './evolution-cycle-settings.js';

// Modal Save and quick preset selection commit the same three-slot snapshot.
export function commitCycleEditorDraft(draft, save) {
    return save(draft.slots.map(cloneCycleRules), draft.index, [...draft.sources], cloneCycleRules(draft.yoursRules)) !== false;
}

export function orderedCyclePresets(container, presets) {
    const byId = new Map(presets.map(preset => [preset.button.id, preset]));
    return [...container.querySelectorAll('button')].filter(button => byId.has(button.id)).map(button => byId.get(button.id));
}

function comparableRules(rules) {
    const value = cloneCycleRules(rules);
    delete value.genetics; // Genetics is a shared GoL preference, not a preset.
    if (value.reach === 0 && value.reachOffset === undefined) value.reachPercent ??= 100;
    return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key,
        Array.isArray(value[key]) ? [...value[key]].sort((a,b)=>a-b) : value[key]])));
}

export function adjacentCyclePreset(state, presets, direction) {
    if (!presets.length || ![-1,1].includes(direction) || ![0,1,2].includes(state.index)) return null;
    const source = state.sources[state.index];
    let index = presets.findIndex(preset => (preset.source || preset.button.id) === source);
    if (index < 0) index = presets.findIndex(preset => comparableRules(preset.rules) === comparableRules(state.slots[state.index]));
    if (index < 0) return presets[direction > 0 ? 0 : presets.length - 1];
    return presets[(index + direction + presets.length) % presets.length];
}

// Modal-local rules only. Saving uses the existing evolution snapshot API.
export function createCycleEditorDraft(state, defaults = state.slots, defaultSources = state.sources) {
    return {
        slots: state.slots.map(cloneCycleRules), sources: [...state.sources],
        // Retain the recording API's personal snapshot for backward compatibility.
        yoursRules: cloneCycleRules(state.yoursRules),
        index: state.index >= 0 && state.index < 3 ? state.index : 0,
        selectSlot(index) {
            if (Number.isInteger(index) && index >= 0 && index < 3) this.index = index;
        },
        assign(rules, source) {
            this.slots[this.index] = cloneCycleRules(rules);
            this.sources[this.index] = source;
        },
        manualChange(rules) {
            this.yoursRules = cloneCycleRules(rules);
            this.assign(rules, 'custom-' + this.index);
        },
        reset() {
            this.slots = defaults.map(cloneCycleRules);
            this.sources = [...defaultSources];
        }
    };
}

export function bindPresetCycleEditor({ toolbar, presets, iconButton, state, defaults, defaultSources, readRules, writeRules, save, getText }) {
    const draft = createCycleEditorDraft(state, defaults, defaultSources);
    toolbar.replaceChildren();
    const buttons = [];
    function refresh() {
        const reset = toolbar.querySelector('.cycle-reset-dot');
        if (reset) {
            reset.title = getText('cycle_reset');
            reset.setAttribute('aria-label', reset.title);
        }
        buttons.forEach((button, index) => {
            button.setAttribute('aria-pressed', String(draft.index === index));
            const preset = presets.find(p => (p.source || p.button.id) === draft.sources[index]) ||
                presets.find(p => JSON.stringify(p.rules) === JSON.stringify(draft.slots[index]));
            const name = preset?.button.textContent || getText('cycle_manual');
            button.title = `${getText('cycle_position')} ${index + 1}: ${name}`;
            button.setAttribute('aria-label', button.title);
        });
    }
    function selectPreset(source, rules) {
        draft.assign(rules, source);
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
        commit() { return commitCycleEditorDraft(draft, save); }
    };
}
