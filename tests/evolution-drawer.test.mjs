import test from 'node:test';
import assert from 'node:assert/strict';
import {EVOLUTION_CATALOG,DEFAULT_EVOLUTION_SLOTS,DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots,assignEvolutionSlot,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';
import {translations} from '../js/i18n.js';
const unique=slots=>slots.filter(id=>id!==null);
test('two ten-place drawers contain every evolution once, preserving the original first drawer',()=>{
 assert.equal(DEFAULT_EVOLUTION_LAYOUT.length,20);
 assert.deepEqual(DEFAULT_EVOLUTION_LAYOUT.slice(0,10),DEFAULT_EVOLUTION_SLOTS);
 assert.deepEqual(DEFAULT_EVOLUTION_LAYOUT.slice(10),[null,'breathe','turing','cymatics',null,null,null,'nudgeBrighter',null,null]);
 assert.equal(DEFAULT_EVOLUTION_LAYOUT.filter(id=>id===null).length,6);
 assert.equal(new Set(unique(DEFAULT_EVOLUTION_LAYOUT)).size,EVOLUTION_CATALOG.length);
 for(const e of EVOLUTION_CATALOG)for(const lang of ['en','he','ru','nl'])assert(translations[e.key]?.[lang]);
 for(const key of ['drawer_page','drawer_navigation','drawer_open_hint','drawer_empty','drawer_destination','drawer_running_elsewhere','drawer_selected_elsewhere'])for(const lang of ['en','he','ru','nl'])assert(translations[key]?.[lang]);
});
test('legacy custom layouts retain all ten positions and append only the missing controls',()=>{
 const legacy=['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)];
 const migrated=validateEvolutionSlots(legacy);
 assert.deepEqual(migrated.slice(0,10),legacy);
 assert.deepEqual(migrated.slice(10,13),['dla','breathe','turing']);
 assert.deepEqual(validateEvolutionSlots(migrated),migrated);
 assert.deepEqual(legacy,['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)]);
});
test('moves swap occupied places or leave a vacancy, across either drawer, without losing controls',()=>{
 const original=[...DEFAULT_EVOLUTION_LAYOUT];
 const swap=moveEvolutionSlot(original,0,13);assert.equal(swap[0],'cymatics');assert.equal(swap[13],'dla');
 const moved=moveEvolutionSlot(swap,13,19);assert.equal(moved[13],null);assert.equal(moved[19],'dla');
 assert.equal(new Set(unique(moved)).size,14);assert.deepEqual(original,DEFAULT_EVOLUTION_LAYOUT);
 assert.deepEqual(moveEvolutionSlot(moved,19,19),moved);
 assert.deepEqual(assignEvolutionSlot(original,19,'dla'),moveEvolutionSlot(original,0,19));
 for(const [from,to] of [[-1,0],[0,20],[.5,0],[10,0]])assert.throws(()=>moveEvolutionSlot(original,from,to));
});
test('new layouts round-trip through settings and old settings migrate without touching rules',()=>{
 const settings=defaultWorkspaceSettings(),legacy=serializeWorkspaceSettings(settings);assert(!legacy.includes('evolutionSlots'));
 settings.evolutionSlots=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,2,19);
 assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 const old={version:1,settings:{evolutionSlots:['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)]}};
 const migrated=deserializeWorkspaceSettings('FYI_SETTINGS_V1\n'+JSON.stringify(old));
 assert.equal(migrated.evolutionSlots[0],'cymatics');assert.equal(migrated.evolutionSlots[10],'dla');
 assert.deepEqual(migrated.rules,defaultWorkspaceSettings().rules);
 assert.deepEqual(validateEvolutionSlots(deserializeWorkspaceSettings(legacy).evolutionSlots),DEFAULT_EVOLUTION_LAYOUT);
 for(const bad of [[],Array(20).fill(null),[...DEFAULT_EVOLUTION_LAYOUT.slice(0,19),'dla'],[...DEFAULT_EVOLUTION_LAYOUT.slice(0,19),'unknown'],[...DEFAULT_EVOLUTION_SLOTS,'breathe']])assert.throws(()=>validateWorkspaceSettings({...settings,evolutionSlots:bad}));
});
test('legacy Nudge directions share one movable control without moving other assignments',()=>{
 const old=[...DEFAULT_EVOLUTION_SLOTS];old[3]='nudgeDarker';old[5]='nudgeBrighter';
 const migrated=validateEvolutionSlots(old);
 assert.equal(migrated[3],'nudgeBrighter');assert.equal(migrated[5],'brightnessEvo');
 for(let i=0;i<10;i++)if(i!==3&&i!==5)assert.equal(migrated[i],old[i]);
 assert.equal(migrated.filter(id=>id==='nudgeBrighter').length,1);assert.equal(new Set(unique(migrated)).size,14);
 assert.deepEqual(validateEvolutionSlots(migrated),migrated);assert.equal(old[3],'nudgeDarker');
 assert.deepEqual(assignEvolutionSlot(migrated,0,'nudgeDarker'),moveEvolutionSlot(migrated,3,0));
});

test('saved twenty-slot layouts keep their exact positions, including the former factory layout',()=>{
 const previous=[...DEFAULT_EVOLUTION_SLOTS,'breathe','turing','cymatics',...Array(7).fill(null)];
 const edited=moveEvolutionSlot(previous,0,19);
 for(const saved of [previous,edited]){
  const migrated=validateEvolutionSlots(saved);assert.equal(migrated[17],'nudgeBrighter');
  for(let i=0;i<20;i++)if(saved[i]!==null)assert.equal(migrated[i],saved[i]);
  const settings={...defaultWorkspaceSettings(),evolutionSlots:saved};
  assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).evolutionSlots,migrated);
 }
});

test('adding Nudge uses an empty fallback without replacing an occupied preferred slot',()=>{
 const old=[...DEFAULT_EVOLUTION_SLOTS,'breathe','turing','cymatics',...Array(7).fill(null)];
 [old[0],old[17]]=[old[17],old[0]];
 const migrated=validateEvolutionSlots(old);
 assert.equal(migrated[0],'nudgeBrighter');assert.equal(migrated[17],'dla');
 for(let i=0;i<20;i++)if(old[i]!==null)assert.equal(migrated[i],old[i]);
 const moved=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,17,4);
 assert.deepEqual(validateEvolutionSlots(moved),moved);
 const darker=moved.map(id=>id==='nudgeBrighter'?'nudgeDarker':id);
 assert.deepEqual(validateEvolutionSlots(darker),moved);
});
