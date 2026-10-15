import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { erosionEarthSpan, erosionPaceEvents, erosionStageEvents, resolveErosionEvents, erodedIndex, restoreErosionRules, recordErosionRules } from '../js/erosion-settings.js';
import { runErosionGeneration } from '../js/simulations/erosion.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';
import { createProfileState } from '../js/profile-state.js';

test('every supported event target reaches air in exactly that many hits, in both channel modes', () => {
    for (const size of [21, 23, 64, 264]) {
        for (const mode of ['channels-solid', 'channels']) {
            const span = erosionEarthSpan(size, mode);
            const end = Math.floor(size * .8);
            const isEarth = k => mode === 'channels-solid' ? k < span : k >= Math.floor(size * .2);
            for (let events = 1; events <= span; events++) {
                const rules = { mode, erosionEvents: events };
                let k = mode === 'channels-solid' ? 0 : end - 1;
                for (let hit = 1; hit <= events; hit++) {
                    k = erodedIndex(k, size, rules);
                    assert.equal(isEarth(k), hit < events, `${size}/${mode}/${events}/${hit}`);
                    assert(k >= 0 && k < size);
                }
            }
            // Switching to a smaller palette caps the effective count without changing the preference.
            const rules = { mode, erosionEvents: 159 };
            let k = mode === 'channels-solid' ? 0 : end - 1;
            for (let hit = 0; hit < span; hit++) k = erodedIndex(k, size, rules);
            assert(!isEarth(k)); assert.equal(rules.erosionEvents, 159);
        }
    }
});

test('the actual engine opens a channel at the requested hit and preserves gold and water', t => {
    t.mock.method(Math, 'random', () => 0);
    for (const size of [23, 64, 264]) for (const mode of ['channels-solid', 'channels']) {
        const events = Math.min(5, erosionEarthSpan(size, mode));
        const k = mode === 'channels-solid' ? 0 : Math.floor(size * .8) - 1;
        let board = Array.from({ length: 9 }, () => ({ k, v: k, isGold: true }));
        board[1] = { k: size - 1, v: size - 1, isGold: false };
        board[4] = { k, v: k, isGold: false };
        const gold = structuredClone(board[0]);
        for (let hit = 1; hit <= events; hit++) {
            board = runErosionGeneration({ n: 3, currentBoardState: board,
                currentPalette: Array(size).fill('#000000'), erosionRules: { mode, erosionStrength: 1, erosionEvents: events } });
            assert.equal(board[4].k === size - 1, hit === events);
            assert.deepEqual(board[0], gold);
            assert.equal(board.filter(tile => tile.k === size - 1).length, 1);
        }
    }
});

test('original rate retains one-color erosion and legacy ignores the new option', t => {
    t.mock.method(Math, 'random', () => 0);
    for (const size of [23, 64, 264]) {
        for (const mode of ['channels-solid', 'channels']) {
            const k = mode === 'channels-solid' ? 0 : Math.floor(size * .8) - 1;
            assert.equal(erodedIndex(k, size, { mode }), k + (mode === 'channels-solid' ? 1 : -1));
        }
        const state = Array.from({ length: 9 }, () => ({ k: 0, v: 0, isGold: false }));
        state[1] = { k: size - 1, v: size - 1, isGold: false };
        const context = { n: 3, currentBoardState: state, currentPalette: Array(size).fill('#000000') };
        assert.deepEqual(runErosionGeneration({ ...context, erosionRules: { mode: 'legacy', erosionStrength: 1 } }),
            runErosionGeneration({ ...context, erosionRules: { mode: 'legacy', erosionStrength: 1, erosionEvents: 1 } }));
    }
});

test('settings and independent profile drafts preserve the target, while old files keep the V1 baseline', () => {
    const original = defaultWorkspaceSettings();
    assert.deepEqual(JSON.parse(serializeWorkspaceSettings(original).split('\n').slice(1).join('\n')).settings, {});
    assert.deepEqual(deserializeWorkspaceSettings('FYI_SETTINGS_V1\n{"version":1,"settings":{"rules":{"erosion":{"mode":"channels"}}}}').rules.erosion,
        { mode: 'channels', erosionStrength: .1 });
    const settings = defaultWorkspaceSettings();
    settings.rules.erosion = { mode: 'channels-solid', erosionStrength: .1, erosionEvents: 5 };
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    for (const value of [0, -1, 1.5, '5', null, 160]) {
        settings.rules.erosion.erosionEvents = value;
        assert.throws(() => serializeWorkspaceSettings(settings));
    }
    settings.rules.erosion.erosionEvents = 5;
    let stored;
    const storage = { getItem: () => stored ?? null, setItem: (_, text) => { stored = text; } };
    const profiles = createProfileState({ settings: original }, storage);
    profiles.capture({ settings }); assert(profiles.dirty(0)); profiles.save();
    profiles.select(1); assert(!Object.hasOwn(profiles.draft().settings.rules.erosion, 'erosionEvents'));
    const reopened = createProfileState({ settings: original }, storage);
    assert.equal(reopened.draft(0).settings.rules.erosion.erosionEvents, 5);
    assert(!reopened.dirty(0));
});

