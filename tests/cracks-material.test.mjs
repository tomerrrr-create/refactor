import test from 'node:test';
import assert from 'node:assert/strict';
import {createCracksState,runCracksGeneration,restoreCracksState,queueCracksGrowth} from '../js/simulations/cracks.js';
import {DEFAULT_CRACKS_MATERIAL,validateCracksMaterial} from '../js/cracks-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const fixture=()=>({n:41,currentPalette:Array(23),contourRules:{lineColor:'darkest',material:{enabled:true,strength:80}},currentBoardState:Array.from({length:1681},()=>({k:20,v:20,isGold:false}))});
function run(ctx,state,count){for(let i=0;i<count;i++){const r=runCracksGeneration(ctx,state);ctx={...ctx,currentBoardState:r.nextBoardState};state=r.nextCracksState;}return {ctx,state};}
test('material barriers stay intact and deflect a tip toward a softer lane',()=>{
 const ctx=fixture();for(let y=0;y<41;y++)for(let x=20;x<41;x++)ctx.currentBoardState[y*41+x]={k:2,v:2,isGold:false};
 const state={...createCracksState(41,123),roots:3,steps:1,tips:[{x:19,y:20,angle:0,age:0}]};
 const result=run(ctx,state,40);
 for(let y=0;y<41;y++)for(let x=20;x<41;x++)assert.equal(result.ctx.currentBoardState[y*41+x].k,2);
 assert(result.ctx.currentBoardState.some((t,i)=>t.k===0&&Math.floor(i/41)!==20),'fracture changes direction along the barrier');
});
test('hard material does not nucleate or queue brush nuclei; soft material still grows',()=>{
 const hard=fixture();hard.currentBoardState.forEach(t=>{t.k=t.v=2;});const state=createCracksState(41);
 assert.deepEqual(run(hard,state,20).ctx.currentBoardState,hard.currentBoardState);
 assert.equal(queueCracksGrowth(hard,state,[{i:800,k:2}]).pendingSeed,null);
 const soft=run(fixture(),state,30);assert(soft.ctx.currentBoardState.some(t=>t.k===0));
 const half=run({...hard,contourRules:{...hard.contourRules,material:{enabled:true,strength:20}}},state,30);assert(half.ctx.currentBoardState.some(t=>t.k===0),'lower strength allows the same color to fracture');
});
test('Off and zero influence preserve version-2 growth exactly, including the random cursor',()=>{
 for(const material of [{enabled:false,strength:100},{enabled:true,strength:0}]){
  const ctx=fixture();ctx.contourRules.material=material;
  const modern=run(ctx,createCracksState(41,123),100),legacy=run(ctx,{...createCracksState(41,123),version:2},100);
  assert.deepEqual(modern.ctx.currentBoardState,legacy.ctx.currentBoardState);assert.deepEqual({...modern.state,version:2},legacy.state);
 }
});
test('material settings and pending growth round trip without changing old settings files',()=>{
 assert.deepEqual(validateCracksMaterial(),DEFAULT_CRACKS_MATERIAL);
 const settings=defaultWorkspaceSettings(),old=serializeWorkspaceSettings(settings);assert(!old.includes('material'));
 settings.rules.contour.material={...DEFAULT_CRACKS_MATERIAL};assert.equal(serializeWorkspaceSettings(settings),old,'default material settings have one canonical representation');
 settings.rules.contour.material={enabled:false,strength:45};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 for(const value of [{enabled:1,strength:80},{enabled:true,strength:101},{enabled:true,strength:1.5},{enabled:true,strength:80,extra:1}])assert.throws(()=>validateCracksMaterial(value));
 const ctx=fixture(),queued=queueCracksGrowth(ctx,createCracksState(41),[{i:800,k:20}]);const restored=restoreCracksState(JSON.parse(JSON.stringify(queued)));assert.deepEqual(run(ctx,queued,25),run(ctx,restored,25));
});
