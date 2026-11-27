// The toolbar groups existing engines without changing their recording IDs.
export const VORTICES_MODES = Object.freeze({
    turbine2: {engine:'gravitationalSort', label:'spiral_turbine2'},
    flow: {engine:'ink', label:'help_ink'},
    left: {engine:'spiral', label:'spiral_left'},
    cosmic: {engine:'cymatics', label:'cymatics_map_cosmic', map:6},
    black_hole: {engine:'gravitationalSort', label:'spiral_black_hole'},
    a: {engine:'spiral', label:'spiral_a'},
    circular: {engine:'cymatics', label:'cymatics_map_circular', map:3},
    tornado: {engine:'spiral', label:'spiral_tornado'}
});
export const VORTICES_CYCLE = Object.freeze(['off', ...Object.keys(VORTICES_MODES)]);
export const VORTICES_RESONANCE_MAPS = Object.freeze(['cosmic', 'circular']);
export const VORTICES_SETTINGS_ENTRY_MODES = Object.freeze(
    Object.keys(VORTICES_MODES).filter(mode => mode !== 'flow' && !VORTICES_RESONANCE_MAPS.includes(mode))
);
export const RESONANCE_MAPS = Object.freeze(['interference', 'heart', 'grid', 'diagonal', 'clouds']);

const cycleStorageKey = 'colorGridVorticesCycleV1';
export const DEFAULT_VORTICES_CYCLE = Object.freeze(Object.keys(VORTICES_MODES).filter(mode => mode !== 'a' && mode !== 'tornado'));

export function loadVorticesCycle() {
    try {
        const stored = JSON.parse(localStorage.getItem(cycleStorageKey));
        if (Array.isArray(stored) && VORTICES_SETTINGS_ENTRY_MODES.some(mode => stored.includes(mode))) {
            return Object.keys(VORTICES_MODES).filter(mode => stored.includes(mode));
        }
    } catch {
        // Use the default cycle if browser storage is unavailable or invalid.
    }
    return [...DEFAULT_VORTICES_CYCLE];
}

export function persistVorticesCycle(enabledModes) {
    try {
        localStorage.setItem(cycleStorageKey, JSON.stringify(enabledModes));
    } catch {
        // The selection remains active for this session.
    }
}

export function nextVorticesMode(current, enabledModes, playing) {
    const start = VORTICES_CYCLE.indexOf(current) + 1;
    const ordered = [...VORTICES_CYCLE.slice(start), ...VORTICES_CYCLE.slice(0, start)];
    return ordered.find(mode => mode === 'off' ? !playing : enabledModes.includes(mode));
}

export function vorticesModeFor(engine, mode) {
    if (engine === 'ink') return 'flow';
    if (engine === 'cymatics') return VORTICES_RESONANCE_MAPS.find(name => VORTICES_MODES[name].map === mode);
    return Object.hasOwn(VORTICES_MODES, mode) && VORTICES_MODES[mode].engine === engine ? mode : undefined;
}
