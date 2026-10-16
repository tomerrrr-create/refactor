import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSimulationLayout,loadSimulationLayout,persistSimulationLayout,swapSimulationSlots} from '../js/simulation-layout.js';

const defaults=['a','b','c','d','e','f','g','h','i','j','k','l'];
test('swap across pages preserves every simulation and survives a saved reload',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const next=swapSimulationSlots(defaults,0,11);
 assert.equal(next[0],'l');assert.equal(next[11],'a');assert.deepEqual([...next].sort(),defaults);
 assert.equal(persistSimulationLayout(next,storage),true);assert.deepEqual(loadSimulationLayout(defaults,storage),next);
 assert.deepEqual(defaults,['a','b','c','d','e','f','g','h','i','j','k','l']);
});
test('invalid stored layouts restore defaults, and unavailable storage does not crash',()=>{
 for(const value of [null,[],[...defaults.slice(1),'b'],[...defaults.slice(1),'unknown'],{},'text'])assert.deepEqual(normalizeSimulationLayout(value,defaults),defaults);
 assert.deepEqual(loadSimulationLayout(defaults,{getItem:()=>'{invalid'}),defaults);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.deepEqual(loadSimulationLayout(defaults,blocked),defaults);assert.equal(persistSimulationLayout(defaults,blocked),false);
 assert.deepEqual(swapSimulationSlots(defaults,-1,11),defaults);
});
