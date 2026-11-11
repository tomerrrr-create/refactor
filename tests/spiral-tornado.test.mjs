import test from 'node:test';
import assert from 'node:assert/strict';
import {runSpiralGeneration} from '../js/simulations/spiral.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const make = n => Array.from({length:n*n},(_,id)=>({id,k:(id*71+13)%23,v:id,isGold:id%41===0}));
const step = (n,board) => runSpiralGeneration({n,currentBoardState:board,currentPalette:[],spiralRules:{method:'tornado'}});
for(const n of [1,2,9,32,100]) test(`Tornado preserves exact tiles and gold, settles, and accepts edits: ${n}`,()=>{
 const board=make(n),original=structuredClone(board),gold=original.filter(t=>t.isGold);
 let settled=false;
 for(let g=0;g<2000;g++) {const before=board.map(t=>t.id);assert.equal(step(n,board),board);if(board.every((t,i)=>t.id===before[i])) {settled=true;break;}}
 assert(settled,'converges within fixed work budget');assert.deepEqual([...board].sort((a,b)=>a.id-b.id),original);
 for(const t of gold)assert.deepEqual(board[t.id],t);
 const copy=structuredClone(board);step(n,board);assert.deepEqual(board,copy);
 if(n>2){const free=board.map((t,i)=>t.isGold?-1:i).filter(i=>i>=0);[board[free[0]],board[free.at(-1)]]=[board[free.at(-1)],board[free[0]]];const edited=structuredClone(board);step(n,board);assert.notDeepEqual(board,edited);}
});
test('cold/warm caches, resizing and replay produce the same generation',()=>{
 const first=make(31),second=structuredClone(first);step(31,first);step(9,make(9));step(31,second);assert.deepEqual(first,second);
});
test('Tornado round-trips through settings without changing old modes',()=>{
 for(const method of ['b','left','radial','down','a','tornado','black_hole','vortex','turbine2']){
 const s=defaultWorkspaceSettings();s.rules.spiral.method=method;assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(s)).rules.spiral.method,method);
 }
});
test('the settled funnel narrows downward and its palette ranks increase toward the foot',()=>{
 const n=50,board=Array.from({length:n*n},(_,i)=>({k:(i*71)%(n*n)}));
 for(let g=0;g<200;g++)step(n,board);
 const width=row=>board.slice(row*n,(row+1)*n).filter(t=>t.k>n*n*.5).length;
 assert(width(10)>width(40)*2,'broad crown and narrow foot');
 assert(board[40*n+25].k>board[10*n+25].k,'palette begins above and ends below');
});
