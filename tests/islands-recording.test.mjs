import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createIslandsSession, restoreIslandsSession, runIslandsGeneration, restoreIslandsBoard } from '../js/simulations/islands.js';

const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(seed=123){
    const context=vm.createContext({
        restoreIslandsSession, runIslandsGeneration, updateIslandsButtonUI(){}, islandsSession:createIslandsSession(seed),
        armedSimulation:'islands', isLifePlaying:true, isMacroPlaying:true,
        n:21, boardState:Array.from({length:441},(_,i)=>({k:i%23,v:i%23,isGold:i===220})),
        palette:()=>Array(23), gameOfLifeRules:{}, gravitationalSortRules:{}, erosionRules:{}, dlaState:null,dlaRules:{},contourRules:{},
        currentGenerationCount:0,currentMacroStep:0,macroQueue:[], currentSortMethod:'luminance',
        renderToScreen(){},requestAnimationFrame(){},scheduleNextMacroStep(){},
        stopMacro(){context.isMacroPlaying=false;},pauseLife(){context.isLifePlaying=false;},
        armSimulation(sim){context.armedSimulation=sim;},console
    });
    context.executeMacroAction=action=>{
        if(action.eventName==='PAUSE') context.pauseLife();
        else if(action.eventName==='DRAW_STROKE') for(const {i,k} of JSON.parse(action.details)) Object.assign(context.boardState[i],{k,v:k,isGold:false});
    };
    vm.runInContext(source.slice(source.indexOf('      function gameLoop('),source.indexOf('      function stepForward(')),context);
    vm.runInContext(source.slice(source.indexOf('function applyMacroRules('),source.indexOf('function executeMacroAction(')),context);
    return context;
}
const rules=session=>`Armed: islands | Sort: luminance | Rules: ${JSON.stringify(session)}`;
test('actual generation scheduler applies recorded edits and stops at exact step across frame rates',()=>{
    let expected;
    for(const frameMs of [8,16,33,100]){
        const c=harness();c.applyMacroRules(rules(createIslandsSession(123)));
        c.macroQueue=[{eventName:'DRAW_STROKE',details:'[{"i":0,"k":7}]',isGenBased:true,targetGen:3},{eventName:'PAUSE',isGenBased:true,targetGen:19}];
        for(let time=0;c.isLifePlaying&&time<10000;time+=frameMs)c.gameLoop();
        assert.equal(c.currentGenerationCount,19);assert.equal(c.islandsSession.steps,19);
        if(expected)assert.deepEqual(c.boardState,expected);else expected=structuredClone(c.boardState);
    }
});
test('PLAY/STEP rules restore random cursor in constant time and reject unknown versions before arming',()=>{
    const c=harness();for(let i=0;i<17;i++)c.gameLoop();
    const snapshot=structuredClone(c.islandsSession), tiles=structuredClone(c.boardState);
    c.gameLoop();const expected=structuredClone(c.boardState);
    c.boardState=tiles;c.applyMacroRules(rules(snapshot));c.gameLoop();assert.deepEqual(c.boardState,expected);
    const before=structuredClone(c.islandsSession);c.armedSimulation='contour';
    assert.throws(()=>c.applyMacroRules(rules({...snapshot,islandsVersion:2})),/Unsupported/);
    assert.equal(c.armedSimulation,'contour');assert.deepEqual(c.islandsSession,before);
});

test('macro import validates Islands version and board before scheduling playback',()=>{
    const c=vm.createContext({restoreIslandsSession,restoreIslandsBoard});
    vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),c);
    const initial={...createIslandsSession(7),n:2,activePaletteIndex:0,separatorPx:0,currentSortMethod:'luminance',board:[[4,0,0,0]]};
    const recipe=`[12:00:00.000] ISLANDS_INIT -> ${JSON.stringify(initial)}\n[12:00:00.001] PLAY -> ${rules(createIslandsSession(7))}\n[12:00:00.002] [GEN:10] PAUSE -> ---`;
    assert.equal(c.parseMacroText(recipe).length,3);
    assert.throws(()=>c.parseMacroText(recipe.replaceAll('"islandsVersion":1','"islandsVersion":2')),/Unsupported/);
    assert.throws(()=>c.parseMacroText(recipe.replace('"board":[[4,0,0,0]]','"board":[]')),/Incomplete Islands board/);
});

