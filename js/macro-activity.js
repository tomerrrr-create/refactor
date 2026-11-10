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
export function macroActivityPlacement(board, viewport, fullscreen = false) {
    const gap = fullscreen ? 74 : 28; // Leave the fullscreen gallery frame untouched.
    const width = Math.min(224, board.left - gap - 16), height = 72;
    if (viewport.width < 1024 || width < 188 || viewport.height < height + 32 || board.width <= 0) return null;
    return { left: board.left - gap - width, top: Math.max(16, Math.min(viewport.height - height - 16,
        board.top + (board.height - height) / 2)), width };
}

export function createMacroActivity({ board, getText, getLang, readState, document: doc = document }) {
    const win = doc.defaultView, desktop = win.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    const panel = doc.createElement('aside');
    panel.id = 'macroActivity'; panel.className = 'macro-activity'; panel.hidden = true;
    panel.setAttribute('role', 'region');
    const current = doc.createElement('div'); current.className = 'macro-activity-current';
    panel.append(current); doc.body.append(panel);
    let enabled = loadMacroActivity(), active = false, timer = null, entry = null, lastMarkup = '';
    const text = key => getText(key).split('\n')[0];
    function row(item) {
        const row = doc.createElement('div'); row.className = 'macro-activity-row';
        const icon = doc.createElement('span'); icon.className = 'macro-activity-icon'; icon.setAttribute('aria-hidden', 'true');
        const original = doc.getElementById(item.icon)?.querySelector('svg, .glyph, .glyph-dark');
        if (original) {
            const svg = original.cloneNode(true);
            const originals = [original, ...original.querySelectorAll('*')];
            const copies = [svg, ...svg.querySelectorAll('*')];
            for (let i = 0; i < copies.length; i++) {
                const node = copies[i];
                if (i && win.getComputedStyle(originals[i]).display === 'none') { node.remove(); continue; }
                node.removeAttribute('id');
                if (!node.matches('.glyph, .glyph-dark')) node.removeAttribute('class');
                // Current control layout must not hide an informational icon.
                node.style.removeProperty('display');
            }
            icon.append(svg);
        } else icon.textContent = doc.getElementById(item.icon)?.textContent.trim() || '◇';
        const body = doc.createElement('div'), title = doc.createElement('p');
        title.className = 'macro-activity-title'; title.textContent = text(item.label); body.append(title);
        row.append(icon, body); return row;
    }
    function render() {
        const state = readState();
        const place = enabled && active && desktop.matches && entry && state.loaded && state.fullscreen
            ? macroActivityPlacement(board.getBoundingClientRect(), {width: win.innerWidth, height: win.innerHeight}, state.fullscreen) : null;
        panel.hidden = !place;
        if (!place) return;
        Object.assign(panel.style, { left: place.left + 'px', top: place.top + 'px', width: place.width + 'px' });
        panel.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        const signature = JSON.stringify([entry, getLang()]);
        if (signature === lastMarkup) return;
        lastMarkup = signature;
        panel.setAttribute('aria-label', text('macro_activity_setting'));
        current.replaceChildren(row(entry));
    }
    function sync() {
        if (enabled && active && desktop.matches) {
            const state = readState();
            entry = latestMacroActivity(state.queue, state.index - 1, state.simulation);
        }
        if (timer !== null) win.clearInterval(timer);
        timer = enabled && active && desktop.matches ? win.setInterval(render, 100) : null;
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
            if (!enabled || !active || !desktop.matches) return;
            const next = describeMacroActivity(action, readState().simulation);
            if (next) entry = next;
        }
    };
}
