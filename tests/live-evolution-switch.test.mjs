import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const section = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const simulations = {
    spiral: 'btnSpiral', gravitationalSort: 'btnGravitationalSort', brightnessEvo: 'btnBrightnessEvo',
    erosion: 'btnErosion', islands: 'btnIslands', gameOfLife: 'btnGameOfLife', sandpile: 'btnSandpile',
    magnet: 'btnMagnetModes', contour: 'btnContour', turing: 'btnTuring',
    nudgeBrighter: 'btnNudgeBrighter', nudgeDarker: 'btnNudgeDarker', breathe: 'btnShowBreatheMenu', dla: 'btnDla'
};
function harness() {
    const dom = Object.fromEntries([...Object.values(simulations), 'btnPlayPauseLife', 'btnStepForward', 'iconPlay', 'iconPause']
        .map(id => [id, { id, style: {}, disabled: false, classList: { add() {}, remove() {} } }]));
    const c = vm.createContext({ dom, window: {}, artRecipeLog: [], isMacroLoaded: false, isExecutingMacroCommand: false,
        isLifePlaying: false, armedSimulation: null, currentGenerationCount: 0, currentSortMethod: 'luminance',
        boardState: [{k: 1}, {k: 2}], simulationStartState: null, simulationHasBrushInput: false,
        animationFrameId: null, history: [], queued: [], brushFinishes: 0,
        Simulations: {resetMagnetCaches() {}, resetGravitationalSortCaches() {}},
        brightnessEvoMode: 'off', dlaMode: 'off', breatheEvoMode: 'off', gsMode: 'off', spiralMode: 'off', magnetMode: 'off',
        turingState: null, spiralRules: {method: 'b'}, gravitationalSortRules: {direction: 'up'},
        magnetRules: {}, erosionRules: {mode: 'legacy'}, contourRules: {}, turingRules: {},
        evolutionTuning: {islands: {activity: .05}, brightnessEvo: {}, dla: {}}, dlaRules: {},
        gameOfLifeCycle: [{}, {}, {}], chiFlowCycle: [{}, {}, {}], SPIRAL_MODE_SEQUENCE: ['off','b','left','black_hole'],
        isMacroPlaying: false, lastNudgeTime: 0, performance: {now: () => 100},
        getCurrentState: () => ({board: c.boardState.map(t => ({...t}))}),
        areStatesEqual: (a,b) => JSON.stringify(a) === JSON.stringify(b),
        pushHistory: action => c.history.push(action),
        finishBrushGesture: () => c.brushFinishes++,
        cancelAnimationFrame: id => { c.queued = c.queued.filter(item => item.id !== id); },
        requestAnimationFrame: fn => { const id = c.queued.length + 1; c.queued.push({id,fn}); return id; },
        getErosionRecordingRules: () => ({...c.erosionRules}), getGameOfLifeRecordingRules: () => ({mode:c.gameOfLifeMode}),
        getChiFlowRecordingRules: () => ({cycleMode:c.chiFlowMode}), getNudgeTiming: () => ({legacyFrames:false}),
        cloneChiFlowRules: r => ({...r}), cloneGameOfLifeRules: r => ({...r}),
        createIslandsSession: () => ({mode:'classic',seed:42,state:42,steps:0}), logIslandsSessionStart() {},
        restoreIslandsSession: r => ({...r}), syncDlaCrystalState() {}, initializeDla() {} });
    for (const name of ['updateUndoRedoButtons','updateBrightnessEvoButtonUI','updateDlaButtonUI','updateErosionButtonUI',
        'updateBreatheEvoButtonUI','updateGravitationalSortButtonUI','updateSpiralButtonUI','updateMagnetButtonUI',
        'updateGameOfLifeButtonUI','updateChiFlowButtonUI','updateIslandsButtonUI']) c[name] = () => {};
    c.gameLoop = () => { c.currentGenerationCount++; c.animationFrameId = c.requestAnimationFrame(c.gameLoop); };
    vm.runInContext(section('window.logArtEvent = function', '// ------------------------------------------'), c);
    vm.runInContext(section('function pauseLife()', 'function getRandomGridPosition('), c);
    vm.runInContext(section('function handleEvolutionTap(', 'function setBrushMode('), c);
    vm.runInContext(section('function nextEvolutionMode(', 'function updateErosionButtonUI('), c);
    for (const name of ['cycleSpiralMode','cycleGravitationalSortMode','cycleMagnetMode','cycleErosionMode','cycleGameOfLifeMode','cycleChiFlowMode','cycleIslandsMode']) {
        const fn=source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm'));
        vm.runInContext(fn[0], c);
    }
    return c;
}
const selectors = {spiral:'cycleSpiralMode', gravitationalSort:'cycleGravitationalSortMode', brightnessEvo:'cycleBrightnessEvoMode',
    magnet:'cycleMagnetMode', erosion:'cycleErosionMode', gameOfLife:'cycleGameOfLifeMode', sandpile:'cycleChiFlowMode', islands:'cycleIslandsMode'};
