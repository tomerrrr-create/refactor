import { loadToolbarCycle, orderToolbarCycle, persistToolbarCycle } from './toolbar-cycle-storage.js';
import { currentPolygonFlowMode } from './simulations/polygon-circulation.js';

const diagonalModes = ['triangle_gravity', 'triangle_gravity_mirror'];
const centerLineModes = ['horizontal_gravity', 'vertical_gravity'];
const polygonModes = ['radial', 'down'];
const previousModes = [...polygonModes, ...diagonalModes];
export const DEFAULT_GEOMETRIC_FLOW_CYCLE = Object.freeze([centerLineModes[0], diagonalModes[0], centerLineModes[1], diagonalModes[1]]);
export const GEOMETRIC_FLOW_MODES = Object.freeze([...DEFAULT_GEOMETRIC_FLOW_CYCLE, ...polygonModes]);

const STORAGE_KEY = 'colorGridGeometricFlowCycleV2';
const LEGACY_STORAGE_KEY = 'colorGridGeometricFlowCycleV1';
const cycle = ['off', ...GEOMETRIC_FLOW_MODES];

export function orderGeometricFlowModes(modes) {
    return orderToolbarCycle(modes, GEOMETRIC_FLOW_MODES);
}

export function loadGeometricFlowCycle(storage) {
    const saved = loadToolbarCycle(STORAGE_KEY, GEOMETRIC_FLOW_MODES, [], storage);
    if (saved.length) return saved;
    const previous = loadToolbarCycle(LEGACY_STORAGE_KEY, previousModes, diagonalModes, storage, currentPolygonFlowMode);
    return orderGeometricFlowModes([...previous, ...centerLineModes]);
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
