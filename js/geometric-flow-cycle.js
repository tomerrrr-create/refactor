export const GEOMETRIC_FLOW_MODES = Object.freeze(['radial', 'down', 'triangle_flow', 'square_flow', 'triangle_weave']);

const STORAGE_KEY = 'colorGridGeometricFlowCycleV1';
const cycle = ['off', ...GEOMETRIC_FLOW_MODES];

export function orderGeometricFlowModes(modes) {
    return Array.isArray(modes) ? GEOMETRIC_FLOW_MODES.filter(mode => modes.includes(mode)) : [];
}

export function loadGeometricFlowCycle(storage) {
    try {
        const enabled = orderGeometricFlowModes(JSON.parse((storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY)));
        if (enabled.length) return enabled;
    } catch { /* Use the default cycle. */ }
    return [...GEOMETRIC_FLOW_MODES];
}

export function persistGeometricFlowCycle(modes, storage) {
    try { (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(modes)); }
    catch { /* Use the selection for this session. */ }
}

export function nextGeometricFlowMode(current, enabled, playing) {
    const start = cycle.indexOf(current) + 1;
    for (let offset = 0; offset < cycle.length; offset++) {
        const mode = cycle[(start + offset) % cycle.length];
        if (mode === 'off' ? !playing : enabled.includes(mode)) return mode;
    }
    return 'off';
}
