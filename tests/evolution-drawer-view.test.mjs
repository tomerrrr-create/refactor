import test from 'node:test';
import assert from 'node:assert/strict';
import {projectInternalDrawer,INTERNAL_NAV_SLOTS} from '../js/evolution-drawer-view.js';
import {DEFAULT_EVOLUTION_LAYOUT,EVOLUTION_CATALOG,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
test('internal drawer reserves both center slots and keeps the agreed first-page order',()=>{
 const slots=projectInternalDrawer(DEFAULT_EVOLUTION_LAYOUT);
 assert.deepEqual(slots.slice(0,10),['dla','contour','gameOfLife','brightnessEvo','islands','magnet','gravitationalSort',null,'sandpile','erosion']);
 assert.equal(slots.indexOf('spiral'),10);assert(slots.indexOf('cymatics')>=10);
 assert(INTERNAL_NAV_SLOTS.every(i=>slots[i]===null));
});
test('projection never changes saved slots or loses an evolution in customized layouts',()=>{
 for(let from=0;from<20;from++)for(let to=0;to<20;to++){
  if(DEFAULT_EVOLUTION_LAYOUT[from]===null)continue;
  const raw=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,from,to),before=[...raw],projected=projectInternalDrawer(raw);
  assert.deepEqual(raw,before);assert.deepEqual(projected.filter(Boolean).sort(),EVOLUTION_CATALOG.map(e=>e.id).sort());
  assert(INTERNAL_NAV_SLOTS.every(i=>projected[i]===null));
 }
});

test('a full second drawer still projects all evolutions into the available places',()=>{
 const raw=[...Array(6).fill(null),...EVOLUTION_CATALOG.map(e=>e.id)],before=[...raw];
 const result=projectInternalDrawer(raw);
 assert.deepEqual(result.filter(Boolean).sort(),EVOLUTION_CATALOG.map(e=>e.id).sort());
 assert(INTERNAL_NAV_SLOTS.every(i=>result[i]===null));assert.deepEqual(raw,before);
});
