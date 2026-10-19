import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {recordWindWave,validateWindCommand,prepareWindMacro,createWindReplay} from '../js/wind-recording.js';
import {createWindPainter,createWindWave,applyWindCell,WIND_DURATION,WIND_MAX_WAVES} from '../js/wind-paint.js';
import {DEFAULT_WIND_SETTINGS} from '../js/wind-settings.js';

const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const record=(batch='batch-a',elapsed=0,settings=DEFAULT_WIND_SETTINGS)=>recordWindWave(createWindWave(31,480,64,9,0,settings),settings,batch,elapsed);
const action=(name,value,gen=null)=>({eventName:name,details:JSON.stringify(value),isGenBased:gen!==null,targetGen:gen,delta:0});
const end=(batch,elapsed,reason='complete')=>({windVersion:1,batch,elapsed,reason});
function engine(n=31){
 let time=0,serial=0;const frames=new Map(),board=Array.from({length:n*n},(_,i)=>({k:i%64,v:i%64,isGold:i===0}));
 let renders=0,idles=0;
 const replay=createWindReplay({context:()=>({n,paletteLength:64}),paint:(i,k,w)=>applyWindCell(board,i,k,w,time),
  onFrame:()=>renders++,onIdle:()=>idles++,now:()=>time,requestFrame:fn=>{frames.set(++serial,fn);return serial;},cancelFrame:id=>frames.delete(id),reducedMotion:()=>false});
 return {replay,board,frames,set time(value){time=value;},get renders(){return renders;},get idles(){return idles;},
  tick(value){time=value;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}};
}

test('recorded waves retain mode-specific settings, origin and paint rank without any board payload',()=>{
 for(const mode of ['ripple','paint','displace']){
  const settings={...DEFAULT_WIND_SETTINGS,mode,strength:mode==='ripple'?7:2,speed:1.5,range:.5};
  const value=record('settings',0,settings);
  assert.deepEqual(validateWindCommand(action('WIND_WAVE',value)),value);
  assert.equal(value.settings.strength,settings.strength);assert.equal(value.index,480);assert.equal(value.base,9);
  assert(!('board' in value));assert(!('tiles' in value));assert(JSON.stringify(value).length<400);
 }
 for(const invalid of [{n:328},{index:-1},{paletteLength:0},{base:64},{settings:{...DEFAULT_WIND_SETTINGS,strength:11}},{elapsed:-1},{windVersion:2}]){
  assert.throws(()=>validateWindCommand(action('WIND_WAVE',{...record(),...invalid})),/Invalid/);
 }
});

test('only a batch start waits for a generation; drag and stop retain milliseconds at equal generations',()=>{
 const commands=[action('WIND_WAVE',record(),120),action('WIND_WAVE',record('batch-a',180),120),action('WIND_END',end('batch-a',600,'stop'),121),
  action('WIND_WAVE',record('batch-b'),140),action('WIND_END',end('batch-b',2200),150)];
 prepareWindMacro(commands);
 assert.deepEqual(commands.map(a=>a.isGenBased),[true,false,false,true,false]);
 assert.deepEqual(commands.map(a=>a.windElapsed),[0,180,600,0,2200]);
 assert.deepEqual(commands.map(a=>a.windGroup),[1,1,1,2,2]);
 assert.throws(()=>prepareWindMacro([action('WIND_END',end('bad',0))]),/Missing Wind/);
 assert.throws(()=>prepareWindMacro([action('WIND_WAVE',record()),action('WIND_END',end('different',100))]),/Invalid Wind sequence/);
});

test('drag logger records accepted emissions only and differentiates early stop from natural finish',()=>{
 let time=0,next;const waves=[],ends=[];
 const p=createWindPainter({context:()=>({n:31,paletteLength:64,base:0}),paint(){},onStart(){},onCommit:r=>ends.push(r),onFrame(){},
  onWave:(wave,config)=>waves.push(recordWindWave(wave,config,'live',time)),now:()=>time,requestFrame:f=>(next=f,1),cancelFrame(){},reducedMotion:()=>false});
 p.down(1,480);p.move(1,482);time=50;p.move(1,484);assert.equal(waves.length,1);
 time=150;p.move(1,484);assert.equal(waves.length,2);p.up(1);time=500;p.down(2,485);p.move(2,490);p.up(2);
 assert.equal(waves.length,2);assert.deepEqual(ends,['stop']);
 time=600;p.down(3,490);p.up(3);time=600+WIND_DURATION;next(time);assert.deepEqual(ends,['stop','complete']);
});

