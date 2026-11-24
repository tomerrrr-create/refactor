import { GRAVITY_DIRECTIONS, GRAVITY_MODES, DEFAULT_GRAVITY_CYCLE } from './gravity-cycle.js';
import {DEFAULT_NETWORK_PREFERENCES,validateNetworkRules} from './simulations/network.js';
import {INITIAL_OIL_RULES,validateOilRules} from './simulations/oil.js';
import {DEFAULT_INK_PREFERENCES,validateInkRules} from './simulations/ink.js';
import {INITIAL_CYMATICS_RULES,migrateCymaticsPreferences,validateCymaticsFrequencies,validateCymaticsStrengths} from './cymatics-settings.js';
import {validateEvolutionSlots} from './evolution-drawer-settings.js';
import {validateContourActionRules} from './contour-action-settings.js';
import { CONTOUR_LINE_COLORS, DEFAULT_CRACKS_MATERIAL, validateCracksMaterial, DEFAULT_CRACKS_GROWTH, validateCracksGrowth } from './cracks-settings.js';
import { BRUSH_SIZES, BRUSH_SHAPES, normalizeBrushSize } from './brush-footprint.js';
import { validateEvolutionTuning } from './evolution-tuning.js';
import { normalizeSeparatorCycle } from './separator-cycle.js';
import { isSimulationTheme } from './simulation-theme.js';
import * as C from './constants.js';
import { EROSION_MODES, validErosionStages } from './erosion-settings.js';
import { DEFAULT_STARTUP, normalizeStartup } from './startup-settings.js';
import { DEFAULT_SIM_INIT, validateSimInit } from './sim-init-settings.js';
import { DEFAULT_SORT_CYCLE, normalizeSortCycle } from './sort-cycle-settings.js';
import { CHI_REACH_PERCENTAGES } from './chi-reach.js';
import { POLYGON_CIRCULATION_MODES } from './simulations/polygon-circulation.js';

import { GEOMETRIC_FLOW_MODES, DEFAULT_GEOMETRIC_FLOW_CYCLE } from './geometric-flow-cycle.js';
import { RESONANCE_CYCLE_VERSIONS, DEFAULT_RESONANCE_CYCLE } from './resonance-cycle.js';
import { DEFAULT_VORTICES_CYCLE, VORTICES_MODES, VORTICES_SETTINGS_ENTRY_MODES } from './vortices-modes.js';
import { orderToolbarCycle } from './toolbar-cycle-storage.js';
import { MAGNET_ANCHOR_LIMITS, DEFAULT_MAGNET_ANCHOR_PREFERENCE } from './magnet-anchor-limit.js';
import { normalizeWindSettings } from './wind-settings.js';
import { DEFAULT_GEOMETRIC_FLOW_VISIBLE } from './experimental-simulations.js';

export function defaultSimulationPreferences() {
    return {
        gravityCycle: [...DEFAULT_GRAVITY_CYCLE], geometricFlowCycle: [...DEFAULT_GEOMETRIC_FLOW_CYCLE],
        resonanceCycle: [...DEFAULT_RESONANCE_CYCLE], circularCycle: [...DEFAULT_VORTICES_CYCLE],
        magnetAnchorLimit: DEFAULT_MAGNET_ANCHOR_PREFERENCE, wind: normalizeWindSettings(),
        geometricFlowVisible: DEFAULT_GEOMETRIC_FLOW_VISIBLE, breatheVisible: false, rememberSimulationModes: false
    };
}

function validateSimulationPreferences(value) {
    if (!object(value)) throw new Error('Invalid simulation preferences');
    const result = {};
    for (const [key, modes] of Object.entries({
        gravityCycle: GRAVITY_MODES, geometricFlowCycle: GEOMETRIC_FLOW_MODES,
        resonanceCycle: RESONANCE_CYCLE_VERSIONS, circularCycle: Object.keys(VORTICES_MODES)
    })) {
        if (!Object.hasOwn(value, key)) continue;
        const ordered = orderToolbarCycle(value[key], modes);
        if (!ordered.length || ordered.length !== value[key].length ||
            key === 'circularCycle' && !ordered.some(mode => VORTICES_SETTINGS_ENTRY_MODES.includes(mode))) {
            throw new Error('Invalid simulation cycle: ' + key);
        }
        result[key] = ordered;
    }
    if (Object.hasOwn(value, 'magnetAnchorLimit')) {
        if (!MAGNET_ANCHOR_LIMITS.includes(value.magnetAnchorLimit)) throw new Error('Invalid Magnet anchor limit');
        result.magnetAnchorLimit = value.magnetAnchorLimit;
    }
    if (Object.hasOwn(value, 'wind')) {
        if (!object(value.wind)) throw new Error('Invalid Wind settings');
        result.wind = normalizeWindSettings(value.wind);
    }
    for (const key of ['geometricFlowVisible', 'breatheVisible', 'rememberSimulationModes']) {
        if (!Object.hasOwn(value, key)) continue;
        if (typeof value[key] !== 'boolean') throw new Error('Invalid simulation preference: ' + key);
        result[key] = value[key];
    }
    if (Object.keys(result).length !== Object.keys(value).length) throw new Error('Unknown simulation preference');
    return result;
}

