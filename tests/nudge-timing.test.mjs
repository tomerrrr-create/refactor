import { validateEvolutionTuning } from '../js/evolution-tuning.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness({direction = 'nudgeBrighter', stored = null, blockedStorage = false} = {}) {
    let now = 0;
    const logs = [], storage = new Map([['colorGridNudge', stored]]);
    const context = vm.createContext({ breatheDisplay: {isActive:()=>false}, evolutionTuning: validateEvolutionTuning(), validateEvolutionTuning,
        localStorage: {getItem:k=>{if(blockedStorage) throw Error('blocked');return storage.get(k);},
            setItem:(k,v)=>{if(blockedStorage) throw Error('blocked');storage.set(k,v);}},
        performance: {now:()=>now}, window: {logArtEvent:(...args)=>logs.push(args)},
        isLifePlaying:true, isMacroPlaying:false, currentGenerationCount:0,
        armedSimulation:direction, n:2, boardState:[{k:2,v:2},{k:8,v:8,isGold:true}],
        palette:()=>Array(97), norm:v=>(v+97)%97, startAnimationLoop:()=>{},
        gameOfLifeRules:{}, gravitationalSortRules:{}, erosionRules:{}, dlaState:null,
        dlaRules:{}, contourRules:{}, renderToScreen:()=>{}, requestAnimationFrame:()=>{},
        currentMacroStep:0, macroQueue:[], stopMacro:()=>{context.isMacroPlaying=false;},
        pauseLife:()=>{context.isLifePlaying=false;}, scheduleNextMacroStep:()=>{},
        Simulations:{runGameOfLifeGeneration:ctx=>ctx.currentBoardState},
        currentSortMethod:'luminance', console
    });
    vm.runInContext(source.slice(source.indexOf('let nudgeIntervalMs'),source.indexOf('// --- Macro Replay System Variables')),context);
    vm.runInContext(source.slice(source.indexOf('function applyNudgeLogic('),source.indexOf('      function nudgeColors(')),context);
    vm.runInContext(source.slice(source.indexOf('      function gameLoop('),source.indexOf('      function stepForward(')),context);
    vm.runInContext(source.slice(source.indexOf('function applyMacroRules('),source.indexOf('function executeMacroAction(')),context);
    context.executeMacroAction=action=>{
        if(action.eventName==='NUDGE_SPEED') context.applyNudgeTiming(action.details);
        if(action.eventName==='PAUSE') context.isLifePlaying=false;
    };
    return {context, logs, storage,
        frame(t){now=t;context.gameLoop();},
        timing:()=>JSON.parse(JSON.stringify(context.getNudgeTiming()))};
}
const rules = ms=>JSON.stringify({nudgeTimingVersion:1,intervalMs:ms});

