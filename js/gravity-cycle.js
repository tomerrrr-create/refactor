import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';

export const GRAVITY_MODES = Object.freeze(['up', 'right', 'center_x', 'reverse_up', 'reverse_right', 'pinwheel']);
export const DEFAULT_GRAVITY_CYCLE = Object.freeze(['up', 'right', 'center_x', 'pinwheel']);
export const GRAVITY_DIRECTIONS = Object.freeze([...GRAVITY_MODES, 'down', 'left', 'radial', 'vortex', 'turbine2', 'black_hole']);
const STORAGE_KEY = 'colorGridGravityCycleV1';
const cycle = ['off', ...GRAVITY_MODES];

export function loadGravityCycle(storage) {
    return loadToolbarCycle(STORAGE_KEY, GRAVITY_MODES, DEFAULT_GRAVITY_CYCLE, storage);
}

export function saveGravityCycle(modes, storage) {
    const ordered = orderToolbarCycle(modes, GRAVITY_MODES);
    if (ordered.length) persistToolbarCycle(STORAGE_KEY, ordered, storage);
    return ordered;
}

export function nextGravityMode(current, enabled, playing) {
    const start = cycle.indexOf(current) + 1;
    const ordered = [...cycle.slice(start), ...cycle.slice(0, start)];
    return ordered.find(mode => mode === 'off' ? !playing : enabled.includes(mode));
}
