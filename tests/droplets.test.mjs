import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_DROPLETS_RULES,validateDropletsRules,createDropletsState,recordDropletsState,restoreDropletsState,validateDropletsSnapshot,runDropletsGeneration} from '../js/simulations/droplets.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots} from '../js/evolution-drawer-settings.js';
const palette=Array.from({length:64},(_,i)=>'#'+(i*4).toString(16).padStart(2,'0').repeat(3));
function boardFor(n,centers=[[.5,.5,60]],radius=.13){return Array.from({length:n*n},(_,i)=>{let k=4;for(const[x,y,color]of centers)if((i%n-x*n)**2+(Math.floor(i/n)-y*n)**2<(radius*n)**2)k=color;return{k,v:k,isGold:i===0,id:i};});}
const step=(board,state,rules=INITIAL_DROPLETS_RULES,pal=palette)=>runDropletsGeneration({n:state.n,currentBoardState:board,currentPalette:pal,dropletsRules:rules},state);
function center(state){const g=Math.min(state.n,97);let x=0,y=0;for(let i=0;i<state.phase.length;i++){x+=i%g*state.phase[i];y+=Math.floor(i/g)*state.phase[i];}return[x/state.volume,y/state.volume];}
function parts(state){const g=Math.min(state.n,97),seen=new Set();let count=0;for(let i=0;i<state.phase.length;i++){if(state.phase[i]<32768||seen.has(i))continue;count++;const q=[i];seen.add(i);for(let h=0;h<q.length;h++){const at=q[h],r=Math.floor(at/g),c=at%g;for(const j of [c?at-1:-1,c+1<g?at+1:-1,r?at-g:-1,r+1<g?at+g:-1])if(j>=0&&!seen.has(j)&&state.phase[j]>=32768){seen.add(j);q.push(j);}}}return count;}
test('Droplets validates compact, bounded, versioned phase-field checkpoints',()=>{
 assert.deepEqual(validateDropletsRules(),INITIAL_DROPLETS_RULES);
 for(const bad of [{flow:101},{tension:NaN},{viscosity:'3'},{unknown:3}])assert.throws(()=>validateDropletsRules(bad));
 for(const n of [1,2,61,327]){const s=createDropletsState(n);assert.deepEqual(restoreDropletsState(JSON.parse(JSON.stringify(recordDropletsState(s)))),s);}
 const board=boardFor(31),state=createDropletsState(31);step(board,state);const saved=recordDropletsState(state);assert.deepEqual(restoreDropletsState(saved),state);assert.doesNotThrow(()=>validateDropletsSnapshot({dropletsVersion:1,rules:INITIAL_DROPLETS_RULES,state:saved}));
 for(const bad of [{...saved,dropletsVersion:2},{...saved,n:328},{...saved,volume:saved.volume+1},{...saved,phase:'AA=='},{...saved,initialized:false}])assert.throws(()=>restoreDropletsState(bad));
});
test('an isolated same-quarter drop travels cohesively and preserves its phase volume',()=>{
 const n=61,board=boardFor(n,[[.5,.5,60]]),state=createDropletsState(n),gold=structuredClone(board[0]);step(board,state);const start=center(state),volume=state.volume;
 for(let f=0;f<240;f++){step(board,state);assert.equal(state.phase.reduce((a,b)=>a+b,0),volume);}
 assert(Math.hypot(center(state)[0]-start[0],center(state)[1]-start[1])>5);assert.equal(parts(state),1);assert.deepEqual(board[0],gold);assert(board.every(t=>t.k>=0&&t.k<palette.length));
 assert(state.red.reduce((a,b)=>a+b,0)/state.volume>.8,'the moving pigment remains colored');
});
test('surface tension merges contacting drops through a growing neck, conserving oil',()=>{
 const n=61,board=boardFor(n,[[22/61,30/61,45],[39/61,30/61,60]],8/61),state=createDropletsState(n),rules={flow:0,tension:100,viscosity:45};step(board,state,rules);assert.equal(parts(state),2);const volume=state.volume;
 for(let f=0;f<240;f++)step(board,state,rules);assert.equal(parts(state),1);assert.equal(state.volume,volume);assert.equal(state.phase.reduce((a,b)=>a+b,0),volume);
});
test('cold replay retains flow, paint observations and mixtures across drawing and sort changes',()=>{
 const n=41,board=boardFor(n),state=createDropletsState(n);for(let f=0;f<40;f++)step(board,state);const saved=JSON.parse(JSON.stringify({board,state:recordDropletsState(state)}));
 const advance=(board,state)=>{let pal=palette;for(let f=0;f<50;f++){if(f===4)board[5*n+5].k=board[5*n+5].v=40;if(f===14){board.forEach(t=>t.k=t.v=63-t.k);pal=[...palette].reverse();}step(board,state,{flow:80,tension:60,viscosity:25},pal);}return {board,state:recordDropletsState(state)};};
 const a=advance(board,state);step(boardFor(7),createDropletsState(7));const b=advance(saved.board,restoreDropletsState(saved.state));assert.deepEqual(a,b);
});
test('live drawing adds oil, gold stays solid, and zero flow/tension leaves phase still',()=>{
 const n=41,board=boardFor(n),state=createDropletsState(n),rules={flow:0,tension:0,viscosity:45};step(board,state,rules);const volume=state.volume,before=[...state.phase];for(let f=0;f<4;f++)step(board,state,rules);assert.deepEqual([...state.phase],before);
 board[5*n+5].k=board[5*n+5].v=40;step(board,state,rules);assert(state.volume>volume);board[20*n+20].isGold=true;const gold=structuredClone(board[20*n+20]);for(let f=0;f<10;f++)step(board,state);assert.deepEqual(board[20*n+20],gold);assert.equal(state.phase.reduce((a,b)=>a+b,0),state.volume);
});
test('palette changes and tiny/dense boards have valid resumable fields',()=>{
 for(const n of [1,2,31]){const board=Array.from({length:n*n},(_,i)=>({k:i%64,v:i%64,isGold:i===0})),state=createDropletsState(n);for(let f=0;f<8;f++)step(board,state);assert.doesNotThrow(()=>restoreDropletsState(recordDropletsState(state)));}
 const board=boardFor(31),state=createDropletsState(31);for(let f=0;f<10;f++)step(board,state);const volume=state.volume,pal=palette.slice(0,48);board.forEach(t=>t.k=t.v=t.k%48);step(board,state,INITIAL_DROPLETS_RULES,pal);assert.equal(state.volume,volume);assert.doesNotThrow(()=>restoreDropletsState(recordDropletsState(state)));
});
test('new Droplets preferences and layout retain the separate Oil experiment and old assignments',()=>{
 const settings=defaultWorkspaceSettings();assert(!Object.hasOwn(settings.rules,'droplets'));settings.rules.droplets={flow:80,tension:90,viscosity:20};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.droplets,settings.rules.droplets);
 const old=DEFAULT_EVOLUTION_LAYOUT.map(id=>id==='droplets'?null:id),migrated=validateEvolutionSlots(old);for(let i=0;i<old.length;i++)if(old[i]!==null)assert.equal(migrated[i],old[i]);assert.equal(migrated[14],'droplets');assert.equal(migrated[19],'oil');
});

test('separated drops keep their own oil instead of feeding a distant larger drop',()=>{
 const n=61,board=boardFor(n,[[.24,.35,45],[.76,.7,60]],.1),state=createDropletsState(n),rules={flow:0,tension:100,viscosity:45};
 step(board,state,rules);const left=()=>state.phase.reduce((sum,v,i)=>sum+(i%n<n/2?v:0),0),before=left();
 for(let f=0;f<240;f++)step(board,state,rules);
 assert.equal(parts(state),2);assert(Math.abs(left()-before)/before<.01,'separate drop volume stays local');
});
