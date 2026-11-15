import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNetworkState,restoreNetworkState,runNetworkGeneration} from '../js/simulations/network.js';
const palette=Array.from({length:64},(_,i)=>'#'+(i*221991).toString(16).padStart(6,'0'));
const defaults={growth:65,branching:40,persistence:75,backgroundMode:'first'};
function scene(n,kind='sparse'){return Array.from({length:n*n},(_,i)=>{const x=i%n,y=Math.floor(i/n);let k=kind==='dense'?(i*13+y*7)%64:0;if(kind!=='dense')for(const [a,b,c]of [[.2,.25,60],[.75,.3,46],[.35,.75,32],[.8,.8,55]])if((x-a*n)**2+(y-b*n)**2<5)k=c;return {k,v:k,isGold:i===0};});}
const step=(board,state,mode='palette',rules=defaults)=>runNetworkGeneration({n:state.n,currentBoardState:board,currentPalette:palette,networkRules:{...rules,mode}},state);
test('repeated switches do not launch source bursts or defer them to the following generation',()=>{
 for(const kind of ['sparse','dense']){
  const board=scene(149,kind),state=createNetworkState(149),rules={...defaults,branching:0};
  for(let f=0;f<180;f++)step(board,state,'palette',rules);
  for(let f=0;f<100;f++){
   const mode=Math.floor(f/2)%2?'palette':'spatial',before=state.nextId,frame=state.frame;
   step(board,state,mode,rules);
   assert(state.nextId-before<=(frame%10===0?1:0),`${kind}/${f}: only the ordinary timed launch may create a tip`);
   assert.equal(state.frame,frame+1);assert(state.agents.length<=128);
  }
  assert.equal(state.stableSources,true);
 }
});
test('switching preserves the original source points and active tips of surviving patches',()=>{
 const board=scene(149),state=createNetworkState(149),rules={...defaults,branching:0};
 for(let f=0;f<20;f++)step(board,state,'palette',rules);
 const sources=structuredClone(state.sources),agents=state.agents.map(a=>a.id),count=state.nextId;
 step(board,state,'spatial',rules);
 for(const source of sources){const retained=state.sources.find(s=>s[0]===source[0]);assert(retained);assert.deepEqual(retained.slice(0,4),source.slice(0,4));}
 assert(agents.every(id=>state.agents.some(a=>a.id===id)));
 assert(state.nextId-count<=1);
});
test('after switching, actual new painting, recoloring and erasure still update source ownership',()=>{
 const n=61,board=scene(n),state=createNetworkState(n),rules={...defaults,branching:0};
 for(let f=0;f<25;f++)step(board,state,'palette',rules);step(board,state,'spatial',rules);
 const index=30*n+30;board[index]={k:63,v:63};step(board,state,'spatial',rules);
 let source=state.sources.find(s=>s[1]===30&&s[2]===30);assert(source,'new patch buds');
 assert(state.agents.some(a=>a.origin===source[0]&&a.k===63));
 const ids=new Set(state.agents.filter(a=>a.origin===source[0]).map(a=>a.id));
 board[index]={k:50,v:50};step(board,state,'spatial',rules);
 assert(state.agents.some(a=>a.origin===source[0]&&a.k===50));assert(!state.agents.some(a=>ids.has(a.id)));
 board.forEach(t=>{if(!t.isGold)t.k=t.v=0;});step(board,state,'spatial',rules);
 assert.equal(state.sources.length,0);assert.equal(state.agents.length,0);assert.equal(state.trails.length,0);
});
test('cold resume and switches while Growth is zero preserve the processed source mode',()=>{
 const n=61,board=scene(n),state=createNetworkState(n);for(let f=0;f<25;f++)step(board,state);
 const before=state.nextId;step(board,state,'spatial',{...defaults,growth:0});assert.equal(state.nextId,before);assert.equal(state.sourceMode,'palette');
 const saved=JSON.parse(JSON.stringify({board,state}));
 const advance=(b,s)=>{for(let f=0;f<70;f++)step(b,s,Math.floor(f/7)%2?'palette':'spatial');return {board:b,state:s};};
 const expected=advance(board,state);step(scene(7),createNetworkState(7));assert.deepEqual(advance(saved.board,restoreNetworkState(saved.state)),expected);
 for(const invalid of [{transitionVersion:2},{sourceMode:'unknown'},{stableSources:false}])assert.throws(()=>restoreNetworkState({...state,...invalid}));
});
// Reference hashes captured from the unmodified b4ce1cb engine.
test('fresh runs retain their pre-fix trajectories and historical mixed checkpoints remain readable',()=>{
 for(const mode of ['palette','spatial']){
  const board=scene(61),state=createNetworkState(61);
  for(let f=0;f<600;f++)step(board,state,mode);
  const {transitionVersion,sourceMode,stableSources,...runtime}=state;
  const hash=createHash('sha256').update(JSON.stringify({board,state:runtime})).digest('hex');
  assert.equal(hash,mode==='palette'?'32932feb23d90445e7866847d60ae749a93f146cd93284900f8819ad9152777a':'b7633cdbb671e85e6960a7c244e16d183146785eb6b3449aebe586e2ba1a14a5');
 }
 const legacy=createNetworkState(61);delete legacy.transitionVersion;
 assert.equal(restoreNetworkState(legacy).transitionVersion,undefined);
 const board=scene(61);for(let f=0;f<80;f++)step(board,legacy,f<25?'palette':f<50?'spatial':'palette');
 const hash=createHash('sha256').update(JSON.stringify({board,state:legacy})).digest('hex');assert.equal(hash,'7e7692be03121f15a07d474a84a9f8a7741dce966bac99da58f592acf649bb6b');
});
