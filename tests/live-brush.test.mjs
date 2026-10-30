import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {getBrushTiles} from '../js/brush-footprint.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function harness({live=true,continuous=false,brush=1,shape='circle',symmetry='off',progressive=false}={}){
 const logs=[],checkpoints=[],history=[],captures=new Set(),timers=new Map();let snapshots=0,serial=0,syncs=0;
 const rng=Object.create(Math);rng.random=()=>.75;
 const canvas={setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:0,top:0,right:90,bottom:90})};
 const c=vm.createContext({clearPaletteColorTransition() {}, capturePaletteColors() { return null; }, showPaletteColorTransition() {}, dom: { board: {} }, n:9,boardState:Array.from({length:81},()=>({k:3,v:3,isGold:false})),isLifePlaying:live,
  recordPausedBrushMotion:progressive,replayBrushBefore:null,simulationStartState:live?{}:null,simulationHasBrushInput:false,isBreathing:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
  windMode:false,windPainter:{down:()=>true,move(){},up(){}},windPointerId:null,canvas,brushSize:brush,brushShape:shape,getBrushTiles,symmetryMode:symmetry,
  isBrushModeOn:true,isContinuousBrushOn:continuous,isRainbowModeActive:false,selectedColorIndex:0,selectedColor:'#000000',
  armedSimulation:'gravitationalSort',dlaState:null,performance:{now:()=>100},Math:rng,Map,Set,
  setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),C:{LONG_PRESS_SHOW_MS:600},
  paletteLen:()=>16,startAnimationLoop(){},getTileIndexFromCoords:(x,y)=>x<0||y<0||x>=90||y>=90?-1:Math.floor(y/10)*9+Math.floor(x/10),
  getCurrentState:()=>{snapshots++;return {n:9,tiles:copy(c.boardState)};},
  areStatesEqual:(a,b)=>JSON.stringify(a.tiles.map(t=>[t.k,t.isGold]))===JSON.stringify(b.tiles.map(t=>[t.k,t.isGold])),
  pushHistory:entry=>history.push(copy(entry)),window:{logArtEvent:(name,data)=>{const entry={name,data:name==='DRAW_STROKE'?JSON.parse(data):data,generation:c.isLifePlaying?c.generation:null};(['BRUSH_CHECKPOINT','BRUSH_CONTINUE'].includes(name)?checkpoints:logs).push(entry);}},
  generation:12,currentGenerationCount:12,breatheStartTime:0,hasPerformedInitialAutofill:false,syncDlaCrystalState:()=>syncs++,
  performAction:fn=>fn(),resetSelectedColor(){throw Error('holding a live brush must not clear its color');},modals:{openColorPickerModal(){throw Error('must not open a modal while drawing live');}},
  animateBoardTransition:fn=>fn(),toggleMacroFullScreen(){}});
 if(live)c.simulationStartState={n:9,tiles:copy(c.boardState)};
 vm.runInContext(source.slice(source.indexOf('function applyActionToTiles('),source.indexOf('let windMode =')),c);
 vm.runInContext(source.slice(source.indexOf('function getTilesInRadius('),source.indexOf('      function updateSymmetryButtonUI(')),c);
 vm.runInContext(source.slice(source.indexOf('const pointerState ='),source.indexOf('function updateLayout()'))+'\nglobalThis.pointer=pointerState;',c);
 const event=(type,x,y,id=1,extra={})=>({type,clientX:x,clientY:y,pointerId:id,button:0,isPrimary:true,target:canvas,preventDefault(){},...extra});
 return {c,logs,checkpoints,history,timers,captures,get snapshots(){return snapshots;},get syncs(){return syncs;},
 down:(x,y,id=1,extra={})=>c.onPointerDown(event('pointerdown',x,y,id,extra)),
 move:(x,y,id=1)=>c.onPointerMove(event('pointermove',x,y,id)),up:(x,y,id=1,type='pointerup')=>c.onPointerUp(event(type,x,y,id))};
}

