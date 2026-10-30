import test from 'node:test';
import assert from 'node:assert/strict';
import {CRACKS_GROWTH_PRESETS,getCracksPresetId,DEFAULT_CRACKS_GROWTH,DEFAULT_CRACKS_MATERIAL,validateCracksGrowth} from '../js/cracks-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {createCracksState,runCracksGeneration,restoreCracksState} from '../js/simulations/cracks.js';
const expected=[{branchChance:65,branchInterval:11,curvature:100},{branchChance:40,branchInterval:22,curvature:100},{branchChance:40,branchInterval:22,curvature:0},{branchChance:55,branchInterval:8,curvature:130}];
test('four unique presets match the agreed values and custom matching is derived from actual settings',()=>{
 assert.equal(CRACKS_GROWTH_PRESETS.length,4);assert.equal(new Set(CRACKS_GROWTH_PRESETS.map(p=>p.id)).size,4);
 CRACKS_GROWTH_PRESETS.forEach((p,i)=>{assert.deepEqual(validateCracksGrowth(p.values),expected[i]);assert.equal(getCracksPresetId({...p.values}),p.id);assert(Object.isFrozen(p.values));});
 assert.deepEqual(CRACKS_GROWTH_PRESETS[0].values,DEFAULT_CRACKS_GROWTH);assert.equal(getCracksPresetId({branchChance:35,branchInterval:22,curvature:100}),null);
});
test('material now defaults Off while explicit saved On values remain On after serialization',()=>{
 assert.deepEqual(DEFAULT_CRACKS_MATERIAL,{enabled:false,strength:40});
 const settings=defaultWorkspaceSettings(),baseline=serializeWorkspaceSettings(settings);settings.rules.contour.material={...DEFAULT_CRACKS_MATERIAL};assert.equal(serializeWorkspaceSettings(settings),baseline);
 settings.rules.contour.material={enabled:true,strength:40};const encoded=serializeWorkspaceSettings(settings);assert(encoded.includes('"material"'));assert.deepEqual(deserializeWorkspaceSettings(encoded).rules.contour.material,{enabled:true,strength:40});
});
test('every preset checkpoints and resumes from actual numeric rules without a preset identity',()=>{
 const n=41,palette=Array(23),initial=Array.from({length:n*n},()=>({k:12,v:12,isGold:false}));
 function run(board,state,growth,count){for(let i=0;i<count;i++){const r=runCracksGeneration({n,currentPalette:palette,currentBoardState:board,contourRules:{lineColor:'darkest',material:{enabled:false,strength:40},growth}},state);board=r.nextBoardState;state=r.nextCracksState;}return {board,state};}
 for(const p of CRACKS_GROWTH_PRESETS){const part=run(initial,createCracksState(n,123),p.values,30),checkpoint=JSON.parse(JSON.stringify({board:part.board,state:part.state,growth:p.values}));
  assert(!JSON.stringify(checkpoint).includes(p.id));assert.deepEqual(run(part.board,part.state,p.values,40),run(checkpoint.board,restoreCracksState(checkpoint.state),checkpoint.growth,40));
 }
});
