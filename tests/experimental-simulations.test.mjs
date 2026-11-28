import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperimentalSimulationFlags,EXPERIMENTAL_SIMULATIONS_KEY} from '../js/experimental-simulations.js';
test('Breathe defaults off while Geometric Flow, Fibonacci and ordinary evolutions stay visible',()=>{
 const flags=createExperimentalSimulationFlags({storage:{getItem:()=>null}});
 assert(flags.visible('spiral'));assert(!flags.visible('breathe'));assert(flags.visible('fibonacci'));
 assert.equal(flags.visible('turing'),true);
 assert(flags.visible('ink'));assert(flags.visible('network'));
 flags.set('breathe',true);flags.set('spiral',false);assert(flags.visible('breathe'));assert(!flags.visible('spiral'));
 assert.throws(()=>flags.set('turing',true));assert.throws(()=>flags.set('oil',true));
});
test('choices survive reopening and missing or invalid values use the feature defaults',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const flags=createExperimentalSimulationFlags({storage});flags.set('spiral',true);flags.set('breathe',true);flags.set('spiral',false);flags.set('fibonacci',true);
 const restored=createExperimentalSimulationFlags({storage});assert(restored.visible('network'));assert(restored.visible('ink'));assert(!restored.visible('spiral'));assert(restored.visible('breathe'));assert(restored.visible('fibonacci'));
 saved.set(EXPERIMENTAL_SIMULATIONS_KEY,JSON.stringify({ink:'true',spiral:1,oil:true,network:false,fibonacci:1,other:true}));
 const validated=createExperimentalSimulationFlags({storage});assert(validated.visible('ink'));assert(validated.visible('spiral'));assert(validated.visible('network'));assert(validated.visible('fibonacci'));
 validated.set('spiral',true);assert(createExperimentalSimulationFlags({storage}).visible('spiral'));
 for(const id of ['spiral','breathe','fibonacci'])validated.set(id,false);
 const disabled=createExperimentalSimulationFlags({storage});
 for(const id of ['spiral','breathe','fibonacci'])assert.equal(disabled.visible(id),false);

});
test('invalid or unavailable storage is safe and retains session choices',()=>{
 for(const value of ['bad','[]','true','null']){
  const flags=createExperimentalSimulationFlags({storage:{getItem:()=>value}});
  assert(flags.visible('spiral'));assert(!flags.visible('breathe'));assert(flags.visible('fibonacci'));
 }
 const flags=createExperimentalSimulationFlags({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
 flags.set('spiral',true);assert(flags.visible('spiral'));flags.set('spiral',false);assert(!flags.visible('spiral'));assert.throws(()=>flags.set('ink',false));
});
test('Patterns defaults on and its opt-out only affects the current session',()=>{
 const saved=new Map([[EXPERIMENTAL_SIMULATIONS_KEY, JSON.stringify({patterns:false,breathe:true})]]);
 const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const ids=['crystal','pinwheel-map','octagonal','apollonian','voronoi'];
 const flags=createExperimentalSimulationFlags({storage});
 assert(flags.visible('patterns')); assert(ids.every(id=>flags.visible(id)));
 flags.set('patterns',false);
 assert(!flags.visible('patterns')); assert(ids.every(id=>!flags.visible(id)));
 flags.set('fibonacci',true);
 assert(!Object.hasOwn(JSON.parse(saved.get(EXPERIMENTAL_SIMULATIONS_KEY)), 'patterns'));
 const restored=createExperimentalSimulationFlags({storage});
 assert(restored.visible('patterns')); assert(ids.every(id=>restored.visible(id)));
 assert(restored.visible('breathe')); assert(restored.visible('fibonacci'));
});
