import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_NETWORK_RULES,validateNetworkRules,createNetworkState,restoreNetworkState,validateNetworkSnapshot,runNetworkGeneration} from '../js/simulations/network.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots} from '../js/evolution-drawer-settings.js';
const palette=Array.from({length:64},(_,k)=>'#'+(k*221991).toString(16).padStart(6,'0'));
function artwork(n){return Array.from({length:n*n},(_,i)=>{const x=i%n,y=Math.floor(i/n);let k=0;for(const[a,b,color]of [[.2,.25,60],[.75,.3,46],[.35,.75,32],[.8,.8,55]])if((x-a*n)**2+(y-b*n)**2<5)k=color;return {k,v:k,id:i,isGold:i===0};});}
const step=(board,state,rules=INITIAL_NETWORK_RULES,pal=palette)=>runNetworkGeneration({n:state.n,currentBoardState:board,currentPalette:pal,networkRules:rules},state);
test('Network validates bounded versioned state, rules and checkpoint ownership',()=>{
 assert.deepEqual(validateNetworkRules(),INITIAL_NETWORK_RULES);
 for(const bad of [{growth:101},{branching:-1},{persistence:NaN},{growth:'60'},{extra:3}])assert.throws(()=>validateNetworkRules(bad));
 for(const n of [1,2,61,327])assert.deepEqual(restoreNetworkState(JSON.parse(JSON.stringify(createNetworkState(n)))),createNetworkState(n));
 const n=31,state=createNetworkState(n),board=artwork(n);for(let f=0;f<30;f++)step(board,state);
 const copy=restoreNetworkState(JSON.parse(JSON.stringify(state)));assert.deepEqual(copy,state);copy.palette[0]='#ffffff';assert.notDeepEqual(copy.palette,state.palette);
 for(const bad of [{...state,networkVersion:2},{...state,n:328},{...state,frame:-1},{...state,agents:[{id:-1}]},{...state,trails:[[0,1,0,1200]]},{...state,trails:[[3,1,0,10],[3,1,0,20]]}])assert.throws(()=>restoreNetworkState(bad));
 assert.doesNotThrow(()=>validateNetworkSnapshot({networkVersion:1,rules:INITIAL_NETWORK_RULES,state}));
});
test('threads grow in source pigments, preserve sparse painted patches and gold, and reinforce',()=>{
 const n=61,board=artwork(n),original=structuredClone(board),state=createNetworkState(n);
 for(let f=0;f<240;f++)step(board,state);
 assert(state.trails.length>100);assert(state.trails.some(t=>t[3]>700));assert(board.filter(t=>t.k!==0).length>original.filter(t=>t.k!==0).length+100);
 for(let i=0;i<board.length;i++){if(original[i].k||original[i].isGold)assert.equal(board[i].k,original[i].k);assert.equal(board[i].isGold,original[i].isGold);assert.equal(board[i].id,i);assert([0,32,46,55,60].includes(board[i].k));}
 // At least two original patches are connected by the newly grown cells.
 const start=original.findIndex(t=>t.k===60),seen=new Set([start]),queue=[start];
 for(let head=0;head<queue.length;head++){const i=queue[head],r=Math.floor(i/n),c=i%n;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const y=r+dy,x=c+dx,j=y*n+x;if(x<0||x>=n||y<0||y>=n||seen.has(j)||board[j].k===0)continue;seen.add(j);queue.push(j);}}
 assert([...seen].some(i=>original[i].k!==0&&original[i].k!==60),'threads reach another original patch');
 assert(state.agents.length<=128&&state.sources.length<=96&&state.trails.length<=12000);
});
test('cold continuation reproduces live drawing and sorting, independent of scratch buffers',()=>{
 const n=41,board=artwork(n),state=createNetworkState(n);for(let f=0;f<80;f++)step(board,state);
 const saved=JSON.parse(JSON.stringify({board,state}));
 const advance=(board,state)=>{let pal=palette;for(let f=0;f<90;f++){if(f===5){board[20*n+20].k=board[20*n+20].v=63;}if(f===25){pal=[...palette].reverse();board.forEach(t=>{t.k=t.v=63-t.k;});}step(board,state,{growth:80,branching:70,persistence:55},pal);}return {board,state};};
 const a=advance(board,state);step(artwork(7),createNetworkState(7));const b=advance(saved.board,restoreNetworkState(saved.state));assert.deepEqual(a,b);
});
test('live strokes create new source patches and erasing the board leaves no ghost network',()=>{
 const n=41,board=artwork(n),state=createNetworkState(n);for(let f=0;f<70;f++)step(board,state);
 const existing=[...state.sources[0]];board[existing[2]*n+existing[1]].k=board[existing[2]*n+existing[1]].v=63;step(board,state);assert(state.agents.some(a=>a.origin===existing[0]&&a.k===63),'repainting an existing source launches its new color');
 const index=20*n+20;board[index].k=board[index].v=63;step(board,state);assert(state.sources.some(s=>s[1]===20&&s[2]===20&&s[3]===63));
 board.forEach(t=>{if(!t.isGold)t.k=t.v=0;});for(let f=0;f<20;f++)step(board,state);assert.equal(state.sources.length,0);assert.equal(state.agents.length,0);assert.equal(state.trails.length,0);assert(board.every(t=>t.k===0));
});
test('branching and sorting change structure; growth zero and tiny protected boards stay safe',()=>{
 const n=41,a=artwork(n),b=structuredClone(a),sa=createNetworkState(n),sb=createNetworkState(n);
 for(let f=0;f<140;f++){step(a,sa,{...INITIAL_NETWORK_RULES,branching:0});step(b,sb,{...INITIAL_NETWORK_RULES,branching:100});}assert(sb.nextId>sa.nextId);assert.notDeepEqual(a.map(t=>t.k),b.map(t=>t.k));
 const c=artwork(n),d=structuredClone(c),sc=createNetworkState(n),sd=createNetworkState(n);d.forEach(t=>t.k=t.v=63-t.k);
 for(let f=0;f<120;f++){step(c,sc);step(d,sd,INITIAL_NETWORK_RULES,[...palette].reverse());}assert.notDeepEqual(c.map(t=>t.k),d.map(t=>63-t.k));
 for(const n of [1,2,31]){const board=artwork(n),before=structuredClone(board),state=createNetworkState(n);for(let f=0;f<10;f++)step(board,state,{...INITIAL_NETWORK_RULES,growth:0});assert.deepEqual(board,before);}
});
test('optional Network preferences and older layouts retain their previous assignments',()=>{
 const settings=defaultWorkspaceSettings();assert(!Object.hasOwn(settings.rules,'network'));settings.rules.network={growth:80,branching:90,persistence:30};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.network,settings.rules.network);
 for(const removed of [['network'],['network','oil'],['network','oil','ink']]){const old=DEFAULT_EVOLUTION_LAYOUT.slice(0,20).map(id=>removed.includes(id)?null:id),migrated=validateEvolutionSlots(old);for(let i=0;i<old.length;i++)if(old[i]!==null)assert.equal(migrated[i],old[i]);assert(migrated.includes('network'));}
});
