import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNetworkState,restoreNetworkState,runNetworkGeneration} from '../js/simulations/network.js';
const n=149,palette=Array.from({length:64},(_,k)=>'#'+(k*221991).toString(16).padStart(6,'0'));
const rules={growth:100,branching:40,persistence:75,backgroundMode:'first'};
function scene(){
 const board=Array.from({length:n*n},()=>({k:0,v:0}));
 for(const[x,y,k]of [[30,35,60],[110,40,46],[45,110,32],[115,115,55]])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)board[(y+dy)*n+x+dx]={k,v:k,source:true};
 return board;
}
const step=(board,state,r=rules)=>runNetworkGeneration({n,currentBoardState:board,currentPalette:palette,networkRules:r},state);
function disconnected(board){
 const seen=new Set(),queue=[];
 for(let i=0;i<board.length;i++)if(board[i].source){seen.add(i);queue.push(i);}
 for(let head=0;head<queue.length;head++){
  const i=queue[head],y=Math.floor(i/n),x=i%n;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const r=y+dy,c=x+dx,j=r*n+c;
   if(r<0||c<0||r>=n||c>=n||!board[j].k||seen.has(j))continue;
   seen.add(j);queue.push(j);
  }
 }
 return board.filter((t,i)=>t.k&&!seen.has(i)).length;
}
test('fast growth paints a connected path instead of skipping cells',()=>{
 for(const legacy of [true,false]){
  const board=scene(),state=createNetworkState(n);if(legacy)delete state.growthVersion;
  for(let f=0;f<4;f++)step(board,state);
  if(legacy)assert(disconnected(board)>0,'original scenario reproduces a floating pixel');
  else assert.equal(disconnected(board),0);
 }
 const board=scene(),state=createNetworkState(n);
 for(let f=0;f<80;f++){step(board,state);assert.equal(disconnected(board),0,'continuous before trails age out');}
});
test('replacing a patch within the same bucket retires old tips and launches new ones',()=>{
 for(const legacy of [true,false]){
  const board=Array.from({length:n*n},()=>({k:0,v:0}));
  for(const[x,y,k]of [[30,35,60],[110,110,46]])board[y*n+x]={k,v:k};
  const state=createNetworkState(n);if(legacy)delete state.growthVersion;
  for(let f=0;f<12;f++)step(board,state,{...rules,growth:65,branching:0});
  const source=state.sources.find(s=>s[1]===30),oldIds=new Set(state.agents.filter(a=>a.origin===source[0]).map(a=>a.id));
  assert(oldIds.size>0);board[35*n+30]={k:0,v:0};board[35*n+34]={k:60,v:60};
  step(board,state,{...rules,growth:65,branching:0});
  assert.equal(state.sources.find(s=>s[1]===34)[0],source[0],'replacement occupies the same bucket');
  if(legacy)assert(state.agents.some(a=>oldIds.has(a.id)));
  else {
   assert(!state.agents.some(a=>oldIds.has(a.id)));
   assert(state.agents.some(a=>a.origin===source[0]&&a.age===1),'replacement buds immediately');
  }
 }
});
test('moving a representative within the same surviving patch retains its tips',()=>{
 const board=scene(),state=createNetworkState(n);for(let f=0;f<12;f++)step(board,state);
 const source=state.sources.find(s=>s[3]===60),oldIds=new Set(state.agents.filter(a=>a.origin===source[0]).map(a=>a.id));
 // Add a higher-rank cell immediately beside the patch inside its sampling bucket.
 board[33*n+33]={k:63,v:63};step(board,state);
 assert(state.agents.some(a=>oldIds.has(a.id)),'same connected source is still alive');
});
test('both growth versions cold-resume exactly and reject unknown versions',()=>{
 for(const legacy of [true,false]){
  const board=scene(),state=createNetworkState(n);if(legacy)delete state.growthVersion;
  for(let f=0;f<8;f++)step(board,state);
  const saved=JSON.parse(JSON.stringify({board,state}));
  for(let f=0;f<15;f++)step(board,state);
  const resumed=restoreNetworkState(saved.state);
  for(let f=0;f<15;f++)step(saved.board,resumed);
  assert.deepEqual({board,state},{board:saved.board,state:resumed});
 }
 assert.throws(()=>restoreNetworkState({...createNetworkState(n),growthVersion:3}));
});
// Captured from the unmodified work engine at ada8f65.
test('historical growth retains its recorded pixel and runtime sequence',()=>{
 const board=scene(),state=createNetworkState(n);delete state.growthVersion;
 for(let f=0;f<30;f++)step(board,state);
 const hash=createHash('sha256').update(JSON.stringify({board,state})).digest('hex');
 assert.equal(hash,'f1c365337e7a13bc06974fa3b010d76774535464c80d869829260a37ddb8e777');
});