export const SETTINGS_HEADER = 'FYI_SETTINGS_V1';
export const WORKSPACE_STORAGE_KEY = 'colorGridWorkspaceSettings';
const clone = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Version 1's baseline. Bump the file version if this baseline changes.
export function defaultWorkspaceSettings() {
    return clone({ startup: DEFAULT_STARTUP, simulationInit: DEFAULT_SIM_INIT,
        sortCycle: DEFAULT_SORT_CYCLE, nudgeIntervalMs: 100,
        smoothing: { display: false, export: false },
        brush: { size: 1, mode: 'continuous', symmetry: 'off' },
        cycles: { gameOfLife: [C.GAME_OF_LIFE_PRESETS.btnGolPresetPaint, C.GAME_OF_LIFE_PRESETS.btnGolPresetShuffle, C.GAME_OF_LIFE_PRESETS.btnGolPresetCoral],
            chiFlow: [C.defaultChiFlowRules, C.CHI_FLOW_PRESETS.Ripples, C.CHI_FLOW_PRESETS.Nova] },
        rules: { gravity: C.defaultGravitationalSortRules, spiral: C.defaultSpiralRules,
            magnet: C.defaultMagnetRules, erosion: C.defaultErosionRules,
            dla: C.defaultDlaRules, contour: C.defaultContourRules, turing: C.defaultTuringRules } });
}

function mergeKnown(defaults, overrides, path = '') {
    if (!object(overrides)) throw new Error('Invalid settings object');
    const result = clone(defaults);
    for (const [key, value] of Object.entries(overrides)) {
        if (path === '' && key === 'simulationPreferences') { result[key] = validateSimulationPreferences(value); continue; }
        if (path === '' && key === 'contourAction') { result[key] = validateContourActionRules(value); continue; }
        if (path === '' && key === 'cymaticsStrengths') { result[key]=validateCymaticsStrengths(value); continue; }
        if (path === '' && key === 'cymaticsFrequencies') { result[key]=validateCymaticsFrequencies(value); continue; }
        if (path === '' && key === 'evolutionSlots') { result[key] = validateEvolutionSlots(value); continue; }
        if (path === 'rules' && key === 'network') { result[key]=validateNetworkRules(value); continue; }
        if (path === 'rules' && key === 'oil') { result[key]=validateOilRules(value); continue; }
        if (path === 'rules' && key === 'ink') { result[key]=validateInkRules(value); continue; }
        if (path === 'rules' && key === 'cymatics') { result[key] = migrateCymaticsPreferences(value); continue; }
        if (path === 'brush' && key === 'shape') { result[key] = clone(value); continue; }
        // Optional extension; V1’s original baseline stays unchanged.
        if (path === '' && ['simulationTheme', 'simulationPlaybackTheme'].includes(key)) {
            // Retired appearance IDs remain readable in older profiles/settings.
            result[key] = ['silver', 'ice', 'pink', 'graphite', 'graphite-edge', 'graphite-dust', 'deep-blue'].includes(value)
                ? (key === 'simulationTheme' ? 'blue' : 'gold') : clone(value);
            continue;
        }
        if (path === '' && ['separatorCycle', 'evolutionTuning', 'evolutionSelections', 'gameOfLifeGenetics', 'gameOfLifeDeadColor'].includes(key)) { result[key] = clone(value); continue; }
        if (path === 'simulationInit' && ['symmetry', 'brushColor'].includes(key)) { result[key] = clone(value); continue; }
        if (path === 'smoothing' && ['bloom', 'bloomIntensity'].includes(key)) { result[key] = clone(value); continue; }
        if (path === 'rules.magnet' && key === 'anchorColor') { result[key] = clone(value); continue; }
        if (path === 'rules.contour' && key === 'growth') { result[key] = validateCracksGrowth(value); continue; }
        if (path === 'rules.contour' && key === 'material') { result[key] = validateCracksMaterial(value); continue; }
        if (path === 'rules.erosion' && ['erosionEvents', 'erosionPace', 'erosionStages'].includes(key)) { result[key] = clone(value); continue; }
        if (!Object.hasOwn(defaults, key)) throw new Error('Unknown settings field: ' + key);
        result[key] = object(defaults[key]) ? mergeKnown(defaults[key], value, path ? path + '.' + key : key) : clone(value);
    }
    return result;
}
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const number = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
function validCycle(slots, chi) {
    return Array.isArray(slots) && slots.length === 3 && slots.every(rules => {
        if (!object(rules)) return false;
        const fields = chi ? ['awakening', 'flow', 'reach', 'reachOffset', 'reachPercent'] : ['survival', 'birth'];
        if (Object.keys(rules).some(key => !fields.includes(key))) return false;
        const arrays = chi ? ['awakening', 'flow'] : ['survival', 'birth'];
        if (!arrays.every(key => Array.isArray(rules[key]) && rules[key].every(n => integer(n, chi ? 1 : 0, 8)))) return false;
        return !chi || Number.isSafeInteger(rules.reach) && rules.reach >= 0 &&
            (!Object.hasOwn(rules, 'reachOffset') || integer(rules.reachOffset, -10, 10)) &&
            (!Object.hasOwn(rules, 'reachPercent') || CHI_REACH_PERCENTAGES.includes(rules.reachPercent));
    });
}

