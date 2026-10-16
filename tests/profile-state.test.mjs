import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileState, defaultProfileSnapshots, factoryProfileSnapshot, loadProfileStartup, PROFILE_STORAGE_KEY, readProfileFile } from '../js/profile-state.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings } from '../js/workspace-settings.js';

const initial = () => { const settings = defaultWorkspaceSettings(); settings.simulationInit.brushSize = 1; settings.startup.separatorPx = 5; settings.rules.erosion.erosionStages = { 'channels-solid': 0, channels: 0 }; return { settings: { ...settings, simulationTheme: 'blue' } }; };
const storage = () => {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const change = (value, apply) => { const next = structuredClone(value); apply(next.settings); return next; };

test('initial slots are independent, select 1, and compare actual settings including reverted changes', () => {
    const state = createProfileState(initial(), storage());
    assert.equal(state.selected, 0);
    assert.deepEqual([0, 1, 2].map(i => state.dirty(i)), [false, false, false]);
    const edited = change(initial(), s => { s.nudgeIntervalMs = 25; });
    assert(state.capture(edited));
    assert.equal(state.dirty(0), true);
    assert.equal(state.draft(1).settings.nudgeIntervalMs, 100);
    state.capture(initial());
    assert.equal(state.dirty(0), false);
    const copy = state.draft(); copy.settings.nudgeIntervalMs = 1;
    assert.equal(state.draft().settings.nudgeIntervalMs, 100);
});

test('switching and reopening retain three independent drafts, stars and the selected slot', () => {
    const disk = storage();
    const state = createProfileState(initial(), disk);
    for (let i = 0; i < 3; i++) {
        state.select(i); state.observe(state.draft());
        state.capture(change(state.draft(), s => { s.nudgeIntervalMs = (i + 1) * 20; }));
    }
    const reopened = createProfileState(initial(), disk);
    assert(reopened.restored);
    assert.equal(reopened.selected, 2);
    assert.deepEqual([0, 1, 2].map(i => reopened.draft(i).settings.nudgeIntervalMs), [20, 40, 60]);
    assert.deepEqual([0, 1, 2].map(i => reopened.dirty(i)), [true, true, true]);
    reopened.save();
    const again = createProfileState(initial(), disk);
    assert.deepEqual([0, 1, 2].map(i => again.dirty(i)), [true, true, false]);
});

test('file replacement affects only the active profile and becomes a clean saved baseline', () => {
    const state = createProfileState(initial(), storage());
    state.capture(change(initial(), s => { s.brush.size = 9; }));
    state.select(1); state.observe(state.draft());
    const file = readProfileFile(serializeWorkspaceSettings(change(initial(), s => { s.nudgeIntervalMs = 45; }).settings));
    state.replace(file);
    assert.equal(state.draft().settings.nudgeIntervalMs, 45);
    assert.equal(state.dirty(1), false);
    assert.equal(state.draft(0).settings.brush.size, 9);
    assert(state.dirty(0));
    for (const invalid of ['{}', 'FYI_SETTINGS_V2\n{}', 'FYI_SETTINGS_V1\n{', '[00:00:00] INIT_STATE -> {}']) {
        assert.throws(() => readProfileFile(invalid));
    }
    assert.equal(state.draft().settings.nudgeIntervalMs, 45);
});

test('macro settings never enter drafts, including later manual edits after playback', () => {
    const state = createProfileState(initial(), storage());
    state.beginReplay(initial());
    const replay = change(initial(), s => { s.nudgeIntervalMs = 1; s.rules.gravity.strength = .25; s.cycles.gameOfLife[2].birth = [1]; });
    assert.equal(state.capture(replay), false);
    state.endReplay(replay);
    state.capture(replay);
    assert.equal(state.dirty(0), false);
    state.capture(change(replay, s => { s.brush.size = 5; s.cycles.gameOfLife[0].birth = [2]; }));
    assert.equal(state.draft().settings.brush.size, 5);
    assert.equal(state.draft().settings.nudgeIntervalMs, 100);
    assert.deepEqual(state.draft().settings.cycles.gameOfLife[2], initial().settings.cycles.gameOfLife[2]);
    assert.deepEqual(state.draft().settings.cycles.gameOfLife[0].birth, [2]);
});

test('invalid storage cannot inject snapshots, and storage failure keeps session drafts working', () => {
    const disk = storage(); disk.setItem(PROFILE_STORAGE_KEY, '{');
    const recovered = createProfileState(initial(), disk);
    assert(recovered.storageError); assert.equal(recovered.selected, 0);
    const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
    const state = createProfileState(initial(), blocked);
    state.capture(change(initial(), s => { s.brush.size = 7; }));
    assert.equal(state.draft().settings.brush.size, 7);
    assert(state.storageError);
    assert.equal(state.save(), false);
    assert.equal(state.dirty(0), false);
    assert.throws(() => state.select(3));
});

test('personal rules and cycle source identity remain independent from named presets across reopen', () => {
    const disk = storage();
    const snapshot = initial();
    snapshot.identity = {
        gameOfLife: { index: 1, sources: ['custom-0', 'yours', 'custom-2'], yoursRules: { survival: [1], birth: [3] } },
        chiFlow: { index: 2, sources: ['custom-0', 'custom-1', 'yours'], yoursRules: { awakening: [2], flow: [3], reach: 4 } }
    };
    const state = createProfileState(snapshot, disk);
    state.persist();
    const reopened = createProfileState(initial(), disk);
    assert.deepEqual(reopened.draft().identity, snapshot.identity);
    state.capture({ ...snapshot, identity: { ...snapshot.identity,
        gameOfLife: { ...snapshot.identity.gameOfLife, index: 2 } } });
    assert(state.dirty(0));
    state.capture(snapshot);
    assert.equal(state.dirty(0), false);
});

test('failed replay completion resumes normal profile capture without accepting invalid settings',()=>{
    for(const throwsDuringCapture of [false,true]){
        const state=createProfileState(initial(),storage());state.beginReplay(initial());
        const invalid=change(initial(),s=>{s.rules.dla.mode='genetics';});
        assert.throws(()=>state.endReplay(throwsDuringCapture?()=>{throw Error('capture failed');}:invalid));
        assert.deepEqual(state.draft(),initial());
        const edited=change(initial(),s=>{s.brush.size=5;});
        assert.equal(state.capture(edited),true);assert.equal(state.draft().settings.brush.size,5);
    }
});

test('factory profiles keep unspecified settings and have distinct startup, sort, theme and Chi Flow defaults', () => {
    const snapshots = defaultProfileSnapshots(initial());
    const [one, two, three] = snapshots.map(snapshot => snapshot.settings);
    assert.deepEqual(one, initial().settings);
    assert.equal(two.startup.paletteName, 'Golden Midnight Extended');
    assert.equal(two.startup.fill, 'random');
    assert.equal(three.startup.paletteName, 'Ancient 264');
    assert.equal(three.startup.fill, 'dark');
    assert.equal(three.startup.brushSize, 3);
    assert.equal(three.brush.size, 3);
    assert.deepEqual(snapshots.map(s => s.settings.simulationTheme), ['blue', 'gold', 'teal']);
    for (const settings of [two, three]) {
        assert.equal(settings.startup.interfaceMode, 'simulation');
        assert.deepEqual(settings.cycles.chiFlow.map(r => r.flow), [[1], [3, 5, 7], [4, 5, 6, 7, 8]]);
        assert(settings.cycles.chiFlow.every(r => r.reachPercent === 400));
        assert.deepEqual({ ...settings.rules, erosion: one.rules.erosion }, one.rules);
        assert.equal(settings.simulationInit.boardSize, one.simulationInit.boardSize);
        assert.deepEqual(settings.smoothing, one.smoothing);
        assert.deepEqual(settings.cycles.gameOfLife, one.cycles.gameOfLife);
    }
    assert.deepEqual(three.sortCycle, one.sortCycle);
    assert.deepEqual(two.sortCycle, ['luminance', 'dark-rainbow', 'reversed', 'center-out', 'rainbow-fold', 'zig-zag']);
});

test('legacy untouched copies receive new defaults once, while edited profiles and drafts survive', () => {
    const disk = storage();
    const old = initial(); delete old.settings.simulationTheme;
    const legacy = { version: 1, selected: 1, profiles: [0, 1, 2].map(() => ({ saved: structuredClone(old), draft: structuredClone(old) })) };
    legacy.profiles[2].draft.settings.brush.size = 9;
    disk.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacy));
    const state = createProfileState(initial(), disk);
    assert.equal(state.selected, 1);
    assert.equal(state.draft(1).settings.startup.paletteName, 'Golden Midnight Extended');
    assert.equal(state.dirty(1), false);
    assert.equal(state.draft(2).settings.brush.size, 9);
    assert.equal(state.dirty(2), true);
    assert.equal(state.draft(2).settings.simulationTheme, 'teal');
    state.persist();
    const reopened = createProfileState(initial(), disk);
    assert.deepEqual(reopened.draft(2), state.draft(2));
});