test('macro rule injection restores new targets and clears them for old recordings', () => {
    const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    const begin = source.indexOf('function applyMacroRules(');
    const end = source.indexOf('\nfunction executeMacroAction(', begin);
    assert(end > begin);
    const context = vm.createContext({ restoreErosionRules, armedSimulation: 'erosion', currentSortMethod: 'luminance',
        replayNudgeTiming: null, erosionRules: { mode: 'channels', erosionStrength: .1, erosionEvents: 5 },
        updateErosionButtonUI() {}, console });
    vm.runInContext(source.slice(begin, end), context);
    const apply = rules => context.applyMacroRules('Armed: erosion | Sort: luminance | Rules: ' + JSON.stringify(rules));
    apply({ mode: 'channels-solid', erosionStrength: .1, erosionEvents: 3 });
    assert.equal(context.erosionRules.erosionEvents, 3);
    apply({ mode: 'channels', erosionStrength: .1 });
    assert.equal(context.erosionRules.mode, 'channels');
    assert(!Object.hasOwn(context.erosionRules, 'erosionEvents'));
    apply({ erosionStrength: .1 });
    assert.equal(context.erosionRules.mode, 'legacy');
    assert(!Object.hasOwn(context.erosionRules, 'erosionEvents'));
    apply({ mode: 'channels', erosionStrength: .1, erosionPace: 2 });
    assert.equal(context.erosionRules.erosionPace, 2);
    context.applyMacroRules('Armed: erosion | Rules: No specific rules mapping');
    assert.deepEqual(context.erosionRules, { mode: 'legacy', erosionStrength: .1 });
    assert(!Object.hasOwn(context.erosionRules, 'erosionEvents'));
    apply({ mode: 'channels-solid', erosionStrength: .1, erosionEvents: 5 });
    assert.equal(context.erosionRules.erosionEvents, 5);
    assert(!Object.hasOwn(context.erosionRules, 'erosionPace'));
    apply({ mode: 'channels', erosionStrength: .1 });
    assert(!Object.hasOwn(context.erosionRules, 'erosionPace'));
    apply({ mode: 'channels', erosionStrength: .1, erosionStages: { 'channels-solid': 1, channels: 4 } });
    assert.deepEqual(context.erosionRules.erosionStages, { 'channels-solid': 1, channels: 4 });
    apply({ mode: 'channels-solid', erosionStrength: .1, erosionPace: 2 });
    assert(!Object.hasOwn(context.erosionRules, 'erosionStages'));
    assert.equal(context.erosionRules.erosionPace, 2);
});

test('new recording snapshots contain only absolute events and preserve relative preferences', () => {
    const rules = { mode: 'channels-solid', erosionStrength: .1,
        erosionStages: { 'channels-solid': 2, channels: 4 } };
    const before = structuredClone(rules);
    assert.deepEqual(recordErosionRules(rules, 264), { mode: 'channels-solid', erosionStrength: .1, erosionEvents: 35 });
    assert.deepEqual(recordErosionRules({ ...rules, mode: 'channels' }, 264), { mode: 'channels', erosionStrength: .1, erosionEvents: 53 });
    assert.deepEqual(recordErosionRules(rules, 64), { mode: 'channels-solid', erosionStrength: .1, erosionEvents: 8 });
    const recorded = restoreErosionRules(recordErosionRules(rules, 264));
    assert.equal(resolveErosionEvents(264, recorded), 35);
    assert.equal(resolveErosionEvents(64, recorded), 12); // The smaller palette has only 12 soil colors.
    assert.deepEqual(rules, before);
    const original = recordErosionRules({ mode: 'channels-solid', erosionStrength: .1 }, 264);
    assert.equal(original.erosionEvents, 52);
    assert.deepEqual(recordErosionRules({ ...rules, mode: 'legacy' }, 264), { mode: 'legacy', erosionStrength: .1 });
});

test('four acceleration stops adapt to palette and mode and never slow erosion below original', () => {
    assert.deepEqual([0, 1, 2, 3].map(p => erosionPaceEvents(264, 'channels-solid', p)), [52, 35, 17, 1]);
    assert.deepEqual([0, 1, 2, 3].map(p => erosionPaceEvents(264, 'channels', p)), [159, 106, 53, 1]);
    for (const size of [21, 23, 64, 264]) for (const mode of ['channels-solid', 'channels']) {
        let previous = erosionEarthSpan(size, mode);
        for (const pace of [0, 1, 2, 3]) {
            const count = erosionPaceEvents(size, mode, pace);
            assert(count >= 1 && count <= previous);
            previous = count;
            const rules = { mode, erosionStrength: .1, ...(pace ? { erosionPace: pace } : {}) };
            assert.equal(resolveErosionEvents(size, rules), count);
            let k = mode === 'channels-solid' ? 0 : Math.floor(size * .8) - 1;
            for (let hit = 1; hit <= count; hit++) {
                k = erodedIndex(k, size, rules);
                const stillEarth = mode === 'channels-solid' ? k < Math.floor(size * .2) : k >= Math.floor(size * .2);
                assert.equal(stillEarth, hit < count);
            }
            assert.equal(rules.erosionStrength, .1);
        }
    }
});

