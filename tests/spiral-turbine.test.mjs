import test from 'node:test';
import assert from 'node:assert/strict';
import {runSpiralGeneration} from '../js/simulations/spiral.js';
import {runLegacyTurbine} from './fixtures/spiral-turbine-before.mjs';
const random = seed => () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const boardFor = (n,kind) => {const rand=random(55);return Array.from({length:n*n},(_,id)=>{const k=kind==='uniform'?8:kind==='structured'?Math.floor((Math.sin((id/n|0)*.025+(id%n)*.045)+1)*131):rand()*264|0;return {id,k,v:k,prevK:k,isGold:kind==='all-gold'||(kind==='gold'?id%4===0:id%173===0)};});};
function compare(n,kind,frames){
 const nativeRandom=Math.random,nativeNow=Date.now;
 try{
  const board=boardFor(n,kind),reference=structuredClone(board),ra=random(19),rb=random(19);
  const identities=new Map(board.map((tile,i)=>[tile,i])),referenceIdentities=new Map(reference.map((tile,i)=>[tile,i]));
  let ca=0,cb=0,ta=0,tb=0;
  const times=[0,17,1000,1700000000000,1700000000999,1700001000000];
  for(let frame=0;frame<frames;frame++){
   // Model continuous painting, sorting remaps and changed gold protection.
   if(kind!=='all-gold'&&n>1){const i=(frame*317+3)%board.length,k=frame%2?0:263;board[i].k=reference[i].k=k;if(frame===9)board[i].isGold=reference[i].isGold=true;}
   if(frame===12)for(let i=0;i<board.length;i++)board[i].k=reference[i].k=263-board[i].k;
   const now=times[frame%times.length]+frame*701;
   Date.now=()=>{ta++;return now;};Math.random=()=>{ca++;return ra();};
   assert.equal(runSpiralGeneration({n,currentBoardState:board,currentPalette:Array(264),spiralRules:{method:'left'}}),board);
   Date.now=()=>{tb++;return now;};Math.random=()=>{cb++;return rb();};runLegacyTurbine({n,currentBoardState:reference});
   assert.deepEqual(board,reference,JSON.stringify({n,kind,frame}));assert.equal(ca,cb,'same RNG cursor');assert.equal(ta,tb,'one clock sample per generation');
   board.forEach((tile,i)=>assert.equal(identities.get(tile),referenceIdentities.get(reference[i]),'same object permutation'));
  }
 }finally{Math.random=nativeRandom;Date.now=nativeNow;}
}
test('Turbine preserves stable neighbors, gold, tile identities and random/time calls on odd/even and tiny boards',()=>{
 for(const n of [1,2,3,4,19,60,61,101])for(const kind of ['random','structured','uniform','gold'])compare(n,kind,18);
});
test('large boards, protected boards and cache replacement preserve the historical engine exactly',()=>{
 for(const n of [249,327,19,327])for(const kind of ['random','all-gold'])compare(n,kind,6);
});
test('cache retains geometry, not board colors or frozen turbulence',()=>{
 const n=31,nativeRandom=Math.random,nativeNow=Date.now;
 try{
  const run=time=>{const board=boardFor(n,'random');Math.random=random(77);Date.now=()=>time;runSpiralGeneration({n,currentBoardState:board,currentPalette:[],spiralRules:{method:'left'}});return board;};
  const first=run(1700000000000);runSpiralGeneration({n:7,currentBoardState:boardFor(7,'all-gold'),currentPalette:[],spiralRules:{method:'left'}});
  assert.deepEqual(run(1700000000000),first);assert.notDeepEqual(run(1700000500000),first,'time-dependent eddies remain active');
 }finally{Math.random=nativeRandom;Date.now=nativeNow;}
});