function select(c, sim) { c.handleEvolutionTap(sim, () => selectors[sim] ? c[selectors[sim]]() : c.armSimulation(sim)); }

test('all ordinary evolutions hand off on the same board with PAUSE/PLAY, independent generations and Undo segments', () => {
    const c = harness(), board=c.boardState;
    select(c,'spiral'); c.togglePlayPauseLife();
    for (const sim of Object.keys(simulations).filter(sim=>!['breathe','dla','spiral'].includes(sim))) {
        c.currentGenerationCount=17; c.boardState[0].k++; const before=c.history.length;
        select(c, sim);
        assert.equal(c.armedSimulation,sim); assert.equal(c.isLifePlaying,true); assert.equal(c.boardState,board);
        assert.equal(c.currentGenerationCount,1); assert.equal(c.queued.length,1);
        assert.equal(c.history.length,before+1);
        const pause=c.artRecipeLog.findLastIndex(line=>line.includes(' PAUSE ->'));
        assert.match(c.artRecipeLog[pause],/\[GEN:17\] PAUSE/);
        assert.match(c.artRecipeLog.at(-1),new RegExp(`PLAY -> Armed: ${sim} \\|`));
        assert.doesNotMatch(c.artRecipeLog.at(-1),/\[GEN:/);
        assert.equal(c.dom.btnDla.disabled,true); assert.equal(c.dom.btnShowBreatheMenu.disabled,true);
        for(const other of Object.keys(simulations).filter(s=>!['breathe','dla'].includes(s))) assert.equal(c.dom[simulations[other]].disabled,false);
    }
});

test('current evolution cycles without a restart or new history segment', () => {
    const c=harness(); select(c,'spiral'); c.togglePlayPauseLife(); c.currentGenerationCount=23;
    const start=c.simulationStartState;
    for(let i=0;i<6;i++) { select(c,'spiral'); assert.equal(c.isLifePlaying,true); assert.notEqual(c.spiralMode,'off'); }
    assert.equal(c.currentGenerationCount,23); assert.equal(c.simulationStartState,start);
    assert.equal(c.artRecipeLog.filter(line=>line.includes(' PAUSE ->')).length,0);
});

test('breathing and DLA require manual pause in both directions; paused selection never auto-starts', () => {
    for(const excluded of ['breathe','dla']) {
        const c=harness(); select(c,'spiral'); c.togglePlayPauseLife();
        let called=false; c.handleEvolutionTap(excluded,()=>{called=true;}); assert.equal(called,false);
        c.pauseLife(); c.armSimulation(excluded); assert.equal(c.isLifePlaying,false);
        c.isLifePlaying=true; select(c,'erosion'); assert.equal(c.armedSimulation,excluded);
        c.pauseLife(); select(c,'erosion'); assert.equal(c.armedSimulation,'erosion'); assert.equal(c.isLifePlaying,false);
    }
});