test('relative acceleration survives settings/profile storage and old absolute targets remain unchanged', () => {
    const settings = defaultWorkspaceSettings();
    settings.rules.erosion = { mode: 'channels-solid', erosionStrength: .1, erosionPace: 1 };
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    let stored;
    const storage = { getItem: () => stored ?? null, setItem: (_, text) => { stored = text; } };
    const state = createProfileState({ settings: defaultWorkspaceSettings() }, storage);
    state.capture({ settings }); state.save();
    const restored = createProfileState({ settings: defaultWorkspaceSettings() }, storage);
    assert.equal(restored.draft().settings.rules.erosion.erosionPace, 1);
    assert.equal(resolveErosionEvents(64, settings.rules.erosion), 8);
    assert.equal(resolveErosionEvents(264, settings.rules.erosion), 35);
    for (const invalid of [0, 4, 1.5, '1', null]) {
        settings.rules.erosion.erosionPace = invalid;
        assert.throws(() => serializeWorkspaceSettings(settings));
    }
    delete settings.rules.erosion.erosionPace;
    settings.rules.erosion.erosionEvents = 5;
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    assert.equal(resolveErosionEvents(264, settings.rules.erosion), 5);
});

test('five acceleration stages span original to the former very-fast rate with exact hit counts', () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(s => erosionStageEvents(264, 'channels-solid', s)), [52, 43, 35, 26, 17]);
    assert.deepEqual([0, 1, 2, 3, 4].map(s => erosionStageEvents(264, 'channels', s)), [159, 133, 106, 80, 53]);
    for (const size of [21, 23, 64, 264]) for (const mode of ['channels-solid', 'channels']) {
        let previous = erosionEarthSpan(size, mode);
        for (const stage of [0, 1, 2, 3, 4]) {
            const rules = { mode, erosionStrength: .1, erosionStages: { [mode]: stage } };
            const events = resolveErosionEvents(size, rules);
            assert(events >= 1 && events <= previous); previous = events;
            let k = mode === 'channels-solid' ? 0 : Math.floor(size * .8) - 1;
            for (let hit = 1; hit <= events; hit++) {
                k = erodedIndex(k, size, rules);
                const stillEarth = mode === 'channels-solid' ? k < Math.floor(size * .2) : k >= Math.floor(size * .2);
                assert.equal(stillEarth, hit < events);
            }
        }
        assert.equal(erosionStageEvents(size, mode, 4), erosionPaceEvents(size, mode, 2));
    }
});

test('separate stages survive files/profiles and preserve old fallback rules for the unedited mode', () => {
    const settings = defaultWorkspaceSettings();
    settings.rules.erosion = { mode: 'channels-solid', erosionStrength: .1, erosionPace: 3,
        erosionStages: { 'channels-solid': 1 } };
    assert.equal(resolveErosionEvents(264, settings.rules.erosion), 43);
    assert.equal(resolveErosionEvents(264, { ...settings.rules.erosion, mode: 'channels' }), 1);
    settings.rules.erosion.erosionStages.channels = 4;
    assert.equal(resolveErosionEvents(264, { ...settings.rules.erosion, mode: 'channels' }), 53);
    settings.rules.erosion.erosionStages['channels-solid'] = 0;
    assert.equal(resolveErosionEvents(264, settings.rules.erosion), 52);
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    const draft = restoreErosionRules(settings.rules.erosion);
    draft.erosionStages.channels = 2;
    assert.equal(settings.rules.erosion.erosionStages.channels, 4, 'modal draft must not alias live nested rules');
    for (const bad of [null, [], 1, { legacy: 1 }, { channels: 5 }, { channels: -1 }, { channels: '1' }]) {
        const invalid = structuredClone(settings); invalid.rules.erosion.erosionStages = bad;
        assert.throws(() => serializeWorkspaceSettings(invalid));
    }
    let stored;
    const storage = { getItem: () => stored ?? null, setItem: (_, text) => { stored = text; } };
    const profiles = createProfileState({ settings: defaultWorkspaceSettings() }, storage);
    profiles.capture({ settings }); profiles.save();
    assert.deepEqual(createProfileState({ settings: defaultWorkspaceSettings() }, storage).draft().settings.rules.erosion.erosionStages,
        { 'channels-solid': 0, channels: 4 });
});
