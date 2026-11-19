import {MAGNET_CYCLE,isCombinedMagnetMode} from '../js/magnet-modes.js';
import { recordErosionRules, restoreErosionRules } from '../js/erosion-settings.js';
import { runGravitationalSortGeneration } from '../js/simulations/gravitational_sort.js';
import { runSpiralGeneration } from '../js/simulations/spiral.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const spiralSequence = JSON.parse(source.match(/const SPIRAL_MODE_SEQUENCE = (\[[^\]]+\])/)[1].replaceAll("'", '"'));
const cases = [
    { sim: 'erosion', fn: 'cycleErosionMode', event: 'Erosion Mode Changed', modes: ['channels', 'channels-solid', 'legacy'], get: c => c.armedSimulation === 'erosion' ? c.erosionRules.mode : 'off' },
    { sim: 'gravitationalSort', fn: 'cycleGravitationalSortMode', event: 'Gravitational Sort Mode', modes: ['up', 'right', 'center_x', 'pinwheel'], get: c => c.gsMode },
    { sim: 'magnet', fn: 'cycleMagnetMode', event: 'Magnet Mode Changed', modes: MAGNET_CYCLE.slice(1), get: c => c.magnetMode },
    { sim: 'spiral', fn: 'cycleSpiralMode', event: 'Spiral Mode Changed', modes: ['radial', 'down'], get: c => c.spiralMode },
    { sim: 'brightnessEvo', fn: 'cycleBrightnessEvoMode', event: 'Brightness Evo Mode Changed', modes: ['brightness', 'contrast'], get: c => c.brightnessEvoMode },
    { sim: 'dla', fn: 'cycleDlaMode', event: 'DLA Mode Changed', modes: ['genetics', 'no-genetics'], get: c => c.dlaMode }
];
function functionSource(name) {
    const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm'));
    assert(match, name);
    return match[0];
}
function harness() {
    const board = [{ k: 0 }, { k: 1 }], dlaState = { crystal: new Set([0]) };
    const c = vm.createContext({MAGNET_CYCLE,isCombinedMagnetMode, window: {}, artRecipeLog: [], currentGenerationCount: 0,
        isExecutingMacroCommand: false, isLifePlaying: false, armedSimulation: null,
        brightnessEvoMode: 'off', dlaMode: 'off', gsMode: 'off', spiralMode: 'off', magnetMode: 'off',
        erosionRules: { mode: 'legacy', erosionStrength: .1 }, gravitationalSortRules: { direction: 'up' },
        spiralRules: { method: 'b' }, magnetRules: { method: 'cosmic_magnet' },
        SPIRAL_MODE_SEQUENCE: spiralSequence, boardState: board, dlaState,
        armCalls: 0, pauseCalls: 0 });
    c.restoreErosionRules = restoreErosionRules;
    c.getErosionRecordingRules = () => recordErosionRules(c.erosionRules, 64);
    c.armSimulation = (sim, {spiralEntry} = {}) => {
        c.armCalls++;
        if (c.isLifePlaying) return;
        c.armedSimulation = sim;
        if (sim === 'spiral' && spiralEntry) c.spiralMode = c.spiralRules.method = spiralEntry;
    };
    c.pauseLife = () => { if (c.isLifePlaying) { c.pauseCalls++; c.isLifePlaying = false; c.window.logArtEvent('PAUSE', '---'); } };
    for (const name of ['updateErosionButtonUI', 'updateGravitationalSortButtonUI', 'updateSpiralButtonUI', 'updateMagnetButtonUI', 'updateBrightnessEvoButtonUI', 'updateDlaButtonUI']) c[name] = () => {};
    const loggerStart = source.indexOf('window.logArtEvent = function');
    vm.runInContext(source.slice(loggerStart, source.indexOf('// ------------------------------------------', loggerStart)), c);
    c.recordLiveSimulationRules=()=>{};
    c.getActiveSpiralRules=()=>c.spiralRules;
    c.getActiveGravityRules=()=>c.gravitationalSortRules;
    c.restoreGravityRules=rules=>{if(!c.armedSimulation)c.armSimulation('gravitationalSort');Object.assign(c.gravitationalSortRules,rules);};
    vm.runInContext(functionSource('selectMagnetMode'),c);
    vm.runInContext(functionSource('nextEvolutionMode') + cases.map(item => functionSource(item.fn)).join('\n'), c);
    vm.runInContext(source.slice(source.indexOf('function getHistorySettings('), source.indexOf('function toggleMacroFullScreen(')), c);
    vm.runInContext(source.slice(source.indexOf('function executeMacroAction('), source.indexOf('        async function initializeApp(')), c);
    return c;
}
for (const item of cases) {
    test(`${item.sim}: live cycles wrap without resetting state; logger and replay retain mode and generation`, () => {
        const c = harness();
        c.window.logArtEvent('INIT_STATE', JSON.stringify({ recipeVersion: 2, n: 1, pal: 0, sep: 0, sort: 'luminance', board: '1x0' }));
        c[item.fn](); assert.equal(item.get(c), item.modes[0]);
        c.window.logArtEvent('PLAY', `Armed: ${item.sim} | Rules: No specific rules mapping`);
        c.isLifePlaying = true; c.armCalls = 0;
        const board = c.boardState, crystal = c.dlaState;
        const expected = [];
        for (let i = 1; i <= item.modes.length * 2; i++) {
            c.currentGenerationCount = i * 3;
            c[item.fn]();
            expected.push({ mode: item.modes[i % item.modes.length], gen: i * 3 });
            assert.equal(item.get(c), expected.at(-1).mode);
            assert.equal(c.isLifePlaying, true); assert.equal(c.armedSimulation, item.sim);
            assert.equal(c.boardState, board); assert.equal(c.dlaState, crystal);
        }
        assert.equal(c.armCalls, 0); assert.equal(c.pauseCalls, 0);
        const queue = c.parseMacroText(c.artRecipeLog.join('\n'));
        const recorded = queue.filter(e => e.eventName === item.event && e.isGenBased);
        assert.deepEqual(JSON.parse(JSON.stringify(recorded.map(e => ({ mode: item.sim === 'erosion' ? JSON.parse(e.details).mode : e.details, gen: e.targetGen })))), expected);
        const replay = harness(); replay.armedSimulation = item.sim; replay.isLifePlaying = true;
        for (const event of recorded) {
            replay.currentGenerationCount = event.targetGen;
            replay.executeMacroAction(event);
            assert.equal(item.get(replay), item.sim === 'erosion' ? JSON.parse(event.details).mode : event.details); assert.equal(replay.isLifePlaying, true);
        }
        assert.equal(replay.armCalls, 0); assert.equal(replay.pauseCalls, 0);
    });
    test(`${item.sim}: paused cycles still reach Off`, () => {
        const c = harness(); c[item.fn]();
        for (let i = 1; i <= item.modes.length; i++) c[item.fn]();
        assert.equal(item.get(c), 'off'); assert.equal(c.armedSimulation, null);
        assert.equal(c.isLifePlaying, false); assert.equal(c.pauseCalls, 0);
        assert(c.artRecipeLog.some(line => line.endsWith(`${item.event} -> off`)));
    });
    test(`${item.sim}: recorded Off retains existing playback semantics`, () => {
        const c = harness(); c[item.fn](); c.isLifePlaying = true;
        for (const version of [undefined, 2]) {
            const init = { n: 1, pal: 0, sep: 0, sort: 'luminance', board: '1x0' };
            if (version) init.recipeVersion = version;
            const text = [
                `[12:00:00.000] INIT_STATE -> ${JSON.stringify(init)}`,
                `[12:00:00.050] ${item.event} -> ${item.modes[0]}`,
                `[12:00:00.100] PLAY -> Armed: ${item.sim} | Rules: No specific rules mapping`,
                `[12:00:00.200] [GEN:7] ${item.event} -> off`,
                '[12:00:00.300] [GEN:12] PAUSE -> ---'
            ].join('\n');
            const queue = c.parseMacroText(text);
            const off = queue.find(e => e.eventName === item.event && e.details === 'off');
            assert(off, `Off lost in recipe version ${version ?? 'legacy'}`);
            assert.equal(off.isGenBased, true); assert.equal(off.targetGen, 7);
            assert.equal(queue.find(e => e.eventName === 'PAUSE').targetGen, 12);
        }
        const event = { eventName: item.event, details: 'off', targetGen: 7, isGenBased: true };
        c.executeMacroAction(event);
        assert.equal(c.isLifePlaying, item.sim !== 'erosion');
        assert.equal(c.armedSimulation, item.sim === 'erosion' ? null : item.sim);
        const paused = harness(); paused[item.fn](); paused.executeMacroAction(event);
        assert.equal(paused.armedSimulation, null); assert.equal(paused.isLifePlaying, false);
    });
}
test('modes selected outside the button cycle enter its first active mode while running', () => {
    const c = harness(); c.isLifePlaying = true;
    assert.equal(c.nextEvolutionMode('vortex', ['off', 'up', 'right', 'center_x', 'pinwheel']), 'up');
    assert.equal(c.nextEvolutionMode('expand', ['off', 'magnet', 'cosmic_magnet', 'time_magnet']), 'magnet');
    c.isLifePlaying = false;
    assert.equal(c.nextEvolutionMode('vortex', ['off', 'up', 'right', 'center_x', 'pinwheel']), 'off');
});

