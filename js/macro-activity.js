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
export function describeMacroSignal(action, state) {
    const item=describeMacroActivity(action,state.simulation);
    if(!item||['PLAY','STEP FORWARD'].includes(action.eventName))return null;
    if(action.eventName==='Sort by')return {...item,detail:String(action.details)};
    if(action.eventName==='GRID_RESIZE'){
        const size=Number.parseInt(action.details,10),before=state.boardSize;
        if(!Number.isInteger(before)||!Number.isInteger(size))return null;
        return {...item,detail:before+'×'+before+' → '+size+'×'+size,growing:size>before};
    }
    return item;
}
// A running engine takes precedence over incidental artwork commands.
export function primaryMacroActivity(state, fallback) {
    const definition = state.lifePlaying && simulations[state.simulation];
    return definition ? {label:definition[0],icon:definition[1],key:'PLAY:'+state.simulation} : fallback;
}
// Bounded, transient presentation state; repeated actions share one place.
export function createMacroActivitySignals(now = () => Date.now()) {
    const items = new Map();
    function current() {
        for (const [key,item] of items) if (item.expires <= now()) items.delete(key);
        return [...items.values()];
    }
    return {
        add(item) {
            current();items.delete(item.key);
            items.set(item.key,{...item,expires:now()+1400});
            while(items.size>3)items.delete(items.keys().next().value);
        },
        current,
        clear() {items.clear();}
    };
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
    const width = Math.min(184, viewport.width - 32), height = 32;
    // Desktop/tablet fullscreen has a 50px gallery frame; stay below it.
    const gap = viewport.width >= 768 ? 58 : 20;
    const top = board.top + board.height + gap;
    const left = board.left + (board.width - width) / 2;
    if (!fullscreen || board.width <= 0 || width < 24 || left < 16 || left + width > viewport.width - 16 ||
        top + height > viewport.height - Math.max(12, (viewport.safeBottom || 0) + 8)) return null;
    return {left, top, width};
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
            if (enter) { incoming.replaceChildren(...row.childNodes); incoming.setAttribute('aria-label',row.getAttribute('aria-label')); return; }
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
    const win = doc.defaultView;
    const panel = doc.createElement('aside');
    panel.id = 'macroActivity'; panel.className = 'macro-activity'; panel.hidden = true;
    panel.setAttribute('role', 'region');
    const current = doc.createElement('div'); current.className = 'macro-activity-current';
    const signals = doc.createElement('div'); signals.className = 'macro-activity-signals';
    panel.append(current, signals); doc.body.append(panel);
    const fade = createMacroActivityFade(current), effects = createMacroActivitySignals();
    const signalNodes = new Map();
    let iconCacheKey = '', iconSnapshot = null;
    let enabled = loadMacroActivity(), active = false, finishing = false, timer = null, entry = null, lastMarkup = '';
    const text = key => getText(key).split('\n')[0];
    function row(item, snapshot) {
        const row = doc.createElement('div'); row.className = 'macro-activity-row';
        const icon = doc.createElement('span'); icon.className = 'macro-activity-icon'; icon.setAttribute('aria-hidden', 'true');
        if (snapshot) {
            icon.dataset.sourceIcon = snapshot.sourceId;
            icon.append(installIcon(snapshot));
        } else icon.textContent = doc.getElementById(item.icon)?.textContent.trim() || '◇';
        row.setAttribute('role','img');row.setAttribute('aria-label',text(item.label));
        row.append(icon); return row;
    }
    function render() {
        if (finishing) return; // Retain the last icon while its container fades.
        const state = readState();
        const primary = primaryMacroActivity(state, entry);
        const place = enabled && active && primary && state.loaded && state.fullscreen
            ? macroActivityPlacement(board.getBoundingClientRect(), {width: win.innerWidth, height: win.innerHeight, safeBottom: parseFloat(win.getComputedStyle(panel).getPropertyValue('--activity-safe-bottom')) || 0}, state.fullscreen) : null;
        panel.dataset.placement = 'below';
        panel.hidden = !place;
        if (!place) { fade.clear(); signals.replaceChildren(); signalNodes.clear(); lastMarkup = ''; return; }
        Object.assign(panel.style, { left: place.left + 'px', top: place.top + 'px', width: place.width + 'px' });
        panel.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        const displayEntry = primary.icon === 'btnNudgeBrighter' && ['nudgeBrighter', 'nudgeDarker'].includes(state.simulation)
            ? { ...primary, label: simulations[state.simulation][0] } : primary;
        const button = doc.getElementById(displayEntry.icon);
        const cacheKey = (button?.outerHTML ?? '') + (button ? win.getComputedStyle(button).color : '') + doc.documentElement.dataset.simulationEffectiveTheme;
        if (cacheKey !== iconCacheKey) {
            iconCacheKey = cacheKey; iconSnapshot = captureMacroActivityIcon(button);
        }
        const activeSignals = state.lifePlaying ? effects.current() : [];
        const keys = new Set(activeSignals.map(item=>item.key));
        for(const [key,node] of signalNodes)if(!keys.has(key)){node.remove();signalNodes.delete(key);}
        for(const item of activeSignals){
            let node=signalNodes.get(item.key);
            if(!node){
                node=doc.createElement('span');node.className='macro-activity-signal';node.dataset.action=item.key;
                node.setAttribute('role','img');
                if(item.key==='DRAW_STROKE')node.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4 22 21H2Z"/></svg>';
                else if(item.key==='GRID_RESIZE')node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14'+(item.growing?'M12 5v14':'')+'"/></svg>';
                else if(item.key==='ADAPT_COLORS')node.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="8" y="8" width="8" height="8"/></svg>';
                else {const control=doc.getElementById(item.icon),snapshot=captureMacroActivityIcon(control);if(snapshot)node.append(installIcon(snapshot));else node.textContent=control?.textContent.trim()||'◇';}
                signalNodes.set(item.key,node);signals.append(node);
            }
            // A new sort/resize may use the same slot but a different symbol.
            if(node.dataset.expires!==String(item.expires)){
                const animation=node.getAnimations()[0];
                if(animation&&animation.currentTime>=1000)animation.currentTime=0;
                node.dataset.expires=String(item.expires);
                if(!['DRAW_STROKE','GRID_RESIZE','ADAPT_COLORS'].includes(item.key)){
                    const snapshot=captureMacroActivityIcon(doc.getElementById(item.icon));
                    if(snapshot&&node.dataset.icon!==snapshot.signature){node.replaceChildren(installIcon(snapshot));node.dataset.icon=snapshot.signature;}
                }
            }
            if(node.dataset.detail!==String(item.detail??'')){
                node.dataset.detail=String(item.detail??'');
                if(item.key==='Sort by'){const snapshot=captureMacroActivityIcon(doc.getElementById(item.icon));if(snapshot)node.replaceChildren(installIcon(snapshot));}
                if(item.key==='GRID_RESIZE')node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14'+(item.growing?'M12 5v14':'')+'"/></svg>';

            }
            const translationKey='startup_sort_'+item.detail;
            const translated=item.key==='Sort by'?getText(translationKey):item.detail;
            const detail=translated===translationKey?item.detail:translated;
            const label=text(item.label)+(detail?' · '+detail:'');
            if(node.title!==label){node.title=label;node.setAttribute('aria-label',label);}
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
    return {
        enabled: () => enabled,
        setEnabled(value) {
            enabled = Boolean(value);
            if(!enabled){finishing=false;panel.classList.remove('macro-activity-ending');effects.clear();} saveMacroActivity(enabled);
            sync();
        },
        start() { finishing = false; panel.classList.remove('macro-activity-ending'); active = true; sync(); },
        finish() {
            if (enabled && active) {
                const state = readState();
                entry = latestMacroActivity(state.queue, state.index - 1, state.simulation);
                render();
            }
            finishing = true; active = false; effects.clear();
            if (timer !== null) win.clearInterval(timer);
            timer = null;
            panel.classList.add('macro-activity-ending');
        },
        stop() { finishing = false; panel.classList.remove('macro-activity-ending'); active = false; entry = null; effects.clear(); lastMarkup = ''; sync(); },
        record(action) {
            if (!enabled || !active) return;
            const next = describeMacroActivity(action, readState().simulation);
            if (next) {
                entry = next;
                const signal=describeMacroSignal(action,readState());
                if(signal)effects.add(signal);
            }
        }
    };
}
