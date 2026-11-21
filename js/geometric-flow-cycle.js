import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';
import { currentPolygonFlowMode } from './simulations/polygon-circulation.js';

export const GEOMETRIC_FLOW_MODES = Object.freeze(['radial', 'down', 'triangle_gravity', 'triangle_gravity_mirror']);
export const DEFAULT_GEOMETRIC_FLOW_CYCLE = Object.freeze(['triangle_gravity', 'triangle_gravity_mirror']);

const STORAGE_KEY = 'colorGridGeometricFlowCycleV1';
const cycle = ['off', ...GEOMETRIC_FLOW_MODES];

export function orderGeometricFlowModes(modes) {
    return orderToolbarCycle(modes, GEOMETRIC_FLOW_MODES);
}

export function loadGeometricFlowCycle(storage) {
    return loadToolbarCycle(STORAGE_KEY, GEOMETRIC_FLOW_MODES, DEFAULT_GEOMETRIC_FLOW_CYCLE, storage, currentPolygonFlowMode);
}

export function persistGeometricFlowCycle(modes, storage) {
    persistToolbarCycle(STORAGE_KEY, modes, storage);
}

export function nextGeometricFlowMode(current, enabled, playing) {
    const start = cycle.indexOf(current) + 1;
    for (let offset = 0; offset < cycle.length; offset++) {
        const mode = cycle[(start + offset) % cycle.length];
        if (mode === 'off' ? !playing : enabled.includes(mode)) return mode;
    }
    return 'off';
}
