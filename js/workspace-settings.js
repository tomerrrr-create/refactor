import { validateEvolutionTuning } from './evolution-tuning.js';
import { normalizeSeparatorCycle } from './separator-cycle.js';
import * as C from './constants.js';
import { EROSION_MODES, validErosionStages } from './erosion-settings.js';
import { DEFAULT_STARTUP, normalizeStartup } from './startup-settings.js';
import { DEFAULT_SIM_INIT, validateSimInit } from './sim-init-settings.js';
import { DEFAULT_SORT_CYCLE, normalizeSortCycle } from './sort-cycle-settings.js';
import { CHI_REACH_PERCENTAGES } from './chi-reach.js';

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
        cycles: { gameOfLife: [C.defaultGameOfLifeRules, C.GAME_OF_LIFE_PRESETS.btnGolPresetShuffle, C.GAME_OF_LIFE_PRESETS.btnGolPresetCoral],
            chiFlow: [C.defaultChiFlowRules, C.CHI_FLOW_PRESETS.Ripples, C.CHI_FLOW_PRESETS.Nova] },
        rules: { gravity: C.defaultGravitationalSortRules, spiral: C.defaultSpiralRules,
            magnet: C.defaultMagnetRules, erosion: C.defaultErosionRules,
            dla: C.defaultDlaRules, contour: C.defaultContourRules, turing: C.defaultTuringRules } });
}

function mergeKnown(defaults, overrides, path = '') {
    if (!object(overrides)) throw new Error('Invalid settings object');
    const result = clone(defaults);
    for (const [key, value] of Object.entries(overrides)) {
        // Optional extension; V1’s original baseline stays unchanged.
        if (path === '' && ['separatorCycle', 'simulationTheme', 'simulationPlaybackTheme', 'evolutionTuning'].includes(key)) { result[key] = clone(value); continue; }
        if (path === 'simulationInit' && ['symmetry', 'brushColor'].includes(key)) { result[key] = clone(value); continue; }
        if (path === 'smoothing' && ['bloom', 'bloomIntensity'].includes(key)) { result[key] = clone(value); continue; }
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

export function validateWorkspaceSettings(value) {
    const settings = mergeKnown(defaultWorkspaceSettings(), value);
    const r = settings.rules;
    if (Object.hasOwn(settings, 'evolutionTuning')) settings.evolutionTuning = validateEvolutionTuning(settings.evolutionTuning);
    const valid = equal(normalizeStartup(settings.startup), settings.startup) && validateSimInit(settings.simulationInit) &&
        equal(normalizeSortCycle(settings.sortCycle), settings.sortCycle) && integer(settings.nudgeIntervalMs, 0, 200) &&
        (!Object.hasOwn(settings, 'separatorCycle') || Array.isArray(settings.separatorCycle) && equal(normalizeSeparatorCycle(settings.separatorCycle), settings.separatorCycle)) &&
        (!Object.hasOwn(settings, 'simulationTheme') || ['blue', 'gold', 'teal'].includes(settings.simulationTheme)) &&
        (!Object.hasOwn(settings, 'simulationPlaybackTheme') || ['blue', 'gold', 'teal'].includes(settings.simulationPlaybackTheme)) &&
        typeof settings.smoothing.display === 'boolean' && typeof settings.smoothing.export === 'boolean' &&
        (!Object.hasOwn(settings.smoothing, 'bloom') || typeof settings.smoothing.bloom === 'boolean') &&
        (!Object.hasOwn(settings.smoothing, 'bloomIntensity') || integer(settings.smoothing.bloomIntensity, 0, 100)) &&
        integer(settings.brush.size, 1, 15) && settings.brush.size % 2 === 1 &&
        ['paint', 'continuous', 'copy'].includes(settings.brush.mode) && C.SYMMETRY_MODES.includes(settings.brush.symmetry) &&
        validCycle(settings.cycles.gameOfLife, false) && validCycle(settings.cycles.chiFlow, true) &&
        ['up', 'right', 'down', 'left', 'center_x', 'radial', 'vortex'].includes(r.gravity.direction) && number(r.gravity.strength, 0, 1) &&
        ['b', 'a', 'vortex', 'radial', 'down', 'left', 'black_hole'].includes(r.spiral.method) &&
        ['magnet', 'cosmic_magnet', 'time_magnet', 'expand'].includes(r.magnet.method) &&
        integer(r.magnet.anchorColorIndex, -1, Math.max(...C.PALETTES.map(p => p.colors.length)) - 1) &&
        EROSION_MODES.includes(r.erosion.mode) && number(r.erosion.erosionStrength, 0, 1) &&
        (!Object.hasOwn(r.erosion, 'erosionEvents') || integer(r.erosion.erosionEvents, 1,
            Math.max(...C.PALETTES.map(p => Math.floor(p.colors.length * .8) - Math.floor(p.colors.length * .2))))) &&
        (!Object.hasOwn(r.erosion, 'erosionPace') || integer(r.erosion.erosionPace, 1, 3)) &&
        (!Object.hasOwn(r.erosion, 'erosionStages') || validErosionStages(r.erosion.erosionStages)) &&
        Object.values(r.dla).every(v => typeof v === 'boolean') &&
        number(r.contour.sensitivity, 0, 100) && ['darkest', 'lightest'].includes(r.contour.lineColor) &&
        number(r.turing.feed, .01, .1) && number(r.turing.kill, .01, .07) &&
        number(r.turing.dA, 0, 1) && number(r.turing.dB, 0, 1) && number(r.turing.timeStep, 0, 1);
    if (!valid) throw new Error('Invalid workspace settings');
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

export function serializeWorkspaceSettings(value) {
    const settings = validateWorkspaceSettings(value);
    return SETTINGS_HEADER + '\n' + JSON.stringify({ version: 1,
        settings: differences(settings, defaultWorkspaceSettings()) }, null, 2) + '\n';
}

export function isWorkspaceSettingsText(text) {
    return /^FYI_SETTINGS_/u.test(text.replace(/^\uFEFF/u, '').trimStart());
}

export function deserializeWorkspaceSettings(text) {
    if (text.length > 1024 * 1024) throw new Error('Settings file is too large');
    const clean = text.replace(/^\uFEFF/u, '').trimStart();
    const split = clean.indexOf('\n');
    if (split < 0 || clean.slice(0, split).trim() !== SETTINGS_HEADER) throw new Error('Unsupported settings version');
    const payload = JSON.parse(clean.slice(split + 1));
    if (!object(payload) || payload.version !== 1 || !object(payload.settings) ||
        Object.keys(payload).some(key => !['version', 'settings'].includes(key))) throw new Error('Invalid settings file');
    return validateWorkspaceSettings(payload.settings);
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