test('profile themes survive switching, saving and reopening independently', () => {
    const disk = storage();
    const state = createProfileState(initial(), disk);
    for (let i = 0; i < 3; i++) {
        state.select(i); state.observe(state.draft());
        state.capture(change(state.draft(), s => { s.simulationTheme = ['teal', 'blue', 'gold'][i]; }));
        state.save();
    }
    const reopened = createProfileState(initial(), disk);
    assert.deepEqual([0, 1, 2].map(i => reopened.draft(i).settings.simulationTheme), ['teal', 'blue', 'gold']);
    assert.deepEqual([0, 1, 2].map(i => reopened.dirty(i)), [false, false, false]);
});

test('factory reset restores the selected profile independently of personal saved settings', () => {
    const disk = storage();
    const custom = change(initial(), s => {
        s.brush.size = 9;
        s.nudgeIntervalMs = 20;
        s.smoothing.display = false;
    });
    // Existing personal baselines must never become factory reset defaults.
    const state = createProfileState(custom, disk);
    for (const index of [1, 2, 0]) {
        const otherProfiles = [0, 1, 2].map(i => state.draft(i));
        state.select(index);
        state.replace(factoryProfileSnapshot(index));
        assert.equal(state.dirty(index), false);
        assert.equal(state.draft().settings.brush.size, [1, 11, 3][index]);
        assert.equal(state.draft().settings.nudgeIntervalMs, 100);
        assert.equal(state.draft().settings.smoothing.display, true);
        for (const other of [0, 1, 2].filter(i => i !== index)) assert.deepEqual(state.draft(other), otherProfiles[other]);
        assert.deepEqual(createProfileState(initial(), disk).draft(), factoryProfileSnapshot(index));
    }
    assert.deepEqual([0, 1, 2].map(i => factoryProfileSnapshot(i).settings.simulationTheme), ['blue', 'gold', 'teal']);
    assert.equal(factoryProfileSnapshot(1).settings.startup.paletteName, 'Golden Midnight Extended');
    assert.equal(factoryProfileSnapshot(2).settings.startup.paletteName, 'Ancient 264');
    assert.throws(() => factoryProfileSnapshot(3));
});

