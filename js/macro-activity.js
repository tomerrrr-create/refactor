// Read-only playback presentation. No recipe, history or simulation mutations.
export const MACRO_ACTIVITY_STORAGE_KEY = 'colorGridMacroActivity';
export function loadMacroActivity(storage) {
    try { return (storage ?? localStorage).getItem(MACRO_ACTIVITY_STORAGE_KEY) === 'true'; }
    catch { return false; }
}
export function saveMacroActivity(value, storage) {
    try { (storage ?? localStorage).setItem(MACRO_ACTIVITY_STORAGE_KEY, String(Boolean(value))); }
    catch { /* The display choice still works in this session. */ }
}
const simulations = {
    gameOfLife: ['help_gameOfLife', 'btnGameOfLife'], sandpile: ['help_sandpile', 'btnSandpile'],
    gravitationalSort: ['help_gravitationalSort', 'btnGravitationalSort'],
    brightnessEvo: ['help_brightnessEvo', 'btnBrightnessEvo'], islands: ['help_islands', 'btnIslands'],
    magnet: ['help_magnet', 'btnMagnetModes'], spiral: ['help_spiral', 'btnSpiral'],
    erosion: ['help_erosion', 'btnErosion'], dla: ['help_dla', 'btnDla'],
    turing: ['help_turing', 'btnTuring'], breathe: ['help_breathe', 'btnShowBreatheMenu'],
    contour: ['help_contour', 'btnContour'], cymatics: ['help_cymatics', 'btnCymatics'],
    nudgeBrighter: ['help_nudge_forward', 'btnNudgeBrighter'], nudgeDarker: ['help_nudge_backward', 'btnNudgeBrighter']
};
const actions = {
    DRAW_STROKE: ['macro_activity_draw', 'btnBrushMode'],
    WIND_WAVE: ['macro_activity_wind', 'btnWind'],
    'Palette Change': ['macro_activity_palette', 'btnPalette'],
    'Sort by': ['macro_activity_sort', 'btnCycleSort'],
    'Invert Colors': ['macro_activity_invert', 'btnInvert'],
    '--': ['macro_activity_random', 'btnRandom'], SHUFFLE_COLORS: ['macro_activity_random', 'btnRandom'],
    GO_DARK: ['macro_activity_dark', 'btnDark'], ADAPT_COLORS: ['macro_activity_adapt', 'btnSpecialReset'],
    GRID_RESIZE: ['macro_activity_resize', 'btnResizeUp'], SEPARATOR_CHANGE: ['macro_activity_separators', 'btnGap'],
    CONTOUR_APPLY: ['help_contour_action', 'btnContoursAction'],
    UNDO: ['macro_activity_undo', 'btnUndo'], REDO: ['macro_activity_redo', 'btnRedo'],
    NUDGE: ['help_nudge', 'btnNudgeBrighter']
};
export function describeMacroActivity(action, simulation) {
    // Only describe visible creative actions. Pause and settings events still
    // execute and log normally; they never replace a row in this presentation.
    if (['PLAY', 'STEP FORWARD'].includes(action.eventName)) {
        simulation = String(action.details ?? '').match(/Armed:\s*(\w+)/)?.[1] || simulation;
        const definition = simulations[simulation];
        return definition ? { label: definition[0], icon: definition[1],
            key: action.eventName + ':' + simulation } : null;
    }
    const definition = actions[action.eventName];
    return definition ? { label: definition[0], icon: definition[1], key: action.eventName } : null;
}
// Recover the current visible action when the display is enabled mid-play.
// Only already-executed commands are read; nothing is changed or replayed.
export function latestMacroActivity(queue, index, simulation) {
    for (let i = Math.min(index, queue.length - 1); i >= 0; i--) {
        const item = describeMacroActivity(queue[i], simulation);
        if (item) return item;
    }
    return null;
}
export function macroActivityPlacement(board, viewport, fullscreen = false, below = false) {
    if (below) {
        const width = Math.min(224, board.width, viewport.width - 32), height = 72;
        const gap = viewport.width >= 768 ? 74 : 20;
        const top = board.top + board.height + gap;
        const left = board.left + (board.width - width) / 2;
        if (!fullscreen || board.width <= 0 || width < 188 || left < 16 || left + width > viewport.width - 16 ||
            top + height > viewport.height - Math.max(16, viewport.safeBottom || 0)) return null;
        return {left, top, width};
    }
    const gap = fullscreen ? 74 : 28; // Leave the fullscreen gallery frame untouched.
    const width = Math.min(224, board.left - gap - 16), height = 72;
    if (viewport.width < 1024 || width < 188 || viewport.height < height + 32 || board.width <= 0) return null;
    return { left: board.left - gap - width, top: Math.max(16, Math.min(viewport.height - height - 16,
        board.top + (board.height - height) / 2)), width };
}

