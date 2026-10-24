import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { validateEvolutionTuning } from '../js/evolution-tuning.js';

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
        setSimulationRunning(value) { c.runningAppearance = value; }, isLifePlaying: false, isBreathing: false, armedSimulation: null, currentGenerationCount: 0, currentSortMethod: 'luminance',
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
        syncGameOfLifeDeadColor() {}, cloneChiFlowRules: r => ({...r}), cloneGameOfLifeRules: r => ({...r}),
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
    for (const name of ['cycleSpiralMode','cycleGravitationalSortMode','cycleMagnetMode','cycleErosionMode','cycleGameOfLifeMode','cycleChiFlowMode','cycleIslandsMode','cycleDlaMode']) {
        const fn=source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm'));
        vm.runInContext(fn[0], c);
    }
    return c;
}
const selectors = {spiral:'cycleSpiralMode', gravitationalSort:'cycleGravitationalSortMode', brightnessEvo:'cycleBrightnessEvoMode',
    magnet:'cycleMagnetMode', erosion:'cycleErosionMode', gameOfLife:'cycleGameOfLifeMode', sandpile:'cycleChiFlowMode', islands:'cycleIslandsMode', dla:'cycleDlaMode'};
function select(c, sim) { c.handleEvolutionTap(sim, () => selectors[sim] ? c[selectors[sim]]() : c.armSimulation(sim)); }

