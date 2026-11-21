import { EVOLUTION_CATALOG } from './evolution-drawer-settings.js';
import { CYMATICS_RESONANCE_MAPS } from './cymatics-settings.js';
import { VORTICES_MODES, RESONANCE_MAPS } from './vortices-modes.js';

// The original owner is part of each stable mode ID; toolbar reassignment only changes the layout.
const modes = {
    gravitationalSort: [
        ['up', 'gs_direction_up', '#iconGsUp'], ['right', 'gs_direction_right', '#iconGsRight'], ['center_x', 'gs_direction_center_x', '#iconGsCenterX'],
        ['reverse_up', 'gs_direction_reverse_up', '#iconGsReverseUp'], ['reverse_right', 'gs_direction_reverse_right', '#iconGsReverseRight'],
        ['pinwheel', 'spiral_b', '#iconGsPinwheel']
    ],
    spiral: [
        ['radial', 'spiral_radial', '#iconSpiralRadial'], ['down', 'spiral_down', '#iconSpiralDown'],
        ['triangle_gravity', 'spiral_diagonal', '#iconSpiralDiagonal'],
        ['triangle_gravity_mirror', 'spiral_diagonal_mirror', '#iconSpiralDiagonalMirror'],
        ['horizontal_gravity', 'spiral_horizontal', '#iconSpiralHorizontal'],
        ['vertical_gravity', 'spiral_vertical', '#iconSpiralVertical']
    ],
    ink: Object.entries(VORTICES_MODES).map(([value, { label }]) => [value, label, `[data-vortices-icon="${value === 'tornado' ? 'flow' : value}"]`]),
    cymatics: RESONANCE_MAPS.map(map => [CYMATICS_RESONANCE_MAPS[map], 'cymatics_map_' + map, `[data-cymatics-map-icon="${map}"]`]),
    magnet: [
        ['field_magnet', 'magnet_method_field_magnet', '#iconModeFieldMagnet'],
        ['field_cosmic_magnet', 'magnet_method_field_cosmic_magnet', '#iconModeFieldCosmicMagnet'],
        ['magnet', 'magnet_method_magnet', '#iconModeMagnet'], ['cosmic_magnet', 'magnet_method_cosmic_magnet', '#iconModeCosmicMagnet'],
        ['time_magnet', 'magnet_method_time_magnet', '#iconModeTimeMagnet'], ['expand', 'magnet_method_expand', '#iconModeExpand']
    ],
    gameOfLife: [['personal', '1'], ['shuffle', '2'], ['coral', '3']],
    sandpile: [['personal', '1'], ['ripples', '2'], ['nova', '3']],
    brightnessEvo: [['brightness', 'tuning_mode_brightness'], ['contrast', 'tuning_mode_contrast']],
    islands: [['classic', 'tooltip_islands', '#iconIslands'], ['oil', 'tooltip_islands_oil', '#iconIslandsOil']],
    erosion: [
        ['channels', 'erosion_channels', '#iconErosionChannels'], ['channels-solid', 'erosion_solid', '#iconErosionSolid'],
        ['legacy', 'erosion_legacy', '#iconErosionLegacy']
    ],
    network: [['spatial', 'network_mode_spatial', '.network-spatial-icon'], ['palette', 'network_mode_palette', '.network-palette-icon']],
    breathe: [
        ['solo', 'breatheModal_solo', '#iconBreatheSolo'], ['group', 'breatheModal_group', '#iconBreatheGroup'],
        ['random-cell', 'families_random_cells', '#iconBreatheRandomCell'], ['random-color', 'families_random_colors', '#iconBreatheRandomColor']
    ],
    contour: [['all', 'cracks_area_all'], ['dead', 'cracks_area_dead']],
    dla: [['genetics', 'families_genetics'], ['no-genetics', 'families_no_genetics']],
    nudgeBrighter: [['nudgeBrighter', 'help_nudge_forward'], ['nudgeDarker', 'help_nudge_backward']],
    turing: [['turing', 'help_turing']]
};

