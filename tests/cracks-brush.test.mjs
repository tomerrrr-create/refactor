import test from 'node:test';
import assert from 'node:assert/strict';
import {createCracksState,restoreCracksState,getCracksLineIndex,runCracksGeneration,queueCracksGrowth,prepareCracksResume} from '../js/simulations/cracks.js';
import {INITIAL_CRACKS_GROWTH,DEFAULT_CRACKS_GROWTH,validateCracksBrush} from '../js/cracks-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const palette=['#000000','#bb3366','#5588cc','#ffffff'];
const fixture=(rainbow=true,n=21)=>({n,currentPalette:palette,contourRules:{lineColor:'brush',growth:INITIAL_CRACKS_GROWTH},cracksBrush:{color:palette[2],rainbow},currentBoardState:Array.from({length:n*n},()=>({k:1,v:1,isGold:false}))});
const visited=(state,index)=>!!(parseInt(state.rainbowTrail?.[Math.floor(index/256)]?.[Math.floor(index%256/4)]??'0',16)&1<<(index%4));
function advance(ctx,state,count){for(let i=0;i<count;i++){const r=runCracksGeneration(ctx,state);ctx={...ctx,currentBoardState:r.nextBoardState};state=r.nextCracksState;}return {ctx,state};}
test('opening Fibonacci values stay separate from legacy growth; brush source round-trips through settings',()=>{
 assert.deepEqual(INITIAL_CRACKS_GROWTH,{branchChance:55,branchInterval:8,curvature:130});assert.deepEqual(DEFAULT_CRACKS_GROWTH,{branchChance:65,branchInterval:11,curvature:100});
 const settings=defaultWorkspaceSettings();settings.rules.contour.lineColor='brush';assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 for(const bad of [{color:'red',rainbow:false},{color:palette[1],rainbow:1},{color:null,rainbow:false,extra:1}])assert.throws(()=>validateCracksBrush(bad));
});
test('single brush color follows its actual palette entry and empty/unknown brushes fall back to darkest',()=>{
 for(const currentPalette of [palette,[...palette].reverse()]){const ctx={...fixture(false),currentPalette};assert.equal(currentPalette[getCracksLineIndex(ctx)],palette[2]);}
 for(const color of [null,'#abcdef'])assert.equal(getCracksLineIndex({...fixture(false),cracksBrush:{color,rainbow:false}}),0);
 let ctx=fixture(false);ctx.currentBoardState[10]={k:2,v:2,isGold:false};const r=advance(ctx,createCracksState(21),40);assert(r.ctx.currentBoardState.some((t,i)=>i!==10&&t.k===2));assert.equal(r.state.rainbowTrail,undefined);
 ctx={...r.ctx,cracksBrush:{color:palette[3],rainbow:false}};assert(advance(ctx,prepareCracksResume(ctx,r.state),40).ctx.currentBoardState.some(t=>t.k===3));
});
test('rainbow uses all palette colors, gold stays protected and only the visited trail stops growth',()=>{
 let ctx=fixture();ctx.currentBoardState[0].isGold=true;const original=structuredClone(ctx),initial=createCracksState(21),saved=structuredClone(initial);
 const r=advance(ctx,initial,80);assert.deepEqual(ctx,original);assert.deepEqual(initial,saved);assert.equal(r.ctx.currentBoardState[0].isGold,true);
 const colors=new Set(r.ctx.currentBoardState.flatMap((t,i)=>visited(r.state,i)?[t.k]:[]));assert.equal(colors.size,palette.length);assert(!visited(r.state,0));
 const blocked={...createCracksState(21),steps:10,roots:3,tips:[{x:8,y:8,angle:0,age:0}],rainbowTrail:{0:'f'.repeat(64),1:'f'.repeat(46)+'1'+'0'.repeat(17)}};
 // A full visited board prevents both tips and explicit resume, regardless of cell colors.
 assert.equal(runCracksGeneration(ctx,blocked).nextCracksState.tips.length,0);const stopped={...blocked,tips:[]};assert.strictEqual(prepareCracksResume(ctx,stopped),stopped);
 // The same marked board in a solid mode still uses the original color collision rule.
 assert(runCracksGeneration({...ctx,cracksBrush:{color:palette[2],rainbow:false}},blocked).nextCracksState.tips.length>0);
});
test('painting clears rainbow marks without mutating history, queues renewal, and resumes after JSON restore',()=>{
 const run=advance(fixture(),createCracksState(21),40),before=JSON.stringify(run.state);const indices=run.ctx.currentBoardState.flatMap((_,i)=>visited(run.state,i)?[i]:[]).slice(0,20);assert(indices.length>5);
 const ctx={...run.ctx,currentBoardState:run.ctx.currentBoardState.map((t,i)=>indices.includes(i)?{...t,k:1,v:1}:t)};
 const queued=queueCracksGrowth(ctx,run.state,indices.map(i=>({i})));assert.equal(JSON.stringify(run.state),before);for(const i of indices)assert(!visited(queued,i));assert.notEqual(queued.pendingSeed,null);
 const continued=advance(ctx,queued,35),restored=advance(structuredClone(ctx),restoreCracksState(JSON.parse(JSON.stringify(queued))),35);assert.deepEqual(restored,continued);
 assert.equal(JSON.stringify(run.state),before);
});
test('invalid or oversized rainbow chunks are rejected without accepting out-of-board marks',()=>{
 for(const rainbowTrail of [[],{'-1':'0'.repeat(64)},{2:'0'.repeat(64)},{0:'f'},{1:'f'.repeat(64)},{0:'z'.repeat(64)}])assert.throws(()=>restoreCracksState({...createCracksState(21),rainbowTrail}));
});
