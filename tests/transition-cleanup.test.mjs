import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const boardSource=source.slice(source.indexOf('      async function animateBoardTransition('),source.indexOf('      function applyInitialPattern('));
const panelSource=source.slice(source.indexOf('      function toggleSimMode('),source.indexOf('      function resetArmedState('));

test('board action failure releases dimming and permits the next transition without hiding the error',async()=>{
 const delays=[],c=vm.createContext({isAnimating:false,dom:{boardOverlay:{style:{opacity:'0'}}},setTimeout(fn,ms){delays.push(ms);fn();}});
 vm.runInContext(boardSource,c);
 const failure=new Error('initialization failed');
 await assert.rejects(c.animateBoardTransition(()=>{throw failure;}),error=>error===failure);
 assert.equal(c.dom.boardOverlay.style.opacity,'0');assert.equal(c.isAnimating,false);
 delays.length=0;let called=0;
 await c.animateBoardTransition(()=>called++);
 assert.equal(called,1);assert.deepEqual(delays,[350,50,350]);
 assert.equal(c.dom.boardOverlay.style.opacity,'0');assert.equal(c.isAnimating,false);
});

test('busy board transition remains a no-op',async()=>{
 const c=vm.createContext({isAnimating:true,dom:{boardOverlay:{style:{opacity:'1'}}},setTimeout(){assert.fail('must not schedule another transition');}});
 vm.runInContext(boardSource,c);await c.animateBoardTransition(()=>assert.fail('must not run'));
 assert.equal(c.dom.boardOverlay.style.opacity,'1');assert.equal(c.isAnimating,true);
});

function panelHarness(){
 const callbacks=[],delays=[],changes=[];
 const button=()=>({classList:{toggle:(...args)=>changes.push(args)}});
 const c=vm.createContext({isLifePlaying:false,isSimModeActive:false,windMode:false,
  dom:{controlsContainer:{style:{opacity:'1'},classList:{toggle:(...args)=>changes.push(args)}},
   ...Object.fromEntries(['btnBrushMode','btnResetBoard','btnTutorial','btnSpecialReset','btnPlayPauseLife','btnToggleSimMode'].map(name=>[name,button()]))},
  setTimeout(fn,ms){callbacks.push(fn);delays.push(ms);},pauseLife(){},resetArmedState(){},updateSimulationUtilityControl(){}});
 vm.runInContext(panelSource,c);return{c,callbacks,delays,changes};
}

test('panel failures release controls and propagate the original error',()=>{
 for(const stage of ['resetArmedState','updateSimulationUtilityControl']){
  const {c,callbacks,delays}=panelHarness(),failure=new Error(stage+' failed');
  c[stage]=()=>{throw failure;};c.toggleSimMode();assert.equal(c.dom.controlsContainer.style.opacity,'0');
  assert.deepEqual(delays,[500]);assert.throws(callbacks.shift(),error=>error===failure);
  assert.equal(c.dom.controlsContainer.style.opacity,'1');
 }
});

test('normal and playback-interrupted panel transitions retain their behavior',()=>{
 const {c,callbacks,delays}=panelHarness();
 c.toggleSimMode();assert.equal(c.isSimModeActive,false);callbacks.shift()();
 assert.equal(c.isSimModeActive,true);assert.equal(c.dom.controlsContainer.style.opacity,'1');
 c.toggleSimMode();c.isLifePlaying=true;callbacks.shift()();
 assert.equal(c.isSimModeActive,true);assert.equal(c.dom.controlsContainer.style.opacity,'1');
 assert.deepEqual(delays,[500,500]);
});