test('profile initialization and opening use the requested brushes, color meanings and symmetry', () => {
    const snapshots = [0, 1, 2].map(factoryProfileSnapshot);
    assert.deepEqual(snapshots.map(s => s.settings.simulationInit.brushSize), [1, 11, 3]);
    assert.deepEqual(snapshots.map(s => s.settings.startup.brushSize), [1, 11, 3]);
    assert.deepEqual(snapshots.map(s => s.settings.brush.size), [1, 11, 3]);
    const second = snapshots[1].settings;
    assert.equal(second.simulationInit.symmetry, 'off');
    assert.equal(second.simulationInit.brushColor, 'first');
    assert.equal(second.startup.brushColor, 'first');
    assert.equal(second.brush.symmetry, 'off');
    assert.equal(snapshots[2].settings.simulationInit.brushColor, 'lightest');
    assert.equal(snapshots[2].settings.startup.brushColor, 'lightest');
});

test('existing default brushes update once while saved personal sizes survive', () => {
    const disk = storage();
    const profiles = [0, 1, 2].map(i => ({ saved: factoryProfileSnapshot(i), draft: factoryProfileSnapshot(i) }));
    for (const profile of profiles) for (const kind of ['saved', 'draft']) {
        const settings = profile[kind].settings;
        settings.simulationInit = { boardSize: 249, brushSize: 7 };
        settings.startup.brushSize = 1; settings.startup.brushColor = 'none';
        settings.brush.size = 1;
    }
    profiles[2].draft.settings.simulationInit.brushSize = 9;
    disk.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ version: 1, defaultsVersion: 1, selected: 1, profiles }));
    const state = createProfileState(initial(), disk);
    assert.equal(state.draft(0).settings.simulationInit.brushSize, 1);
    assert.equal(state.draft(1).settings.simulationInit.brushSize, 11);
    assert.equal(state.draft(2).settings.simulationInit.brushSize, 9);
    assert.equal(state.dirty(0), false); assert.equal(state.dirty(1), false); assert.equal(state.dirty(2), true);
    state.persist();
    assert.deepEqual(createProfileState(initial(), disk).draft(2), state.draft(2));
});

