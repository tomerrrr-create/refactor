import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvolutionModeMemory,EVOLUTION_MODE_MEMORY_KEY} from '../js/evolution-mode-memory.js';
const storage=()=>{const values=new Map();return {values,getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
test('off is the default; only the switch persists, not remembered modes',()=>{
 const disk=storage(),memory=createEvolutionModeMemory({storage:disk});
 assert(!memory.enabled());memory.remember('spiral','left');assert.equal(memory.recall('spiral'),undefined);
 memory.setEnabled(true);memory.remember('spiral','left');assert.equal(memory.recall('spiral'),'left');
 assert.deepEqual([...disk.values],[[EVOLUTION_MODE_MEMORY_KEY,'true']]);
 const reopened=createEvolutionModeMemory({storage:disk});assert(reopened.enabled());assert.equal(reopened.recall('spiral'),undefined);
});
test('Off never replaces a last active mode; disabling and reset clear the session',()=>{
 const memory=createEvolutionModeMemory({storage:storage()});memory.setEnabled(true);
 memory.remember('gravitationalSort','black_hole');memory.remember('gravitationalSort','off');assert.equal(memory.recall('gravitationalSort'),'black_hole');
 memory.remember('cymatics',6);assert.equal(memory.recall('cymatics'),6);
 memory.clear();assert(memory.enabled());assert.equal(memory.recall('cymatics'),undefined);
 memory.remember('spiral','left');memory.setEnabled(false);memory.setEnabled(true);assert.equal(memory.recall('spiral'),undefined);
});
test('recorded commands neither read nor overwrite manual selections',()=>{
 let replay=false;const memory=createEvolutionModeMemory({storage:storage(),blocked:()=>replay});memory.setEnabled(true);memory.remember('spiral','left');
 replay=true;assert(!memory.active());assert.equal(memory.recall('spiral'),undefined);memory.remember('spiral','b');
 replay=false;assert.equal(memory.recall('spiral'),'left');
});
test('Nudge directions share a place and unavailable storage retains session functionality',()=>{
 const memory=createEvolutionModeMemory({storage:{getItem(){throw Error();},setItem(){throw Error();}}});assert(!memory.enabled());
 assert.doesNotThrow(()=>memory.setEnabled(true));memory.remember('nudgeDarker','nudgeDarker');assert.equal(memory.recall('nudgeBrighter'),'nudgeDarker');
 memory.remember('wind','paint');assert.equal(memory.recall('wind'),'paint');
});

test('explicit Off restarts the cycle while leaving for another simulation recalls the last mode',()=>{
 const memory=createEvolutionModeMemory({storage:storage()});memory.setEnabled(true);
 memory.remember('gravitationalSort','right');assert.equal(memory.entry('gravitationalSort'),'right','handoff recalls last mode');
 memory.remember('gravitationalSort','black_hole');memory.finishCycle('gravitationalSort');
 assert.equal(memory.recall('gravitationalSort'),'black_hole','stored history remains available separately from the entry preview');
 assert.equal(memory.entry('gravitationalSort'),'up','Off queues the first mode');
 assert.equal(memory.entry('gravitationalSort'),'up','reading the entry does not consume it');
 memory.enterCycle('gravitationalSort');memory.remember('gravitationalSort','right');assert.equal(memory.entry('gravitationalSort'),'right');
 memory.remember('nudgeDarker','nudgeDarker');memory.finishCycle('nudgeDarker');assert.equal(memory.entry('nudgeBrighter'),'nudgeBrighter');
 memory.remember('wind','displace');memory.finishCycle('wind');assert.equal(memory.entry('wind'),'ripple');
 memory.clear();assert.equal(memory.entry('gravitationalSort'),undefined);
});
