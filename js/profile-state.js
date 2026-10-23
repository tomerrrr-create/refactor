import { RANDOM_STARTUP_PALETTE } from './startup-settings.js';
import { validateWorkspaceSettings, deserializeWorkspaceSettings, defaultWorkspaceSettings } from './workspace-settings.js';
import { GAME_OF_LIFE_PRESETS, CHI_FLOW_PRESETS, defaultGameOfLifeRules } from './constants.js';
import { normalizeCycleSources, inferCycleSources } from './evolution-cycle-settings.js';

import { DEFAULT_SMOOTH_RENDERING } from './smooth-rendering-settings.js';
import { DEFAULT_SOFT_BLOOM, DEFAULT_BLOOM_INTENSITY } from './soft-bloom.js';

export const PROFILE_STORAGE_KEY = 'colorGridProfileDraftsV1';
const clone = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Key order does not change whether settings match. Rule arrays already use the app's normalized order.
const canonical = value => JSON.stringify(value, function (key, item) {
    return object(item) ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item;
});
const equal = (a, b) => canonical(a) === canonical(b);

export function validateProfileSnapshot(value) {
    const settings = validateWorkspaceSettings(value.settings);
    settings.simulationTheme ??= 'blue';
    settings.simulationPlaybackTheme ??= 'gold';
    const snapshot = { settings };
    if (value.identity) {
        snapshot.identity = {};
        for (const [name, presets] of [['gameOfLife', GAME_OF_LIFE_PRESETS], ['chiFlow', CHI_FLOW_PRESETS]]) {
            const identity = value.identity[name];
            if (!identity || !Number.isInteger(identity.index) || identity.index < 0 || identity.index > 2) throw Error('Invalid profile identity');
            const cycles = clone(settings.cycles);
            cycles[name][0] = identity.yoursRules;
            const checked = validateWorkspaceSettings({ ...settings, cycles });
            snapshot.identity[name] = {
                index: identity.index,
                sources: normalizeCycleSources(identity.sources, settings.cycles[name], presets),
                yoursRules: checked.cycles[name][0]
            };
        }
    }
    return snapshot;
}

// Slider stations I–V use zero-based indices internally.
const PROFILE_EROSION_STAGES = [
    { 'channels-solid': 0, channels: 4 },
    { 'channels-solid': 2, channels: 4 },
    { 'channels-solid': 3, channels: 4 }
];

function applyProfileOneDefaults(snapshot) {
    Object.assign(snapshot.settings.startup, {
        paletteName: RANDOM_STARTUP_PALETTE, fill: 'random', brushColor: 'none', brushSize: 1, separatorPx: 3, boardSize: 21, symmetry: 'off', interfaceMode: 'creative'
    });
    snapshot.settings.brush.symmetry = 'off';
    snapshot.settings.cycles.chiFlow = ['Harmony', 'Nova', 'Alexis'].map(name => clone(CHI_FLOW_PRESETS[name]));
    if (snapshot.identity) snapshot.identity.chiFlow = {
        index: 0, sources: ['Harmony', 'Nova', 'Alexis'],
        yoursRules: clone(snapshot.settings.cycles.chiFlow[0])
    };
}