// Freeze the visible control symbol so an outgoing row cannot change mid-fade.
export function captureMacroActivityIcon(button) {
    if (!button) return null;
    const win = button.ownerDocument.defaultView;
    // Fullscreen/drawers can hide the whole control via inherited visibility.
    // Per-symbol display still identifies the selected variant while it is hidden.
    const original = [...button.querySelectorAll('svg, .glyph, .glyph-dark')]
        .find(node => win.getComputedStyle(node).display !== 'none');
    if (!original) return null;
    const clone = original.cloneNode(true), originals = [original, ...original.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    const properties = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
        'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
        'opacity', 'transform', 'transform-origin', 'vector-effect', 'paint-order',
        'fill-rule', 'clip-rule', 'stroke-miterlimit', 'stop-color', 'stop-opacity'];
    for (let i = 0; i < copies.length; i++) {
        const node = copies[i], style = win.getComputedStyle(originals[i]);
        if (i && style.display === 'none') { node.remove(); continue; }
        if (original instanceof win.SVGElement) {
            node.removeAttribute('class');
            for (const property of properties) node.style.setProperty(property, style.getPropertyValue(property));
        }
        node.style.display = i ? style.display : 'block';
    }
    clone.style.width = '24px'; clone.style.height = '24px';
    return { node: clone, signature: clone.outerHTML, sourceId: original.id };
}
let activityIconId = 0;
function installIcon(snapshot) {
    const clone = snapshot.node.cloneNode(true), nodes = [clone, ...clone.querySelectorAll('*')], ids = new Map();
    for (const node of nodes) if (node.id) {
        const id = 'macro-activity-icon-' + (++activityIconId);
        ids.set(node.id, id); node.id = id;
    }
    for (const node of nodes) for (const attribute of [...node.attributes]) {
        let value = attribute.value;
        for (const [before, after] of ids) {
            value = value.replaceAll('#' + before + ')', '#' + after + ')')
                .replaceAll('#' + before + '"', '#' + after + '"').replaceAll("#" + before + "'", "#" + after + "'");
            if (value === '#' + before) value = '#' + after;
        }
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
    }
    return clone;
}

// At most two overlapping rows. Rapid updates replace the incoming content,
// without restarting the fade or queuing animations behind the actual playback.
export function createMacroActivityFade(container) {
    const win = container.ownerDocument.defaultView, reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    let incoming = null, outgoing = null, enter = null, exit = null;
    function settle() {
        if (enter) { enter.onfinish = null; enter.cancel(); }
        exit?.cancel(); enter = exit = null;
        outgoing?.remove(); outgoing = null;
        if (incoming) incoming.style.opacity = '1';
    }
    reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
    return {
        show(row) {
            if (!incoming || reduced.matches || !row.animate) {
                settle(); incoming = row; container.replaceChildren(row); return;
            }
            if (enter) { incoming.replaceChildren(...row.childNodes); return; }
            outgoing = incoming; outgoing.setAttribute('aria-hidden', 'true');
            incoming = row; container.append(row);
            const timing = {duration: 250, easing: 'ease-in-out', fill: 'forwards'};
            exit = outgoing.animate([{opacity:1}, {opacity:0}], timing);
            enter = incoming.animate([{opacity:0}, {opacity:1}], timing);
            enter.onfinish = settle;
        },
        clear() { settle(); incoming = null; container.replaceChildren(); }
    };
}

