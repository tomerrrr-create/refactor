import test from 'node:test';
import assert from 'node:assert/strict';
import {runSpiralGeneration} from '../js/simulations/spiral.js';
import {runLegacyTornadoGeneration} from '../js/simulations/spiral-tornado-legacy.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const make = n => {let seed=4925;return Array.from({length:n*n},(_,id)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return {id,k:seed%264,v:id,isGold:id%41===0};});};
const step = (n,board,version=2) => runSpiralGeneration({n,currentBoardState:board,currentPalette:[],spiralRules:{method:'tornado',tornadoVersion:version}});
for(const n of [1,2,9,32,100]) test(`flow preserves exact tiles/gold and moves only to neighbors once per generation: ${n}`,()=>{
 const board=make(n),original=structuredClone(board),gold=original.filter(t=>t.isGold);
 for(let g=0;g<50;g++) {
  const positions=new Map(board.map((t,i)=>[t.id,i]));assert.equal(step(n,board),board);
  board.forEach((t,i)=>{const before=positions.get(t.id);assert(Math.abs(i%n-before%n)<=1&&Math.abs(Math.floor(i/n)-Math.floor(before/n))<=1);});
 }
 assert.deepEqual([...board].sort((a,b)=>a.id-b.id),original);for(const t of gold)assert.deepEqual(board[t.id],t);
});
test('vortex keeps evolving after the initial color gathering',()=>{
 const n=64,board=make(n);for(let g=0;g<400;g++)step(n,board);const before=structuredClone(board);for(let g=0;g<100;g++)step(n,board);assert.notDeepEqual(board,before);
});
test('cold/warm caches, resizing and replay produce the same trajectory',()=>{
 const first=make(31),second=structuredClone(first);for(let i=0;i<100;i++)step(31,first);step(9,make(9));for(let i=0;i<100;i++)step(31,second);assert.deepEqual(first,second);
});
test('recorded initial Tornado version preserves its old algorithm',()=>{
 const a=make(31),b=structuredClone(a);for(let i=0;i<20;i++){step(31,a,1);runLegacyTornadoGeneration(31,b);}assert.deepEqual(a,b);
});
test('new profiles choose flow and both versions round-trip through settings',()=>{
 assert.equal(defaultWorkspaceSettings().rules.spiral.tornadoVersion,2);
 for(const method of ['b','left','radial','down','a','tornado','black_hole','vortex','turbine2'])for(const version of [1,2]){
 const s=defaultWorkspaceSettings();s.rules.spiral={method,tornadoVersion:version};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(s)).rules.spiral,s.rules.spiral);
 }
});
