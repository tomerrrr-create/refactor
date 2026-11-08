import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvolutionSlots,INTERNAL_NAV_SLOTS,DEFAULT_EVOLUTION_LAYOUT,EVOLUTION_CATALOG,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
const catalogue=EVOLUTION_CATALOG.map(e=>e.id).sort();
test('canonical customized layouts keep their exact positions across repeated loads',()=>{
 for(let from=0;from<20;from++)for(let to=0;to<20;to++){
  if(DEFAULT_EVOLUTION_LAYOUT[from]===null||INTERNAL_NAV_SLOTS.includes(to))continue;
  const raw=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,from,to),before=[...raw];
  assert.deepEqual(validateEvolutionSlots(raw),before);assert.deepEqual(raw,before);
 }
});
test('legacy migrations remain complete and idempotent across arbitrary saved arrangements',()=>{
 let seed=17;
 for(let trial=0;trial<150;trial++){
  const raw=[...Array(6).fill(null),...EVOLUTION_CATALOG.map(e=>e.id)];
  for(let i=19;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[raw[i],raw[j]]=[raw[j],raw[i]];}
  const before=[...raw],result=validateEvolutionSlots(raw);
  assert.deepEqual(result.filter(Boolean).sort(),catalogue);assert(INTERNAL_NAV_SLOTS.every(i=>result[i]===null));
  assert.deepEqual(validateEvolutionSlots(result),result);assert.deepEqual(raw,before);
 }
});