export function createMacroActivity({ board, getText, getLang, readState, document: doc = document }) {
    const win = doc.defaultView, desktop = win.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    const panel = doc.createElement('aside');
    panel.id = 'macroActivity'; panel.className = 'macro-activity'; panel.hidden = true;
    panel.setAttribute('role', 'region');
    const current = doc.createElement('div'); current.className = 'macro-activity-current';
    panel.append(current); doc.body.append(panel);
    const fade = createMacroActivityFade(current);
    let iconCacheKey = '', iconSnapshot = null;
    let enabled = loadMacroActivity(), active = false, timer = null, entry = null, lastMarkup = '';
    const text = key => getText(key).split('\n')[0];
    function row(item, snapshot) {
        const row = doc.createElement('div'); row.className = 'macro-activity-row';
        const icon = doc.createElement('span'); icon.className = 'macro-activity-icon'; icon.setAttribute('aria-hidden', 'true');
        if (snapshot) {
            icon.dataset.sourceIcon = snapshot.sourceId;
            icon.append(installIcon(snapshot));
        } else icon.textContent = doc.getElementById(item.icon)?.textContent.trim() || '◇';
        const body = doc.createElement('div'), title = doc.createElement('p');
        title.className = 'macro-activity-title'; title.textContent = text(item.label); body.append(title);
        row.append(icon, body); return row;
    }
    function render() {
        const state = readState();
        const place = enabled && active && entry && state.loaded && state.fullscreen
            ? macroActivityPlacement(board.getBoundingClientRect(), {width: win.innerWidth, height: win.innerHeight, safeBottom: parseFloat(win.getComputedStyle(panel).getPropertyValue('--activity-safe-bottom')) || 0}, state.fullscreen, !desktop.matches) : null;
        panel.dataset.placement = desktop.matches ? 'left' : 'below';
        panel.hidden = !place;
        if (!place) { fade.clear(); lastMarkup = ''; return; }
        Object.assign(panel.style, { left: place.left + 'px', top: place.top + 'px', width: place.width + 'px' });
        panel.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        const displayEntry = entry.icon === 'btnNudgeBrighter' && ['nudgeBrighter', 'nudgeDarker'].includes(state.simulation)
            ? { ...entry, label: simulations[state.simulation][0] } : entry;
        const button = doc.getElementById(displayEntry.icon);
        const cacheKey = (button?.outerHTML ?? '') + (button ? win.getComputedStyle(button).color : '') + doc.documentElement.dataset.simulationEffectiveTheme;
        if (cacheKey !== iconCacheKey) {
            iconCacheKey = cacheKey; iconSnapshot = captureMacroActivityIcon(button);
        }
        const signature = JSON.stringify([displayEntry, getLang(), iconSnapshot?.signature]);
        if (signature === lastMarkup) return;
        lastMarkup = signature;
        panel.setAttribute('aria-label', text('macro_activity_setting'));
        fade.show(row(displayEntry, iconSnapshot));
    }
    function sync() {
        if (enabled && active) {
            const state = readState();
            entry = latestMacroActivity(state.queue, state.index - 1, state.simulation);
        }
        if (timer !== null) win.clearInterval(timer);
        timer = enabled && active ? win.setInterval(render, 100) : null;
        render();
    }
    desktop.addEventListener('change', sync);
    return {
        enabled: () => enabled,
        setEnabled(value) {
            enabled = Boolean(value); saveMacroActivity(enabled);
            sync();
        },
        start() { active = true; sync(); },
        stop() { active = false; entry = null; lastMarkup = ''; sync(); },
        record(action) {
            if (!enabled || !active) return;
            const next = describeMacroActivity(action, readState().simulation);
            if (next) entry = next;
        }
    };
}
