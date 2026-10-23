import { getPaletteDisplayName } from './palette-display-names.js';

const groupMarks = {
    classic: '<path d="m12 2 8 10-8 10-8-10zM12 6l5 6-5 6-5-6z"/>',
    extended: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>',
    continuous: '<path d="M12 12C6 3 2 6 3 11c1 8 7 5 9 1s8-8 9-1c1 6-4 10-9 1Z"/>',
    archive: '<path d="M3 7h18M5 7l7 14 7-14M7 3h10"/>'
};

function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function paletteIcon(palette) {
    const icon = element('span', 'palette-choice-icon');
    icon.setAttribute('aria-hidden', 'true');
    // Icons come from the bundled palette catalogue, never from user input.
    if (palette.iconHTML) icon.innerHTML = palette.iconHTML;
    else icon.textContent = palette.emoji || '';
    return icon;
}

function colorRibbon(colors) {
    const ribbon = element('span', 'palette-color-ribbon');
    ribbon.setAttribute('aria-hidden', 'true');
    // Sample evenly, including both endpoints, without changing the palette.
    const count = Math.min(colors.length, 40);
    for (let i = 0; i < count; i++) {
        const swatch = element('i', '');
        swatch.style.backgroundColor = colors[Math.round(i * (colors.length - 1) / Math.max(1, count - 1))];
        ribbon.append(swatch);
    }
    return ribbon;
}

// Presentation only: group navigation never changes the board or records actions.
export function renderPalettePicker(host, { palettes, groups, selectedIndex, getText, onSelect, rtl = false }) {
    host.replaceChildren();
    host.dir = rtl ? 'rtl' : 'ltr';
    const availableGroups = groups.filter(group => group.indexes.length);
    let activeGroup = availableGroups.find(group => group.indexes.includes(selectedIndex)) || availableGroups[0];
    if (!activeGroup) return;

    const tabs = element('div', 'palette-group-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', getText('palette_groups'));
    const description = element('p', 'palette-group-description');
    description.id = 'palette-group-description';
    description.setAttribute('aria-live', 'polite');
    const current = element('div', 'palette-current');
    const list = element('div', 'palette-choice-list');
    list.id = 'palette-choice-panel';
    list.setAttribute('role', 'tabpanel');
    list.setAttribute('aria-describedby', description.id);
    list.tabIndex = 0;

    function choice(index, selected = false) {
        const palette = palettes[index];
        const button = element('button', 'palette-choice' + (selected ? ' is-current' : ''));
        button.type = 'button';
        button.dataset.paletteIndex = index;
        button.setAttribute('aria-pressed', String(index === selectedIndex));
        const title = element('span', 'palette-choice-title');
        title.append(paletteIcon(palette), element('span', 'palette-choice-name', getPaletteDisplayName(palette)),
            element('span', 'palette-choice-count', `${palette.colors.length} ${getText('palette_colors')}`));
        button.append(title, colorRibbon(palette.colors));
        if (selected) {
            button.id = 'active-palette-preview';
            const caption = element('span', 'palette-current-caption', `✓ ${getText('palette_current')}`);
            button.append(caption);
        }
        button.addEventListener('click', () => onSelect(index));
        return button;
    }

    if (palettes[selectedIndex]) current.append(choice(selectedIndex, true));
    function showGroup(group) {
        activeGroup = group;
        description.textContent = getText('palette_group_description_' + group.id);
        for (const tab of tabs.children) {
            const selected = tab.dataset.paletteGroup === group.id;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        }
        list.setAttribute('aria-labelledby', `palette-tab-${group.id}`);
        list.replaceChildren();
        for (const index of group.indexes) {
            // The compact current-palette card already represents this choice.
            if (index !== selectedIndex) list.append(choice(index));
        }
        list.scrollTop = 0;
    }

    for (const group of availableGroups) {
        const tab = element('button', 'palette-group-tab');
        tab.type = 'button';
        tab.id = `palette-tab-${group.id}`;
        tab.dataset.paletteGroup = group.id;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', list.id);
        const mark = element('span', 'palette-group-mark');
        mark.setAttribute('aria-hidden', 'true');
        mark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${groupMarks[group.id] || ''}</svg>`;
        const name = getText('palette_group_' + group.id).replace(/\s*[◈✦♾️▽]+\s*$/u, '');
        tab.append(mark, element('span', '', name));
        tab.addEventListener('click', () => showGroup(group));
        tab.addEventListener('keydown', event => {
            const position = availableGroups.indexOf(activeGroup);
            let next;
            if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = availableGroups.length - 1;
            else if (event.key === 'ArrowRight') next = position + (rtl ? -1 : 1);
            else if (event.key === 'ArrowLeft') next = position + (rtl ? 1 : -1);
            else return;
            event.preventDefault();
            next = (next + availableGroups.length) % availableGroups.length;
            showGroup(availableGroups[next]);
            tabs.children[next].focus();
        });
        tabs.append(tab);
    }
    host.append(tabs, description, current, list);
    showGroup(activeGroup);
}
