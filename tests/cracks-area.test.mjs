import test from 'node:test';
import assert from 'node:assert/strict';
import {createCracksState,runCracksGeneration,prepareCracksResume,queueCracksGrowth} from '../js/simulations/cracks.js';
import {DEFAULT_CRACKS_GROWTH,validateCracksArea,validateCracksGrowth,getCracksPresetId} from '../js/cracks-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const n=41,palette=['#222244','#8888aa','#ffffff'];
function fixture(area='dead',rainbow=false){return {n,currentPalette:palette,cracksBrush:{color:palette[2],rainbow},contourRules:{growth:{...DEFAULT_CRACKS_GROWTH,...(area==='dead'?{area}: {})},material:{enabled:true,strength:100}},currentBoardState:Array.from({length:n*n},(_,i)=>({k:i%n<6||i%n>=n-6||Math.floor(i/n)<6||Math.floor(i/n)>=n-6?0:1,v:i%n<6||i%n>=n-6||Math.floor(i/n)<6||Math.floor(i/n)>=n-6?0:1,isGold:i===0}))};}
const outcome=r=>({board:r.ctx.currentBoardState,state:r.state});
function advance(ctx,state,count){for(let i=0;i<count;i++){const r=runCracksGeneration(ctx,state);ctx={...ctx,currentBoardState:r.nextBoardState};state=r.nextCracksState;}return {ctx,state};}
test('area validation keeps missing/all settings canonical and records dead-only in profiles',()=>{
 assert.equal(validateCracksArea(),'all');for(const area of [null,'','dark',1])assert.throws(()=>validateCracksArea(area));assert.deepEqual(validateCracksGrowth({...DEFAULT_CRACKS_GROWTH,area:'all'}),DEFAULT_CRACKS_GROWTH);
 const growth=validateCracksGrowth({...DEFAULT_CRACKS_GROWTH,area:'dead'});assert.equal(getCracksPresetId(growth),'first-whisper');const settings=defaultWorkspaceSettings();settings.rules.contour.growth=growth;assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.contour.growth,growth);
});
for(const rainbow of [false,true])test(`dead-only grows in rank-zero background at 100% material influence, preserving colored and gold cells; rainbow=${rainbow}`,()=>{
 const ctx=fixture('dead',rainbow),saved=structuredClone(ctx),state=createCracksState(n,1234);const result=advance(ctx,state,150);
 assert(result.ctx.currentBoardState.some((t,i)=>saved.currentBoardState[i].k===0&&!t.isGold&&t.k!==0),'dead background changes despite saved material resistance');for(let i=0;i<n*n;i++)if(saved.currentBoardState[i].k!==0||saved.currentBoardState[i].isGold)assert.deepEqual(result.ctx.currentBoardState[i],saved.currentBoardState[i]);assert.deepEqual(ctx,saved);
 assert.deepEqual(advance(structuredClone(result.ctx),JSON.parse(JSON.stringify(result.state)),50),advance(result.ctx,result.state,50));
});
test('eligibility applies to new roots, renewal, painted seeds and tips reaching a colored wall',()=>{
 const ctx=fixture();ctx.currentBoardState.forEach(t=>{t.k=t.v=1;t.isGold=false;});const initial=createCracksState(n),stopped={...initial,roots:3,steps:100};assert.deepEqual(advance(ctx,initial,20).ctx.currentBoardState,ctx.currentBoardState);assert.strictEqual(prepareCracksResume(ctx,stopped),stopped);assert.equal(queueCracksGrowth(ctx,stopped,[{i:50}]).pendingSeed,null);
 ctx.currentBoardState[50].k=ctx.currentBoardState[51].k=0;ctx.currentBoardState[50].v=ctx.currentBoardState[51].v=0;assert.notEqual(prepareCracksResume(ctx,stopped).pendingSeed,null);assert.equal(queueCracksGrowth(ctx,stopped,[{i:50}]).pendingSeed,50);
 const tip={...stopped,tips:[{x:10,y:10,angle:0,age:1}]};assert.equal(runCracksGeneration(ctx,tip).nextCracksState.tips.length,0);
});
test('missing and explicit all preserve the original algorithm, including legacy versions',()=>{
 const ctx=fixture('all');ctx.contourRules.material={enabled:false,strength:100};const base=advance(ctx,createCracksState(n,9123),100),explicit=advance({...ctx,contourRules:{...ctx.contourRules,growth:{...DEFAULT_CRACKS_GROWTH,area:'all'}}},createCracksState(n,9123),100);assert.deepEqual(outcome(explicit),outcome(base));assert(base.ctx.currentBoardState.some((t,i)=>ctx.currentBoardState[i].k===1&&t.k!==1));
 for(const version of [1,2]){const state={...createCracksState(n,4321),version};assert.deepEqual(outcome(advance({...ctx,contourRules:{...ctx.contourRules,growth:{...DEFAULT_CRACKS_GROWTH,area:'dead'}}},state,60)),outcome(advance(ctx,state,60)),'old engine versions ignore new growth controls until deliberately upgraded');}
});


test('dead-only fully ignores saved material influence, including its random draws',()=>{
 const hard=fixture(),off={...hard,contourRules:{...hard.contourRules,material:{enabled:false,strength:0}}};
 assert.deepEqual(outcome(advance(hard,createCracksState(n,789),120)),outcome(advance(off,createCracksState(n,789),120)));
});
