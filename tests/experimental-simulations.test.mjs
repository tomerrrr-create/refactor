import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperimentalSimulationFlags,EXPERIMENTAL_SIMULATIONS,EXPERIMENTAL_SIMULATIONS_KEY} from '../js/experimental-simulations.js';
test('experiments independently default off, ordinary evolutions stay visible',()=>{
 const flags=createExperimentalSimulationFlags({storage:{getItem:()=>null}});
 for(const {id}of EXPERIMENTAL_SIMULATIONS)assert.equal(flags.visible(id),false);
 assert.equal(flags.visible('turing'),true);
 flags.set('oil',true);assert(flags.visible('oil'));assert(flags.visible('ink'));assert(!flags.visible('network'));
 assert.throws(()=>flags.set('turing',true));
});
test('choices survive reopening; only explicit boolean true enables an experiment',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const flags=createExperimentalSimulationFlags({storage});flags.set('oil',true);flags.set('network',true);flags.set('oil',false);
 const restored=createExperimentalSimulationFlags({storage});assert(restored.visible('network'));assert(restored.visible('ink'));assert(!restored.visible('oil'));
 saved.set(EXPERIMENTAL_SIMULATIONS_KEY,JSON.stringify({ink:'true',oil:1,network:true,other:true}));
 const validated=createExperimentalSimulationFlags({storage});assert(validated.visible('ink'));assert(!validated.visible('oil'));assert(validated.visible('network'));
});
test('invalid or unavailable storage is safe and retains session choices',()=>{
 for(const value of ['bad','[]','true','null']){
  const flags=createExperimentalSimulationFlags({storage:{getItem:()=>value}});
  for(const {id}of EXPERIMENTAL_SIMULATIONS)assert(!flags.visible(id));
 }
 const flags=createExperimentalSimulationFlags({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
 flags.set('oil',true);assert(flags.visible('oil'));flags.set('oil',false);assert(!flags.visible('oil'));assert.throws(()=>flags.set('ink',false));
});
