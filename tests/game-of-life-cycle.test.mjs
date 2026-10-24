import { CHI_REACH_PERCENTAGES } from '../js/chi-reach.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const constants = readFileSync(new URL('../js/constants.js', import.meta.url), 'utf8');
const presets = vm.runInNewContext('(' + constants.match(/export const GAME_OF_LIFE_PRESETS = (\{[\s\S]*?\n\});/)[1] + ')');
const plain = value => JSON.parse(JSON.stringify(value));
const fn = name => source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm'))[0];
const personal = { survival: [1, 2], birth: [3, 6] };
function harness() {
    const c = vm.createContext({ C: { GAME_OF_LIFE_PRESETS: presets }, gameOfLifeRules: plain(personal), personalGameOfLifeRules: plain(personal), gameOfLifeMode: 'personal',
        armedSimulation: null, isLifePlaying: false, isExecutingMacroCommand: false, window: {}, artRecipeLog: [], currentGenerationCount: 0, armCalls: 0 });
    c.defaultGolCycle = [plain(personal), plain(presets.btnGolPresetShuffle), plain(presets.btnGolPresetCoral)];
    c.gameOfLifeCycle = c.defaultGolCycle.map(plain);
    c.localStorage = { setItem() {} };
    vm.runInContext(readFileSync(new URL('../js/evolution-cycle-settings.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, 'const CHI_REACH_PERCENTAGES = ' + JSON.stringify(CHI_REACH_PERCENTAGES) + ';').replaceAll('export ', ''), c);
    c.gameOfLifeSources = c.inferCycleSources(c.gameOfLifeCycle, c.C.GAME_OF_LIFE_PRESETS);
    c.armSimulation = sim => { assert(!c.isLifePlaying); c.armedSimulation = sim; c.armCalls++; };
    c.updateGameOfLifeButtonUI = () => {};
    c.updateSortButtonUI = () => {};
    c.applySortMethod = () => {};
    c.currentSortMethod = 'luminance';
    const logger = source.indexOf('window.logArtEvent = function');
    vm.runInContext(source.slice(logger, source.indexOf('// ------------------------------------------', logger)), c);
    vm.runInContext(['cloneGameOfLifeRules', 'getGameOfLifeRecordingRules', 'setPersonalGameOfLifeRules', 'setGameOfLifeCycle', 'restoreGameOfLifeRules', 'syncGameOfLifeColorSettings', 'cycleGameOfLifeMode', 'nextEvolutionMode'].map(fn).join('\n'), c);
    vm.runInContext(source.slice(source.indexOf('function applyMacroRules('), source.indexOf('function executeMacroAction(')), c);
    vm.runInContext(source.slice(source.indexOf('function getHistorySettings('), source.indexOf('function toggleMacroFullScreen(')), c);
    vm.runInContext(source.slice(source.indexOf('function executeMacroAction('), source.indexOf('        async function initializeApp(')), c);
    return c;
}
test('paused cycle reaches Off, preset shortcuts never overwrite personal rules', () => {
    const c = harness();
    c.cycleGameOfLifeMode(); assert.deepEqual(plain(c.gameOfLifeRules), personal);
    c.cycleGameOfLifeMode(); assert.deepEqual(plain(c.gameOfLifeRules), plain(presets.btnGolPresetShuffle));
    c.cycleGameOfLifeMode(); assert.deepEqual(plain(c.gameOfLifeRules), plain(presets.btnGolPresetCoral));
    c.cycleGameOfLifeMode(); assert.equal(c.armedSimulation, null);
    c.cycleGameOfLifeMode(); assert.deepEqual(plain(c.gameOfLifeRules), personal);
});
test('modal preset/manual saves replace personal mode with independent rule arrays', () => {
    const c = harness(); c.cycleGameOfLifeMode(); c.cycleGameOfLifeMode();
    const chosen = plain(presets.btnGolPresetCoral);
    c.setPersonalGameOfLifeRules(chosen);
    assert.equal(c.gameOfLifeMode, 'personal');
    chosen.survival.length = 0;
    c.gameOfLifeRules.birth.push(8);
    assert.deepEqual(plain(c.personalGameOfLifeRules), plain(presets.btnGolPresetCoral));
    c.setPersonalGameOfLifeRules(personal);
    c.cycleGameOfLifeMode(); c.cycleGameOfLifeMode();
    c.isLifePlaying = true; c.cycleGameOfLifeMode();
    assert.equal(c.gameOfLifeMode, 'personal'); assert.deepEqual(plain(c.gameOfLifeRules), personal);
});
test('running cycles log complete rule snapshots at their generations, parse and replay faithfully', () => {
    const c = harness();
    c.window.logArtEvent('INIT_STATE', JSON.stringify({ recipeVersion: 2, n: 1, pal: 0, sep: 0, sort: 'luminance', board: '1x0' }));
    c.cycleGameOfLifeMode();
    c.window.logArtEvent('PLAY', 'Armed: gameOfLife | Sort: luminance | Rules: ' + JSON.stringify(c.getGameOfLifeRecordingRules()));
    c.isLifePlaying = true; c.armCalls = 0;
    for (let i = 1; i <= 6; i++) {
        c.currentGenerationCount = i * 4; c.cycleGameOfLifeMode();
        assert(c.isLifePlaying); assert.equal(c.armedSimulation, 'gameOfLife');
    }
    assert.equal(c.armCalls, 0);
    const modes = c.artRecipeLog.filter(line => line.includes('[GEN:') && line.includes('Game of Life Mode Changed')).map(line => JSON.parse(line.split(' -> ')[1]).mode);
    assert.deepEqual(modes, ['shuffle', 'coral', 'personal', 'shuffle', 'coral', 'personal']);
    const queue = c.parseMacroText(c.artRecipeLog.join('\n'));
    const changes = queue.filter(a => a.eventName === 'Game of Life Mode Changed' && a.isGenBased);
    assert.deepEqual(plain(changes.map(a => a.targetGen)), [4, 8, 12, 16, 20, 24]);
    const replay = harness(); replay.armedSimulation = 'gameOfLife'; replay.isLifePlaying = true;
    // The player's local personal choice must not leak into playback.
    replay.personalGameOfLifeRules = { survival: [], birth: [] };
    for (const action of changes) {
        replay.executeMacroAction(action);
        assert.deepEqual(plain(replay.getGameOfLifeRecordingRules()), plain((({ mode, ...rules }) => rules)(JSON.parse(action.details))));
        assert(replay.isLifePlaying);
    }
});
test('PLAY/STEP restore snapshot metadata; old macros without metadata retain their exact rules', () => {
    const c = harness(); c.cycleGameOfLifeMode(); c.cycleGameOfLifeMode();
    const rules = plain(c.getGameOfLifeRecordingRules()), replay = harness();
    replay.applyMacroRules('Armed: gameOfLife | Sort: luminance | Rules: ' + JSON.stringify(rules));
    assert.deepEqual(plain(replay.getGameOfLifeRecordingRules()), rules);
    replay.applyMacroRules('Armed: gameOfLife | Rules: ' + JSON.stringify(personal));
    assert.equal(replay.gameOfLifeMode, 'personal'); assert.deepEqual(plain(replay.gameOfLifeRules), personal);
    assert.deepEqual(plain(replay.personalGameOfLifeRules), personal);
});

test('all three slots accept independent custom rules and playback never persists preferences', () => {
    const c = harness();
    const custom = plain(personal);
    const slots = [plain(presets.btnGolPresetCoral), plain(custom), plain(presets.btnGolPresetShuffle)];
    let writes = 0;
    c.localStorage.setItem = () => writes++;
    c.setGameOfLifeCycle(slots, 1);
    assert.equal(writes, 2);
    assert.deepEqual(plain(c.gameOfLifeRules), custom);
    slots[1].survival.length = 0;
    assert.deepEqual(plain(c.gameOfLifeCycle[1]), custom);
    const recorded = c.getGameOfLifeRecordingRules();
    c.restoreGameOfLifeRules(recorded);
    assert.equal(writes, 2);
    assert.deepEqual(plain(c.gameOfLifeCycle[1]), custom);
});

test('Yours survives replacement by a named preset and snapshot replay', () => {
    const c = harness();
    const personalBefore = plain(c.personalGameOfLifeRules);
    const slots = c.gameOfLifeCycle.map(plain);
    slots[0] = plain(slots[1]);
    const sources = [c.gameOfLifeSources[1], c.gameOfLifeSources[1], c.gameOfLifeSources[2]];
    c.setGameOfLifeCycle(slots, 0, sources, personalBefore);
    assert.deepEqual(plain(c.personalGameOfLifeRules), personalBefore);
    const snapshot = c.getGameOfLifeRecordingRules();
    c.restoreGameOfLifeRules(snapshot);
    assert.deepEqual(plain(c.personalGameOfLifeRules), personalBefore);
    assert.deepEqual(plain(c.gameOfLifeSources), plain(sources));
});

test('sorted genetics is logged and replayed for PLAY, STEP and live changes; legacy snapshots clear it', () => {
    const c = harness();
    c.window.logArtEvent('INIT_STATE', JSON.stringify({recipeVersion:2,n:1,pal:0,sep:0,sort:'luminance',board:'1x0'}));
    c.cycleGameOfLifeMode();
    c.setPersonalGameOfLifeRules({...personal,sortGenetics:true,deadColor:'#ff0000'});
    const snapshot = plain(c.getGameOfLifeRecordingRules());
    assert.equal(snapshot.sortGenetics,true);
    assert.equal(snapshot.deadColor,'#ff0000');
    assert.equal(snapshot.cycleSlots[0].sortGenetics,true);
    for (const event of ['PLAY','STEP FORWARD']) {
        c.window.logArtEvent(event,'Armed: gameOfLife | Sort: hue | Rules: '+JSON.stringify(snapshot));
    }
    c.isLifePlaying=true;c.currentGenerationCount=12;
    c.setPersonalGameOfLifeRules({...personal,sortGenetics:true,deadColor:'#ff0000'});
    const changes=c.parseMacroText(c.artRecipeLog.join('\n'));
    const recorded=changes.filter(a=>['PLAY','STEP FORWARD','Game of Life Mode Changed'].includes(a.eventName));
    const replay=harness();
    for(const action of recorded){
        if (action.eventName === 'Game of Life Mode Changed') replay.executeMacroAction(action);
        else replay.applyMacroRules(action.details);
        const expected = action.eventName === 'Game of Life Mode Changed' ? JSON.parse(action.details) : snapshot;
        assert.equal(replay.gameOfLifeRules.sortGenetics,expected.sortGenetics);
        assert.equal(replay.gameOfLifeRules.deadColor,expected.deadColor);
    }
    replay.applyMacroRules('Armed: gameOfLife | Rules: '+JSON.stringify(personal));
    assert.equal(replay.gameOfLifeRules.sortGenetics,undefined);
    assert.equal(replay.gameOfLifeRules.deadColor,undefined);
    assert.deepEqual(plain(replay.gameOfLifeRules),personal);
});

test('anchor and mixing stay shared through Shuffle, Coral, Off and returning', () => {
    const c=harness();c.cycleGameOfLifeMode();
    c.setPersonalGameOfLifeRules({...personal,deadColor:'#000000',sortGenetics:true});
    for(let i=0;i<9;i++){
        c.cycleGameOfLifeMode();
        assert.equal(c.gameOfLifeRules.deadColor,'#000000');
        assert(c.gameOfLifeCycle.every(r=>r.deadColor==='#000000'));
        assert.equal(c.personalGameOfLifeRules.deadColor,'#000000');
        assert.equal(c.gameOfLifeRules.sortGenetics,true);
        assert(c.gameOfLifeCycle.every(r=>r.sortGenetics===true));
    }
    c.setPersonalGameOfLifeRules(personal);c.cycleGameOfLifeMode();
    assert.equal(c.gameOfLifeRules.deadColor,undefined);
    assert(c.gameOfLifeCycle.every(r=>r.deadColor===undefined));
    assert(c.gameOfLifeCycle.every(r=>r.sortGenetics===undefined));
});

test('legacy replay still restores original per-snapshot anchors without changing preferences', () => {
    const c=harness();let writes=0;c.localStorage.setItem=()=>writes++;
    for(const deadColor of ['#112233','#445566',undefined]) {
        const rules={...personal,...(deadColor?{deadColor}:{})};
        c.applyMacroRules('Armed: gameOfLife | Sort: luminance | Rules: '+JSON.stringify(rules));
        assert.equal(c.gameOfLifeRules.deadColor,deadColor);
    }
    assert.equal(writes,0);
});