test('new Islands start is constant-size seed metadata and never reads or encodes the board',()=>{
    const c=vm.createContext({islandsSession:createIslandsSession(123),historyRecipeCursor:0,artRecipeLog:[]});
    Object.defineProperty(c,'boardState',{get(){throw Error('must not read board');}});
    c.window={logArtEvent:(event,details)=>c.artRecipeLog.push({event,details})};
    vm.runInContext(source.slice(source.indexOf('function logIslandsSessionStart('),source.indexOf('// --- NEW: Gravitational Sort UI and Cycling ---')),c);
    c.logIslandsSessionStart();
    assert.deepEqual(JSON.parse(c.artRecipeLog[0].details),{recordingVersion:2,...createIslandsSession(123)});
    assert(c.artRecipeLog[0].details.length<150);assert.equal(c.historyRecipeCursor,1);
});

test('new seed-only recipe imports without board data and rejects unknown recording versions',()=>{
    const c=vm.createContext({restoreIslandsSession,restoreIslandsBoard});
    vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),c);
    const text=`[12:00:00.000] ISLANDS_INIT -> ${JSON.stringify({recordingVersion:2,...createIslandsSession(7)})}`;
    assert.equal(c.parseMacroText(text).length,1);
    assert.throws(()=>c.parseMacroText(text.replace('"recordingVersion":2','"recordingVersion":3')),/Unsupported Islands recording version/);
});

test('new replay keeps existing board while old replay still restores its snapshot',()=>{
    const original=[{k:7,v:7,isGold:false}], logs=[];
    const c=vm.createContext({restoreIslandsSession,restoreIslandsBoard,armedSimulation:'islands',isLifePlaying:false,
        boardState:original,islandsSession:null,updateIslandsButtonUI(){},isExecutingMacroCommand:false,pendingMacroPalette:null,
        C:{PALETTES:[{}]},window:{logArtEvent:(...args)=>logs.push(args)},renderToScreen(){},
        applyState(state){c.boardState=state.tiles;},console});
    for(const [start,end] of [['function getHistorySettings(','function toggleMacroFullScreen('],['function executeMacroAction(','async function initializeApp(']])
        vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),c);
    c.executeMacroAction({eventName:'ISLANDS_INIT',details:JSON.stringify({recordingVersion:2,...createIslandsSession(7)})});
    assert.equal(c.boardState,original);assert.equal(c.islandsSession.seed,7);
    c.executeMacroAction({eventName:'ISLANDS_INIT',details:JSON.stringify({...createIslandsSession(9),n:1,activePaletteIndex:0,separatorPx:0,currentSortMethod:'luminance',board:[[1,3,3,0]]})});
    assert.equal(c.boardState[0].k,3);assert.equal(c.islandsSession.seed,9);
});

for (const mode of ['classic', 'proximity']) {
    test(`${mode} replays exact generations and edits at different frame rates`, () => {
        let expected;
        for (const frameMs of [8, 33, 100]) {
            const c = harness();
            c.applyMacroRules(rules(createIslandsSession(42, mode)));
            c.macroQueue = [{eventName:'DRAW_STROKE', details:'[{"i":0,"k":7}]', isGenBased:true, targetGen:3},
                {eventName:'PAUSE',details:'---',isGenBased:true,targetGen:25}];
            for (let time=0; c.isLifePlaying && time<10000; time+=frameMs) c.gameLoop();
            assert.equal(c.currentGenerationCount,25);
            if (expected) assert.deepEqual(c.boardState,expected); else expected=structuredClone(c.boardState);
            const snapshot=structuredClone(c.islandsSession), tiles=structuredClone(c.boardState);
            c.isLifePlaying=true;c.gameLoop();const next=structuredClone(c.boardState);
            c.boardState=tiles;c.applyMacroRules(rules(snapshot));c.gameLoop();
            assert.deepEqual(c.boardState,next);
        }
    });
}

