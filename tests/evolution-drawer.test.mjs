import test from 'node:test';
import assert from 'node:assert/strict';
import {EVOLUTION_CATALOG,DEFAULT_EVOLUTION_SLOTS,validateEvolutionSlots,assignEvolutionSlot} from '../js/evolution-drawer-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';
import {translations} from '../js/i18n.js';
test('default ten places match the original overlay, with fourteen unique existing engine and button identities',()=>{
 assert.deepEqual(DEFAULT_EVOLUTION_SLOTS,['dla','contour','gameOfLife','brightnessEvo','islands','spiral','magnet','gravitationalSort','sandpile','erosion']);
 assert.equal(EVOLUTION_CATALOG.length,14);assert.equal(new Set(EVOLUTION_CATALOG.map(e=>e.button)).size,14);
 for(const e of EVOLUTION_CATALOG)for(const lang of ['en','he','ru','nl'])assert(translations[e.key]?.[lang],e.key+'/'+lang);
});
test('assignment replaces a parked evolution or swaps an existing place without duplicates or mutation',()=>{
 const original=[...DEFAULT_EVOLUTION_SLOTS],withBreathe=assignEvolutionSlot(original,0,'breathe');assert.equal(withBreathe[0],'breathe');assert(!withBreathe.includes('dla'));assert.deepEqual(original,DEFAULT_EVOLUTION_SLOTS);
 const swapped=assignEvolutionSlot(withBreathe,9,'breathe');assert.equal(swapped[9],'breathe');assert.equal(swapped[0],'erosion');assert.equal(new Set(swapped).size,10);
 assert.deepEqual(assignEvolutionSlot(swapped,9,'breathe'),swapped);
 for(const [slot,id] of [[-1,'breathe'],[10,'breathe'],[1.5,'turing'],[0,'unknown']])assert.throws(()=>assignEvolutionSlot(original,slot,id));
});
test('custom slots round trip as optional profile settings while legacy settings retain their original baseline',()=>{
 const settings=defaultWorkspaceSettings(),legacy=serializeWorkspaceSettings(settings);assert(!legacy.includes('evolutionSlots'));
 settings.evolutionSlots=assignEvolutionSlot(DEFAULT_EVOLUTION_SLOTS,3,'nudgeDarker');assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 assert.deepEqual(validateEvolutionSlots(deserializeWorkspaceSettings(legacy).evolutionSlots),DEFAULT_EVOLUTION_SLOTS);
 for(const bad of [[],DEFAULT_EVOLUTION_SLOTS.slice(1),[...DEFAULT_EVOLUTION_SLOTS,'breathe'],Array(10).fill('breathe'),[...DEFAULT_EVOLUTION_SLOTS.slice(0,9),'unknown']]){assert.throws(()=>validateEvolutionSlots(bad));assert.throws(()=>validateWorkspaceSettings({...settings,evolutionSlots:bad}));}
});

test('legacy darker slots migrate to one Nudge and duplicate directions free a slot safely',()=>{
 const darker=[...DEFAULT_EVOLUTION_SLOTS];darker[3]='nudgeDarker';
 assert.equal(validateEvolutionSlots(darker)[3],'nudgeBrighter');
 const both=[...darker];both[5]='nudgeBrighter';
 const migrated=validateEvolutionSlots(both);
 assert.equal(migrated[3],'nudgeBrighter');assert.equal(migrated[5],'brightnessEvo');
 assert.equal(new Set(migrated).size,10);assert.deepEqual(validateEvolutionSlots(migrated),migrated);
 assert.deepEqual(both[3],'nudgeDarker');
});
