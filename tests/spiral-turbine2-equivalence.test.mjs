import test from 'node:test';
import assert from 'node:assert/strict';
import {runTurbine2Generation} from '../js/simulations/spiral-turbine2.js';
import {runTurbine2Generation as before} from './fixtures/spiral-turbine2-before.mjs';
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const boardFor=(n,kind)=>{const rand=random(55);return Array.from({length:n*n},(_,id)=>{const k=kind==='uniform'?8:kind==='structured'?Math.floor((Math.sin((id/n|0)*.025+(id%n)*.045)+1)*131):rand()*264|0;return {id,k,v:k/3,prevK:id%17,isGold:kind==='all-gold'||(kind==='gold'?id%4===0:id%173===0)};});};
function compare(n,kind,frames){
 const nativeRandom=Math.random,nativeNow=Date.now;
 try {
  const board=boardFor(n,kind),reference=structuredClone(board),ra=random(19),rb=random(19);
  const identities=new Map(board.map((tile,i)=>[tile,i])),referenceIdentities=new Map(reference.map((tile,i)=>[tile,i]));
  let ca=0,cb=0;const clockA=[],clockB=[],times=[0,17,1000,1700000000000,1700000000999,1700001000000];
  for(let frame=0;frame<frames;frame++){
   // Live edits, a sorting remap, protected cells and changing Strength.
   if(kind!=='all-gold'&&n>1){const i=(frame*317+3)%board.length;board[i].k=reference[i].k=frame%2?0:263;if(frame===9)board[i].isGold=reference[i].isGold=true;}
   if(frame===12)for(let i=0;i<board.length;i++)board[i].k=reference[i].k=263-board[i].k;
   const time=times[frame%times.length]+frame*701,strength=[0,.01,.6,1][frame%4];
   Date.now=()=>{clockA.push(ca);return time;};Math.random=()=>{ca++;return ra();};
   assert.equal(runTurbine2Generation(n,board,strength),board);
   Date.now=()=>{clockB.push(cb);return time;};Math.random=()=>{cb++;return rb();};before(n,reference,strength);
   assert.deepEqual(board,reference,JSON.stringify({n,kind,frame}));
   assert.equal(ca,cb,'identical RNG cursor');assert.deepEqual(clockA,clockB,'identical clock sampling relative to RNG');assert.equal(clockA.length,frame+1);
   board.forEach((tile,i)=>assert.equal(identities.get(tile),referenceIdentities.get(reference[i]),'same tile permutation'));
  }
 }finally{Math.random=nativeRandom;Date.now=nativeNow;}
}
test('Turbine 2 preserves exact results and random/time order across tiny, odd/even boards and live edits',()=>{
 for(const n of [1,2,3,4,19,60,61,101])for(const kind of ['random','structured','uniform','gold'])compare(n,kind,18);
});
test('large boards, protected boards and geometry replacement retain the old engine trajectory',()=>{
 for(const n of [249,327,19,327])for(const kind of ['random','all-gold'])compare(n,kind,6);
});
test('cached waves still follow the current generation clock rather than the first frame',()=>{
 const nativeRandom=Math.random,nativeNow=Date.now;
 try {
  const run=time=>{const board=boardFor(31,'random');Math.random=random(77);Date.now=()=>time;runTurbine2Generation(31,board,1);return board;};
  const first=run(1700000000000);runTurbine2Generation(7,boardFor(7,'all-gold'));
  assert.deepEqual(run(1700000000000),first);assert.notDeepEqual(run(1700000500000),first);
 }finally{Math.random=nativeRandom;Date.now=nativeNow;}
});
