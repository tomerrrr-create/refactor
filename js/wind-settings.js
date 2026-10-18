export const WIND_SETTINGS_KEY = 'colorGridWindSettingsV1';
export const DEFAULT_WIND_SETTINGS = Object.freeze({ mode: 'displace', strength: 1, speed: 1, range: 1, colorSpan: 1.25, trail: true });
const WIND_MODES = ['displace', 'paint', 'ripple'];
function normalizeFlatSettings(value) {
    const result = { ...DEFAULT_WIND_SETTINGS };
    for (const [field, min, max, step] of [['speed', .25, 3, .25], ['range', .15, 1, .05], ['colorSpan', .25, 3, .25], ['strength', .25, 3, .25]]) {
        const item = value?.[field];
        if (typeof item === 'number' && Number.isFinite(item) && item >= min && item <= max &&
            Math.abs(item / step - Math.round(item / step)) < 1e-7) result[field] = item;
    }
    if (WIND_MODES.includes(value?.mode)) result.mode = value.mode;
    if (typeof value?.trail === 'boolean') result.trail = value.trail;
    return result;
}
function modeValues(value) {
    const { mode, ...fields } = normalizeFlatSettings(value);
    return fields;
}
export function normalizeWindSettings(value) {
    const flat = normalizeFlatSettings(value);
    if (!value?.modes || typeof value.modes !== 'object') return flat;
    const modes = Object.fromEntries(WIND_MODES.map(mode => [mode, modeValues(value.modes[mode] ?? (mode === 'ripple' && flat.mode !== 'ripple' ? undefined : flat))]));
    return { ...modes[flat.mode], mode: flat.mode, modes };
}
// Migrate old shared settings once, preserving both original modes. New local
// ripples start at defaults. Subsequent edits belong only to the selected mode.
export function selectWindMode(value, mode) {
    const current = normalizeWindSettings(value);
    const modes = current.modes ?? Object.fromEntries(WIND_MODES.map(key => [key, modeValues(key === 'ripple' && current.mode !== 'ripple' ? undefined : current)]));
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
        <h2 id="windSettingsTitle"></h2><div class="wind-mode-field"><label for="wind_mode"></label><select id="wind_mode"><option value="displace"></option><option value="paint"></option><option value="ripple"></option></select><p></p></div><div class="wind-settings-fields"></div>
        <div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div></form>`;
    document.body.append(dialog);
    let draft = null;
    const modeInput = dialog.querySelector('#wind_mode');
    modeInput.addEventListener('change', () => { if (draft) { draft = selectWindMode(draft, modeInput.value); render(); } });
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
        dialog.querySelector('.wind-mode-field label').textContent = getText('wind_mode');
        for (const option of modeInput.options) option.textContent = getText('wind_mode_' + option.value);
        if (draft) {
            modeInput.value = draft.mode;
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
                input.value = draft[field];
                const text = field === 'colorSpan' ? `${draft[field]}×` : `${Math.round(draft[field] * 100)}%`;
                row.querySelector('output').value = text; input.setAttribute('aria-valuetext', text);
            }
        }
    }
    const close = () => dialog.close();
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.querySelector('[data-cancel]').addEventListener('click', close);
    dialog.querySelector('[data-reset]').addEventListener('click', () => { draft.modes[draft.mode] = modeValues(DEFAULT_WIND_SETTINGS); Object.assign(draft, draft.modes[draft.mode]); render(); });
    dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); onSave(normalizeWindSettings(draft)); close(); });
    dialog.addEventListener('close', () => { if (!dialog.open) { draft = null; if (trigger.isConnected) trigger.focus({ preventScroll: true }); } });
    const outside = event => { const r = dialog.getBoundingClientRect(); return event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom); };
    let startedOutside = false;
    dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    dialog.addEventListener('click', event => { if (startedOutside && outside(event)) close(); startedOutside = false; });
    onLanguageChange(render);
    return { dialog, open() { if (dialog.open) return; onOpen(); draft = selectWindMode(getSettings()); render(); dialog.showModal(); fields.get('speed').input.focus(); } };
}