// Profile 1 supplies every unspecified setting; named rules remain snapshots.
export function defaultProfileSnapshots(initial) {
    const first = validateProfileSnapshot(initial);
    first.settings.simulationTheme = 'blue';
    const profiles = [first, clone(first), clone(first)];
    for (const [index, paletteName, fill, theme] of [
        [1, 'Golden Midnight Extended', 'random', 'gold'],
        [2, 'Ancient 264', 'dark', 'teal']
    ]) {
        const snapshot = profiles[index];
        Object.assign(snapshot.settings.startup, { paletteName, fill, interfaceMode: 'simulation' });
        snapshot.settings.simulationTheme = theme;
        snapshot.settings.cycles.chiFlow = ['Electric', 'Harmony', 'Alexis'].map(name =>
            ({ ...clone(CHI_FLOW_PRESETS[name]), reachPercent: 400 }));
        if (snapshot.identity) {
            snapshot.identity.chiFlow = { index: 0, sources: ['Electric', 'Harmony', 'Alexis'],
                yoursRules: clone(snapshot.settings.cycles.chiFlow[0]) };
        }
    }
    Object.assign(profiles[2].settings.startup, { boardSize: 15, fill: 'random', separatorPx: 0 });
    profiles[0].settings.startup.separatorPx = 5; // Relative Large.
    Object.assign(profiles[1].settings.startup, { boardSize: 11, separatorPx: 2 }); // Legacy value 2 maps to relative Small.
    profiles[1].settings.sortCycle = first.settings.sortCycle
        .filter(method => !['outside-in', 'temperature'].includes(method));
    for (const method of ['rainbow-fold', 'zig-zag']) {
        if (!profiles[1].settings.sortCycle.includes(method)) profiles[1].settings.sortCycle.push(method);
    }
    for (const [index, size] of [1, 11, 3].entries()) {
        profiles[index].settings.simulationInit.brushSize = size;
        profiles[index].settings.startup.brushSize = 1;
        profiles[index].settings.brush.size = 1;
    }
    Object.assign(profiles[1].settings.simulationInit, { symmetry: 'off', brushColor: 'first' });
    profiles[1].settings.startup.symmetry = 'off';
    profiles[1].settings.brush.symmetry = 'off';
    profiles[1].settings.startup.brushColor = 'first';
    // The left/right gold columns mirror left/right (named 'horizontal' internally).
    Object.assign(profiles[2].settings.simulationInit, { brushSize: 1, brushColor: 'rainbow', symmetry: 'horizontal' });
    profiles[2].settings.cycles.gameOfLife[0] = clone(GAME_OF_LIFE_PRESETS.btnGolPresetPaint2);
    if (profiles[2].identity) {
        profiles[2].identity.gameOfLife.index = 0;
        profiles[2].identity.gameOfLife.sources[0] = 'btnGolPresetPaint2';
        profiles[2].identity.gameOfLife.yoursRules = clone(GAME_OF_LIFE_PRESETS.btnGolPresetPaint2);
    }
    profiles[2].settings.startup.brushColor = 'lightest';
    profiles.forEach((snapshot, index) => {
        snapshot.settings.rules.erosion.erosionStages = { ...PROFILE_EROSION_STAGES[index] };
        delete snapshot.settings.rules.erosion.erosionEvents;
        delete snapshot.settings.rules.erosion.erosionPace;
    });
    applyProfileOneDefaults(profiles[0]);
    return profiles.map(validateProfileSnapshot);
}

// Reset uses application defaults, never another profile's saved personal settings.
export function factoryProfileSnapshot(index) {
    if (!Number.isInteger(index) || index < 0 || index > 2) throw Error('Invalid profile');
    const settings = defaultWorkspaceSettings();
    Object.assign(settings.smoothing, { display: DEFAULT_SMOOTH_RENDERING,
        bloom: DEFAULT_SOFT_BLOOM, bloomIntensity: DEFAULT_BLOOM_INTENSITY });
    const identity = {};
    for (const [name, presets] of [['gameOfLife', GAME_OF_LIFE_PRESETS], ['chiFlow', CHI_FLOW_PRESETS]]) {
        identity[name] = { index: 0, sources: inferCycleSources(settings.cycles[name], presets),
            yoursRules: clone(settings.cycles[name][0]) };
    }
    return defaultProfileSnapshots({ settings, identity })[index];
}

// Merge only manual changes since the last observation. Replay can change runtime
// settings without becoming a preference; endReplay resets that observation.
function mergeChanges(draft, previous, current) {
    if (equal(previous, current)) return clone(draft);
    if (object(draft) && object(previous) && object(current)) {
        return Object.fromEntries(Object.keys(current).map(key => [key,
            Object.hasOwn(previous, key) && Object.hasOwn(draft, key)
                ? mergeChanges(draft[key], previous[key], current[key]) : clone(current[key])]));
    }
    if (Array.isArray(draft) && Array.isArray(previous) && Array.isArray(current) &&
        draft.length === previous.length && previous.length === current.length) {
        return current.map((item, index) => mergeChanges(draft[index], previous[index], item));
    }
    return clone(current);
}

