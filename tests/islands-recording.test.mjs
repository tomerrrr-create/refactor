import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createIslandsSession, restoreIslandsSession, runIslandsGeneration, restoreIslandsBoard } from '../js/simulations/islands.js';

const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(seed=123){
    const context=vm.createContext({
        restoreIslandsSession, runIslandsGeneration, islandsSession:createIslandsSession(seed),
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