// Read compatibility for the removed swipe feature. Keep the saved active
// choice by folding it into its existing shortcut; new saves use ordinary slots.
export function migrateEvolutionSelections(settings, indices = {}) {
    if (!settings.evolutionSelections) return settings;
    const result = clone(settings);
    for (const [name, rules] of Object.entries(result.evolutionSelections)) {
        const index = integer(indices[name], 0, 2) ? indices[name] : 0;
        result.cycles[name][index] = clone(rules);
    }
    delete result.evolutionSelections;
    return result;
}

export function validateWorkspaceSettings(value) {
    const settings = mergeKnown(defaultWorkspaceSettings(), value);
    settings.brush.size = normalizeBrushSize(settings.brush.size);
    settings.startup.brushSize = normalizeBrushSize(settings.startup.brushSize);
    settings.simulationInit.brushSize = normalizeBrushSize(settings.simulationInit.brushSize);
    const r = settings.rules;
    if (Object.hasOwn(settings, 'evolutionTuning')) settings.evolutionTuning = validateEvolutionTuning(settings.evolutionTuning);
    const valid = equal(normalizeStartup(settings.startup), settings.startup) && validateSimInit(settings.simulationInit) &&
        equal(normalizeSortCycle(settings.sortCycle), settings.sortCycle) && integer(settings.nudgeIntervalMs, 0, 200) &&
        (!Object.hasOwn(settings, 'gameOfLifeGenetics') || ['rgb', 'palette-order'].includes(settings.gameOfLifeGenetics)) &&
        (!Object.hasOwn(settings, 'gameOfLifeDeadColor') || ['current','luminance'].includes(settings.gameOfLifeDeadColor)) &&
        (!Object.hasOwn(settings, 'separatorCycle') || Array.isArray(settings.separatorCycle) && equal(normalizeSeparatorCycle(settings.separatorCycle), settings.separatorCycle)) &&
        (!Object.hasOwn(settings, 'simulationTheme') || isSimulationTheme(settings.simulationTheme)) &&
        (!Object.hasOwn(settings, 'simulationPlaybackTheme') || isSimulationTheme(settings.simulationPlaybackTheme)) &&
        typeof settings.smoothing.display === 'boolean' && typeof settings.smoothing.export === 'boolean' &&
        (!Object.hasOwn(settings.smoothing, 'bloom') || typeof settings.smoothing.bloom === 'boolean') &&
        (!Object.hasOwn(settings.smoothing, 'bloomIntensity') || integer(settings.smoothing.bloomIntensity, 0, 100)) &&
        BRUSH_SIZES.includes(settings.brush.size) &&
        (!Object.hasOwn(settings.brush, 'shape') || BRUSH_SHAPES.includes(settings.brush.shape)) &&
        ['paint', 'continuous', 'copy'].includes(settings.brush.mode) && C.SYMMETRY_MODES.includes(settings.brush.symmetry) &&
        (!Object.hasOwn(settings, 'evolutionSelections') || object(settings.evolutionSelections) &&
            Object.entries(settings.evolutionSelections).every(([name, rules]) => ['gameOfLife','chiFlow'].includes(name) && validCycle([rules,rules,rules],name==='chiFlow'))) &&
        validCycle(settings.cycles.gameOfLife, false) && validCycle(settings.cycles.chiFlow, true) &&
        GRAVITY_DIRECTIONS.includes(r.gravity.direction) && number(r.gravity.strength, 0, 1) &&
        ['b', 'a', 'vortex', 'radial', 'down', 'left', 'black_hole', 'turbine2', 'tornado', 'triangle', ...POLYGON_CIRCULATION_MODES].includes(r.spiral.method) &&
        [1, 2, 3].includes(r.spiral.tornadoVersion) && integer(r.spiral.tornadoFrame, 0, Number.MAX_SAFE_INTEGER) &&
        ['field_magnet','field_cosmic_magnet','magnet', 'cosmic_magnet', 'time_magnet', 'expand'].includes(r.magnet.method) &&
        (!Object.hasOwn(r.magnet, 'anchorColor') || r.magnet.anchorColor === 'luminance') &&
        integer(r.magnet.anchorColorIndex, -1, Math.max(...C.PALETTES.map(p => p.colors.length)) - 1) &&
        EROSION_MODES.includes(r.erosion.mode) && number(r.erosion.erosionStrength, 0, 1) &&
        (!Object.hasOwn(r.erosion, 'erosionEvents') || integer(r.erosion.erosionEvents, 1,
            Math.max(...C.PALETTES.map(p => Math.floor(p.colors.length * .8) - Math.floor(p.colors.length * .2))))) &&
        (!Object.hasOwn(r.erosion, 'erosionPace') || integer(r.erosion.erosionPace, 1, 3)) &&
        (!Object.hasOwn(r.erosion, 'erosionStages') || validErosionStages(r.erosion.erosionStages)) &&
        Object.values(r.dla).every(v => typeof v === 'boolean') &&
        number(r.contour.sensitivity, 0, 100) && CONTOUR_LINE_COLORS.includes(r.contour.lineColor) &&
        number(r.turing.feed, .01, .1) && number(r.turing.kill, .01, .07) &&
        number(r.turing.dA, 0, 1) && number(r.turing.dB, 0, 1) && number(r.turing.timeStep, 0, 1);
    if (!valid) throw new Error('Invalid workspace settings');
    if (r.contour.material && r.contour.material.enabled === DEFAULT_CRACKS_MATERIAL.enabled && r.contour.material.strength === DEFAULT_CRACKS_MATERIAL.strength) delete r.contour.material;
    if (r.contour.growth && equal(r.contour.growth, DEFAULT_CRACKS_GROWTH)) delete r.contour.growth;
    if(r.cymatics && equal(r.cymatics,INITIAL_CYMATICS_RULES))delete r.cymatics;
    if(r.ink && equal(r.ink,DEFAULT_INK_PREFERENCES))delete r.ink;
    if(r.oil && equal(r.oil,INITIAL_OIL_RULES))delete r.oil;
    if(r.network && equal(r.network,DEFAULT_NETWORK_PREFERENCES))delete r.network;
    return settings;
}

