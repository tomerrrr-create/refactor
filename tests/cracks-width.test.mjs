import test from 'node:test';
import assert from 'node:assert/strict';
import {getBrushTiles,BRUSH_SIZES} from '../js/brush-footprint.js';
import {validateCracksBrush} from '../js/cracks-settings.js';
import {createCracksState,restoreCracksState,runCracksGeneration,prepareCracksResume} from '../js/simulations/cracks.js';
const n=81,palette=['#000000','#777777','#ffffff'];
function setup(size=5){
 const i=40*n+20,ctx={n,currentPalette:palette,cracksBrush:{color:palette[2],rainbow:false,size},contourRules:{growth:{branchChance:0,branchInterval:40,curvature:0}},currentBoardState:Array.from({length:n*n},()=>({k:1,v:1,isGold:false}))};
 for(const j of getBrushTiles(i,n,size))ctx.currentBoardState[j]={k:2,v:2,isGold:false};
 const state={...createCracksState(n),roots:16,steps:1,tips:[{x:20,y:40,angle:0,age:0,recent:[{i,size}]}]};return {ctx,state};
}
function advance(ctx,state,count=1){for(let i=0;i<count;i++){const r=runCracksGeneration(ctx,state);ctx={...ctx,currentBoardState:r.nextBoardState};state=r.nextCracksState;}return {ctx,state};}
test('all brush diameters grow uninterrupted at their circular width, with immutable snapshots',()=>{
 for(const size of BRUSH_SIZES){const {ctx,state}=setup(size),saved=structuredClone({ctx,state}),r=advance(ctx,state,30);assert.equal(r.state.tips.length,1,`size ${size}`);assert.equal(r.ctx.currentBoardState.filter((t,i)=>i%n===30&&t.k===2).length,size);assert.deepEqual({ctx,state},saved);assert.deepEqual(advance(structuredClone(ctx),restoreCracksState(JSON.parse(JSON.stringify(state))),30),r);}
});
test('live widening and narrowing affect only future growth and preserve earlier pixels',()=>{
 let r=advance(...Object.values(setup(3)),16);const before=structuredClone(r.ctx.currentBoardState);
 r.ctx.cracksBrush={...r.ctx.cracksBrush,size:9};r=advance(r.ctx,r.state,18);assert.equal(r.state.tips.length,1);
 for(let i=0;i<before.length;i++)if(before[i].k===2)assert.deepEqual(r.ctx.currentBoardState[i],before[i]);
 assert.equal(r.ctx.currentBoardState.filter((t,i)=>i%n===40&&t.k===2).length,9);
 r.ctx.cracksBrush={...r.ctx.cracksBrush,size:1,color:palette[0]};r=advance(r.ctx,r.state,25);assert.equal(r.state.tips.length,1,'narrow tip escapes its previous wide cap');assert.equal(r.ctx.currentBoardState.filter((t,i)=>i%n===65&&t.k===0).length,1);
});
test('wide leading edge respects protected cells and other cracks, including off-center obstacles',()=>{
 for(const gold of [true,false]){const {ctx,state}=setup();const i=42*n+23;ctx.currentBoardState[i]={k:2,v:2,isGold:gold};const before=structuredClone(ctx.currentBoardState[i]);const r=advance(ctx,state,10);assert.equal(r.state.tips.length,0);assert.deepEqual(r.ctx.currentBoardState[i],before);assert(!r.ctx.currentBoardState.some((t,i)=>i%n>24&&t.k===2));}
});
test('wide roots do not fit narrow lanes or overwrite hard material; brush footprints clip at edges',()=>{
 const {ctx,state}=setup(7);ctx.contourRules.material={enabled:true,strength:100};ctx.currentBoardState.forEach((t,i)=>{t.k=t.v=i%n===20?1:0;});const stopped={...state,tips:[],pendingSeed:null};assert.strictEqual(prepareCracksResume(ctx,stopped),stopped);assert.deepEqual(advance(ctx,stopped,5).ctx.currentBoardState,ctx.currentBoardState);
 const edge=setup(5);edge.state.tips=[{x:1,y:0,angle:0,age:0,recent:[{i:1,size:5}]}];edge.ctx.currentBoardState=Array.from({length:n*n},()=>({k:1,v:1,isGold:false}));for(const i of getBrushTiles(1,n,5))edge.ctx.currentBoardState[i].k=2;const r=advance(edge.ctx,edge.state,12);assert.equal(r.state.tips.length,1);assert(!r.ctx.currentBoardState.some((t,i)=>Math.floor(i/n)>2&&t.k===2));
});
test('wide rainbow footprints all enter the collision trail; branches and JSON continue deterministically',()=>{
 const {ctx,state}=setup(7);ctx.cracksBrush.rainbow=true;ctx.contourRules.growth={branchChance:100,branchInterval:4,curvature:80};const r=advance(ctx,state,25);assert(r.state.tips.some(t=>t.age<20));assert(Object.keys(r.state.rainbowTrail).length>0);for(const t of r.state.tips)for(const i of getBrushTiles(Math.round(t.y)*n+Math.round(t.x),n,7)){const chunk=r.state.rainbowTrail[Math.floor(i/256)];assert((parseInt(chunk?.[Math.floor(i%256/4)]??'0',16)&1<<(i%4))||ctx.currentBoardState[i].k===2);}
 assert.deepEqual(advance(structuredClone(r.ctx),restoreCracksState(JSON.parse(JSON.stringify(r.state))),20),advance(r.ctx,r.state,20));
});
test('optional size and bounded tip history validate strictly; absent size keeps legacy one-cell growth',()=>{
 assert.deepEqual(validateCracksBrush({color:null,rainbow:false}),{color:null,rainbow:false});for(const size of [0,2,21,100,'3'])assert.throws(()=>validateCracksBrush({color:null,rainbow:false,size}));
 const {ctx,state}=setup(1);delete ctx.cracksBrush.size;delete state.tips[0].recent;const r=advance(ctx,state,15);assert(r.state.tips.every(t=>t.recent===undefined));assert.equal(r.ctx.currentBoardState.filter((t,i)=>i%n===25&&t.k===2).length,1);
 for(const recent of [[{i:-1,size:3}],[{i:1,size:2}],Array(27).fill({i:1,size:3})])assert.throws(()=>restoreCracksState({...state,tips:[{...state.tips[0],recent}]}));
});
