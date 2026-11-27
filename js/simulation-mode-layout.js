import { DEFAULT_GRAVITY_CYCLE, GRAVITY_MODES } from './gravity-cycle.js';
import { DEFAULT_GEOMETRIC_FLOW_CYCLE, GEOMETRIC_FLOW_MODES } from './geometric-flow-cycle.js';
import { DEFAULT_VORTICES_CYCLE, VORTICES_MODES } from './vortices-modes.js';

export const MODE_LAYOUT_KEY = 'colorGridSimulationModeLayoutV1';
export const MODE_FAMILIES = {
    gravitationalSort: { label: 'gs_modal_title', button: 'btnGravitationalSort', modes: GRAVITY_MODES, cycle: DEFAULT_GRAVITY_CYCLE },
    spiral: { label: 'spiral_modal_title', button: 'btnSpiral', modes: GEOMETRIC_FLOW_MODES, cycle: DEFAULT_GEOMETRIC_FLOW_CYCLE },
    ink: { label: 'vortices_cycle_title', button: 'btnInk', modes: Object.keys(VORTICES_MODES), cycle: DEFAULT_VORTICES_CYCLE }
};
export const MODE_FAMILY_IDS = Object.keys(MODE_FAMILIES);
const gravityIcons = ['Up', 'Right', 'Horizontal', 'Vertical', 'Diagonal', 'DiagonalMirror', 'CenterX', 'Pinwheel', 'ReverseUp', 'ReverseRight'];
const gravityLabels = {
    horizontal_gravity: 'spiral_horizontal', vertical_gravity: 'spiral_vertical',
    triangle_gravity: 'spiral_diagonal', triangle_gravity_mirror: 'spiral_diagonal_mirror',
    center_x: 'gs_direction_center_x', pinwheel: 'spiral_b'
};
export const LAYOUT_MODES = new Map([
    ...GRAVITY_MODES.map((id, index) => [id, { origin: 'gravitationalSort', label: gravityLabels[id] ?? 'gs_direction_' + id, selector: '#iconGs' + gravityIcons[index] }]),
    ['radial', { origin: 'spiral', label: 'spiral_radial', selector: '#iconSpiralRadial' }],
    ['down', { origin: 'spiral', label: 'spiral_down', selector: '#iconSpiralDown' }],
    ...Object.entries(VORTICES_MODES).map(([id, { label }]) => [id, {
        origin: 'ink', label, selector: '#btnInk [data-vortices-icon="' + (id === 'tornado' ? 'flow' : id) + '"]'
    }])
]);

export function createModeLayout(cycles = {}) {
    return { version: 1, families: Object.fromEntries(MODE_FAMILY_IDS.map(id => {
        const family = MODE_FAMILIES[id];
        const enabled = cycles[id] ?? family.cycle;
        return [id, family.modes.map(mode => ({ id: mode, inCycle: enabled.includes(mode) }))];
    })) };
}

export function validateModeLayout(value) {
    if (value?.version !== 1 || !value.families || Object.keys(value.families).length !== MODE_FAMILY_IDS.length) return null;
    const seen = new Set();
    const families = {};
    for (const family of MODE_FAMILY_IDS) {
        const entries = value.families[family];
        if (!Array.isArray(entries) || entries.length > LAYOUT_MODES.size) return null;
        const modes = [];
        for (const entry of entries) {
            if (!LAYOUT_MODES.has(entry?.id) || typeof entry.inCycle !== 'boolean' || seen.has(entry.id)) return null;
            seen.add(entry.id);
            modes.push({ id: entry.id, inCycle: entry.inCycle });
        }
        families[family] = modes;
    }
    return seen.size === LAYOUT_MODES.size ? { version: 1, families } : null;
}

export function loadModeLayout(storage) {
    try {
        return validateModeLayout(JSON.parse((storage ?? localStorage).getItem(MODE_LAYOUT_KEY)));
    } catch {
        return null;
    }
}

export function nextLayoutMode(entries, current, remembered, playing) {
    const enabled = entries.filter(entry => entry.inCycle).map(entry => entry.id);
    if (!enabled.length) return undefined;
    if (!current) return enabled.includes(remembered) ? remembered : enabled[0];
    const position = entries.findIndex(entry => entry.id === current);
    const next = entries.slice(position + 1).find(entry => entry.inCycle);
    return next?.id ?? (playing ? enabled[0] : 'off');
}

export function modeLayoutIcon(mode) {
    const metadata = LAYOUT_MODES.get(mode);
    if (!metadata) return null;
    const svg = document.querySelector(metadata.selector);
    if (!svg) return null;
    const copy = svg.cloneNode(true);
    copy.removeAttribute('id');
    copy.removeAttribute('data-vortices-icon');
    copy.style.removeProperty('display');
    const badge = copy.querySelector('.vortices-tornado-badge');
    if (mode === 'tornado') badge?.classList.remove('vortices-tornado-badge');
    else badge?.remove();
    copy.setAttribute('aria-hidden', 'true');
    return copy;
}