test('Spiral cycling repairs stale mode/arming combinations without toggling off a selected simulation', () => {
    const unarmed = harness();
    unarmed.spiralMode = 'left';
    unarmed.cycleSpiralMode();
    assert.equal(unarmed.armedSimulation, 'spiral');
    assert.equal(unarmed.spiralMode, 'radial');
    assert.equal(unarmed.spiralRules.method, 'radial');
    assert.equal(unarmed.armCalls, 1);

    const selected = harness();
    selected.armedSimulation = 'spiral';
    selected.spiralMode = 'off';
    selected.cycleSpiralMode();
    assert.equal(selected.armedSimulation, 'spiral');
    assert.equal(selected.spiralMode, 'radial');
    assert.equal(selected.spiralRules.method, 'radial');
    assert.equal(selected.armCalls, 0);
});


test('Spiral starts at Diamond when Tornado was selected on the other button', () => {
 for (const running of [false,true]) {
  const c=harness();c.armedSimulation='spiral';c.spiralMode='tornado';c.spiralRules.method='tornado';c.isLifePlaying=running;
  c.cycleSpiralMode();assert.equal(c.spiralMode,'radial');
 }
});

test('Gravity Pinwheel matches legacy Spiral Pinwheel with the same random input', () => {
    const n = 15;
    const board = Array.from({length:n*n}, (_, index) => ({k:index*7%23, v:index%23, isGold:index===3}));
    const originalRandom = Math.random;
    function evolve(run) {
        let seed = 1234;
        Math.random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const currentBoardState = structuredClone(board);
        for (let i = 0; i < 12; i++) run({n,currentBoardState});
        return currentBoardState;
    }
    try {
        const legacy = evolve(context => runSpiralGeneration({...context,spiralRules:{method:'b'}}));
        assert.notDeepEqual(legacy,board);
        for (const strength of [0,1]) {
            const current = evolve(context => runGravitationalSortGeneration({...context,gravitationalSortRules:{direction:'pinwheel',strength}}));
            assert.deepEqual(current,legacy);
        }
    } finally {
        Math.random = originalRandom;
    }
});
