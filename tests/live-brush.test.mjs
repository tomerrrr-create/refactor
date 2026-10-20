import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function harness({live=true,continuous=false,brush=1,symmetry='off'}={}){
 const logs=[],history=[],captures=new Set(),timers=new Map();let snapshots=0,serial=0,syncs=0;
 const rng=Object.create(Math);rng.random=()=>.75;
 const canvas={setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:0,top:0,right:90,bottom:90})};
 const c=vm.createContext({n:9,boardState:Array.from({length:81},()=>({k:3,v:3,isGold:false})),isLifePlaying:live,
  simulationStartState:live?{}:null,isBreathing:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
  windMode:false,windPainter:{down:()=>true,move(){},up(){}},windPointerId:null,canvas,brushSize:brush,symmetryMode:symmetry,
  isBrushModeOn:true,isContinuousBrushOn:continuous,isRainbowModeActive:false,selectedColorIndex:0,selectedColor:'#000000',
  armedSimulation:'gravitationalSort',dlaState:null,performance:{now:()=>100},Math:rng,Map,Set,
  setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),C:{LONG_PRESS_SHOW_MS:600},
  paletteLen:()=>16,startAnimationLoop(){},getTileIndexFromCoords:(x,y)=>x<0||y<0||x>=90||y>=90?-1:Math.floor(y/10)*9+Math.floor(x/10),
  getCurrentState:()=>{snapshots++;return {n:9,tiles:copy(c.boardState)};},
  areStatesEqual:(a,b)=>JSON.stringify(a.tiles.map(t=>[t.k,t.isGold]))===JSON.stringify(b.tiles.map(t=>[t.k,t.isGold])),
  pushHistory:entry=>history.push(copy(entry)),window:{logArtEvent:(name,data)=>logs.push({name,data:JSON.parse(data),generation:c.isLifePlaying?c.generation:null})},
  generation:12,hasPerformedInitialAutofill:false,syncDlaCrystalState:()=>syncs++,
  performAction:fn=>fn(),resetSelectedColor(){throw Error('holding a live brush must not clear its color');},modals:{openColorPickerModal(){throw Error('must not open a modal while drawing live');}},
  animateBoardTransition:fn=>fn(),toggleMacroFullScreen(){}});
 vm.runInContext(source.slice(source.indexOf('function applyActionToTiles('),source.indexOf('let windMode =')),c);
 vm.runInContext(source.slice(source.indexOf('function getTilesInRadius('),source.indexOf('      function updateSymmetryButtonUI(')),c);
 vm.runInContext(source.slice(source.indexOf('const pointerState ='),source.indexOf('function updateLayout()'))+'\nglobalThis.pointer=pointerState;',c);
 const event=(type,x,y,id=1,extra={})=>({type,clientX:x,clientY:y,pointerId:id,button:0,isPrimary:true,target:canvas,preventDefault(){},...extra});
 return {c,logs,history,timers,captures,get snapshots(){return snapshots;},get syncs(){return syncs;},
 down:(x,y,id=1,extra={})=>c.onPointerDown(event('pointerdown',x,y,id,extra)),
 move:(x,y,id=1)=>c.onPointerMove(event('pointermove',x,y,id)),up:(x,y,id=1,type='pointerup')=>c.onPointerUp(event(type,x,y,id))};
}

