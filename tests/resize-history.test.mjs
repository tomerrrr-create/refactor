import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const copy=v=>JSON.parse(JSON.stringify(v));
function harness(live=false){
 const logs=[],h=vm.createContext({n:5,isAnimating:false,isLifePlaying:live,boardState:Array.from({length:25},(_,i)=>({k:i,v:i,isGold:i===0})),separatorPx:1,separatorIsSnapshot:true,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
 history:[],future:[],C:{HISTORY_LIMIT:100,SIZES:[9,7,5,3,1]},nextHistoryActionId:1,artRecipeLog:[],historyRecipeCursor:0,hasPerformedInitialAutofill:false,
 simulationStartState:null,finishBrushGesture(){},windPainter:{stop(){}},animateBoardTransition:fn=>fn(),renderToScreen(){},updateUndoRedoButtons(){},getHistorySettings:s=>({n:s.n}),
 window:{logArtEvent:(event,detail)=>{logs.push([event,detail]);h.artRecipeLog.push([event,detail]);}},
 getCurrentState:()=>({n:h.n,tiles:copy(h.boardState)}),areStatesEqual:(a,b)=>JSON.stringify(a)===JSON.stringify(b),applyState:s=>{h.n=s.n;h.boardState=copy(s.tiles);},
 initializeBoardAndCanvas:()=>{h.boardState=Array.from({length:h.n*h.n},()=>({k:0,v:0,isGold:false}));},
 pauseLife:()=>{if(!h.isLifePlaying)return;h.isLifePlaying=false;h.pushHistory({before:h.simulationStartState,after:h.getCurrentState()});h.simulationStartState=null;},
 togglePlayPauseLife:()=>{h.isLifePlaying=true;h.simulationStartState=h.getCurrentState();}});
 vm.runInContext(source.slice(source.indexOf('      function pushHistory('),source.indexOf('      function updateUndoRedoButtons(')),h);
 vm.runInContext(source.slice(source.indexOf('      function _performResize('),source.indexOf('function syncDlaCrystalState(')),h);
 h.simulationStartState=live?h.getCurrentState():null;return {h,logs};
}
test('preset and custom resizing preserve every board cell and gold through drawing, Undo and Redo',()=>{
 for(const target of [3,7,1,9]){const {h}=harness(),initial=h.getCurrentState();h.resizeBoard(target);const resized=h.getCurrentState();h.performAction(()=>{h.boardState[0]={k:99,v:99,isGold:false};});const drawn=h.getCurrentState();assert.equal(h.history.length,2);h.undo();assert.deepEqual(h.getCurrentState(),resized);h.undo();assert.deepEqual(h.getCurrentState(),initial);h.redo();assert.deepEqual(h.getCurrentState(),resized);h.redo();assert.deepEqual(h.getCurrentState(),drawn);}
});
test('live resize ends the old run before the resize and starts a new-size history segment',()=>{
 const {h,logs}=harness(true),old=h.getCurrentState();h.boardState[4].k=77;const evolved=h.getCurrentState();h.resizeGrid(true);const resized=h.getCurrentState();assert(h.isLifePlaying);assert.equal(h.n,7);assert.equal(h.simulationStartState.n,7);assert.deepEqual(h.history.map(a=>[a.before.n,a.after.n]),[[5,5],[5,7]]);h.boardState[0].k=66;h.pauseLife();const end=h.getCurrentState();h.undo();assert.deepEqual(h.getCurrentState(),resized);h.undo();assert.deepEqual(h.getCurrentState(),evolved);h.undo();assert.deepEqual(h.getCurrentState(),old);h.redo();h.redo();h.redo();assert.deepEqual(h.getCurrentState(),end);assert.equal(logs.filter(([name])=>name==='GRID_RESIZE').length,1);
});
test('same-size requests and requests during transitions leave history untouched',()=>{
 const {h}=harness();h.resizeBoard(5);h.isAnimating=true;h.resizeBoard(7);assert.equal(h.n,5);assert.equal(h.history.length,0);
});