test('live thick/symmetric taps snapshot only the single brush boundary',()=>{
 const h=harness({brush:3,symmetry:'mandala'});h.down(25,25);h.up(25,25);
 assert(h.logs.length===1);const writes=h.logs[0].data;assert(writes.length>5);assert(writes.every(t=>t.k===0));
 assert.equal(h.logs[0].generation,12);assert.equal(h.c.isLifePlaying,true);assert.equal(h.snapshots,1);assert.equal(h.history.length,1);assert.equal(h.c.pointer.id,null);
});
test('live drag packets contain only brush writes, not unrelated simulation edits or an end-of-drag snapshot',()=>{
 const h=harness();h.down(15,15);h.c.boardState[80].k=12;h.move(35,15);h.c.generation=20;
 h.c.boardState[10].k=9;h.move(55,15);h.up(55,15);
 assert.equal(h.logs.length,2);assert.deepEqual(h.logs.map(e=>e.generation),[12,20]);
 assert.deepEqual(h.logs.flatMap(e=>e.data.map(t=>t.i)),[10,12,14]);assert.equal(h.c.boardState[10].k,9);assert.equal(h.c.boardState[80].k,12);
 assert.equal(h.snapshots,1);assert.equal(h.history.length,1,'the simulated lead-in is a separate history action');
});
test('live continuous brush fills a fast segment delivered only on pointerup, including rainbow',()=>{
 const h=harness({continuous:true});h.c.isRainbowModeActive=true;h.down(15,15);h.up(75,15);
 const indices=h.logs.flatMap(e=>e.data.map(t=>t.i));assert.deepEqual(indices,[10,11,12,13,14,15,16]);assert(indices.every(i=>h.c.boardState[i].k>=0&&h.c.boardState[i].k<16));
});
test('paused drawing retains one history action and one packet for the whole gesture',()=>{
 const h=harness({live:false});h.down(15,15);h.move(35,15);h.move(55,15);assert.equal(h.logs.length,0);h.up(55,15);
 assert.equal(h.logs.length,1);assert.equal(h.history.length,1);assert.equal(h.snapshots,2);assert.equal(h.logs[0].generation,null);
});
test('unchanged-color strokes retain their intent and undo entry; changing gold alone is recorded',()=>{
 const h=harness({live:false});h.c.boardState[10].k=h.c.boardState[10].v=0;h.down(15,15);h.up(15,15);assert.equal(h.logs.length,1);assert.equal(h.history.length,1);
 h.c.boardState[10].isGold=true;h.down(15,15);h.up(15,15);assert.equal(h.logs.length,2);assert.equal(h.c.boardState[10].isGold,false);assert.equal(h.history.length,2);
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
  replayBrushBefore:null,performance:{now:()=>100},getCurrentState:()=>{snapshots++;return {};},renderToScreen(){},startAnimationLoop(){},pushHistory:e=>entries.push(e),
  armedSimulation:'dla',dlaState:{},syncDlaCrystalState:()=>syncs++,console:{error:(label,error)=>{throw error;}}});
 const start=source.indexOf("        else if (action.eventName === 'DRAW_STROKE'");
 const end=source.indexOf('        isExecutingMacroCommand = false;',start);
 vm.runInContext('function replay(action){'+source.slice(start,end).replace('else if','if')+'}',c);
 c.replay({eventName:'DRAW_STROKE',details:'[{"i":0,"k":0},{"i":1,"k":4,"isGold":true}]'});
 assert.equal(c.boardState[0].k,0);assert.equal(c.boardState[0].isGold,false);assert.equal(c.boardState[1].isGold,true);assert.equal(snapshots,0);assert.equal(entries.length,0);assert.equal(syncs,1);assert.equal(c.simulationHasBrushInput,true);
 c.isLifePlaying=false;c.replay({eventName:'DRAW_STROKE',details:'[{"i":1,"k":2}]'});assert.equal(c.boardState[1].isGold,false);assert.equal(snapshots,2);assert.equal(entries.length,1);
});
test('Undo ends live input and pauses the run before restoring its complete combined action; Redo restores the result',()=>{
 const events=[],initial={tiles:[{k:0}]},final={tiles:[{k:2}]};let restored;
 const c=vm.createContext({isExecutingMacroCommand:false,isMacroPlaying:false,isLifePlaying:true,history:[],future:[],artRecipeLog:[],historyRecipeCursor:0,getCurrentState:()=>restored,
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

for (const live of [false,true]) test(`${live?'running':'paused'}: a thick mirrored stroke on matching colors repaints its entire footprint on a different replay board`,()=>{
 const h=harness({live,continuous:true,brush:3,symmetry:'vertical'});
 h.c.boardState.forEach(t=>{t.k=t.v=0;});if(h.c.isLifePlaying)h.c.simulationStartState={n:9,tiles:copy(h.c.boardState)};
 h.down(15,15);h.up(75,15);
 const footprint=new Set();
 for(const row of [0,2,6,8])for(let col=1;col<=7;col++)footprint.add(row*9+col);
 for(const row of [1,7])for(let col=0;col<=8;col++)footprint.add(row*9+col);
 const recorded=h.logs.flatMap(e=>e.data);
 assert.equal(recorded.length,46);assert.deepEqual(new Set(recorded.map(t=>t.i)),footprint);assert(recorded.every(t=>t.k===0));
 assert.equal(h.history.length,1);if(live)assert.equal(h.snapshots,1);
 // Replay real DRAW_STROKE handlers on colors that did not exist under the
 // original brush. Every touched cell must be painted; others must stay intact.
 const start=source.indexOf("        else if (action.eventName === 'DRAW_STROKE'");
 const end=source.indexOf('        isExecutingMacroCommand = false;',start);
 h.c.renderToScreen=()=>{};h.c.console={error:(label,error)=>{throw error;}};
 vm.runInContext('function replay(action){'+source.slice(start,end).replace('else if','if')+'}',h.c);
 h.c.boardState.forEach(t=>{t.k=t.v=5;});
 for(const packet of h.logs)h.c.replay({eventName:'DRAW_STROKE',details:JSON.stringify(packet.data)});
 h.c.boardState.forEach((tile,i)=>assert.equal(tile.k,footprint.has(i)?0:5,`cell ${i}`));
});

test('an unchanged-color live stroke still owns a combined history action when the simulation pauses',()=>{
 const h=harness();h.c.armedSimulation='breathe';h.c.boardState.forEach(t=>{t.k=t.v=0;});h.c.simulationStartState={n:9,tiles:copy(h.c.boardState)};if(h.c.isLifePlaying)h.c.simulationStartState={n:9,tiles:copy(h.c.boardState)};
 h.down(15,15);h.up(15,15);assert.equal(h.c.simulationHasBrushInput,true);
 Object.assign(h.c,{animationFrameId:null,setSimulationRunning(){},cancelAnimationFrame(){},updateUndoRedoButtons(){},
  dom:{iconPlay:{style:{}},iconPause:{style:{}},btnStepForward:{}}});
 vm.runInContext(source.slice(source.indexOf('function pauseLife()'),source.indexOf('      function togglePlayPauseLife(')),h.c);
 h.c.pauseLife();assert.equal(h.history.length,2);assert.equal(h.c.simulationHasBrushInput,false);
 // A later untouched, visually unchanged breathing run stays a genuine no-op.
 h.c.simulationStartState=h.c.getCurrentState();h.c.isLifePlaying=true;h.c.pauseLife();assert.equal(h.history.length,2);
});

for(const tool of ['rainbow','copy'])test(`${tool} also records an unchanged-color paint intent while paused`,()=>{
 const h=harness({live:false});const color=tool==='rainbow'?12:3;
 h.c.boardState.forEach(t=>{t.k=t.v=color;});
 if(tool==='rainbow')h.c.isRainbowModeActive=true;else h.c.isBrushModeOn=false;
 h.down(15,15);if(tool==='copy')h.move(35,15);h.up(tool==='copy'?35:15,15);
 assert.equal(h.logs.length,1);assert.deepEqual(h.logs[0].data,[{i:tool==='copy'?12:10,k:color}]);
 assert(h.c.boardState.every(t=>t.k===color));assert.equal(h.history.length,1);
});

for (const cancelled of [false,true]) test('paused progressive stroke records motion with one undo, including cancellation='+cancelled,()=>{
 const h=harness({live:false,progressive:true,continuous:true});
 h.c.boardState.forEach(t=>{t.k=t.v=0;});if(h.c.isLifePlaying)h.c.simulationStartState={n:9,tiles:copy(h.c.boardState)};
 h.down(15,15);h.move(35,15);h.move(55,15);
 assert.equal(h.history.length,0);assert.equal(h.logs[0].name,'BRUSH_START');
 assert.equal(h.logs.filter(e=>e.name==='DRAW_STROKE').length,2);
 h.up(55,15,1,cancelled?'pointercancel':'pointerup');
 assert.equal(h.logs.at(-1).name,'BRUSH_END');assert.equal(h.history.length,1);
 assert.equal(h.logs.filter(e=>e.name==='BRUSH_START').length,1);
 const writes=h.logs.filter(e=>e.name==='DRAW_STROKE').flatMap(e=>e.data);
 assert(writes.every(t=>t.k===0));assert(writes.length>=5);assert.equal(h.c.pointer.id,null);
});
test('cancelled paused tap emits no empty motion group',()=>{
 const h=harness({live:false,progressive:true});h.down(15,15);h.up(15,15,1,'pointercancel');
 assert.equal(h.logs.length,0);assert.equal(h.history.length,0);
});

test('macro groups paused motion into one undo action, independently of the recording preference',()=>{
 const h=harness({live:false});h.c.renderToScreen=()=>{};
 const start=source.indexOf("        else if (action.eventName === 'BRUSH_START'");
 const end=source.indexOf('        isExecutingMacroCommand = false;',start);
 vm.runInContext(source.slice(source.indexOf('function finishBrushReplay()'),source.indexOf('function stopMacro()'))+'function replay(action){'+source.slice(start,end).replace('else if','if')+'}',h.c);
 h.c.replay({eventName:'BRUSH_START',details:'{"version":1}'});
 for(const i of [0,1,2])h.c.replay({eventName:'DRAW_STROKE',details:JSON.stringify([{i,k:0}])});
 assert.equal(h.history.length,0);h.c.replay({eventName:'BRUSH_END',details:'{"version":1}'});
 assert.equal(h.history.length,1);assert.equal(h.history[0].before.tiles[0].k,3);assert.equal(h.history[0].after.tiles[2].k,0);
 assert.equal(h.c.replayBrushBefore,null);
});

for(const shape of ['circle','square','diamond']) for(const live of [false,true]) {
 test(`${shape} XL paints safely in ${live?'live simulation':'creative'} mode, one stroke and correct history ownership`,()=>{
  const h=harness({live,brush:23,shape});
  h.down(45,45); h.up(45,45);
  assert(h.c.boardState.every(tile=>tile.k===0));
  assert.equal(h.history.length,1);
  if(!live) assert.equal(h.logs.filter(log=>log.name==='DRAW_STROKE').length,1);
 });
}

for(const shape of ['circle','square','diamond','ring','line']) for(const symmetry of ['off','vertical','horizontal','mandala','kaleidoscope']) {
 test(`${shape} tap mirrors the complete footprint in ${symmetry} symmetry`,()=>{
  const h=harness({live:false,brush:3,shape,symmetry});
  h.down(15,15);h.up(15,15);
  const copies=symmetry==='off'?1:['horizontal','vertical'].includes(symmetry)?2:4;
  const area=shape==='square'?9:shape==='ring'?4:shape==='line'?3:5;
  // Kaleidoscope also transposes the line, creating vertical copies.
  const expected=shape==='line'&&symmetry==='kaleidoscope'?20:area*copies;
  assert.equal(h.c.boardState.filter(tile=>tile.k===0).length,expected);
  assert.equal(h.history.length,1);
 });
}

function enableLiveUndo(h) {
 const c=h.c;
 Object.assign(c,{animationFrameId:null,setSimulationRunning(){},cancelAnimationFrame(){},updateUndoRedoButtons(){},
  history:h.history,future:[],artRecipeLog:[],historyRecipeCursor:0,getHistorySettings:()=>({}),
  applyState:s=>{c.boardState=copy(s.tiles);}});
 c.windPainter.stop=()=>{};
 Object.assign(c.dom,{iconPlay:{style:{}},iconPause:{style:{}},btnStepForward:{}});
 vm.runInContext(source.slice(source.indexOf('function pauseLife()'),source.indexOf('      function togglePlayPauseLife(')),c);
 vm.runInContext(source.slice(source.indexOf('      function undo()'),source.indexOf('      function updateUndoRedoButtons()')),c);
}
test('live Undo stops at the latest brush boundary, preserves earlier generations, and Redo restores the result',()=>{
 const h=harness();enableLiveUndo(h);h.c.boardState[80].k=h.c.boardState[80].v=12;
 const before=copy(h.c.boardState);h.down(15,15);assert.equal(h.snapshots,0,'do not snapshot a pointerdown that might cancel');
 h.move(35,15);const boundary=h.c.simulationStartState;
 for(let x=4;x<=7;x++)h.move(x*10+5,15);
 h.up(75,15);assert.equal(h.snapshots,1,'one snapshot for the entire stroke');assert(h.c.isLifePlaying);
 assert.equal(h.c.currentGenerationCount,12,'drawing never resets the generation counter');
 assert.deepEqual(h.history[0].after,boundary);assert.deepEqual(boundary.tiles,before);
 h.c.boardState[79].k=h.c.boardState[79].v=8;const after=copy(h.c.boardState);
 h.c.undo();assert.equal(h.c.isLifePlaying,false);assert.deepEqual(h.c.boardState,before);
 h.c.redo();assert.deepEqual(h.c.boardState,after);
 h.c.undo();h.c.undo();assert(h.c.boardState.every(t=>t.k===3),'a second Undo can still undo the earlier simulation');
});
test('each live stroke creates its own boundary, but cancelled untouched input creates none',()=>{
 const h=harness();enableLiveUndo(h);
 h.down(15,15);h.up(15,15,1,'pointercancel');assert.equal(h.snapshots,0);assert.equal(h.checkpoints.length,0);
 h.c.boardState[80].k=h.c.boardState[80].v=12;
 const first=copy(h.c.boardState);h.down(15,15);h.up(15,15);
 h.c.boardState[79].k=h.c.boardState[79].v=8;
 const second=copy(h.c.boardState);h.down(35,15);h.up(35,15);
 assert.equal(h.snapshots,2);assert.equal(h.checkpoints.length,4);
 h.c.undo();assert.deepEqual(h.c.boardState,second);h.c.undo();assert.deepEqual(h.c.boardState,first);
});