test('factory erosion defaults map UI stages I/I, III/IV and IV/V to both carving modes', () => {
    assert.deepEqual([0, 1, 2].map(i => factoryProfileSnapshot(i).settings.rules.erosion.erosionStages), [
        { 'channels-solid': 0, channels: 0 },
        { 'channels-solid': 2, channels: 3 },
        { 'channels-solid': 3, channels: 4 }
    ]);
});

test('erosion defaults migrate once and retain personal per-mode and legacy acceleration values', () => {
    const disk = storage();
    const profiles = [0, 1, 2].map(index => ({ saved: factoryProfileSnapshot(index), draft: factoryProfileSnapshot(index) }));
    for (const profile of profiles) for (const kind of ['saved', 'draft']) delete profile[kind].settings.rules.erosion.erosionStages;
    profiles[1].draft.settings.rules.erosion.erosionStages = { channels: 1 };
    profiles[2].draft.settings.rules.erosion.erosionEvents = 7;
    disk.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ version: 1, defaultsVersion: 2, selected: 1, profiles }));
    const state = createProfileState(initial(), disk);
    assert.deepEqual(state.draft(0).settings.rules.erosion.erosionStages, { 'channels-solid': 0, channels: 0 });
    assert.deepEqual(state.draft(1).settings.rules.erosion.erosionStages, { 'channels-solid': 2, channels: 1 });
    assert.equal(state.draft(2).settings.rules.erosion.erosionEvents, 7);
    assert.equal(state.draft(2).settings.rules.erosion.erosionStages, undefined);
    state.persist();
    assert.deepEqual(createProfileState(initial(), disk).draft(1), state.draft(1));
});

test('startup resolves profile separators and board size before rendering, including old saved defaults', () => {
    const disk = storage();
    const profiles = [0, 1, 2].map(i => ({ saved: factoryProfileSnapshot(i), draft: factoryProfileSnapshot(i) }));
    for (const profile of profiles) for (const kind of ['saved', 'draft']) {
        profile[kind].settings.startup.separatorPx = 2;
        profile[kind].settings.startup.boardSize = 7;
    }
    for (const selected of [0, 1, 2]) {
        disk.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ version: 1, defaultsVersion: 3, selected, profiles }));
        const startup = loadProfileStartup(initial().settings.startup, disk);
        assert.equal(startup.separatorPx, [5, 2, 2][selected]);
        assert.equal(startup.boardSize, [7, 11, 7][selected]);
    }
    profiles[1].draft.settings.startup.boardSize = 21;
    profiles[1].draft.settings.startup.separatorPx = 3;
    disk.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ version: 1, defaultsVersion: 3, selected: 1, profiles }));
    const personal = loadProfileStartup(initial().settings.startup, disk);
    assert.equal(personal.boardSize, 21); assert.equal(personal.separatorPx, 3);
    assert.equal(defaultProfileSnapshots(initial())[2].settings.startup.separatorPx, 2);
    assert.equal(factoryProfileSnapshot(0).settings.startup.separatorPx, 5);
    assert.equal(factoryProfileSnapshot(1).settings.startup.separatorPx, 2);
});