test('replay evolves the current board over frames alongside simulation edits and honors explicit stop',()=>{
 const e=engine(),before=e.board.map(t=>t.k);
 e.replay.emit(record());assert.deepEqual(e.board.map(t=>t.k),before);
 e.tick(200);const early=e.board.map(t=>t.k);assert.notDeepEqual(early,before);
 // A simulation changes its current board between wave frames, without a stored board being reapplied.
 e.board[0].k=e.board[0].v=55;e.tick(700);const later=e.board.map(t=>t.k);
 assert.notDeepEqual(later,early);assert.equal(e.board[0].k,55);assert.equal(e.replay.activeWaves,1);
 e.replay.stop();assert.equal(e.frames.size,0);e.tick(3000);assert.deepEqual(e.board.map(t=>t.k),later);
});

test('all three effects settle naturally, preserve viewer preferences and bound concurrent work',()=>{
 for(const mode of ['ripple','paint','displace']){
  const settings={...DEFAULT_WIND_SETTINGS,mode,strength:3},saved=structuredClone(settings),e=engine();
  for(let i=0;i<20;i++)e.replay.emit(record('bounds',0,settings));
  assert.equal(e.replay.activeWaves,WIND_MAX_WAVES);
  e.tick(100);assert(e.replay.activeWaves>0);e.tick(WIND_DURATION);
  assert.equal(e.replay.activeWaves,0);assert.equal(e.frames.size,0);assert.equal(e.idles,1);assert(e.renders>=2);
  assert.deepEqual(settings,saved);
 }
});

function parser(){
 const c=vm.createContext({prepareWindMacro});
 vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),c);
 return text=>Array.from(c.parseMacroText(text));
}
const init='[12:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":31,"pal":0,"sep":0,"sort":"luminance","board":"961x0"}';
const line=(name,value,ms='000')=>`[12:00:01.${ms}] ${name} -> ${JSON.stringify(value)}`;
test('history parser removes undone Wind commands and restores drag duration on redo; legacy strokes stay unchanged',()=>{
 const parse=parser();const events=[init,line('WIND_WAVE',record()),line('WIND_WAVE',record('batch-a',180),'180'),line('WIND_END',end('batch-a',2200)),
  line('HISTORY_ACTION',{recipeVersion:2,id:1,from:0,to:4})];
 const history={recipeVersion:2,id:1,settings:{n:31,activePaletteIndex:0,separatorPx:0,currentSortMethod:'luminance'}};
 assert.equal(parse(events.join('\n')).filter(a=>a.eventName==='WIND_WAVE').length,2);
 events.push(line('UNDO',history));assert(!parse(events.join('\n')).some(a=>a.eventName==='WIND_WAVE'));
 events.push(line('REDO',history));const restored=parse(events.join('\n')).filter(a=>a.eventName.startsWith('WIND_'));
 assert.deepEqual(restored.map(a=>a.windElapsed),[0,180,2200]);
 const legacy=parse(init+'\n'+line('DRAW_STROKE',[{i:0,k:2}]));assert.equal(legacy.at(-1).eventName,'DRAW_STROKE');
});

test('scheduler uses batch clock for drag events and waits for generation before first wave',()=>{
 let time=1000,timer;const executed=[];
 const c=vm.createContext({performance:{now:()=>time},replayWindBatch:null,replayWindClocks:new Map([[1,1000]]),macroStartTime:0,isMacroPlaying:true,
  currentMacroStep:0,macroQueue:[{...action('WIND_WAVE',record('batch-a',300)),windGroup:1,windElapsed:300}],isLifePlaying:true,currentGenerationCount:0,
  setTimeout:(fn,delay)=>(timer={fn,delay},1),executeMacroAction:a=>executed.push(a),finishMacroPlayback(){c.isMacroPlaying=false;}});
 vm.runInContext(source.slice(source.indexOf('function scheduleNextMacroStep('),source.indexOf('function applyMacroRules(')),c);
 c.scheduleNextMacroStep();assert.equal(timer.delay,300);time=1300;timer.fn();assert.equal(executed.length,1);
 c.isMacroPlaying=true;c.currentMacroStep=0;c.macroQueue=[{...action('WIND_WAVE',record(),120),delta:0}];timer=null;
 c.scheduleNextMacroStep();assert.equal(timer,null);c.currentGenerationCount=120;c.scheduleNextMacroStep();assert.equal(timer.delay,0);
});

test('finishing a macro lets its last moving wave settle; cancellation stops replay and clears clocks',()=>{
 let stopped=0,paused=0,finished=0;
 const c=vm.createContext({windReplay:{activeWaves:1},finishWindReplay:()=>finished++,stopMacro:()=>stopped++,isLifePlaying:true,pauseLife:()=>paused++});
 vm.runInContext(source.slice(source.indexOf('function finishMacroPlayback('),source.indexOf('function stopMacro(')),c);
 c.finishMacroPlayback();assert.equal(stopped,0);c.windReplay.activeWaves=0;c.finishMacroPlayback();assert.equal(stopped,1);assert.equal(paused,1);assert.equal(finished,1);
});

