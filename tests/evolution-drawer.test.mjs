import test from 'node:test';
import assert from 'node:assert/strict';
import {EVOLUTION_CATALOG,DEFAULT_EVOLUTION_SLOTS,DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots,assignEvolutionSlot,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';
import {translations} from '../js/i18n.js';
const unique=slots=>slots.filter(id=>id!==null);
test('two ten-place drawers contain every evolution once, preserving the original first drawer',()=>{
 assert.equal(DEFAULT_EVOLUTION_LAYOUT.length,20);
 assert.deepEqual(DEFAULT_EVOLUTION_LAYOUT.slice(0,10),DEFAULT_EVOLUTION_SLOTS);
 assert.deepEqual(DEFAULT_EVOLUTION_LAYOUT.slice(10,13),['breathe','turing','cymatics']);
 assert.equal(DEFAULT_EVOLUTION_LAYOUT.filter(id=>id===null).length,7);
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
 const swap=moveEvolutionSlot(original,0,12);assert.equal(swap[0],'cymatics');assert.equal(swap[12],'dla');
 const moved=moveEvolutionSlot(swap,12,19);assert.equal(moved[12],null);assert.equal(moved[19],'dla');
 assert.equal(new Set(unique(moved)).size,13);assert.deepEqual(original,DEFAULT_EVOLUTION_LAYOUT);
 assert.deepEqual(moveEvolutionSlot(moved,19,19),moved);
 assert.deepEqual(assignEvolutionSlot(original,19,'dla'),moveEvolutionSlot(original,0,19));
 for(const [from,to] of [[-1,0],[0,20],[.5,0],[13,0]])assert.throws(()=>moveEvolutionSlot(original,from,to));
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
test('legacy Nudge slots migrate outside both drawers without losing other assignments',()=>{
 const old=[...DEFAULT_EVOLUTION_SLOTS];old[3]='nudgeDarker';old[5]='nudgeBrighter';
 const migrated=validateEvolutionSlots(old);
 assert.equal(migrated[3],'brightnessEvo');assert.equal(migrated[5],'spiral');
 assert(!migrated.some(id=>id?.startsWith('nudge')));assert.equal(new Set(unique(migrated)).size,13);
 assert.deepEqual(validateEvolutionSlots(migrated),migrated);assert.equal(old[3],'nudgeDarker');
 assert.throws(()=>assignEvolutionSlot(migrated,0,'nudgeBrighter'));
});