function differences(value, defaults) {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        if (equal(item, defaults[key])) continue;
        if (object(item) && object(defaults[key])) {
            const diff = differences(item, defaults[key]);
            if (Object.keys(diff).length) result[key] = diff;
        } else result[key] = clone(item);
    }
    return result;
}

export function serializeWorkspaceSettings(value, identity) {
    const settings = validateWorkspaceSettings(value);
    return SETTINGS_HEADER + '\n' + JSON.stringify({ version: 1,
        settings: differences(settings, defaultWorkspaceSettings()), ...(identity ? { identity } : {}) }, null, 2) + '\n';
}

export function isWorkspaceSettingsText(text) {
    return /^FYI_SETTINGS_/u.test(text.replace(/^\uFEFF/u, '').trimStart());
}

export function readWorkspaceSettingsFile(text) {
    if (text.length > 1024 * 1024) throw new Error('Settings file is too large');
    const clean = text.replace(/^\uFEFF/u, '').trimStart();
    const split = clean.indexOf('\n');
    if (split < 0 || clean.slice(0, split).trim() !== SETTINGS_HEADER) throw new Error('Unsupported settings version');
    const payload = JSON.parse(clean.slice(split + 1));
    if (!object(payload) || payload.version !== 1 || !object(payload.settings) ||
        Object.keys(payload).some(key => !['version', 'settings', 'identity'].includes(key))) throw new Error('Invalid settings file');
    return { settings: validateWorkspaceSettings(payload.settings),
        ...(Object.hasOwn(payload, 'identity') ? { identity: payload.identity } : {}) };
}

export function deserializeWorkspaceSettings(text) {
    return readWorkspaceSettingsFile(text).settings;
}

export function loadWorkspaceSettings(storage = localStorage) {
    try {
        const text = storage.getItem(WORKSPACE_STORAGE_KEY);
        return text ? deserializeWorkspaceSettings(text) : null;
    } catch { return null; }
}
export function persistWorkspaceSettings(settings, storage = localStorage) {
    try { storage.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspaceSettings(settings)); return true; }
    catch { return false; }
}
