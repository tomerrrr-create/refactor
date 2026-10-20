export const WIND_SETTINGS_KEY = 'colorGridWindSettingsV1';
export const DEFAULT_WIND_SETTINGS = Object.freeze({ mode: 'ripple', strength: 3, speed: 1, range: 1, colorSpan: 1.25, trail: true });
export const WIND_MODE_SEQUENCE = Object.freeze(['ripple', 'paint', 'displace']);
export function nextWindEffect(mode) {
    return WIND_MODE_SEQUENCE[(WIND_MODE_SEQUENCE.indexOf(mode) + 1) % WIND_MODE_SEQUENCE.length];
}
// Use the actual breathing symbols, keeping geometry and stroke widths identical.
export function createWindModeIcon(mode) {
    const sourceId = mode === 'ripple' ? 'iconBreatheSolo' : mode === 'paint' ? 'iconBreatheRandomColor' : null;
    if (sourceId) {
        const icon = document.getElementById(sourceId).cloneNode(true);
        icon.removeAttribute('id'); icon.style.display = 'block';
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) icon.setAttribute(key, value);
    icon.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="12" cy="12" r="5.5"/>';
    return icon;
}
// The control has a single SVG and a single path for its entire lifetime.
// In particular, Off contains no hidden rectangle from the previous effect.
export function updateWindButtonIcon(button, mode) {
    let icon = button.firstElementChild;
    if (!icon) {
        icon = createWindModeIcon('ripple');
        button.append(icon);
    }
    let d, width;
    if (mode === 'paint') {
        const ellipse = document.getElementById('iconBreatheRandomColor').querySelector('ellipse');
        const [cx, cy, rx, ry] = ['cx', 'cy', 'rx', 'ry'].map(key => Number(ellipse.getAttribute(key)));
        d = `M${cx} ${cy - ry}a${rx} ${ry} 0 1 0 0 ${2 * ry}a${rx} ${ry} 0 1 0 0 ${-2 * ry}`;
        width = document.getElementById('iconBreatheRandomColor').getAttribute('stroke-width');
    } else if (mode === 'displace') {
        d = 'M4 3H20A1 1 0 0 1 21 4V20A1 1 0 0 1 20 21H4A1 1 0 0 1 3 20V4A1 1 0 0 1 4 3Z M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0 -11';
        width = '1.5';
    } else {
        const source = document.getElementById('iconBreatheSolo');
        d = source.querySelector('path').getAttribute('d');
        width = source.getAttribute('stroke-width');
    }
    icon.firstElementChild.setAttribute('d', d);
    icon.setAttribute('stroke-width', width);
    return icon;
}
const WIND_MODES = ['displace', 'paint', 'ripple'];
function normalizeFlatSettings(value) {
    const mode = WIND_MODES.includes(value?.mode) ? value.mode : DEFAULT_WIND_SETTINGS.mode;
    const result = { ...DEFAULT_WIND_SETTINGS, mode, strength: mode === 'ripple' ? 3 : 1 };
    for (const [field, min, max, step] of [['speed', .25, 3, .25], ['range', .15, 1, .05], ['colorSpan', .25, 3, .25], ['strength', .25, mode === 'ripple' ? 10 : 3, .25]]) {
        const item = value?.[field];
        if (typeof item === 'number' && Number.isFinite(item) && item >= min && item <= max &&
            Math.abs(item / step - Math.round(item / step)) < 1e-7) result[field] = item;
    }
    if (WIND_MODES.includes(value?.mode)) result.mode = value.mode;
    if (typeof value?.trail === 'boolean') result.trail = value.trail;
    return result;
}
function modeValues(value, selectedMode) {
    const { mode, ...fields } = normalizeFlatSettings({ ...value, ...(selectedMode ? { mode: selectedMode } : {}) });
    return fields;
}
// Only the original two modes inherit legacy shared preferences from each other.
// Local ripple keeps its own defaults and must not change the other modes.
const modeFallback = (value, mode) => mode === value.mode || (mode !== 'ripple' && value.mode !== 'ripple') ? value : undefined;
export function normalizeWindSettings(value) {
    const flat = normalizeFlatSettings(value);
    if (!value?.modes || typeof value.modes !== 'object') return flat;
    const modes = Object.fromEntries(WIND_MODES.map(mode => [mode, modeValues(value.modes[mode] ?? modeFallback(flat, mode), mode)]));
    return { ...modes[flat.mode], mode: flat.mode, modes };
}
// Migrate old shared settings once, preserving both original modes. New local
// ripples start at defaults. Subsequent edits belong only to the selected mode.
export function selectWindMode(value, mode) {
    const current = normalizeWindSettings(value);
    const modes = current.modes ?? Object.fromEntries(WIND_MODES.map(key => [key, modeValues(modeFallback(current, key), key)]));
    const selected = WIND_MODES.includes(mode) ? mode : current.mode;
    return { ...modes[selected], mode: selected, modes };
}
export function loadWindSettings(storage) {
    try { return normalizeWindSettings(JSON.parse((storage ?? localStorage).getItem(WIND_SETTINGS_KEY))); }
    catch { return { ...DEFAULT_WIND_SETTINGS }; }
}
export function saveWindSettings(settings, storage) {
    try { (storage ?? localStorage).setItem(WIND_SETTINGS_KEY, JSON.stringify(normalizeWindSettings(settings))); return true; }
    catch { return false; }
}