test('live thick/symmetric taps use the selected color and do not snapshot simulation generations',()=>{
 const h=harness({brush:3,symmetry:'mandala'});h.down(25,25);h.up(25,25);
 assert(h.logs.length===1);const writes=h.logs[0].data;assert(writes.length>5);assert(writes.every(t=>t.k===0));
 assert.equal(h.logs[0].generation,12);assert.equal(h.c.isLifePlaying,true);assert.equal(h.snapshots,0);assert.equal(h.history.length,0);assert.equal(h.c.pointer.id,null);
});
test('live drag packets contain only brush writes, not unrelated simulation edits or an end-of-drag snapshot',()=>{
 const h=harness();h.down(15,15);h.c.boardState[80].k=12;h.move(35,15);h.c.generation=20;
 h.c.boardState[10].k=9;h.move(55,15);h.up(55,15);
 assert.equal(h.logs.length,2);assert.deepEqual(h.logs.map(e=>e.generation),[12,20]);
 assert.deepEqual(h.logs.flatMap(e=>e.data.map(t=>t.i)),[10,12,14]);assert.equal(h.c.boardState[10].k,9);assert.equal(h.c.boardState[80].k,12);
 assert.equal(h.snapshots,0);assert.equal(h.history.length,0);
});
test('live continuous brush fills a fast segment delivered only on pointerup, including rainbow',()=>{
 const h=harness({continuous:true});h.c.isRainbowModeActive=true;h.down(15,15);h.up(75,15);
 const indices=h.logs.flatMap(e=>e.data.map(t=>t.i));assert.deepEqual(indices,[10,11,12,13,14,15,16]);assert(indices.every(i=>h.c.boardState[i].k>=0&&h.c.boardState[i].k<16));
});
test('paused drawing retains one history action and one packet for the whole gesture',()=>{
 const h=harness({live:false});h.down(15,15);h.move(35,15);h.move(55,15);assert.equal(h.logs.length,0);h.up(55,15);
 assert.equal(h.logs.length,1);assert.equal(h.history.length,1);assert.equal(h.snapshots,2);assert.equal(h.logs[0].generation,null);
});
test('painting unchanged colors creates no empty undo action; changing gold alone is recorded',()=>{
 const h=harness({live:false});h.c.boardState[10].k=h.c.boardState[10].v=0;h.down(15,15);h.up(15,15);assert.equal(h.logs.length,0);assert.equal(h.history.length,0);
 h.c.boardState[10].isGold=true;h.down(15,15);h.up(15,15);assert.equal(h.logs.length,1);assert.equal(h.c.boardState[10].isGold,false);assert.equal(h.history.length,1);
});
test('copy brush records copied gold status as well as color',()=>{
 const h=harness({live:false});h.c.isBrushModeOn=false;h.c.boardState[10].isGold=true;h.down(15,15);h.move(35,15);h.up(35,15);
 assert.deepEqual(h.logs[0].data,[{i:12,k:3,isGold:true}]);assert.equal(h.c.boardState[12].isGold,true);
});
test('cancellation commits only already-painted cells and releases pointer ownership without a stray tap',()=>{
 const h=harness();h.down(15,15);h.move(35,15);const count=h.logs.length;h.c.finishBrushGesture();h.up(75,15);
 assert.equal(h.logs.length,count);assert.equal(h.c.pointer.id,null);assert.equal(h.captures.size,0);assert.equal(h.c.boardState[16].k,3);
 const paused=harness({live:false});paused.down(15,15);paused.up(15,15,1,'pointercancel');assert.equal(paused.history.length,0);assert.equal(paused.logs.length,0);
});
test('live input ignores secondary touches, right clicks and a loaded macro',()=>{
 const h=harness();h.down(15,15,2,{isPrimary:false});h.down(15,15,2,{button:2});assert.equal(h.c.pointer.id,null);
 h.down(15,15);h.down(35,15,2);assert.equal(h.c.pointer.id,1);h.up(35,15,2);assert.equal(h.logs.length,0);h.up(15,15);
 h.c.isMacroLoaded=true;h.down(15,15);assert.equal(h.c.pointer.id,null);
});
test('Wind owns all board input while active and never creates brush samples',()=>{
 const h=harness();const events=[];h.c.windMode=true;h.c.windPainter={down:()=>{events.push('down');return true;},move:()=>events.push('move'),up:()=>events.push('up')};
 h.down(15,15);h.move(35,15);h.up(35,15);assert.deepEqual(events,['down','move','up']);assert.equal(h.logs.length,0);assert.equal(h.c.pointer.id,null);
});
test('DLA resynchronizes its crystal after a live brush sample; live holds schedule no color-reset timer',()=>{
 const h=harness();h.c.armedSimulation='dla';h.c.dlaState={};h.down(15,15);assert.equal(h.timers.size,0);h.move(35,15);assert.equal(h.syncs,1);h.up(35,15);assert.equal(h.syncs,1);
});
test('state equality checks corresponding tiles, so an unchanged breathing session is not an undo action',()=>{
 const c=vm.createContext({});vm.runInContext(source.slice(source.indexOf('      function areStatesEqual('),source.indexOf('      function applyState(')),c);
 const a={n:1,tiles:[{k:0,isGold:false}]};assert(c.areStatesEqual(a,copy(a)));assert(!c.areStatesEqual(a,{...a,tiles:[{k:1,isGold:false}]}));assert(!c.areStatesEqual(a,{...a,tiles:[{k:0,isGold:true}]}));
});

