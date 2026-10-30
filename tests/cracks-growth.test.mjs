import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCracksState,runCracksGeneration,restoreCracksState} from '../js/simulations/cracks.js';
import {DEFAULT_CRACKS_GROWTH,validateCracksGrowth} from '../js/cracks-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const fixture=()=>({n:81,currentPalette:Array(23),contourRules:{lineColor:'darkest'},currentBoardState:Array.from({length:6561},()=>({k:20,v:20,isGold:false}))});
const tip=()=>({...createCracksState(81,123),roots:5,steps:1,tips:[{x:40,y:40,angle:0,age:0}]});
function run(ctx,state,count){for(let i=0;i<count;i++){const r=runCracksGeneration(ctx,state);ctx={...ctx,currentBoardState:r.nextBoardState};state=r.nextCracksState;}return {ctx,state};}
test('default growth retains version-3 artwork and random cursors from before parameterization',()=>{
 for(const [lineColor,checksum] of [['darkest','e50fd3154ca9d0a9cfe133a9017becd150301ddbd874060a4486dc5f73aa4070'],['lightest','1d4fed35059c562124f717b93f02a9cd86a6140421d13785e61fb672954737f6']]){
  const ctx={n:41,currentPalette:Array(23),contourRules:{lineColor,material:{enabled:true,strength:40}},currentBoardState:Array.from({length:1681},(_,i)=>({k:10+i%11,v:10+i%11,isGold:i%137===0}))};
  const result=run(ctx,createCracksState(41,123),100),hash=createHash('sha256').update(JSON.stringify({board:result.ctx.currentBoardState,state:result.state})).digest('hex');assert.equal(hash,checksum);
  const explicit=run({...ctx,contourRules:{...ctx.contourRules,growth:DEFAULT_CRACKS_GROWTH}},createCracksState(41,123),100);assert.deepEqual(explicit.ctx.currentBoardState,result.ctx.currentBoardState);assert.deepEqual(explicit.state,result.state);
 }
});
test('branch chance and interval control the existing split, and zero curvature keeps the path straight',()=>{
 const ctx=fixture(),growth={branchChance:100,branchInterval:1,curvature:0};
 const one=run({...ctx,contourRules:{...ctx.contourRules,growth}},tip(),1);assert.equal(one.state.tips.length,2);
 for(const change of [{branchChance:0},{branchInterval:11}])assert.equal(run({...ctx,contourRules:{...ctx.contourRules,growth:{...growth,...change}}},tip(),1).state.tips.length,1);
 const straight=run({...ctx,contourRules:{...ctx.contourRules,growth:{...growth,branchChance:0}}},tip(),15);assert(straight.ctx.currentBoardState.every((t,i)=>t.k!==0||Math.floor(i/81)===40));
 const curved=run({...ctx,contourRules:{...ctx.contourRules,growth:{...growth,branchChance:0,curvature:200}}},tip(),15);assert.notDeepEqual(curved.ctx.currentBoardState,straight.ctx.currentBoardState);
 const dense=run({...ctx,contourRules:{...ctx.contourRules,growth}},tip(),200);assert(dense.state.tips.length<=48);
});
test('custom growth resumes exactly and version-1/2 sessions ignore modern tuning',()=>{
 const ctx=fixture(),custom={...ctx,contourRules:{...ctx.contourRules,growth:{branchChance:90,branchInterval:4,curvature:175}}};
 const part=run(custom,tip(),20);assert.deepEqual(run(part.ctx,part.state,40),run(structuredClone(part.ctx),restoreCracksState(JSON.parse(JSON.stringify(part.state))),40));
 for(const version of [1,2]){const state={...tip(),version};if(version===1)delete state.pendingSeed;const a=run(custom,state,60),b=run(ctx,state,60);assert.deepEqual(a.ctx.currentBoardState,b.ctx.currentBoardState);assert.deepEqual(a.state,b.state);}
});
test('growth preferences validate and round trip as an optional settings extension',()=>{
 assert.deepEqual(validateCracksGrowth(),{branchChance:65,branchInterval:11,curvature:100});
 const settings=defaultWorkspaceSettings(),legacy=serializeWorkspaceSettings(settings);settings.rules.contour.growth={...DEFAULT_CRACKS_GROWTH};assert.equal(serializeWorkspaceSettings(settings),legacy);
 settings.rules.contour.growth={branchChance:0,branchInterval:40,curvature:200};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 for(const growth of [{branchChance:-1},{branchChance:101},{branchInterval:0},{branchInterval:41},{curvature:201},{curvature:2.5},{unknown:1}])assert.throws(()=>validateCracksGrowth({...DEFAULT_CRACKS_GROWTH,...growth}));
});
