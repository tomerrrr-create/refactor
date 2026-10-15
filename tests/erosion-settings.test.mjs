import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { erosionEarthSpan, erodedIndex, restoreErosionRules } from '../js/erosion-settings.js';
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
});