export const SIMULATION_MODES = new Map(EVOLUTION_CATALOG.flatMap(({ id, button }) =>
    modes[id].map(([value, label, icon]) => {
        const key = id + ':' + value;
        return [key, Object.freeze({ key, family: id, value, label, icon: icon ?? '#' + button + ' > svg' })];
    })
));

export function defaultSimulationFamilies(cycles = {}) {
    return {
        enabled: false,
        families: EVOLUTION_CATALOG.map(({ id }) => {
            const available = modes[id].map(([mode]) => mode);
            const inCycle = cycles[id] ?? (id === 'magnet' ? available.slice(0, 4) : available);
            const order = [...inCycle, ...available.filter(mode => !inCycle.includes(mode))];
            return { id, modes: order.map(value => ({ id: id + ':' + value, inCycle: inCycle.includes(value) })) };
        })
    };
}

export function validateSimulationFamilies(value) {
    if (typeof value?.enabled !== 'boolean' || !Array.isArray(value.families) || value.families.length !== EVOLUTION_CATALOG.length) {
        throw new Error('Invalid simulation families');
    }
    const familyIds = new Set(EVOLUTION_CATALOG.map(({ id }) => id)), assigned = new Set();
    const families = value.families.map(family => {
        if (!familyIds.delete(family?.id) || !Array.isArray(family.modes)) throw new Error('Invalid simulation family');
        for (const key of ['name', 'label']) {
            if (family[key] !== undefined && (typeof family[key] !== 'string' || !family[key].trim() || family[key].length > 100)) {
                throw new Error('Invalid simulation family name');
            }
        }
        return { id: family.id, ...(family.name ? { name: family.name.trim() } : {}),
            ...(family.label ? { label: family.label } : {}), modes: family.modes.map(mode => {
            if (!SIMULATION_MODES.has(mode?.id) || assigned.has(mode.id) || typeof mode.inCycle !== 'boolean') {
                throw new Error('Invalid simulation mode assignment');
            }
            assigned.add(mode.id);
            if (mode.label !== undefined && (typeof mode.label !== 'string' || mode.label.length > 160)) {
                throw new Error('Invalid simulation mode label');
            }
            return { id: mode.id, inCycle: mode.inCycle, ...(mode.label ? { label: mode.label } : {}) };
        }) };
    });
    if (assigned.size !== SIMULATION_MODES.size) throw new Error('Missing simulation modes');
    return { enabled: value.enabled, families };
}

const STORAGE_KEY = 'colorGridSimulationFamiliesV1';
export function loadSimulationFamilies(storage = globalThis.localStorage) {
    try { return validateSimulationFamilies(JSON.parse(storage.getItem(STORAGE_KEY))); }
    catch { return null; }
}
export function saveSimulationFamilies(value, storage = globalThis.localStorage) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; }
    catch { return false; }
}

export function nextFamilyMode(modes, selected, playing, remembered) {
    const cycle = modes.filter(mode => mode.inCycle).map(mode => mode.id);
    const index = cycle.indexOf(selected);
    if (index < 0) return cycle.includes(remembered) ? remembered : cycle[0];
    return cycle[index + 1] ?? (playing ? cycle[0] : undefined);
}

// Native settings edit only the modes they know about in the current toolbar family.
export function familyCycleFor(group, origin) {
    if (!group) return null;
    const entries = group.modes.map(item => ({ mode: SIMULATION_MODES.get(item.id), inCycle: item.inCycle }))
        .filter(entry => entry.mode.family === origin);
    return {
        available: entries.map(entry => entry.mode.value),
        enabled: entries.filter(entry => entry.inCycle).map(entry => entry.mode.value)
    };
}

export function updateFamilyCycle(layout, groupId, origin, enabled) {
    return { ...layout, families: layout.families.map(group => group.id !== groupId ? group : {
        ...group, modes: group.modes.map(item => {
            const mode = SIMULATION_MODES.get(item.id);
            return mode.family === origin ? { ...item, inCycle: enabled.includes(mode.value) } : item;
        })
    }) };
}