test('all ordinary evolutions hand off on the same board with PAUSE/PLAY, independent generations and Undo segments', () => {
    const c = harness(), board=c.boardState;
    select(c,'spiral'); c.togglePlayPauseLife();
    for (const sim of Object.keys(simulations).filter(sim=>!['breathe','spiral'].includes(sim))) {
        c.currentGenerationCount=17; c.boardState[0].k++; const before=c.history.length;
        select(c, sim);
        assert.equal(c.armedSimulation,sim); assert.equal(c.isLifePlaying,true); assert.equal(c.runningAppearance,true); assert.equal(c.boardState,board);
        assert.equal(c.currentGenerationCount,1); assert.equal(c.queued.length,1);
        assert.equal(c.history.length,before+1);
        const pause=c.artRecipeLog.findLastIndex(line=>line.includes(' PAUSE ->'));
        assert.match(c.artRecipeLog[pause],/\[GEN:17\] PAUSE/);
        assert.match(c.artRecipeLog.at(-1),new RegExp(`PLAY -> Armed: ${sim} \\|`));
        assert.doesNotMatch(c.artRecipeLog.at(-1),/\[GEN:/);
        assert.equal(c.dom.btnDla.disabled,false); assert.equal(c.dom.btnShowBreatheMenu.disabled,true);
        for(const other of Object.keys(simulations).filter(s=>s!=='breathe')) assert.equal(c.dom[simulations[other]].disabled,false);
    }
});

test('current evolution cycles without a restart or new history segment', () => {
    const c=harness(); select(c,'spiral'); c.togglePlayPauseLife(); c.currentGenerationCount=23;
    const start=c.simulationStartState;
    for(let i=0;i<6;i++) { select(c,'spiral'); assert.equal(c.isLifePlaying,true); assert.notEqual(c.spiralMode,'off'); }
    assert.equal(c.currentGenerationCount,23); assert.equal(c.simulationStartState,start);
    assert.equal(c.artRecipeLog.filter(line=>line.includes(' PAUSE ->')).length,0);
});

test('breathing requires manual pause in both directions; paused selection never auto-starts', () => {
    for(const excluded of ['breathe']) {
        const c=harness(); select(c,'spiral'); c.togglePlayPauseLife();
        let called=false; c.handleEvolutionTap(excluded,()=>{called=true;}); assert.equal(called,false);
        c.pauseLife(); c.armSimulation(excluded); assert.equal(c.isLifePlaying,false);
        c.isLifePlaying=true; select(c,'erosion'); assert.equal(c.armedSimulation,excluded);
        c.pauseLife(); select(c,'erosion'); assert.equal(c.armedSimulation,'erosion'); assert.equal(c.isLifePlaying,false);
    }
});

test('live rule snapshots replay at their recorded generation without restarting the engine', () => {
    const c=harness();
    vm.runInContext(section('function getHistorySettings(', 'function toggleMacroFullScreen('), c);
    vm.runInContext(section('function applyMacroRules(', '        async function initializeApp('), c);
    c.isWindCommand=()=>false;
    select(c,'spiral'); c.togglePlayPauseLife(); c.currentGenerationCount=37;
    c.spiralRules.method='left'; c.spiralMode='left'; c.recordLiveSimulationRules('spiral');
    const recorded=c.artRecipeLog.at(-1);
    assert.match(recorded,/\[GEN:37\] SIMULATION_RULES/);
    const action=c.parseMacroText(recorded)[0];
    assert.equal(action.targetGen,37);
    c.spiralRules.method='b'; c.spiralMode='b';
    const start=c.simulationStartState;
    c.executeMacroAction(action);
    assert.equal(c.spiralRules.method,'left'); assert.equal(c.spiralMode,'left');
    assert.equal(c.isLifePlaying,true); assert.equal(c.currentGenerationCount,37);
    assert.equal(c.simulationStartState,start); assert.equal(c.history.length,0);
});

test('saving live tuning keeps one run and random-breathing tuning references', () => {
    const c=harness();
    c.evolutionTuning=validateEvolutionTuning(); c.validateEvolutionTuning=validateEvolutionTuning; c.islandsSession=null;
    c.persistWorkspaceSettings=()=>{};c.getWorkspaceSettings=()=>({});c.settingsProfiles={scheduleCapture(){}};
    c.performAction=fn=>{fn();c.history.push('paused edit');};
    vm.runInContext(section('      function restoreEvolutionTuningState(', '      function getWorkspaceSettings('), c);
    select(c,'brightnessEvo');c.togglePlayPauseLife();c.currentGenerationCount=12;
    const sessionRules=c.evolutionTuning.breathe;
    assert.equal(c.saveEvolutionTuning('brightnessEvo',{smoothing:.5,contrast:.4},'contrast'),true);
    assert.equal(c.isLifePlaying,true);assert.equal(c.currentGenerationCount,12);assert.equal(c.history.length,0);
    assert.match(c.artRecipeLog.at(-1),/\[GEN:12\] EVOLUTION_TUNING/);
    assert.equal(c.evolutionTuning.breathe,sessionRules);
    assert.equal(c.brightnessEvoMode,'contrast');
    c.isMacroPlaying=true;
    assert.equal(c.saveEvolutionTuning('brightnessEvo',{smoothing:.2,contrast:.2},'brightness'),false);
});

test('DLA live cycling retains the current run and re-entry reinitializes its internal session', () => {
    const c=harness(); let initializations=0;
    c.initializeDla=()=>{initializations++;c.dlaState={session:initializations};};
    select(c,'spiral');c.togglePlayPauseLife();select(c,'dla');
    assert.equal(c.isLifePlaying,true);assert.equal(c.dlaMode,'genetics');assert.equal(initializations,1);
    const state=c.dlaState, start=c.simulationStartState;c.currentGenerationCount=33;
    select(c,'dla');assert.equal(c.dlaMode,'no-genetics');select(c,'dla');assert.equal(c.dlaMode,'genetics');
    assert.equal(c.dlaState,state);assert.equal(c.simulationStartState,start);assert.equal(c.currentGenerationCount,33);
    select(c,'spiral');select(c,'dla');assert.equal(initializations,2);assert.notEqual(c.dlaState,state);
    c.pauseLife();assert.equal(c.isLifePlaying,false);assert.equal(c.runningAppearance,false);
    assert(Object.values(simulations).every(id=>!c.dom[id].disabled));
});
