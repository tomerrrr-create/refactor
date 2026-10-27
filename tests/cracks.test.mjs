import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createCracksState,restoreCracksState,runCracksGeneration} from '../js/simulations/cracks.js';
const fixture=(n=81,color='darkest')=>({n,currentPalette:Array(23).fill('#fff'),contourRules:{sensitivity:75,lineColor:color},currentBoardState:Array.from({length:n*n},()=>({k:11,v:11,isGold:false}))});
const advance=(ctx,state,count)=>{for(let i=0;i<count;i++){const result=runCracksGeneration(ctx,state);ctx={...ctx,currentBoardState:result.nextBoardState};state=result.nextCracksState;}return {ctx,state};};
test('cracks branch gradually, preserve protected cells and do not mutate inputs',()=>{
 const ctx=fixture();ctx.currentBoardState[0].isGold=true;const original=structuredClone(ctx),state=createCracksState(ctx.n),saved=structuredClone(state);
 const first=runCracksGeneration(ctx,state);assert.deepEqual(ctx,original);assert.deepEqual(state,saved);
 assert(first.nextBoardState.filter(t=>t.k===0).length<=4);assert.equal(first.nextBoardState[0].isGold,true);
 let branching=false,board=ctx.currentBoardState,session=state;
 for(let i=0;i<120;i++){const next=runCracksGeneration({...ctx,currentBoardState:board},session);assert(next.nextCracksState.tips.length<=48);if(next.nextCracksState.roots===session.roots&&next.nextCracksState.tips.length>session.tips.length)branching=true;board=next.nextBoardState;session=next.nextCracksState;}
 assert(branching);assert(board.filter(t=>t.k===0).length>30);assert.equal(board[0].k,11);assert(board.every(t=>t.k>=0&&t.k<23&&t.k===t.v));
});
test('project/recipe checkpoint round trips resume the identical deterministic evolution',()=>{
 const initial=advance(fixture(),createCracksState(81,123),45);
 const savedBoard=JSON.parse(JSON.stringify(initial.ctx.currentBoardState)),savedState=JSON.parse(JSON.stringify(initial.state));
 const uninterrupted=advance(initial.ctx,initial.state,70);
 const resumed=advance({...initial.ctx,currentBoardState:savedBoard},restoreCracksState(savedState),70);
 assert.deepEqual(resumed,uninterrupted);
});
test('empty and gold boards stay unchanged, light lines work and changed board sizes restart safely',()=>{
 for(const n of [1,2,9,249]){const ctx=fixture(n);ctx.currentBoardState.forEach(t=>{t.k=t.v=0;});const result=advance(ctx,createCracksState(n),5);assert.deepEqual(result.ctx.currentBoardState,ctx.currentBoardState);}
 const gold=fixture(21);gold.currentBoardState.forEach(t=>t.isGold=true);assert.deepEqual(advance(gold,createCracksState(21),20).ctx.currentBoardState,gold.currentBoardState);
 const light=advance(fixture(21,'lightest'),createCracksState(21),10);assert(light.ctx.currentBoardState.some(t=>t.k===22));
 assert.equal(runCracksGeneration(fixture(9),createCracksState(21)).nextCracksState.n,9);
 for(const invalid of [{...createCracksState(9),random:0},{...createCracksState(9),tips:[{x:NaN,y:0,angle:0,age:0}]},{...createCracksState(9),tips:Array(49).fill({x:0,y:0,angle:0,age:0})}])assert.throws(()=>restoreCracksState(invalid));
});
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(){const c=vm.createContext({createCracksState,restoreCracksState,runCracksGeneration,n:21,contourMode:'contours',cracksState:null,contourRules:{sensitivity:75,lineColor:'darkest'},armedSimulation:null,isLifePlaying:false,dom:{btnContour:{classList:{toggle(){}},setAttribute(){}}},getText:k=>k,recordLiveSimulationRules:()=>{c.recorded=c.getContourRecordingRules();},Simulations:{runContourGeneration:()=>['original']}});
 c.armSimulation=sim=>{c.armedSimulation=sim;if(sim==='contour'){c.contourMode='contours';c.cracksState=null;}};
 vm.runInContext(source.slice(source.indexOf('function getContourSnapshot()'),source.indexOf('function nextEvolutionMode(')),c);return c;}
test('paused contour cycle includes Off, live cycle skips Off, and snapshots preserve rules and tips',()=>{
 const c=harness();c.cycleContourMode();assert.equal(c.armedSimulation,'contour');assert.equal(c.contourMode,'contours');assert.deepEqual(c.runContourEvolution(fixture(21)),['original']);
 c.cycleContourMode();assert.equal(c.contourMode,'cracks');c.runContourEvolution(fixture(21));const snapshot=JSON.parse(JSON.stringify(c.getContourSnapshot()));assert(snapshot.cracksState.steps>0);
 c.cycleContourMode();assert.equal(c.armedSimulation,null);c.restoreContourSnapshot(snapshot);assert.equal(c.contourMode,'cracks');assert.deepEqual(JSON.parse(JSON.stringify(c.getContourSnapshot())),snapshot);
 c.isLifePlaying=true;c.cycleContourMode();assert.equal(c.contourMode,'contours');assert.equal(c.armedSimulation,'contour');c.cycleContourMode();assert.equal(c.recorded.mode,'cracks');assert.equal(c.recorded.cracksState.steps,0);assert(c.isLifePlaying);
 assert.throws(()=>c.validateContourSnapshot({...snapshot,mode:'unknown'}));
});