test('saved fast setting shifts once per frame in both directions; gold stays unchanged',()=>{
    for(const [direction,expected] of [['nudgeBrighter',12],['nudgeDarker',89]]){
        const h=harness({direction, stored:'{"intervalMs":0}'});
        for(let i=0;i<10;i++)h.frame(i*16);
        assert.equal(h.context.currentGenerationCount,10);
        assert.equal(h.context.boardState[0].k,expected);
        assert.equal(h.context.boardState[1].k,8);
    }
});
test('slow counts only shifts, including exact 200 ms boundary',()=>{
    const h=harness();h.context.setNudgeInterval(200);
    for(const t of [0,16,199,200,201,399,400])h.frame(t);
    assert.equal(h.context.currentGenerationCount,3);
    assert.equal(h.context.boardState[0].k,5);
    assert.equal(h.logs.length,1);
    assert.deepEqual(JSON.parse(h.logs[0][1]),{nudgeTimingVersion:1,intervalMs:200});
});
test('changing speed while running does not manufacture a generation or shift',()=>{
    const h=harness({stored:'{"intervalMs":0}'});h.frame(0);h.frame(16);
    h.context.setNudgeInterval(200);h.frame(32);h.frame(215);
    assert.equal(h.context.currentGenerationCount,2);
    h.frame(216);assert.equal(h.context.currentGenerationCount,3);
    h.context.setNudgeInterval(0);h.frame(217);
    assert.equal(h.context.currentGenerationCount,4);
    h.context.setNudgeInterval(0);assert.equal(h.logs.length,2);
});
test('preferences survive reload; malformed or blocked storage uses defaults',()=>{
    const h=harness();h.context.setNudgeInterval(123);
    const loaded=harness({stored:h.storage.get('colorGridNudge')});
    assert.equal(loaded.timing().intervalMs,123);
    loaded.context.applyNudgeTiming('No specific rules mapping');assert.equal(loaded.timing().legacyFrames,true);
    for(const stored of ['{broken', 'null', '{"intervalMs":201,"unmarkedMode":"fast"}']){
        assert.equal(harness({stored}).timing().intervalMs,100);
    }
    const blocked=harness({blockedStorage:true});blocked.context.setNudgeInterval(200);
    assert.equal(blocked.timing().intervalMs,200);
});
test('versioned PLAY overrides local speed without changing stored preferences',()=>{
    const h=harness();
    h.context.applyMacroRules(`Armed: nudgeBrighter | Sort: luminance | Rules: ${rules(200)}`);
    h.frame(0);h.frame(16);
    assert.equal(h.context.currentGenerationCount,1);
    assert.equal(h.storage.get('colorGridNudge'),null);
    vm.runInContext('replayNudgeTiming = null',h.context);
    assert.equal(h.timing().intervalMs,100);
});
test('unmarked recordings always use original slow frame counting',()=>{
    const old=harness();old.context.applyNudgeTiming('No specific rules mapping');
    for(let i=0;i<10;i++)old.frame(i*16);
    assert.equal(old.context.currentGenerationCount,10);assert.equal(old.context.boardState[0].k,3);

});
test('generation-timed replay reaches identical boards at different frame rates and speeds',()=>{
    for(const ms of [0,1,25,75,123,199,200]) for(const frameMs of [8,16,33,80]){
        const h=harness();h.context.applyNudgeTiming(rules(ms));h.context.isMacroPlaying=true;
        h.context.macroQueue=[{eventName:'PAUSE',isGenBased:true,targetGen:7}];
        for(let t=0;h.context.isLifePlaying&&t<10000;t+=frameMs)h.frame(t);
        assert.equal(h.context.currentGenerationCount,7);
        assert.equal(h.context.boardState[0].k,9);
    }
});
test('replay can switch speed at a recorded generation and still stop at the right shift',()=>{
    for(const frameMs of [8,33,100]){
        const h=harness();h.context.applyNudgeTiming(rules(0));h.context.isMacroPlaying=true;
        h.context.macroQueue=[{eventName:'NUDGE_SPEED',details:rules(200),isGenBased:true,targetGen:2},
            {eventName:'NUDGE_SPEED',details:rules(0),isGenBased:true,targetGen:4},
            {eventName:'PAUSE',isGenBased:true,targetGen:7}];
        for(let t=0;h.context.isLifePlaying&&t<10000;t+=frameMs)h.frame(t);
        assert.equal(h.context.currentGenerationCount,7);assert.equal(h.context.boardState[0].k,9);
    }
});
test('invalid timing is rejected',()=>{
    const h=harness();
    for(const value of [null,201,-1,1.5,NaN])assert.throws(()=>h.context.setNudgeInterval(value));
    for(const value of ['{}','{"nudgeTimingVersion":2,"intervalMs":0}','{"nudgeTimingVersion":1,"intervalMs":201}'])assert.throws(()=>h.context.applyNudgeTiming(value));
});

test('other simulations still count every generated state',()=>{
    const h=harness({direction:'gameOfLife'});h.context.setNudgeInterval(200);
    for(let i=0;i<10;i++)h.frame(i*16);
    assert.equal(h.context.currentGenerationCount,10);
});

test('slider updates apply and log immediately but persist only when requested',()=>{
    const h=harness();h.context.setNudgeInterval(75,false);
    assert.equal(h.timing().intervalMs,75);
    assert.equal(h.logs.length,1);
    assert.equal(h.storage.get('colorGridNudge'),null);
    h.context.persistNudgeSettings();
    assert.deepEqual(JSON.parse(h.storage.get('colorGridNudge')),{intervalMs:75});
});


test('default is 100ms with immediate first shift and exact interval boundary',()=>{
    for(const [direction,expected] of [['nudgeBrighter',4],['nudgeDarker',0]]){
        const h=harness({direction});
        assert.equal(h.timing().intervalMs,100);
        h.frame(0);h.frame(16);h.frame(99);
        assert.equal(h.context.currentGenerationCount,1);
        h.frame(100);h.frame(101);h.frame(199);
        assert.equal(h.context.currentGenerationCount,2);
        assert.equal(h.context.boardState[0].k,expected);
        assert.equal(h.context.boardState[1].k,8);
    }
});
