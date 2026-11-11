import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {bindPickerGestures} from '../js/picker-gestures.js';
import {defaultEvolutionCycleMode,DEFAULT_EVOLUTION_CYCLE_MODES} from '../js/evolution-mode-memory.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(t,type){
 const original={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};t.after(()=>Object.assign(globalThis,original));
 const handlers=new Map(),timers=new Map(),actions=[];let now=0,id=0;
 const button={disabled:false,contains:e=>e===button,setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){},classList:{toggle(){},remove(){}},addEventListener:(name,fn)=>handlers.set(name,fn)};
 Object.assign(globalThis,{document:{elementFromPoint:(x,y)=>y>=0&&y<=50?button:null,addEventListener(){}},window:{addEventListener(){}},setTimeout(fn,ms){timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:key=>timers.delete(key)});
 const context=vm.createContext({bindPickerGestures,evolutionPickers:[[button,'gravitationalSort',()=>actions.push('tap'),()=>actions.push('settings')]],isBreathing:false,isMacroLoaded:false,armedSimulation:'gravitationalSort',C:{LONG_PRESS_SHOW_MS:600},handleEvolutionTap:(sim,fn)=>fn(),resetEvolutionCycle:sim=>actions.push('reset:'+sim),isNudgeSimulation:()=>false,hideLongPressDisplay(){},contextForModals:{canBrowseEvolutionPreset:()=>false},evolutionExplanation:{isOpen:()=>false,show:(b,sim)=>actions.push('help:'+sim)}});
 const start=source.indexOf('evolutionPickers.forEach('),end=source.indexOf("dom.btnPlayPauseLife.addEventListener",start);vm.runInContext(source.slice(start,end),context);
 const event=(name,x=25,y=25)=>handlers.get(name)?.({pointerId:1,pointerType:type,isPrimary:true,button:0,clientX:x,clientY:y,detail:1});
 return{actions,event,advance(time){for(;;){const next=[...timers].filter(([,v])=>v.at<=time).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=time;},down:()=>event('pointerdown'),release(){event('pointerup');event('click');}};
}
for(const type of ['mouse','touch']){
 test(`${type}: 600ms resets, release before 1200ms neither shows help nor advances`,t=>{
  const h=harness(t,type);h.down();h.advance(599);assert.deepEqual(h.actions,[]);h.advance(600);assert.deepEqual(h.actions,['reset:gravitationalSort']);h.advance(900);h.release();h.advance(4000);assert.deepEqual(h.actions,['reset:gravitationalSort']);
 });
 test(`${type}: continuous hold resets once then shows help at 1200ms total`,t=>{
  const h=harness(t,type);h.down();h.advance(1199);assert.deepEqual(h.actions,['reset:gravitationalSort']);h.advance(1200);assert.deepEqual(h.actions,['reset:gravitationalSort','help:gravitationalSort']);h.advance(5000);h.release();assert.deepEqual(h.actions,['reset:gravitationalSort','help:gravitationalSort']);
 });
 test(`${type}: short tap and upward swipe retain their original actions`,t=>{
  const h=harness(t,type);h.down();h.advance(100);h.release();assert.deepEqual(h.actions,['tap']);h.down();h.event('pointermove',25,-10);h.event('pointerup',25,-10);h.event('click');h.advance(5000);assert.deepEqual(h.actions,['tap','settings']);
 });
 test(`${type}: cancellation cancels pending stages without undoing a completed reset`,t=>{
  const h=harness(t,type);h.down();h.advance(100);h.event('pointercancel');h.event('click');h.advance(1500);assert.deepEqual(h.actions,[]);h.down();h.advance(2100);h.event('pointercancel');h.event('click');h.advance(5000);assert.deepEqual(h.actions,['reset:gravitationalSort']);
 });
}
test('defaults describe first cycle choices, with Nudge directions sharing one default',()=>{
 assert.equal(Object.keys(DEFAULT_EVOLUTION_CYCLE_MODES).length,14);
 assert.equal(defaultEvolutionCycleMode('gravitationalSort'),'up');assert.equal(defaultEvolutionCycleMode('cymatics'),3);
 assert.equal(defaultEvolutionCycleMode('nudgeDarker'),'nudgeBrighter');assert.equal(defaultEvolutionCycleMode('turing'),undefined);
});
