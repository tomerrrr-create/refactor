import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';
import { currentPolygonFlowMode } from './simulations/polygon-circulation.js';

export const GEOMETRIC_FLOW_MODES = Object.freeze(['radial', 'down', 'triangle_gravity', 'square_flow', 'triangle_weave']);

const STORAGE_KEY = 'colorGridGeometricFlowCycleV1';
const cycle = ['off', ...GEOMETRIC_FLOW_MODES];

export function orderGeometricFlowModes(modes) {
    return orderToolbarCycle(modes, GEOMETRIC_FLOW_MODES);
}

export function loadGeometricFlowCycle(storage) {
    return loadToolbarCycle(STORAGE_KEY, GEOMETRIC_FLOW_MODES, GEOMETRIC_FLOW_MODES, storage, currentPolygonFlowMode);
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
