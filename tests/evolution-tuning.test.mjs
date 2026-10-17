import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EVOLUTION_TUNING, validateEvolutionTuning, breatheTuningKey } from '../js/evolution-tuning.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';
import { createIslandsSession, restoreIslandsSession, runIslandsGeneration } from '../js/simulations/islands.js';
import { runBrightnessEvolution, runContrastGeneration } from '../js/simulations/brightness.js';
import { getBreatheBrightnessFactor, createRandomBreatheSession } from '../js/simulations/breathe.js';
import { runDlaGeneration } from '../js/simulations/dla.js';
import { factoryProfileSnapshot, validateProfileSnapshot } from '../js/profile-state.js';

const board = () => [0, 4, 8, 2].map(k => ({ k, v: k, isGold: false }));
test('optional tuning round trips through settings and profiles without changing V1 defaults', () => {
    assert.equal('evolutionTuning' in defaultWorkspaceSettings(), false);
    const settings = { ...defaultWorkspaceSettings(), evolutionTuning: validateEvolutionTuning({
        brightnessEvo: { smoothing: .8, contrast: .5 }, breathe: { speed: 2, depth: 1.5 },
        islands: { activity: .2 }, dla: { batchSize: 500 } }) };
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    assert.deepEqual(validateProfileSnapshot({settings}).settings.evolutionTuning, settings.evolutionTuning);
    for (let i = 0; i < 3; i++) assert.equal('evolutionTuning' in factoryProfileSnapshot(i).settings, false);
    assert.deepEqual(validateEvolutionTuning(), DEFAULT_EVOLUTION_TUNING);
});
test('invalid tuning is rejected before it can be saved or restored', () => {
    for (const value of [null, [], {unknown:{}}, {islands:{activity:NaN}}, {islands:{activity:0}},
        {breathe:{speed:4}}, {brightnessEvo:{contrast:'0.2'}}, {dla:{batchSize:10.5}}, {dla:{fastMode:true}}]) {
        assert.throws(() => validateEvolutionTuning(value));
        assert.throws(() => serializeWorkspaceSettings({...defaultWorkspaceSettings(),evolutionTuning:value}));
    }
});
test('brightness tuning changes the amount per generation; default and gold remain exact', () => {
    const context = {n:2,currentBoardState:board(),currentPalette:Array(12)};
    const defaults = runBrightnessEvolution(context);
    assert.deepEqual(defaults, runBrightnessEvolution({...context,brightnessRules:DEFAULT_EVOLUTION_TUNING.brightnessEvo}));
    const full = runBrightnessEvolution({...context,brightnessRules:{smoothing:1}});
    assert.equal(defaults[0].v,1.75); assert.equal(full[0].v,3.5);
    const low = runContrastGeneration(context), high = runContrastGeneration({...context,brightnessRules:{contrast:1}});
    assert.equal(low[2].v,8.1); assert.equal(high[2].v,9);
    context.currentBoardState[0].isGold = true;
    assert.deepEqual(runBrightnessEvolution({...context,brightnessRules:{smoothing:1}})[0],context.currentBoardState[0]);
});
test('breathing speed rescales time and depth rescales the deviation without touching tiles', () => {
    const tile = {k:3,startDelay:100};
    assert.equal(getBreatheBrightnessFactor(tile,2100,100,'solo',{speed:2}),getBreatheBrightnessFactor(tile,4100,100,'solo'));
    const base = getBreatheBrightnessFactor(tile,4100,100,'group');
    assert.equal(getBreatheBrightnessFactor(tile,4100,100,'group',{depth:.5}),1+(base-1)*.5);
    const tiles = board(), before = structuredClone(tiles);
    const normal=createRandomBreatheSession(tiles,'random-cell',()=>0);
    const tuned=createRandomBreatheSession(tiles,'random-cell',()=>0,{speed:2,depth:.5});
    normal.update(2100); tuned.update(1050);
    assert.equal(tuned.factor(0),1+(normal.factor(0)-1)*.5);
    assert.deepEqual(tiles,before);
});
test('Islands keeps original seeded runs exact and records custom activity with its random cursor', () => {
    const initial=Array.from({length:441},(_,k)=>({k:k%23,v:k%23,isGold:k===220}));
    const run = activity => {
        const session=createIslandsSession(123,{activity});const tiles=structuredClone(initial);
        for(let i=0;i<4;i++)runIslandsGeneration({n:21,currentBoardState:tiles},session);
        return {session,tiles};
    };
    const baseline=run(.05), fast=run(.2);
    assert.equal(Object.hasOwn(baseline.session,'activity'),false);
    assert.notDeepEqual(fast.tiles,baseline.tiles);
    assert.deepEqual(fast.tiles[220],initial[220]);
    const copy=structuredClone(fast.tiles), restored=restoreIslandsSession(JSON.parse(JSON.stringify(fast.session)));
    runIslandsGeneration({n:21,currentBoardState:fast.tiles},fast.session);
    runIslandsGeneration({n:21,currentBoardState:copy},restored);
    assert.deepEqual(copy,fast.tiles); assert.deepEqual(restored,fast.session);
    assert.throws(()=>restoreIslandsSession({...fast.session,activity:1}));
});
test('DLA tuning controls actual particle work per generation', t => {
    const original=Math.random;t.after(()=>{Math.random=original;});
    let calls=0;Math.random=()=>{calls++;return .999;};
    const run=batchSize=>{
        calls=0;
        runDlaGeneration({n:3,currentBoardState:Array.from({length:9},()=>({k:0,v:0})),currentPalette:Array(8),
            dlaRules:{fastMode:false,colorGenetics:true},dlaTuning:{batchSize},
            dlaState:{isInitialized:true,crystal:new Set([0]),walkers:[{x:2,y:2}],emptyIndices:[1,2,3,4,5,6,7,8],lastWalkerIndex:0}});
        return calls;
    };
    assert.equal(run(100),200);assert.equal(run(500),1000);
});

