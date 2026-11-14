import test from 'node:test';
import assert from 'node:assert/strict';
import {EVOLUTION_CATALOG,DEFAULT_EVOLUTION_SLOTS,DEFAULT_EVOLUTION_LAYOUT,INTERNAL_NAV_SLOTS,validateEvolutionSlots,assignEvolutionSlot,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';
import {translations} from '../js/i18n.js';
const ids=slots=>slots.filter(id=>id!==null).sort();
const complete=slots=>{assert.deepEqual(ids(slots),EVOLUTION_CATALOG.map(e=>e.id).sort());assert(INTERNAL_NAV_SLOTS.every(i=>slots[i]===null));};
test('permanent drawers reserve bottom center and retain the approved default order',()=>{
 assert.equal(DEFAULT_EVOLUTION_LAYOUT.length,20);
 assert.deepEqual(DEFAULT_EVOLUTION_LAYOUT.slice(0,10),['cymatics','sandpile','gameOfLife','brightnessEvo','islands','nudgeBrighter','magnet',null,'gravitationalSort','erosion']);
 assert.deepEqual(DEFAULT_EVOLUTION_LAYOUT.slice(10),[null,'spiral','breathe','dla',null,'ink','turing',null,'contour',null]);
 complete(DEFAULT_EVOLUTION_LAYOUT);
 for(const e of EVOLUTION_CATALOG)for(const lang of ['en','he','ru','nl'])assert(translations[e.key]?.[lang]);
 for(const lang of ['en','he','ru','nl'])assert(translations.drawer_navigation_slot[lang]);
});
test('legacy ten-place layouts migrate without losing controls or mutating the input',()=>{
 const legacy=['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)],before=[...legacy],migrated=validateEvolutionSlots(legacy);
 assert.deepEqual(migrated.slice(0,5),legacy.slice(0,5));assert.deepEqual(migrated.slice(5,10),['magnet','gravitationalSort',null,'sandpile','erosion']);
 assert.equal(migrated[10],'dla');assert.equal(migrated[13],'spiral');complete(migrated);
 assert.deepEqual(validateEvolutionSlots(migrated),migrated);assert.deepEqual(legacy,before);
});
test('arranging occupied and empty places preserves every simulation and protects navigation',()=>{
 const original=[...DEFAULT_EVOLUTION_LAYOUT],swap=moveEvolutionSlot(original,0,13);
 assert.equal(swap[0],'dla');assert.equal(swap[13],'cymatics');
 const moved=moveEvolutionSlot(swap,13,19);assert.equal(moved[13],null);assert.equal(moved[19],'cymatics');complete(moved);
 assert.deepEqual(original,DEFAULT_EVOLUTION_LAYOUT);assert.deepEqual(moveEvolutionSlot(moved,19,19),moved);
 assert.deepEqual(assignEvolutionSlot(original,19,'cymatics'),moveEvolutionSlot(original,0,19));
 for(const [from,to] of [[-1,0],[0,20],[.5,0],[14,0],[0,7],[0,17],[7,0]])assert.throws(()=>moveEvolutionSlot(original,from,to));
 for(const reserved of INTERNAL_NAV_SLOTS)assert.throws(()=>assignEvolutionSlot(original,reserved,'dla'));
});
test('new arrangements round-trip exactly through settings; legacy rules stay unchanged',()=>{
 const settings=defaultWorkspaceSettings(),baseline=serializeWorkspaceSettings(settings);assert(!baseline.includes('evolutionSlots'));
 settings.evolutionSlots=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,2,19);
 assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 const old={version:1,settings:{evolutionSlots:['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)]}};
 const migrated=deserializeWorkspaceSettings('FYI_SETTINGS_V1\n'+JSON.stringify(old));
 assert.equal(migrated.evolutionSlots[0],'cymatics');complete(migrated.evolutionSlots);assert.deepEqual(migrated.rules,defaultWorkspaceSettings().rules);
 assert.deepEqual(validateEvolutionSlots(deserializeWorkspaceSettings(baseline).evolutionSlots),DEFAULT_EVOLUTION_LAYOUT);
 for(const bad of [[],Array(20).fill(null),[...DEFAULT_EVOLUTION_LAYOUT.slice(0,19),'dla'],[...DEFAULT_EVOLUTION_LAYOUT.slice(0,19),'unknown']])assert.throws(()=>validateWorkspaceSettings({...settings,evolutionSlots:bad}));
});
test('historical Nudge directions normalize once and keep the first unified assignment',()=>{
 const old=[...DEFAULT_EVOLUTION_SLOTS];old[3]='nudgeDarker';old[5]='nudgeBrighter';
 const migrated=validateEvolutionSlots(old);assert.equal(migrated[3],'nudgeBrighter');assert.equal(migrated[14],'brightnessEvo');complete(migrated);
 assert.deepEqual(validateEvolutionSlots(migrated),migrated);assert.equal(old[3],'nudgeDarker');
 const moved=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,5,4);
 assert.deepEqual(validateEvolutionSlots(moved.map(id=>id==='nudgeBrighter'?'nudgeDarker':id)),moved);
});
test('previous twenty-place layouts free navigation places without dropping their occupants',()=>{
 const old=[...DEFAULT_EVOLUTION_SLOTS,'breathe','turing','cymatics',...Array(7).fill(null)],before=[...old];
 const migrated=validateEvolutionSlots(old);complete(migrated);assert.equal(migrated[13],'spiral');assert.equal(migrated[18],'nudgeBrighter');assert.deepEqual(old,before);
 const occupied=[...old];[occupied[0],occupied[17]]=[occupied[17],occupied[0]];
 const result=validateEvolutionSlots(occupied);complete(result);assert(result.includes('dla'));assert.equal(result[17],null);assert.deepEqual(validateEvolutionSlots(result),result);
 const settings={...defaultWorkspaceSettings(),evolutionSlots:occupied};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).evolutionSlots,result);
});