test('a reduced-motion recording cannot let later actions overtake its animated replay tail',()=>{
 let time=0,frame;const board=Array.from({length:961},(_,i)=>({k:i%64,v:i%64,isGold:false})),logs=[];let commits=0,scheduled=0;
 const c=vm.createContext({windReplay:null,replayWindBatch:null,replayWindClocks:new Map(),n:31,paletteLen:()=>64,boardState:board,
  performance:{now:()=>time},createWindReplay:options=>createWindReplay({...options,now:()=>time,requestFrame:f=>(frame=f,1),cancelFrame(){},reducedMotion:()=>false}),
  applyWindCell,validateWindCommand,nextWindBatchId:()=>'replay-new',getCurrentState:()=>structuredClone(board),pushHistory:()=>commits++,
  window:{logArtEvent:(name,details)=>logs.push({name,data:JSON.parse(details)})},startAnimationLoop(){},isMacroPlaying:true,currentMacroStep:2,macroQueue:[{},{},{}],
  isLifePlaying:false,simulationStartState:null,scheduleNextMacroStep:()=>scheduled++});
 vm.runInContext(source.slice(source.indexOf('function getWindReplay('),source.indexOf('function stopMacro(')),c);
 c.executeWindMacro({...action('WIND_WAVE',record()),windGroup:1});time=16;c.executeWindMacro(action('WIND_END',end('batch-a',16)));
 assert.equal(c.replayWindBatch.ending,true);assert.equal(commits,0);assert.equal(logs.length,1);
 time=WIND_DURATION;frame(time);assert.equal(c.replayWindBatch,null);assert.equal(commits,1);assert.equal(scheduled,1);
 assert.equal(logs.at(-1).name,'WIND_END');assert.equal(logs.at(-1).data.elapsed,WIND_DURATION);
});

test('macro cancellation cancels pending wave frames, closes history once and clears timing anchors',()=>{
 let stopped=0,ended=0,paused=0;const c=vm.createContext({isLifePlaying:true,pauseLife(){paused++;c.isLifePlaying=false;},macroTimerId:1,clearTimeout(){},macroQueue:[{}],isMacroLoaded:true,isMacroPlaying:true,
  windReplay:{stop:()=>stopped++},finishWindReplay:reason=>{assert.equal(reason,'stop');ended++;},replayWindClocks:new Map([[1,123]]),
  replayNudgeTiming:null,currentMacroStep:1,pendingMacroPalette:null,isSelectingMacroPalette:false,isMacroFullscreen:false,
  dom:{macroOverlay:{classList:{remove(){}}},boardOverlay:{style:{}}},console});
 vm.runInContext(source.slice(source.indexOf('function stopMacro('),source.indexOf('function playMacro(')),c);c.stopMacro();
 assert.equal(stopped,1);assert.equal(ended,1);assert.equal(paused,1);assert.equal(c.isLifePlaying,false);assert.equal(c.replayWindClocks.size,0);assert.equal(c.isMacroPlaying,false);assert.equal(c.macroQueue.length,0);
});

test('file import validates a replacement before cancelling the old macro, then installs only the new queue',()=>{
 const old=[{eventName:'OLD'}],replacement=[{eventName:'DRAW_STROKE',details:'[{"i":0,"k":1}]'}],order=[],alerts=[];
 const c=vm.createContext({isMacroLoaded:true,isMacroPlaying:true,isLifePlaying:true,windMode:false,macroQueue:old,
  currentMacroStep:10,pendingMacroPalette:2,isSelectingMacroPalette:true,
  isWorkspaceSettingsText:()=>false,modals:{closeModal(){}},
  parseMacroText:text=>{order.push('parse');if(text==='bad')throw Error('bad file');return replacement;},
  stopMacro(){order.push('stop');c.macroQueue=[];c.isMacroLoaded=false;c.isMacroPlaying=false;c.isLifePlaying=false;},
  settingsProfiles:{beginReplay:()=>order.push('begin')},pauseLife(){throw Error('old simulation must already be cancelled');},
  FileReader:class{readAsText(file){this.onload({target:{result:file.text}});}},
  dom:{macroOverlay:{classList:{add(){},remove(){}}},boardOverlay:{style:{}}},console:{error(){}},alert:text=>alerts.push(text)});
 vm.runInContext(source.slice(source.indexOf('      function onProjectFileSelected('),source.indexOf('      function hideLongPressDisplay(')),c);
 const event=text=>({target:{files:[{name:'replacement.txt',text}],value:'file'}});
 c.onProjectFileSelected(event('bad'));assert.deepEqual(order,['parse']);assert.equal(c.macroQueue,old);assert.equal(c.isMacroPlaying,true);assert.equal(alerts.length,1);
 order.length=0;c.onProjectFileSelected(event('valid'));assert.deepEqual(order,['parse','stop','begin']);assert.equal(c.macroQueue,replacement);
 assert.equal(c.currentMacroStep,0);assert.equal(c.isMacroLoaded,true);assert.equal(c.isMacroPlaying,false);assert.equal(c.pendingMacroPalette,null);
});
