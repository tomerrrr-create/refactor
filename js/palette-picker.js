import { sortColorsArray } from './colors.js';
import { getPaletteDisplayName } from './palette-display-names.js';

const previewCache = new WeakMap();

// Explicit presentation choices keyed by stable catalogue names, not translated
// labels. All other palettes keep their rainbow previews.
const reversedPreviews = new Set([
    'Hearts', 'Amazon Rainforest', 'Magma Flow', 'Sky', 'Golden Midnight',
    'Electric Dreams', 'Desert Sunrise', 'Mono', 'Serenety',
    'Golden Midnight Extended', 'Plasma Overload', 'Jasmine Stardust Aura',
    'Earth & Spirit', 'Air', 'Blue Hypnosis 264', 'Glacier Pulse 264',
    'Northern Lights HD', 'Baby First Gaze'
]);

// Preview order is independent of the active board order. The requested
// reversed previews run from light to dark.
export function getPalettePreviewColors(palette) {
    const source = palette.originalColors ?? palette.colors;
    const method = reversedPreviews.has(palette.originalName ?? palette.name) ? 'reversed' : 'dark-rainbow';
    const cached = previewCache.get(palette);
    if (cached?.source === source && cached.method === method) return cached.colors;
    const colors = Object.freeze(sortColorsArray(source, method));
    previewCache.set(palette, { source, method, colors });
    return colors;
}

const groupMarks = {
    classic: '<path d="m12 2 8 10-8 10-8-10zM12 6l5 6-5 6-5-6z"/>',
    extended: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>',
    continuous: '<path d="M12 12C6 3 2 6 3 11c1 8 7 5 9 1s8-8 9-1c1 6-4 10-9 1Z"/>',
    archive: '<path d="M3 7h18M5 7l7 14 7-14M7 3h10"/>'
};

