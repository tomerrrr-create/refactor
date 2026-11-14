import test from 'node:test';
import assert from 'node:assert/strict';
import {createMacroEnding} from '../js/macro-ending.js';
function harness(){
 let id=0;const timers=new Map(),events=[];
 const ending=createMacroEnding({onExit:()=>events.push('exit'),onFinish:()=>events.push('finish'),onCancel:()=>events.push('cancel'),setTimer:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimer:key=>timers.delete(key)});
 const fire=()=>{const [key,value]=timers.entries().next().value;timers.delete(key);value.fn();return value;};
 return {ending,timers,events,fire};
}
test('last-frame presentation waits 1500ms, exits once, then finishes the 400ms return',()=>{
 const h=harness();h.ending.start();assert(h.ending.active());assert.deepEqual(h.events,[]);assert.equal([...h.timers.values()][0].delay,1500);
 h.fire();assert.deepEqual(h.events,['exit']);assert(h.ending.active());assert.equal([...h.timers.values()][0].delay,400);
 h.fire();assert.deepEqual(h.events,['exit','finish']);assert(!h.ending.active());assert.equal(h.timers.size,0);
});
test('Stop or a new run cancels a queued exit even if its old callback fires',()=>{
 const h=harness();h.ending.start();const old=[...h.timers.values()][0].fn;h.ending.cancel();old();assert.deepEqual(h.events,['cancel']);assert.equal(h.timers.size,0);
 h.ending.start();old();assert.deepEqual(h.events,['cancel']);h.fire();assert.deepEqual(h.events,['cancel','exit']);
});
test('cancelling during the return prevents stale finish cleanup on a new run',()=>{
 const h=harness();h.ending.start();h.fire();const old=[...h.timers.values()][0].fn;h.ending.cancel();h.ending.start();old();assert.deepEqual(h.events,['exit','cancel']);assert(h.ending.active());
 h.fire();h.fire();assert.deepEqual(h.events,['exit','cancel','exit','finish']);
});
test('idle cancellation has no UI side effects; replacement only leaves one timer',()=>{
 const h=harness();h.ending.cancel();assert.deepEqual(h.events,[]);h.ending.start();h.ending.start();assert.deepEqual(h.events,['cancel']);assert.equal(h.timers.size,1);
});

import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('natural EOF cleans up the engine immediately and delays only the fullscreen presentation',()=>{
 for(const fullscreen of [false,true]){
  const calls=[];let pending=false;
  const c=vm.createContext({windReplay:null,isLifePlaying:true,isMacroFullscreen:fullscreen,macroEnding:{active:()=>pending},
   finishWindReplay:()=>calls.push('wind'),macroActivity:{finish:()=>calls.push('fade')},
   stopMacro:options=>{calls.push(options);c.isLifePlaying=false;},pauseLife:()=>calls.push('pause'),getMacroEnding:()=>({start:()=>{pending=true;calls.push('hold');}})});
  vm.runInContext(source.slice(source.indexOf('function finishMacroPlayback('),source.indexOf('function finishBrushReplay(')),c);
  c.finishMacroPlayback();assert.equal(c.isLifePlaying,false);assert.equal(pending,fullscreen);
  assert.equal(calls[1]==='fade',fullscreen);
  const options=calls.find(value=>typeof value==='object');assert.equal(options.preserveFullscreen,fullscreen);assert.equal(options.preserveActivity,fullscreen);
  if(fullscreen){const length=calls.length;c.finishMacroPlayback();assert.equal(calls.length,length,'repeated completion cannot restart the hold');}
 }
});
