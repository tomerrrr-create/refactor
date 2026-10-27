import test from 'node:test';
import assert from 'node:assert/strict';
import {createCracksState,runCracksGeneration,restoreCracksState,queueCracksGrowth,prepareCracksResume} from '../js/simulations/cracks.js';
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

test('exhausted material runs renew on explicit resume, repeatedly, without painting during Pause',()=>{
 let {ctx,state}=run(fixture(),createCracksState(41,123),1000);
 for(let repeat=0;repeat<3;repeat++) {
  assert.equal(state.tips.length,0);assert(state.roots>=3);
  const before=structuredClone({ctx,state});
  assert.deepEqual(run(ctx,state,10).ctx.currentBoardState,ctx.currentBoardState,'exhausted state stays stuck without preparation');
  const resumed=prepareCracksResume(ctx,state);
  assert.notEqual(resumed,state);assert.equal(resumed.roots,0);assert.notEqual(resumed.pendingSeed,null);
  assert.deepEqual({ctx,state},before);assert.equal(resumed.random,state.random);
  const result=run(ctx,resumed,1000);assert.notDeepEqual(result.ctx.currentBoardState,ctx.currentBoardState);
  ({ctx,state}=result);
 }
});
test('resume finds tiny soft patches and respects hard/line/gold material and legacy sessions',()=>{
 const ctx=fixture();ctx.currentBoardState.forEach(t=>{t.k=t.v=2;});
 const exhausted={...createCracksState(41),steps:500,roots:3};
 assert.strictEqual(prepareCracksResume(ctx,exhausted),exhausted);
 ctx.currentBoardState[800]={k:20,v:20,isGold:false};ctx.currentBoardState[801]={k:20,v:20,isGold:false};
 const resumed=prepareCracksResume(ctx,exhausted);assert([800,801].includes(resumed.pendingSeed));
 assert.notDeepEqual(run(ctx,resumed,1).ctx.currentBoardState,ctx.currentBoardState);
 ctx.currentBoardState[800].isGold=true;ctx.currentBoardState[801].k=0;assert.strictEqual(prepareCracksResume(ctx,exhausted),exhausted);
 for(const version of [1,2]){const old={...exhausted,version};assert.strictEqual(prepareCracksResume(ctx,old),old);}
 const off={...ctx,contourRules:{...ctx.contourRules,material:{enabled:false,strength:80}}};
 assert.notEqual(prepareCracksResume(off,exhausted),exhausted,'disabling material unblocks an exhausted run');
 const live=run(fixture(),createCracksState(41),1).state;assert(live.tips.length);assert.strictEqual(prepareCracksResume(fixture(),live),live);
 assert.strictEqual(prepareCracksResume(ctx,resumed),resumed,'queued brush nucleus is retained');
});