test('old and new macro rule formats restore resolved values instead of inheriting local tuning', async () => {
    const {readFileSync} = await import('node:fs');
    const vm = await import('node:vm');
    const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
    const c=vm.createContext({validateEvolutionTuning,breatheTuningKey,paletteLen:()=>23,evolutionTuning:validateEvolutionTuning({brightnessEvo:{smoothing:1},breathe:{speed:3},dla:{batchSize:1000}}),
        armedSimulation:'brightnessEvo',currentSortMethod:'luminance',replayNudgeTiming:null,console,
        armSimulation(sim){c.armedSimulation=sim;},
        updateBrightnessEvoButtonUI(){},updateBreatheEvoButtonUI(){},
        dlaRules:{colorGenetics:true,injectFromEdges:false,fastMode:false}});
    vm.runInContext(source.slice(source.indexOf('function applyMacroRules('),source.indexOf('function executeMacroAction(')),c);
    const play=(sim,rules)=>c.applyMacroRules(`Armed: ${sim} | Sort: luminance | Rules: ${rules}`);
    play('brightnessEvo','Mode: contrast');assert.equal(c.brightnessEvoMode,'contrast');assert.equal(c.evolutionTuning.brightnessEvo.smoothing,.5);
    play('breathe','Mode: group');assert.equal(c.breatheEvoMode,'group');assert.equal(c.evolutionTuning.breathe.speed,1);
    play('dla','{"mode":"genetics","colorGenetics":true}');assert.equal(c.evolutionTuning.dla.batchSize,100);
    play('brightnessEvo','{"mode":"contrast","tuning":{"smoothing":0.8,"contrast":0.6}}');assert.equal(c.evolutionTuning.brightnessEvo.contrast,.6);
    play('breathe','{"mode":"random-cell","tuning":{"speed":2,"depth":0.5}}');assert.equal(c.evolutionTuning.breathe.depth,.5);
    play('dla','{"mode":"no-genetics","tuning":{"batchSize":500}}');assert.equal(c.evolutionTuning.dla.batchSize,500);
    c.paletteLen=()=>264;
    play('breathe','Mode: group');assert.equal(c.breatheEvoMode,'group');
    assert.equal(c.evolutionTuning.breatheLargePalette.speed,1);assert.equal(c.evolutionTuning.breatheLargePalette.depth,1);
    play('breathe','{"mode":"random-color","tuning":{"speed":2.4,"depth":2.3}}');
    assert.equal(c.evolutionTuning.breatheLargePalette.speed,2.4);assert.equal(c.evolutionTuning.breatheLargePalette.depth,2.3);
    assert.equal(c.evolutionTuning.breathe.speed,2);assert.equal(c.evolutionTuning.breathe.depth,.5);

});

test('breathing defaults switch exactly at 64 colors and independent settings round trip', () => {
    const tuning = validateEvolutionTuning();
    for (const length of [2, 32, 63]) assert.deepEqual(tuning[breatheTuningKey(length)], {speed:1,depth:1});
    for (const length of [64, 65, 264]) assert.deepEqual(tuning[breatheTuningKey(length)], {speed:2.4,depth:2.3});
    tuning.breathe = {speed:.75,depth:.5};
    tuning.breatheLargePalette = {speed:2,depth:2.3};
    const settings = {...defaultWorkspaceSettings(),evolutionTuning:tuning};
    const restored = deserializeWorkspaceSettings(serializeWorkspaceSettings(settings));
    assert.deepEqual(restored.evolutionTuning,tuning);
    assert.deepEqual(validateProfileSnapshot({settings}).settings.evolutionTuning,tuning);
    assert.throws(()=>validateEvolutionTuning({breatheLargePalette:{depth:3.1}}));
});

test('230% breathing depth remains bounded and never changes underlying board colors', () => {
    const tiles=board(),before=structuredClone(tiles);
    const session=createRandomBreatheSession(tiles,'random-cell',()=>0,{speed:2.4,depth:2.3});
    for(let elapsed=0;elapsed<12000;elapsed+=20){
        session.update(elapsed);
        for(let i=0;i<tiles.length;i++)assert(session.factor(i)>=0 && session.factor(i)<=1.12);
        for(const mode of ['solo','group'])assert(getBreatheBrightnessFactor({k:3,startDelay:0},elapsed,0,mode,{speed:2.4,depth:2.3})>=0);
    }
    assert.deepEqual(tiles,before);
});