test('proximity seed metadata is accepted by the actual recipe parser',()=>{
    const c=vm.createContext({restoreIslandsSession,restoreIslandsBoard});
    vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),c);
    const session=createIslandsSession(7,'proximity');
    const recipe=`[12:00:00.000] ISLANDS_INIT -> ${JSON.stringify({recordingVersion:2,...session})}\n[12:00:00.001] PLAY -> ${rules(session)}\n[12:00:00.002] [GEN:10] PAUSE -> ---`;
    assert.equal(c.parseMacroText(recipe).length,3);
    assert.throws(()=>c.parseMacroText(recipe.replaceAll('"mode":"proximity"','"mode":"invalid"')),/Unsupported/);
});

test('live Islands cycling logs generations and replays without pause or seed reset',()=>{
    function wire(c){
        c.window={logArtEvent(){}};c.isExecutingMacroCommand=false;c.isMacroLoaded=false;
        c.artRecipeLog=[];c.createIslandsSession=createIslandsSession;
        const start=source.indexOf('window.logArtEvent = function');
        vm.runInContext(source.slice(start,source.indexOf('// ------------------------------------------',start)),c);
        vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),c);
        vm.runInContext(source.slice(source.indexOf('function nextEvolutionMode('),source.indexOf('function cycleBrightnessEvoMode(')),c);
        const cycle=source.match(/function cycleIslandsMode\([^)]*\) \{[\s\S]*?^\}/m)[0];
        vm.runInContext(cycle,c);
        const other=c.executeMacroAction;
        vm.runInContext(source.slice(source.indexOf('function executeMacroAction('),source.indexOf('async function initializeApp(')),c);
        const actual=c.executeMacroAction;
        c.executeMacroAction=action=>action.eventName==='Islands Mode Changed' ? actual(action) : other(action);
    }
    const c=harness();wire(c);c.isMacroPlaying=false;c.isLifePlaying=false;
    c.window.logArtEvent('INIT_STATE',JSON.stringify({recipeVersion:2,n:21,pal:0,sep:0,sort:'luminance',board:'441x0'}));
    c.isLifePlaying=true;
    for(let gen=1;gen<=30;gen++){
        c.gameLoop();
        if([5,12,19,24].includes(gen)){
            const before={...c.islandsSession};c.cycleIslandsMode();
            assert.equal(c.isLifePlaying,true);assert.equal(c.currentGenerationCount,gen);
            for(const key of ['seed','state','steps'])assert.equal(c.islandsSession[key],before[key]);
        }
    }
    c.window.logArtEvent('PAUSE','---');
    const actions=c.parseMacroText(c.artRecipeLog.join('\n')).filter(a=>a.eventName!=='INIT_STATE');
    assert.deepEqual(JSON.parse(JSON.stringify(actions.filter(a=>a.eventName==='Islands Mode Changed').map(a=>[a.targetGen,JSON.parse(a.details).mode]))),
        [[5,'proximity'],[12,'classic'],[19,'proximity'],[24,'classic']]);
    for(const frameMs of [8,33,100]){
        const replay=harness();wire(replay);replay.macroQueue=actions;
        for(let time=0;replay.isLifePlaying&&time<10000;time+=frameMs)replay.gameLoop();
        assert.equal(replay.currentGenerationCount,30);assert.deepEqual(replay.boardState,c.boardState);
        assert.deepEqual(replay.islandsSession,c.islandsSession);
    }
    assert.throws(()=>c.parseMacroText(c.artRecipeLog.join('\n').replace('"mode":"proximity"','"mode":"invalid"')),/Invalid Islands mode/);
});
