import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {FTUE_STEPS,FTUE_CHAPTERS} from '../js/first-time-content.js';
import {readFtueProgress,FTUE_STORAGE_KEY} from '../js/first-time-experience.js';
test('the broad tour covers the real tools and simulations with stable bilingual steps',()=>{
 assert.equal(new Set(FTUE_STEPS.map(step=>step.id)).size,FTUE_STEPS.length);
 for(const [chapter]of FTUE_CHAPTERS)assert(FTUE_STEPS.some(step=>step.chapter===chapter));
 for(const step of FTUE_STEPS){assert(step.en.every(Boolean));assert(step.he.every(Boolean));assert(FTUE_CHAPTERS.some(([id])=>id===step.chapter));}
 for(const id of ['draw','drag','undo','redo','palette-apply','brush-shape','brush-size','separators','sort','play','paint-live','pause','drawer-map','anchor','profiles','experiments','ink','oil','network','idea','journey','done'])assert(FTUE_STEPS.some(step=>step.id===id),id);
 for(const id of ['gameOfLife','sandpile','cymatics','magnet','gravitationalSort','spiral','brightnessEvo','erosion','turing','dla','breathe','nudgeBrighter','contour'])assert(FTUE_STEPS.some(step=>step.id==='sim-'+id),id);
});
test('progress reads safely, retains valid work, and ignores corrupt or unknown versions',()=>{
 const read=value=>readFtueProgress({getItem:key=>{assert.equal(key,FTUE_STORAGE_KEY);return value;}});
 for(const text of [null,'bad','{}','{"version":2,"status":"complete"}','{"version":1,"status":"unknown"}'])assert.equal(read(text),null);
 assert.equal(readFtueProgress({getItem(){throw Error('blocked');}}),null);
 const original={version:1,status:'active',stepId:'paint-live',completed:['draw','removed-step']};
 const result=read(JSON.stringify(original));assert.equal(result.stepId,'paint-live');assert.deepEqual(result.completed,['draw']);assert.deepEqual(original.completed,['draw','removed-step']);
 assert.equal(read(JSON.stringify({...original,stepId:'removed'})).stepId,FTUE_STEPS[0].id);
});
test('practice preferences are ephemeral and a top-level query cannot replace real storage',()=>{
 const source=readFileSync(new URL('../js/ftue-storage.js',import.meta.url),'utf8').replace('export const','const');
 for(const framed of [false,true]){
  const disk=new Map([['real-art','keep'],['userLanguage','en']]);const native={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)};
  const win={localStorage:native};win.parent=framed?{}:win;
  const context=vm.createContext({window:win,location:{search:'?ftue-practice=1&lang=he'},document:{documentElement:{dataset:{}}},URLSearchParams});
  vm.runInContext(source,context);
  if(!framed){assert.equal(win.localStorage,native);continue;}
  assert.notEqual(win.localStorage,native);assert.equal(win.localStorage.getItem('real-art'),null);assert.equal(win.localStorage.getItem('userLanguage'),'he');
  win.localStorage.setItem('userLanguage','ru');win.localStorage.setItem('profile','practice');win.localStorage.removeItem('userLanguage');win.localStorage.clear();
  assert.deepEqual([...disk],[['real-art','keep'],['userLanguage','en']]);
 }
});
