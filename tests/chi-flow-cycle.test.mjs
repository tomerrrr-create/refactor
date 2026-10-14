import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const constants = readFileSync(new URL('../js/constants.js', import.meta.url), 'utf8');
const presets = vm.runInNewContext('(' + constants.match(/export const CHI_FLOW_PRESETS = (\{[\s\S]*?\n\});/)[1] + ')');
const plain = value => JSON.parse(JSON.stringify(value));
const fn = name => source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm'))[0];
const personal = { awakening: [1, 2], flow: [3, 6], reach: 3 };
function harness() {
    const c = vm.createContext({ C: { CHI_FLOW_PRESETS: presets }, chiFlowRules: plain(personal), personalChiFlowRules: plain(personal), chiFlowMode: 'personal',
        armedSimulation: null, isLifePlaying: false, isExecutingMacroCommand: false, window: {}, artRecipeLog: [], currentGenerationCount: 0, armCalls: 0 });
    c.armSimulation = sim => { assert(!c.isLifePlaying); c.armedSimulation = sim; c.armCalls++; };
    c.updateChiFlowButtonUI = () => {};
    c.updateSortButtonUI = () => {};
    c.applySortMethod = () => {};
    c.currentSortMethod = 'luminance';
    const logger = source.indexOf('window.logArtEvent = function');
    vm.runInContext(source.slice(logger, source.indexOf('// ------------------------------------------', logger)), c);
    vm.runInContext(['cloneChiFlowRules', 'getChiFlowRecordingRules', 'setPersonalChiFlowRules', 'restoreChiFlowRules', 'cycleChiFlowMode', 'nextEvolutionMode'].map(fn).join('\n'), c);
    vm.runInContext(source.slice(source.indexOf('function applyMacroRules('), source.indexOf('function executeMacroAction(')), c);
    vm.runInContext(source.slice(source.indexOf('function getHistorySettings('), source.indexOf('function toggleMacroFullScreen(')), c);
    vm.runInContext(source.slice(source.indexOf('function executeMacroAction('), source.indexOf('        async function initializeApp(')), c);
    return c;
}
test('paused cycle reaches Off, preset shortcuts never overwrite personal rules', () => {
    const c = harness();
    c.cycleChiFlowMode(); assert.deepEqual(plain(c.chiFlowRules), personal);
    c.cycleChiFlowMode(); assert.deepEqual(plain(c.chiFlowRules), plain(presets.Ripples));
    c.cycleChiFlowMode(); assert.deepEqual(plain(c.chiFlowRules), plain(presets.Nova));
    c.cycleChiFlowMode(); assert.equal(c.armedSimulation, null);
    c.cycleChiFlowMode(); assert.deepEqual(plain(c.chiFlowRules), personal);
});
test('modal preset/manual saves replace personal mode with independent rule arrays', () => {
    const c = harness(); c.cycleChiFlowMode(); c.cycleChiFlowMode();
    const chosen = plain(presets.Nova);
    c.setPersonalChiFlowRules(chosen);
    assert.equal(c.chiFlowMode, 'personal');
    chosen.awakening.length = 0;
    c.chiFlowRules.flow.push(8);
    assert.deepEqual(plain(c.personalChiFlowRules), plain(presets.Nova));
    c.setPersonalChiFlowRules(personal);
    c.cycleChiFlowMode(); c.cycleChiFlowMode();
    c.isLifePlaying = true; c.cycleChiFlowMode();
    assert.equal(c.chiFlowMode, 'personal'); assert.deepEqual(plain(c.chiFlowRules), personal);
});
test('running cycles log complete rule snapshots at their generations, parse and replay faithfully', () => {
    const c = harness();
    c.window.logArtEvent('INIT_STATE', JSON.stringify({ recipeVersion: 2, n: 1, pal: 0, sep: 0, sort: 'luminance', board: '1x0' }));
    c.cycleChiFlowMode();
    c.window.logArtEvent('PLAY', 'Armed: sandpile | Sort: luminance | Rules: ' + JSON.stringify(c.getChiFlowRecordingRules()));
    c.isLifePlaying = true; c.armCalls = 0;
    for (let i = 1; i <= 6; i++) {
        c.currentGenerationCount = i * 4; c.cycleChiFlowMode();
        assert(c.isLifePlaying); assert.equal(c.armedSimulation, 'sandpile');
    }
    assert.equal(c.armCalls, 0);
    const modes = c.artRecipeLog.filter(line => line.includes('[GEN:') && line.includes('Chi Flow Mode Changed')).map(line => JSON.parse(line.split(' -> ')[1]).mode);
    assert.deepEqual(modes, ['ripples', 'nova', 'personal', 'ripples', 'nova', 'personal']);
    const queue = c.parseMacroText(c.artRecipeLog.join('\n'));
    const changes = queue.filter(a => a.eventName === 'Chi Flow Mode Changed' && a.isGenBased);
    assert.deepEqual(plain(changes.map(a => a.targetGen)), [4, 8, 12, 16, 20, 24]);
    const replay = harness(); replay.armedSimulation = 'sandpile'; replay.isLifePlaying = true;
    // The player's local personal choice must not leak into playback.
    replay.personalChiFlowRules = { awakening: [], flow: [], reach: 1 };
    for (const action of changes) {
        replay.executeMacroAction(action);
        assert.deepEqual(plain(replay.getChiFlowRecordingRules()), plain((({ mode, ...rules }) => rules)(JSON.parse(action.details))));
        assert(replay.isLifePlaying);
    }
});
test('PLAY/STEP restore snapshot metadata; old macros without metadata retain their exact rules', () => {
    const c = harness(); c.cycleChiFlowMode(); c.cycleChiFlowMode();
    const rules = plain(c.getChiFlowRecordingRules()), replay = harness();
    replay.applyMacroRules('Armed: sandpile | Sort: luminance | Rules: ' + JSON.stringify(rules));
    assert.deepEqual(plain(replay.getChiFlowRecordingRules()), rules);
    replay.applyMacroRules('Armed: sandpile | Rules: ' + JSON.stringify(personal));
    assert.equal(replay.chiFlowMode, 'personal'); assert.deepEqual(plain(replay.chiFlowRules), personal);
    assert.deepEqual(plain(replay.personalChiFlowRules), personal);
});
