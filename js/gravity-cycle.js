import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';

export const LINE_GRAVITY_MODES = Object.freeze(['horizontal_gravity', 'vertical_gravity', 'triangle_gravity', 'triangle_gravity_mirror']);
const PREVIOUS_DEFAULT_CYCLE = ['up', 'right', 'center_x', 'pinwheel'];
export const DEFAULT_GRAVITY_CYCLE = Object.freeze(['up', 'right', ...LINE_GRAVITY_MODES, 'center_x', 'pinwheel']);
export const GRAVITY_MODES = Object.freeze([...DEFAULT_GRAVITY_CYCLE, 'reverse_up', 'reverse_right']);
export const GRAVITY_CYCLE_VERSION = 2;
export const GRAVITY_DIRECTIONS = Object.freeze([...GRAVITY_MODES, 'down', 'left', 'radial', 'vortex', 'turbine2', 'black_hole']);
const STORAGE_KEY = 'colorGridGravityCycleV2';
const cycle = ['off', ...GRAVITY_MODES];

export function migrateGravityCycle(gravity = PREVIOUS_DEFAULT_CYCLE, geometric = LINE_GRAVITY_MODES) {
    return orderToolbarCycle([...gravity, ...geometric.filter(mode => LINE_GRAVITY_MODES.includes(mode))], GRAVITY_MODES);
}

export function loadLegacyGeometricFlowCycle(storage) {
    const saved = loadToolbarCycle('colorGridGeometricFlowCycleV2', [...LINE_GRAVITY_MODES, 'radial', 'down'], [], storage);
    if (saved.length) return saved;

    const diagonals = ['triangle_gravity', 'triangle_gravity_mirror'];
    const legacy = loadToolbarCycle('colorGridGeometricFlowCycleV1', ['radial', 'down', ...diagonals], diagonals, storage,
        mode => ['triangle', 'triangle_orbit', 'triangle_flow'].includes(mode) ? 'triangle_gravity' : mode);
    return ['horizontal_gravity', 'vertical_gravity', ...legacy];
}

export function loadGravityCycle(storage) {
    const saved = loadToolbarCycle(STORAGE_KEY, GRAVITY_MODES, [], storage);
    if (saved.length) return saved;
    const gravity = loadToolbarCycle('colorGridGravityCycleV1', GRAVITY_MODES, PREVIOUS_DEFAULT_CYCLE, storage);
    return migrateGravityCycle(gravity, loadLegacyGeometricFlowCycle(storage));
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