const groupSymbols = {
    classic: '23',
    extended: '64',
    continuous: '264',
    archive: '•'
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

function colorMosaic(colors, side = 6) {
    const mosaic = element('span', 'palette-color-mosaic');
    mosaic.setAttribute('aria-hidden', 'true');
    mosaic.style.gridTemplateColumns = `repeat(${side}, minmax(0, 1fr))`;
    mosaic.style.gridTemplateRows = `repeat(${side}, minmax(0, 1fr))`;
    // A fixed square preview keeps every card the same size. Sample existing
    // colors in catalogue order; no interpolation or changes to palette data.
    const count = side * side;
    for (let i = 0; i < count; i++) {
        const cell = element('i', '');
        cell.style.backgroundColor = colors[Math.round(i * (colors.length - 1) / (count - 1))];
        mosaic.append(cell);
    }
    return mosaic;
}

// Presentation only: group navigation never changes the board or records actions.
export function renderPalettePicker(host, { palettes, groups, selectedIndex, getText, onSelect, onCurrent, currentPreviewHost = null, showCurrentLabel = true, rtl = false, idPrefix = 'palette', deferredSelection = false, allowCurrentSelection = false }) {
    host.replaceChildren();
    host.classList.toggle('palette-picker-deferred', deferredSelection);
    currentPreviewHost?.replaceChildren();
    host.dir = rtl ? 'rtl' : 'ltr';
    const availableGroups = groups.filter(group => group.indexes.length);
    let activeGroup = availableGroups.find(group => group.indexes.includes(selectedIndex)) || availableGroups[0];
    if (!activeGroup) return;

    const tabs = element('div', 'palette-group-tabs');
    tabs.style.gridTemplateColumns = `repeat(${availableGroups.length}, minmax(0, 1fr))`;
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', getText('palette_groups'));
    const description = element('p', 'palette-group-description');
    description.id = `${idPrefix}-group-description`;
    description.setAttribute('aria-live', 'polite');
    let pendingIndex = null;
    const current = element(onCurrent && !deferredSelection ? 'button' : 'div', 'palette-current-summary');
    current.id = `${idPrefix}-current-summary`;
    current.hidden = !palettes[selectedIndex];
    if (onCurrent) {
        current.setAttribute('aria-label', `${getText('brush_picker_title')} — ${palettes[selectedIndex] ? getPaletteDisplayName(palettes[selectedIndex]) : ''}`);
        if (!deferredSelection) {
            current.type = 'button';
            current.setAttribute('aria-haspopup', 'dialog');
            current.addEventListener('click', onCurrent);
        }
    }
    const list = element('div', 'palette-choice-list');
    list.id = `${idPrefix}-choice-panel`;
    list.setAttribute('role', 'tabpanel');
    if (!currentPreviewHost) list.setAttribute('aria-describedby', description.id);
    list.tabIndex = 0;

    function choice(index, selected = false) {
        const palette = palettes[index];
        const button = element('button', 'palette-choice' + (selected ? ' is-current' : ''));
        button.type = 'button';
        button.dataset.paletteIndex = index;
        button.setAttribute('aria-pressed', String(deferredSelection ? index === pendingIndex : index === selectedIndex));
        button.setAttribute('aria-label', `${getPaletteDisplayName(palette)}, ${palette.colors.length} ${getText('palette_colors')}`);
        const title = element('span', 'palette-choice-title');
        title.dir = 'ltr';
        const name = element('span', 'palette-choice-name', getPaletteDisplayName(palette));
        name.dir = rtl ? 'rtl' : 'ltr';
        const count = element('span', 'palette-choice-count', String(palette.colors.length));
        const showCount = activeGroup.id === 'archive';
        title.append(name);
        const symbol = element('span', 'palette-choice-symbol');
        symbol.append(paletteIcon(palette));
        const preview = element('span', 'palette-choice-preview');
        const previewSide = currentPreviewHost ? ({ extended: 4, continuous: 7 }[activeGroup.id] ?? 3) : 6;
        preview.append(colorMosaic(getPalettePreviewColors(palette), previewSide));
        preview.hidden = deferredSelection && index !== pendingIndex;
        button.classList.toggle('is-preview', deferredSelection && index === pendingIndex);
        if (currentPreviewHost) {
            if (showCount) title.append(count);
            button.append(symbol, title, preview);
        } else {
            if (showCount) symbol.prepend(count);
            title.append(symbol);
            button.append(preview, title);
        }
        if (selected) {
            button.id = idPrefix === 'palette' ? 'active-palette-preview' : `${idPrefix}-active-palette-preview`;
        }
        button.addEventListener('click', () => {
            if (!deferredSelection) { onSelect(index); return; }
            pendingIndex = pendingIndex === index ? null : index;
            refreshPendingSelection();
        });
        return button;
    }
    function refreshPendingSelection() {
        for (const button of list.children) {
            const selected = Number(button.dataset.paletteIndex) === pendingIndex;
            button.classList.toggle('is-preview', selected);
            button.setAttribute('aria-pressed', String(selected));
            button.querySelector('.palette-choice-preview').hidden = !selected;
        }
        const palette = palettes[pendingIndex ?? selectedIndex];
        const details = current.querySelector('.palette-current-details');
        if (palette && details) {
            const name = getPaletteDisplayName(palette);
            const icon = paletteIcon(palette); icon.classList.add('palette-current-icon');
            details.querySelector('.palette-current-icon')?.replaceWith(icon);
            const label = details.querySelector('.palette-current-name');
            label.textContent = name; label.title = name;
            details.querySelector('.palette-choice-count').textContent = `${palette.colors.length} ${getText('palette_colors')}`;
            current.setAttribute('aria-label', getText(pendingIndex === null ? 'palette_current' : 'palette_preview') + ' — ' + name);
        }
        applyButton.disabled = pendingIndex === null || (!allowCurrentSelection && pendingIndex === selectedIndex);
    }

    if (palettes[selectedIndex]) {
        const palette = palettes[selectedIndex];
        const name = getPaletteDisplayName(palette);
        const dot = element('span', 'palette-current-dot');
        dot.setAttribute('aria-hidden', 'true');
        const label = element('span', 'palette-current-label', getText('palette_current'));
        const nameLabel = element('span', 'palette-current-name', name);
        nameLabel.title = name;
        const count = element('span', 'palette-choice-count', `${palette.colors.length} ${getText('palette_colors')}`);
        const details = element('span', 'palette-current-details');
        details.dir = rtl ? 'rtl' : 'ltr';
        if (showCurrentLabel) details.append(dot, label);
        details.append(nameLabel, count);
        const icon = paletteIcon(palette);
        icon.classList.add('palette-current-icon');
        current.dir = 'ltr';
        const ribbon = colorRibbon(getPalettePreviewColors(palette));
        if (currentPreviewHost && onCurrent) {
            const preview = element('button', 'palette-current-preview');
            preview.id = `${idPrefix}-current-preview`;
            preview.type = 'button';
            preview.dir = 'ltr';
            preview.setAttribute('aria-haspopup', 'dialog');
            preview.setAttribute('aria-label', current.getAttribute('aria-label'));
            preview.addEventListener('click', onCurrent);
            const headerIcon = paletteIcon(palette);
            headerIcon.classList.add('palette-current-icon');
            preview.append(headerIcon);
            currentPreviewHost.append(preview);
            details.prepend(icon);
            current.append(details);
        } else {
            // Other palette pickers retain their combined footer.
            current.append(details, ribbon, icon);
        }
    }
    let applyButton;
    if (deferredSelection) {
        current.removeAttribute('aria-label');
        const details = current.querySelector('.palette-current-details');
        details.setAttribute('aria-live', 'polite');
        details.id = `${idPrefix}-pending-name`;
        applyButton = element('button', 'palette-apply', getText('palette_apply'));
        applyButton.type = 'button'; applyButton.id = `${idPrefix}-apply`;
        applyButton.setAttribute('aria-describedby', details.id);
        applyButton.disabled = true;
        applyButton.addEventListener('click', () => {
            if (!applyButton.disabled && pendingIndex !== null) {
                applyButton.disabled = true;
                onSelect(pendingIndex);
            }
        });
        current.append(applyButton);
        refreshPendingSelection();
    }

    function showGroup(group) {
        activeGroup = group;
        list.dataset.activeGroup = group.id;
        description.textContent = getText('palette_group_description_' + group.id);
        for (const tab of tabs.children) {
            const selected = tab.dataset.paletteGroup === group.id;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        }
        list.setAttribute('aria-labelledby', `${idPrefix}-tab-${group.id}`);
        list.replaceChildren();
        for (const index of group.indexes) {
            list.append(choice(index, index === selectedIndex));
        }
        list.scrollTop = 0;
    }

    for (const group of availableGroups) {
        const tab = element('button', 'palette-group-tab');
        tab.type = 'button';
        tab.id = `${idPrefix}-tab-${group.id}`;
        tab.dataset.paletteGroup = group.id;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', list.id);
        const mark = element('span', 'palette-group-mark');
        mark.setAttribute('aria-hidden', 'true');
        mark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${groupMarks[group.id] || ''}</svg>`;
        const name = getText('palette_group_' + group.id).replace(/\s*[◈✦♾️▽]+\s*$/u, '');
        if (currentPreviewHost) {
            const symbol = element('span', 'palette-group-symbol');
            symbol.dir = 'ltr';
            symbol.setAttribute('aria-hidden', 'true');
            symbol.textContent = groupSymbols[group.id];
            tab.setAttribute('aria-label', name);
            tab.title = name;
            tab.append(symbol);
        } else tab.append(mark, element('span', '', name));
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
    if (currentPreviewHost) {
        const header = currentPreviewHost.parentElement;
        header.querySelector('.palette-group-tabs')?.remove();
        currentPreviewHost.before(tabs);
        host.append(list, current);
    } else host.append(tabs, description, list, current);
    showGroup(activeGroup);
    // The host can still be hidden while it is populated. Wait for the opening
    // layout before revealing the selected card; manual tab browsing stays at
    // the top of each group as before.
    const selectedCard = list.querySelector('.is-current');
    if (selectedCard) requestAnimationFrame(() => {
        if (selectedCard.isConnected && selectedCard.getClientRects().length) {
            selectedCard.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
    });
}
