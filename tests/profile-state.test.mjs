import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileState, PROFILE_STORAGE_KEY, readProfileFile } from '../js/profile-state.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings } from '../js/workspace-settings.js';

const initial = () => ({ settings: defaultWorkspaceSettings() });
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
