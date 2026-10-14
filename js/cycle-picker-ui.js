import { cloneCycleRules } from './evolution-cycle-settings.js';

const sameRules = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Draft-only editor: assigning and previewing rules never touches the running app.
export function createCyclePicker({ host, iconButton, presets, state, readRules, writeRules, save, getText }) {
    const slots = state.slots.map(cloneCycleRules);
    let selected = state.index;
    let selectedRules = cloneCycleRules(readRules());
    host.replaceChildren();
    const customList = document.createElement('div');
    customList.className = 'cycle-custom-list';
    const heading = document.createElement('p');
    heading.className = 'cycle-picker-heading';
    heading.textContent = getText('cycle_use');
    const choices = document.createElement('div');
    choices.className = 'cycle-slot-choices';
    const hint = document.createElement('p');
    hint.className = 'cycle-picker-hint';
    hint.textContent = getText('cycle_hint');
    hint.setAttribute('role', 'status');
    host.append(customList, heading, choices, hint);

    function icon(index) {
        const svg = iconButton.querySelector('svg').cloneNode(true);
        svg.removeAttribute('id');
        svg.setAttribute('aria-hidden', 'true');
        svg.querySelectorAll('[data-gol-star], [data-chi-star]').forEach((star, i) => {
            star.style.display = i < index ? '' : 'none';
        });
        return svg;
    }
    const buttons = slots.map((_, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cycle-slot-button';
        button.setAttribute('aria-label', `${getText('cycle_position')} ${index + 1}`);
        button.append(icon(index));
        button.addEventListener('click', () => {
            slots[index] = cloneCycleRules(readRules());
            selected = index;
            selectedRules = cloneCycleRules(readRules());
            refresh();
        });
        choices.append(button);
        return button;
    });

    function badges(element, indices) {
        element.querySelector('.cycle-badges')?.remove();
        if (!indices.length) return;
        const group = document.createElement('span');
        group.className = 'cycle-badges';
        group.setAttribute('aria-label', getText('cycle_position') + ' ' + indices.map(i => i + 1).join(', '));
        indices.forEach(index => group.append(icon(index)));
        element.append(group);
    }
    function refresh() {
        const current = readRules();
        if (!sameRules(current, selectedRules)) selected = null;
        hint.textContent = getText('cycle_hint');
        hint.classList.remove('cycle-picker-error');
        buttons.forEach((button, index) => {
            button.classList.toggle('is-target', index === selected);
            button.setAttribute('aria-pressed', String(index === selected));
        });
        presets.forEach(({ button, rules }) => badges(button, slots.flatMap((slot, i) => sameRules(slot, rules) ? [i] : [])));
        customList.replaceChildren();
        const seen = [];
        slots.forEach((rules, index) => {
            if (presets.some(p => sameRules(p.rules, rules)) || seen.some(r => sameRules(r, rules))) return;
            seen.push(rules);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'gol-preset-btn cycle-custom-preset';
            button.textContent = `${getText('cycle_custom')} ${seen.length}`;
            button.classList.toggle('active', sameRules(rules, current));
            badges(button, slots.flatMap((slot, i) => sameRules(slot, rules) ? [i] : []));
            button.addEventListener('click', () => { writeRules(cloneCycleRules(rules)); refresh(); });
            customList.append(button);
        });
    }
    function commit() {
        if (selected === null) {
            hint.textContent = getText('cycle_choose');
            hint.classList.add('cycle-picker-error');
            choices.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return false;
        }
        save(slots.map(cloneCycleRules), selected);
        return true;
    }
    refresh();
    return { refresh, commit };
}