export function createWindSettingsDialog({ getText, getLang, onLanguageChange, getSettings, onSave, onOpen, trigger }) {
    const dialog = document.createElement('dialog');
    dialog.id = 'windSettingsDialog'; dialog.className = 'erosion-settings-dialog evolution-tuning-dialog wind-settings-dialog';
    dialog.setAttribute('aria-labelledby', 'windSettingsTitle');
    dialog.innerHTML = `<form><button type="button" class="modal-dismiss" data-close>×</button>
        <h2 id="windSettingsTitle"></h2><div class="wind-mode-field"><span id="windModeLabel"></span><div id="windModeButtons" class="tuning-modes wind-mode-buttons" role="group" aria-labelledby="windModeLabel"></div><p></p></div><div class="wind-settings-fields"></div>
        <div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div></form>`;
    document.body.append(dialog);
    let draft = null;
    const modeGroup = dialog.querySelector('#windModeButtons');
    for (const mode of WIND_MODE_SEQUENCE) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.mode = mode;
        button.append(createWindModeIcon(mode));
        button.addEventListener('click', () => { if (draft) { draft = selectWindMode(draft, mode); render(); } });
        modeGroup.append(button);
    }
    const fields = new Map();
    for (const [field, min, max, step] of [['speed', .25, 3, .25], ['range', .15, 1, .05], ['colorSpan', .25, 3, .25], ['strength', .25, 3, .25], ['trail']]) {
        const row = document.createElement('div'); row.className = 'wind-settings-field';
        row.innerHTML = `<label for="wind_${field}"></label><output for="wind_${field}"></output><input id="wind_${field}"/><p id="wind_${field}_note"></p>`;
        const input = row.querySelector('input'); input.type = field === 'trail' ? 'checkbox' : 'range';
        if (field !== 'trail') Object.assign(input, { min, max, step });
        input.setAttribute('aria-describedby', `wind_${field}_note`);
        input.addEventListener('input', () => { if (draft) { draft[field] = field === 'trail' ? input.checked : Number(input.value); draft.modes[draft.mode][field] = draft[field]; render(); } });
        fields.set(field, { row, input }); dialog.querySelector('.wind-settings-fields').append(row);
    }
    function render() {
        dialog.dir = getLang() === 'he' ? 'rtl' : 'ltr';
        dialog.querySelector('h2').textContent = getText('wind_settings');
        dialog.querySelector('[data-close]').setAttribute('aria-label', getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent = getText('evolution_reset_default');
        dialog.querySelector('[data-cancel]').textContent = getText('gs_modal_cancel');
        dialog.querySelector('[type=submit]').textContent = getText('gs_modal_save_close');
        dialog.querySelector('#windModeLabel').textContent = getText('wind_mode');
        for (const button of modeGroup.children) {
            const label = getText('wind_mode_' + button.dataset.mode);
            button.title = label; button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(button.dataset.mode === draft?.mode));
        }
        if (draft) {
            dialog.querySelector('.wind-mode-field p').textContent = getText('wind_mode_' + draft.mode + '_note') + ' ' + getText('wind_mode_settings_note');
        }
        for (const [field, { row, input }] of fields) {
            row.hidden = Boolean(draft && (field === 'colorSpan' && draft.mode !== 'paint' || field === 'strength' && draft.mode === 'paint'));
            input.disabled = row.hidden;
            row.querySelector('label').textContent = getText('wind_' + field);
            row.querySelector('p').textContent = getText('wind_' + field + '_note');
            if (!draft) continue;
            if (field === 'trail') { input.checked = draft.trail; row.querySelector('output').hidden = true; }
            else {
                if (field === 'strength') input.max = draft.mode === 'ripple' ? '10' : '3';
                input.value = draft[field];
                const text = field === 'colorSpan' ? `${draft[field]}×` : `${Math.round(draft[field] * 100)}%`;
                row.querySelector('output').value = text; input.setAttribute('aria-valuetext', text);
            }
        }
    }
    const close = () => dialog.close();
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.querySelector('[data-cancel]').addEventListener('click', close);
    dialog.querySelector('[data-reset]').addEventListener('click', () => { draft.modes[draft.mode] = modeValues(undefined, draft.mode); Object.assign(draft, draft.modes[draft.mode]); render(); });
    dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); onSave(normalizeWindSettings(draft)); close(); });
    dialog.addEventListener('close', () => { if (!dialog.open) { draft = null; if (trigger.isConnected) trigger.focus({ preventScroll: true }); } });
    const outside = event => { const r = dialog.getBoundingClientRect(); return event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom); };
    let startedOutside = false;
    dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    dialog.addEventListener('click', event => { if (startedOutside && outside(event)) close(); startedOutside = false; });
    onLanguageChange(render);
    return { dialog, open() { if (dialog.open) return; onOpen(); draft = selectWindMode(getSettings()); render(); dialog.showModal(); fields.get('speed').input.focus(); } };
}
