import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperimentalSimulationFlags,EXPERIMENTAL_SIMULATIONS,EXPERIMENTAL_SIMULATIONS_KEY} from '../js/experimental-simulations.js';
test('experiments independently default off, ordinary evolutions stay visible',()=>{
 const flags=createExperimentalSimulationFlags({storage:{getItem:()=>null}});
 for(const {id}of EXPERIMENTAL_SIMULATIONS)assert.equal(flags.visible(id),false);
 assert.equal(flags.visible('turing'),true);
 flags.set('spiral',true);assert(flags.visible('spiral'));assert(!flags.visible('breathe'));assert(flags.visible('ink'));assert(flags.visible('network'));
 flags.set('breathe',true);flags.set('spiral',false);assert(flags.visible('breathe'));assert(!flags.visible('spiral'));
 assert.throws(()=>flags.set('turing',true));assert.throws(()=>flags.set('oil',true));
});
test('choices survive reopening; only explicit boolean true enables an experiment',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const flags=createExperimentalSimulationFlags({storage});flags.set('spiral',true);flags.set('breathe',true);flags.set('spiral',false);
 const restored=createExperimentalSimulationFlags({storage});assert(restored.visible('network'));assert(restored.visible('ink'));assert(!restored.visible('spiral'));assert(restored.visible('breathe'));
 saved.set(EXPERIMENTAL_SIMULATIONS_KEY,JSON.stringify({ink:'true',spiral:1,oil:true,network:false,other:true}));
 const validated=createExperimentalSimulationFlags({storage});assert(validated.visible('ink'));assert(!validated.visible('spiral'));assert(validated.visible('network'));
});
test('invalid or unavailable storage is safe and retains session choices',()=>{
 for(const value of ['bad','[]','true','null']){
  const flags=createExperimentalSimulationFlags({storage:{getItem:()=>value}});
  for(const {id}of EXPERIMENTAL_SIMULATIONS)assert(!flags.visible(id));
 }
 const flags=createExperimentalSimulationFlags({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
 flags.set('spiral',true);assert(flags.visible('spiral'));flags.set('spiral',false);assert(!flags.visible('spiral'));assert.throws(()=>flags.set('ink',false));
});
