import { cloneCycleRules } from './evolution-cycle-settings.js';

export const sameCycleRules = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createMembershipDraft(initialSlots) {
    const slots = initialSlots.map(cloneCycleRules);
    let vacant = null;
    let removedRules = null;
    return {
        slots,
        get vacant() { return vacant; },
        get removedRules() { return removedRules; },
        remove(index) {
            if (vacant !== null || !slots[index]) return false;
            removedRules = cloneCycleRules(slots[index]);
            slots[index] = null;
            vacant = index;
            return true;
        },
        fill(rules) {
            if (vacant === null) return false;
            slots[vacant] = cloneCycleRules(rules);
            vacant = null;
            removedRules = null;
            return true;
        }
    };
}

// Membership lives beside existing preset controls; rule selection remains independent.
export function bindPresetCycleMembership({ presets, iconButton, state, readRules, writeRules, save, saveButton, getText }) {
    const draft = createMembershipDraft(state.slots);
    const initialRules = cloneCycleRules(readRules());
    const sources = [...state.sources];
    let yoursRules = cloneCycleRules(state.yoursRules);
    let previewingPersonal = false;
    let membershipChanged = false;
    const existingRow = presets[0].button.closest('.cycle-preset-row');
    const grid = existingRow ? existingRow.parentElement : presets[0].button.parentElement;
    grid.parentElement.querySelector('.cycle-custom-presets')?.remove();
    grid.querySelectorAll('[data-cycle-personal]').forEach(row => row.remove());
    const rows = presets.map(preset => {
        let row = preset.button.closest('.cycle-preset-row');
        if (!row) {
            row = document.createElement('div');
            row.className = 'cycle-preset-row';
            preset.button.before(row);
            row.append(preset.button);
        }
        return { ...preset, source: preset.source || preset.button.id, row };
    });

    function icon(index) {
        const svg = iconButton.querySelector('svg').cloneNode(true);
        svg.removeAttribute('id');
        svg.setAttribute('aria-hidden', 'true');
        svg.querySelectorAll('[data-gol-star], [data-chi-star]').forEach((star, i) => {
            star.style.display = i < index ? '' : 'none';
        });
        return svg;
    }
    function renderRow({ button, rules, row, source }) {
        row.querySelector('.cycle-membership-buttons')?.remove();
        const group = document.createElement('span');
        group.className = 'cycle-membership-buttons';
        const indices = draft.slots.flatMap((slot, index) => slot && sources[index] === source ? [index] : []);
        const positions = indices.length ? indices : [null];
        positions.forEach(index => {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'cycle-membership-icon' + (index === null ? '' : ' is-assigned');
            toggle.setAttribute('aria-pressed', String(index !== null));
            toggle.setAttribute('aria-label', index === null
                ? getText('cycle_add') + ': ' + button.textContent.trim()
                : getText('cycle_remove') + ': ' + button.textContent.trim() + ', ' + getText('cycle_position') + ' ' + (index + 1));
            toggle.title = toggle.getAttribute('aria-label');
            toggle.disabled = index === null ? draft.vacant === null : draft.vacant !== null;
            toggle.append(icon(index ?? 0));
            toggle.addEventListener('click', () => {
                const target = index ?? draft.vacant;
                const changed = index === null ? draft.fill(rules) : draft.remove(index);
                if (changed) sources[target] = index === null ? source : null;
                if (changed) { membershipChanged = true; refresh(); }
            });
            group.append(toggle);
        });
        row.prepend(group);
    }
    function personalRow(rules, source, label) {
        const row = document.createElement('div');
        row.className = 'cycle-preset-row';
        row.dataset.cyclePersonal = source;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gol-preset-btn' + (sameCycleRules(readRules(), rules) ? ' active' : '');
        button.textContent = label;
        button.addEventListener('click', () => {
            previewingPersonal = true;
            writeRules(cloneCycleRules(rules));
            refresh();
            previewingPersonal = false;
        });
        row.append(button);
        renderRow({ button, rules, row, source });
        return row;
    }
    function refresh() {
        const current = readRules();
        if (!previewingPersonal && !sameCycleRules(current, initialRules) && !presets.some(p => sameCycleRules(p.rules, current))) {
            yoursRules = cloneCycleRules(current);
        }
        rows.forEach(renderRow);
        grid.querySelectorAll('[data-cycle-personal]').forEach(row => row.remove());
        grid.prepend(personalRow(yoursRules, 'yours', getText('cycle_custom')));
        const custom = sources.flatMap((source, index) => source?.startsWith('custom-') && draft.slots[index] ? [{ source, rules: draft.slots[index] }] : []);
        // Preserve a removed custom choice until its vacancy is filled or cancelled.
        if (draft.removedRules && !presets.some(p => sameCycleRules(p.rules, draft.removedRules)) && !sameCycleRules(draft.removedRules, yoursRules)) {
            custom.push({ source: 'custom-' + draft.vacant, rules: draft.removedRules });
        }
        custom.forEach(({ source, rules }, index) => grid.append(personalRow(rules, source, getText('cycle_custom') + ' ' + (index + 2))));
        saveButton.disabled = draft.vacant !== null;
    }
    function commit() {
        if (draft.vacant !== null) return false;
        const current = readRules();
        let index = state.index;
        if (!sameCycleRules(current, initialRules)) {
            const existing = draft.slots.findIndex(slot => sameCycleRules(slot, current));
            if (membershipChanged && existing >= 0) index = existing;
            else {
                yoursRules = cloneCycleRules(current);
                const personalIndex = sources.indexOf('yours');
                index = personalIndex >= 0 ? personalIndex : 0;
                draft.slots[index] = cloneCycleRules(current);
                sources[index] = 'yours';
            }
        }
        save(draft.slots.map(cloneCycleRules), index, [...sources], cloneCycleRules(yoursRules));
        return true;
    }
    refresh();
    return { refresh, commit };
}
