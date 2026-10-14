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
    let membershipChanged = false;
    const existingRow = presets[0].button.closest('.cycle-preset-row');
    const grid = existingRow ? existingRow.parentElement : presets[0].button.parentElement;
    grid.parentElement.querySelector('.cycle-custom-presets')?.remove();
    const customContainer = document.createElement('div');
    customContainer.className = 'cycle-custom-presets';
    grid.after(customContainer);
    const rows = presets.map(preset => {
        let row = preset.button.closest('.cycle-preset-row');
        if (!row) {
            row = document.createElement('div');
            row.className = 'cycle-preset-row';
            preset.button.before(row);
            row.append(preset.button);
        }
        return { ...preset, row };
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
    function renderRow({ button, rules, row }) {
        row.querySelector('.cycle-membership-buttons')?.remove();
        const group = document.createElement('span');
        group.className = 'cycle-membership-buttons';
        const indices = draft.slots.flatMap((slot, index) => slot && sameCycleRules(slot, rules) ? [index] : []);
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
                const changed = index === null ? draft.fill(rules) : draft.remove(index);
                if (changed) { membershipChanged = true; refresh(); }
            });
            group.append(toggle);
        });
        row.append(group);
    }
    function refresh() {
        rows.forEach(renderRow);
        customContainer.replaceChildren();
        const current = readRules();
        const custom = [];
        [...draft.slots, draft.removedRules, current].filter(Boolean).forEach(rules => {
            if (!presets.some(p => sameCycleRules(p.rules, rules)) && !custom.some(r => sameCycleRules(r, rules))) custom.push(rules);
        });
        custom.forEach((rules, index) => {
            const row = document.createElement('div');
            row.className = 'cycle-preset-row';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'gol-preset-btn' + (sameCycleRules(current, rules) ? ' active' : '');
            button.textContent = getText('cycle_custom') + (custom.length > 1 ? ' ' + (index + 1) : '');
            button.addEventListener('click', () => { writeRules(cloneCycleRules(rules)); refresh(); });
            row.append(button);
            customContainer.append(row);
            renderRow({ button, rules, row });
        });
        saveButton.disabled = draft.vacant !== null;
    }
    function commit() {
        if (draft.vacant !== null) return false;
        const current = readRules();
        let index = state.index;
        if (!sameCycleRules(current, initialRules)) {
            const existing = draft.slots.findIndex(slot => sameCycleRules(slot, current));
            if (membershipChanged && existing >= 0) index = existing;
            else { draft.slots[0] = cloneCycleRules(current); index = 0; }
        } else if (!membershipChanged) {
            index = state.index;
        }
        save(draft.slots.map(cloneCycleRules), index);
        return true;
    }
    refresh();
    return { refresh, commit };
}