export function createProfileState(initial, storage) {
    initial = validateProfileSnapshot(initial);
    let state = { version: 1, defaultsVersion: 11, selected: 0,
        profiles: defaultProfileSnapshots(initial).map(snapshot => ({ saved: clone(snapshot), draft: clone(snapshot) })) };
    let restored = false, storageError = false, suspended = false, observed = clone(initial);
    try {
        storage ??= globalThis.localStorage;
        const text = storage.getItem(PROFILE_STORAGE_KEY);
        if (text !== null) {
            if (text.length > 8 * 1024 * 1024) throw Error('Profiles are too large');
            const value = JSON.parse(text);
            if (value?.version !== 1 || !Number.isInteger(value.selected) || value.selected < 0 || value.selected > 2 ||
                !Array.isArray(value.profiles) || value.profiles.length !== 3) throw Error('Invalid profiles');
            state = { version: 1, defaultsVersion: 11, selected: value.selected, profiles: value.profiles.map(profile => ({
                saved: validateProfileSnapshot(profile.saved), draft: validateProfileSnapshot(profile.draft)
            })) };
            if (!value.defaultsVersion) {
                const baseline = state.profiles[0].saved;
                const defaults = defaultProfileSnapshots(baseline);
                for (let index = 0; index < 3; index++) {
                    const profile = state.profiles[index];
                    // Only replace the old identical, untouched copies. Keep personal settings.
                    if (index > 0 && equal(profile.saved, baseline) && equal(profile.draft, baseline)) {
                        state.profiles[index] = { saved: clone(defaults[index]), draft: clone(defaults[index]) };
                    } else {
                        for (const kind of ['saved', 'draft']) {
                            if (!Object.hasOwn(value.profiles[index][kind].settings, 'simulationTheme')) {
                                profile[kind].settings.simulationTheme = ['blue', 'gold', 'teal'][index];
                            }
                        }
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 2) {
                // Upgrade only previous default values; retain explicit personal overrides.
                for (const [index, profile] of state.profiles.entries()) {
                    for (const kind of ['saved', 'draft']) {
                        const settings = profile[kind].settings;
                        const size = [1, 11, 3][index];
                        if (settings.simulationInit.brushSize === 7) settings.simulationInit.brushSize = size;
                        if (settings.brush.size === 1) settings.brush.size = size;
                        if (settings.startup.brushSize === 1) settings.startup.brushSize = size;
                        if (index === 1) {
                            settings.simulationInit.symmetry ??= 'off';
                            settings.simulationInit.brushColor ??= 'first';
                        }
                        if (index === 2) settings.simulationInit.brushColor ??= 'lightest';
                        if (index > 0 && settings.startup.brushColor === 'none') {
                            settings.startup.brushColor = index === 1 ? 'first' : 'lightest';
                        }
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 3) {
                for (const [index, profile] of state.profiles.entries()) {
                    for (const kind of ['saved', 'draft']) {
                        const rules = profile[kind].settings.rules.erosion;
                        // Shared/absolute legacy rates and explicit per-mode edits stay exact.
                        if (!Object.hasOwn(rules, 'erosionEvents') && !Object.hasOwn(rules, 'erosionPace')) {
                            rules.erosionStages = { ...PROFILE_EROSION_STAGES[index], ...rules.erosionStages };
                        }
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 4) {
                for (const [index, profile] of state.profiles.entries()) {
                    for (const kind of ['saved', 'draft']) {
                        const startup = profile[kind].settings.startup;
                        if (index === 0 && startup.separatorPx === 2) startup.separatorPx = 5;
                        if (index === 1) {
                            if (startup.boardSize === 7) startup.boardSize = 11;
                        }
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 5) {
                for (const kind of ['saved', 'draft']) {
                    const snapshot = state.profiles[2][kind];
                    const { startup, simulationInit, cycles } = snapshot.settings;
                    if (startup.boardSize === 7) startup.boardSize = 15;
                    if (startup.fill === 'dark') startup.fill = 'random';
                    if (startup.separatorPx === 2) startup.separatorPx = 0;
                    if (simulationInit.brushSize === 3) simulationInit.brushSize = 1;
                    if (!simulationInit.brushColor || simulationInit.brushColor === 'lightest') simulationInit.brushColor = 'rainbow';
                    if (!simulationInit.symmetry || simulationInit.symmetry === 'kaleidoscope') simulationInit.symmetry = 'horizontal';
                    if (equal(cycles.gameOfLife[0], defaultGameOfLifeRules)) {
                        cycles.gameOfLife[0] = clone(GAME_OF_LIFE_PRESETS.btnGolPresetPaint2);
                        if (snapshot.identity) {
                            snapshot.identity.gameOfLife.sources[0] = 'btnGolPresetPaint2';
                            if (equal(snapshot.identity.gameOfLife.yoursRules, defaultGameOfLifeRules)) {
                                snapshot.identity.gameOfLife.yoursRules = clone(GAME_OF_LIFE_PRESETS.btnGolPresetPaint2);
                            }
                        }
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 6) {
                for (const [index, profile] of state.profiles.entries()) {
                    const formerSize = [1, 11, 3][index];
                    for (const kind of ['saved', 'draft']) {
                        const settings = profile[kind].settings;
                        if (settings.startup.brushSize === formerSize) settings.startup.brushSize = 1;
                        if (settings.brush.size === formerSize) settings.brush.size = 1;
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 7) {
                const previous = defaultWorkspaceSettings();
                previous.startup.paletteName = 'Journey';
                for (const kind of ['saved', 'draft']) {
                    const snapshot = state.profiles[0][kind];
                    const updated = clone(snapshot);
                    applyProfileOneDefaults(updated);
                    for (const key of ['paletteName', 'fill', 'brushColor', 'brushSize']) {
                        if (snapshot.settings.startup[key] === previous.startup[key]) {
                            snapshot.settings.startup[key] = updated.settings.startup[key];
                        }
                    }
                    if (equal(snapshot.settings.cycles.chiFlow, previous.cycles.chiFlow)) {
                        snapshot.settings.cycles.chiFlow = updated.settings.cycles.chiFlow;
                        if (snapshot.identity) snapshot.identity.chiFlow = updated.identity.chiFlow;
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 8) {
                for (const kind of ['saved', 'draft']) {
                    const startup = state.profiles[0][kind].settings.startup;
                    if (startup.separatorPx === 5) startup.separatorPx = 0;
                }
            }
            if ((value.defaultsVersion || 0) < 9) {
                for (const kind of ['saved', 'draft']) {
                    const startup = state.profiles[0][kind].settings.startup;
                    if (startup.boardSize === 7) startup.boardSize = 249;
                }
            }
            if ((value.defaultsVersion || 0) < 10) {
                const previousStages = [0, 3, 4];
                for (const [index, profile] of state.profiles.entries()) {
                    for (const kind of ['saved', 'draft']) {
                        const rules = profile[kind].settings.rules.erosion;
                        if (!Object.hasOwn(rules, 'erosionEvents') && !Object.hasOwn(rules, 'erosionPace') &&
                            rules.erosionStages?.channels === previousStages[index]) {
                            rules.erosionStages.channels = 4;
                        }
                    }
                }
            }
            if ((value.defaultsVersion || 0) < 11) {
                // Upgrade former factory values only; keep personal overrides and other profiles.
                const previous = { paletteName: 'Autumn into Winter 264', boardSize: 249,
                    separatorPx: 0, fill: 'dark', brushColor: 'rainbow' };
                const next = { paletteName: RANDOM_STARTUP_PALETTE, boardSize: 21,
                    separatorPx: 3, fill: 'random', brushColor: 'none' };
                for (const kind of ['saved', 'draft']) {
                    const startup = state.profiles[0][kind].settings.startup;
                    for (const key of Object.keys(previous)) {
                        if (startup[key] === previous[key]) startup[key] = next[key];
                    }
                }
            }
            restored = true;
        }
    } catch { storageError = true; }
    function persist() {
        try { storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state)); storageError = false; return true; }
        catch { storageError = true; return false; }
    }
    function checkIndex(index) {
        if (!Number.isInteger(index) || index < 0 || index > 2) throw Error('Invalid profile');
    }
    return {
        restored,
        get storageError() { return storageError; },
        get selected() { return state.selected; },
        draft(index = state.selected) { checkIndex(index); return clone(state.profiles[index].draft); },
        dirty(index) { checkIndex(index); return !equal(state.profiles[index].saved, state.profiles[index].draft); },
        capture(value) {
            if (suspended) return false;
            const current = validateProfileSnapshot(value);
            const profile = state.profiles[state.selected];
            const draft = validateProfileSnapshot(mergeChanges(profile.draft, observed, current));
            observed = current;
            if (equal(profile.draft, draft)) return false;
            profile.draft = draft;
            persist();
            return true;
        },
        observe(value) { observed = validateProfileSnapshot(value); },
        select(index) { checkIndex(index); state.selected = index; suspended = false; return persist(); },
        save() { state.profiles[state.selected].saved = clone(state.profiles[state.selected].draft); return persist(); },
        replace(value) {
            const snapshot = validateProfileSnapshot(value);
            state.profiles[state.selected] = { saved: clone(snapshot), draft: snapshot };
            observed = clone(snapshot);
            return persist();
        },
        beginReplay(value) { this.capture(value); suspended = true; },
        endReplay(value) {
            try { this.observe(typeof value === 'function' ? value() : value); }
            finally { suspended = false; }
        },
        persist
    };
}

export function readProfileFile(text) {
    return { settings: deserializeWorkspaceSettings(text) };
}

// Resolve the selected profile before drawing the first frame, including migrations.
// This read does not write preferences or replace the other runtime settings.
export function loadProfileStartup(fallback, storage) {
    return createProfileState({ settings: { ...defaultWorkspaceSettings(), startup: fallback } }, storage)
        .draft().settings.startup;
}
