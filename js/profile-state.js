import { validateWorkspaceSettings, deserializeWorkspaceSettings } from './workspace-settings.js';
import { GAME_OF_LIFE_PRESETS, CHI_FLOW_PRESETS } from './constants.js';
import { normalizeCycleSources } from './evolution-cycle-settings.js';

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
    profiles[1].settings.sortCycle = first.settings.sortCycle
        .filter(method => !['outside-in', 'temperature'].includes(method));
    for (const method of ['rainbow-fold', 'zig-zag']) {
        if (!profiles[1].settings.sortCycle.includes(method)) profiles[1].settings.sortCycle.push(method);
    }
    profiles[2].settings.startup.brushSize = 1;
    profiles[2].settings.brush.size = 1;
    return profiles.map(validateProfileSnapshot);
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
    let state = { version: 1, defaultsVersion: 1, selected: 0,
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
            state = { version: 1, defaultsVersion: 1, selected: value.selected, profiles: value.profiles.map(profile => ({
                saved: validateProfileSnapshot(profile.saved), draft: validateProfileSnapshot(profile.draft)
            })) };
            if (value.defaultsVersion !== 1) {
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
