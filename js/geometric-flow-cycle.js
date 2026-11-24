import { loadLegacyGeometricFlowCycle } from './gravity-cycle.js';
import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';

export const GEOMETRIC_FLOW_MODES = Object.freeze(['radial', 'down']);
export const DEFAULT_GEOMETRIC_FLOW_CYCLE = GEOMETRIC_FLOW_MODES;

const STORAGE_KEY = 'colorGridGeometricFlowCycleV3';
const cycle = ['off', ...GEOMETRIC_FLOW_MODES];

export function orderGeometricFlowModes(modes) {
    return orderToolbarCycle(modes, GEOMETRIC_FLOW_MODES);
}

export function loadGeometricFlowCycle(storage) {
    const saved = loadToolbarCycle(STORAGE_KEY, GEOMETRIC_FLOW_MODES, [], storage);
    if (saved.length) return saved;
    const remaining = orderGeometricFlowModes(loadLegacyGeometricFlowCycle(storage));
    return remaining.length ? remaining : [...DEFAULT_GEOMETRIC_FLOW_CYCLE];
}

export function persistGeometricFlowCycle(modes, storage) {
    persistToolbarCycle(STORAGE_KEY, modes, storage);
}

export function nextGeometricFlowMode(current, enabled, playing) {
    const start = Math.max(1, cycle.indexOf(current) + 1);
    for (let offset = 0; offset < cycle.length; offset++) {
        const mode = cycle[(start + offset) % cycle.length];
        if (mode === 'off' ? !playing : enabled.includes(mode)) return mode;
    }
    return 'off';
}