test('macro brush packets edit the live board without taking per-packet snapshots; old arrays and gold copies remain readable',()=>{
 let snapshots=0,syncs=0;const entries=[];
 const c=vm.createContext({boardState:[{k:3,v:3,isGold:true},{k:2,v:2,isGold:false}],isLifePlaying:true,simulationStartState:{},
  performance:{now:()=>100},getCurrentState:()=>{snapshots++;return {};},renderToScreen(){},startAnimationLoop(){},pushHistory:e=>entries.push(e),
  armedSimulation:'dla',dlaState:{},syncDlaCrystalState:()=>syncs++,console:{error:(label,error)=>{throw error;}}});
 const start=source.indexOf("        else if (action.eventName === 'DRAW_STROKE'");
 const end=source.indexOf('        isExecutingMacroCommand = false;',start);
 vm.runInContext('function replay(action){'+source.slice(start,end).replace('else if','if')+'}',c);
 c.replay({eventName:'DRAW_STROKE',details:'[{"i":0,"k":0},{"i":1,"k":4,"isGold":true}]'});
 assert.equal(c.boardState[0].k,0);assert.equal(c.boardState[0].isGold,false);assert.equal(c.boardState[1].isGold,true);assert.equal(snapshots,0);assert.equal(entries.length,0);assert.equal(syncs,1);
 c.isLifePlaying=false;c.replay({eventName:'DRAW_STROKE',details:'[{"i":1,"k":2}]'});assert.equal(c.boardState[1].isGold,false);assert.equal(snapshots,2);assert.equal(entries.length,1);
});
test('Undo ends live input and pauses the run before restoring its complete combined action; Redo restores the result',()=>{
 const events=[],initial={tiles:[{k:0}]},final={tiles:[{k:2}]};let restored;
 const c=vm.createContext({isExecutingMacroCommand:false,isLifePlaying:true,history:[],future:[],artRecipeLog:[],historyRecipeCursor:0,
  finishBrushGesture:()=>events.push('finish'),windPainter:{stop:()=>events.push('wind-stop')},
  pauseLife:()=>{events.push('pause');c.isLifePlaying=false;c.history.push({id:1,before:initial,after:final});},applyState:s=>restored=s,
  window:{logArtEvent(){}},getHistorySettings:()=>({}),updateUndoRedoButtons(){}});
 vm.runInContext(source.slice(source.indexOf('      function undo()'),source.indexOf('      function updateUndoRedoButtons()')),c);
 c.undo();assert.deepEqual(events,['finish','wind-stop','pause']);assert.equal(restored,initial);assert.equal(c.future.length,1);c.redo();assert.equal(restored,final);assert.equal(c.history.length,1);
});
test('the Undo control is available during the first live run before any history entry exists',()=>{
 const c=vm.createContext({history:[],future:[],isLifePlaying:true,simulationStartState:{},dom:{btnUndo:{},btnRedo:{}}});
 vm.runInContext(source.slice(source.indexOf('      function updateUndoRedoButtons()'),source.indexOf('      function getPaletteColor(')),c);
 c.updateUndoRedoButtons();assert.equal(c.dom.btnUndo.disabled,false);assert.equal(c.dom.btnRedo.disabled,true);
 c.isLifePlaying=false;c.updateUndoRedoButtons();assert.equal(c.dom.btnUndo.disabled,true);
 c.future.push({});c.updateUndoRedoButtons();assert.equal(c.dom.btnRedo.disabled,false);
});
