import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createCracksState,restoreCracksState,runCracksGeneration,queueCracksGrowth} from '../js/simulations/cracks.js';
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
 c.armSimulation=sim=>{c.armedSimulation=sim;if(sim==='contour'){c.contourMode='cracks';c.cracksState=null;}};
 vm.runInContext(source.slice(source.indexOf('function getContourSnapshot()'),source.indexOf('function nextEvolutionMode(')),c);return c;}
test('paused contour cycle includes Off, live cycle skips Off, and snapshots preserve rules and tips',()=>{
 const c=harness();c.cycleContourMode();assert.equal(c.armedSimulation,'contour');assert.equal(c.contourMode,'cracks');c.runContourEvolution(fixture(21));const snapshot=JSON.parse(JSON.stringify(c.getContourSnapshot()));assert(snapshot.cracksState.steps>0);
 c.cycleContourMode();assert.equal(c.contourMode,'contours');assert.deepEqual(c.runContourEvolution(fixture(21)),['original']);c.cycleContourMode();assert.equal(c.armedSimulation,null);c.restoreContourSnapshot(snapshot);assert.equal(c.contourMode,'cracks');assert.deepEqual(JSON.parse(JSON.stringify(c.getContourSnapshot())),snapshot);
 c.isLifePlaying=true;c.cycleContourMode();assert.equal(c.contourMode,'contours');assert.equal(c.armedSimulation,'contour');c.cycleContourMode();assert.equal(c.recorded.mode,'cracks');assert.equal(c.recorded.cracksState.steps,0);assert(c.isLifePlaying);
 assert.throws(()=>c.validateContourSnapshot({...snapshot,mode:'unknown'}));
});

test('legacy contour recordings select original contours despite the new default',()=>{
 const c=harness();c.currentSortMethod='luminance';
 vm.runInContext(source.slice(source.indexOf('function applyMacroRules('),source.indexOf('function executeMacroAction(')),c);
 c.applyMacroRules('Armed: contour | Sort: luminance | Rules: No specific rules mapping');assert.equal(c.contourMode,'contours');
 c.cycleContourMode();c.applyMacroRules('Armed: contour | Sort: luminance | Rules: {"sensitivity":75,"lineColor":"darkest"}');assert.equal(c.contourMode,'contours');
});

test('exhausted cracks restart inside newly painted material after Pause/Play, without changing the paused board',()=>{
 let {ctx,state}=advance(fixture(21),createCracksState(21),500);assert.equal(state.tips.length,0);assert.equal(state.roots,3);
 const changes=[];for(let y=7;y<14;y++)for(let x=7;x<14;x++){const i=y*21+x;ctx.currentBoardState[i]={k:12,v:12,isGold:false};changes.push({i,k:12});}
 const painted=structuredClone(ctx.currentBoardState),dead=advance(ctx,state,20);assert.deepEqual(dead.ctx.currentBoardState,painted,'reproduces the exhausted original state');
 const queued=queueCracksGrowth(ctx,state,changes);assert.deepEqual(ctx.currentBoardState,painted);assert.equal(queued.roots,0);assert(queued.pendingSeed!==null);assert.equal(state.roots,3);
 const resumed=advance(ctx,queued,8);assert.notDeepEqual(resumed.ctx.currentBoardState,painted);assert(resumed.ctx.currentBoardState.some((tile,i)=>tile.k===0&&painted[i].k!==0));
 const saved=JSON.parse(JSON.stringify(queued));assert.deepEqual(advance(ctx,restoreCracksState(saved),8),resumed);
});
test('renewal is independent of brush packet grouping and ignores line-colored or protected targets',()=>{
 const ctx=fixture(21),state=createCracksState(21),a=[{i:250,k:11},{i:249,k:11}],b=[{i:247,k:11},{i:248,k:11}];
 assert.deepEqual(queueCracksGrowth(ctx,queueCracksGrowth(ctx,state,a),b),queueCracksGrowth(ctx,state,[...a,...b]));
 ctx.currentBoardState[50]={k:0,v:0,isGold:false};ctx.currentBoardState[51].isGold=true;
 assert.deepEqual(queueCracksGrowth(ctx,state,[{i:50,k:0},{i:51,k:11}]),state);
 const legacy={...state,version:1,roots:3};delete legacy.pendingSeed;
 assert.strictEqual(queueCracksGrowth(ctx,legacy,a),legacy,'old recordings keep version-1 behavior');
 assert.deepEqual(advance(ctx,legacy,10),advance(ctx,restoreCracksState(JSON.parse(JSON.stringify(legacy))),10));
 assert.throws(()=>restoreCracksState({...state,pendingSeed:441}));
});

test('version-1 recipes retain the board and random cursor captured from the original engine',()=>{
 const ctx=fixture(41),legacy={version:1,n:41,random:123,steps:0,roots:0,tips:[]};
 const result=advance(ctx,legacy,100);
 const hash=createHash('sha256').update(JSON.stringify({board:result.ctx.currentBoardState,state:result.state})).digest('hex');
 assert.equal(hash,'b7b0358bcb508c9b35a57dd931b5822ed82e7ac7924614ffee699e08868358b2');
});
