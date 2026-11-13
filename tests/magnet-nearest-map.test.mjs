import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMagnetNearestMap} from '../js/simulations/magnet-nearest-map.js';
import {runMagnetGeneration,resetMagnetCaches} from '../js/simulations/magnet.js';

const random = seed => () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function brute(n, anchors) {
 return Array.from({length:n*n},(_,i)=>{let best=-1,distance=Infinity;for(let id=0;id<anchors.length;id++){const d=(anchors[id].r-(i/n|0))**2+(anchors[id].c-i%n)**2;if(d<distance){best=id;distance=d;}}return best;});
}
test('exact map preserves original-order ties, sparse columns, duplicates, resize and empty rebuilds',()=>{
 const map=createMagnetNearestMap();
 for(const n of [7,31,101]){
  const rand=random(11);
  const sets=[[],[{r:0,c:0}],[{r:n-1,c:n-1},{r:0,c:0},{r:0,c:n-1},{r:n-1,c:0}],Array.from({length:n},(_,i)=>({r:n/2|0,c:n-i-1})),Array.from({length:Math.min(n*n,300)},()=>({r:rand()*n|0,c:rand()*n|0}))];
  for(const anchors of sets)assert.deepEqual([...map.build(n,anchors)],brute(n,anchors));
 }
 map.clear();assert.deepEqual([...map.build(3,[{r:1,c:1}])],Array(9).fill(0));
});

// The direct branch is the pre-optimization algorithm. Disable only map lookup
// in a separate module instance to compare evolving boards and RNG call order.
let directSource=await readFile(new URL('../js/simulations/magnet.js',import.meta.url),'utf8');
assert.equal(directSource.split('cachedAnchors.length > 8 ? nearestAnchorMap.build(n, cachedAnchors) : null').length-1,4,'all four optimized paths have a direct reference');
directSource=directSource.replace(/from '([^']+)'/g,(_,file)=>`from '${new URL(file,new URL('../js/simulations/magnet.js',import.meta.url)).href}'`)
 .replaceAll('cachedAnchors.length > 8 ? nearestAnchorMap.build(n, cachedAnchors) : null','null');
const direct=await import('data:text/javascript;base64,'+Buffer.from(directSource).toString('base64'));
test('all four engines retain every tile and random call through dynamic edits, sorts, anchors and resizes',()=>{
 const native=Math.random;
 try {for(const n of [19,61,101])for(const method of ['magnet','cosmic_magnet','time_magnet','expand'])for(const length of [23,264]){
  resetMagnetCaches();direct.resetMagnetCaches();const rand=random(9);
  let board=Array.from({length:n*n},(_,i)=>{const k=rand()*length|0;return {k,v:k,prevK:k,isGold:i%137===0};}),reference=structuredClone(board);
  const palette=Array.from({length},(_,i)=>'#'+(i*6511).toString(16).padStart(6,'0'));
  let rules={method,anchorColorIndex:0},ra=random(991),rb=random(991),ca=0,cb=0;
  for(let frame=0;frame<24;frame++){
   if(frame===6)rules={...rules,anchorColor:'luminance'};
   if(frame===12){palette.reverse();for(let i=0;i<board.length;i++){board[i].k=length-1-board[i].k;reference[i].k=length-1-reference[i].k;}}
   // Simulate continuous drawing: add/delete anchors and change protected cells.
   for(let i=0;i<8;i++){const pos=(frame*71+i*13)%board.length,k=frame%3===0?0:frame%length;board[pos]={k,v:k,isGold:i===3};reference[pos]={...board[pos]};}
   if(frame===18){rules={method,anchorColorIndex:7};resetMagnetCaches();direct.resetMagnetCaches();}
   const context={n,currentPalette:palette,originalPalette:[...palette].reverse(),magnetRules:rules};
   Math.random=()=>{ca++;return ra();};runMagnetGeneration({...context,currentBoardState:board});
   Math.random=()=>{cb++;return rb();};direct.runMagnetGeneration({...context,currentBoardState:reference});
   assert.deepEqual(board,reference,JSON.stringify({n,method,length,frame}));assert.equal(ca,cb);
  }
 }} finally {Math.random=native;}
});
