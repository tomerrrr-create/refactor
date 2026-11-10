import test from 'node:test';
import assert from 'node:assert/strict';
import {turbine2Direction} from '../js/simulations/spiral-turbine2.js';
import {runSpiralGeneration} from '../js/simulations/spiral.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const step=(board,n)=>runSpiralGeneration({n,currentBoardState:board,currentPalette:[],spiralRules:{method:'turbine2'}});
const boardFor=n=>Array.from({length:n*n},(_,id)=>({id,k:(id*157+31)%264,v:(id*157+31)%264,isGold:id%37===0,prevK:null}));
function seeded(fn){
 const random=Math.random,now=Date.now;let seed=14327;
 Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};Date.now=()=>1700000000000;
 try{return fn();}finally{Math.random=random;Date.now=now;}
}
test('weighted cardinal/diagonal/stay choices follow continuous vectors without diagonal acceleration',()=>{
 for(let degrees=0;degrees<360;degrees+=7.5){
  const angle=degrees*Math.PI/180,dx=4*Math.cos(angle),dy=4*Math.sin(angle);let x=0,y=0;
  for(let i=0;i<2048;i++){const step=turbine2Direction(dx,dy,(i+.5)/2048);x+=step.dc;y+=step.dr;}
  assert(Math.abs(x/2048-Math.cos(angle))<.001);assert(Math.abs(y/2048-Math.sin(angle))<.001);
 }
 assert.deepEqual(turbine2Direction(0,0,.5),{dr:0,dc:0});
 let x=0,y=0;for(let i=0;i<2048;i++){const step=turbine2Direction(.1,-.2,(i+.5)/2048);x+=step.dc;y+=step.dr;}
 assert(Math.abs(x/2048-.1)<.001);assert(Math.abs(y/2048+.2)<.001);
});
for(const n of [1,2,3,11,64,249,327])test(`one swap per pigment, protected gold and exact tile/color preservation at ${n}x${n}`,()=>seeded(()=>{
 const board=boardFor(n),before=[...board];assert.equal(step(board,n),board);
 assert.deepEqual([...board].sort((a,b)=>a.id-b.id),before);
 board.forEach((tile,i)=>{
  assert(Math.abs(Math.floor(i/n)-Math.floor(tile.id/n))<=1);assert(Math.abs(i%n-tile.id%n)<=1);
  if(before[i].isGold)assert.equal(tile,before[i]);
 });
}));
test('replay from a restored board needs no hidden runtime beyond the existing random/time inputs',()=>{
 const n=31,original=boardFor(n);
 const first=seeded(()=>{const b=structuredClone(original);for(let i=0;i<20;i++)step(b,n);return b;});
 step(boardFor(11),11); // Resizing or another board may replace the reusable geometry.
 const second=seeded(()=>{const b=structuredClone(original);for(let i=0;i<20;i++)step(b,n);return b;});
 assert.deepEqual(first,second);assert.notDeepEqual(first,original);
});
test('the experiment is a separate settings value and never replaces the existing Turbine or factory default',()=>{
 const settings=defaultWorkspaceSettings(),factory=settings.rules.spiral.method;
 for(const method of ['turbine2','left',factory]){
  const candidate=structuredClone(settings);candidate.rules.spiral.method=method;
  assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(candidate)).rules.spiral.method,method);
 }
 assert.equal(defaultWorkspaceSettings().rules.spiral.method,factory);
});

test('a pigment participates in at most one actual swap per generation',()=>seeded(()=>{
 const n=17,writes=new Map(),target=boardFor(n);
 const board=new Proxy(target,{set(array,key,tile){
  if(/^\d+$/.test(String(key)))writes.set(tile.id,(writes.get(tile.id)||0)+1);
  array[key]=tile;return true;
 }});
 step(board,n);assert(writes.size>0);assert([...writes.values()].every(count=>count===1));
}));
