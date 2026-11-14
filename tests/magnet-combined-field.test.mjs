import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombinedMagnetField} from '../js/simulations/magnet-combined-field.js';
import {runMagnetGeneration, resetMagnetCaches} from '../js/simulations/magnet.js';
import * as legacy from './fixtures/magnet-before-combined.mjs';
import {magnetRecordingRules, recordedMagnetCombinedField} from '../js/magnet-anchor-limit.js';
import {defaultWorkspaceSettings, serializeWorkspaceSettings} from '../js/workspace-settings.js';
const methods=['magnet','cosmic_magnet','time_magnet','expand'];
const palette=Array.from({length:64},(_,i)=>'#'+(i*221991).toString(16).slice(-6).padStart(6,'0'));
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const boardFor=n=>Array.from({length:n*n},(_,id)=>({id,k:id%17===0?0:(id*7)%64,v:id/3,isGold:id%137===0,prevK:id%5}));

test('every source contributes and symmetric forces cancel without a scan-order preference',()=>{
 const n=11,field=createCombinedMagnetField(),board=Array.from({length:n*n},()=>({k:5,isGold:false})),out=new Float64Array(2);
 board[5*n+2].k=board[5*n+8].k=0;
 assert(field.build(n,board,0,64,0));assert.deepEqual([...field.sample(5,5,out)],[0,0]);
 field.sample(3,5,out);assert(Math.abs(out[0])<1e-12);assert(out[1]>0);
 field.sample(5,4,out);assert(out[0]<0);assert(Math.abs(out[1])<1e-12);
 board[0].k=0;assert(field.build(n,board,0,64,0));field.sample(5,5,out);assert(out[0]<0&&out[1]<0,'third source changes the field even though the original two are closer');
 board[0].isGold=true;field.build(n,board,0,64,0);assert.deepEqual([...field.sample(5,5,out)],[0,0]);
 board.forEach(tile=>tile.k=5);assert.equal(field.build(n,board,0,64,0),false);assert.deepEqual([...field.sample(5,5,out)],[0,0]);
 field.clear();board[5*n+2].k=0;assert(field.build(n,board,0,64,0));assert(field.sample(5,5,out)[0]<0);
});

test('the coarse field remains finite, updates live, and does not retain sources across board sizes',()=>{
 const field=createCombinedMagnetField(),out=new Float64Array(2);
 for(const n of [1,2,19,61,327,11]){
  const board=boardFor(n);field.build(n,board,0,64,0);
  for(let i=0;i<n;i++){field.sample(i,i,out);assert([...out].every(Number.isFinite));}
  board.forEach(tile=>tile.k=5);assert.equal(field.build(n,board,0,64,0),false);assert.deepEqual([...field.sample(0,0,out)],[0,0]);
 }
});

for(const method of methods)test(`${method}: off is identical to the frozen engine through edits, aliases and anchor changes`,()=>{
 const native=Math.random;
 try {for(const n of [9,61]){
  resetMagnetCaches();legacy.resetMagnetCaches();const a=boardFor(n),b=structuredClone(a),ra=random(99),rb=random(99);let ca=0,cb=0;
  for(let frame=0;frame<12;frame++){
   const index=(frame*71)%a.length;a[index].k=b[index].k=frame%2?127:0;
   const rules={method,anchorColorIndex:frame<6?0:7};
   Math.random=()=>{ca++;return ra();};runMagnetGeneration({n,currentBoardState:a,currentPalette:palette,magnetRules:rules,combinedField:false});
   Math.random=()=>{cb++;return rb();};legacy.runMagnetGeneration({n,currentBoardState:b,currentPalette:palette,magnetRules:rules});
   assert.deepEqual(a,b);assert.equal(ca,cb);
  }
 }}finally{Math.random=native;}
});

for(const method of methods)test(`${method}: combined swaps preserve metadata, anchors, gold, one-cell steps and one swap per pigment`,()=>{
 const native=Math.random;
 try {
  resetMagnetCaches();Math.random=random(77);const n=31,original=boardFor(n),board=[...original],writes=new Map();
  const tracked=new Proxy(board,{set(array,key,tile){if(/^\d+$/.test(String(key)))writes.set(tile.id,(writes.get(tile.id)||0)+1);array[key]=tile;return true;}});
  runMagnetGeneration({n,currentBoardState:tracked,currentPalette:palette,magnetRules:{method,anchorColorIndex:0},combinedField:true});
  assert(writes.size>0);assert([...writes.values()].every(count=>count===1));
  assert.deepEqual([...board].sort((a,b)=>a.id-b.id),original);
  for(let i=0;i<board.length;i++){
   const tile=board[i];assert(Math.abs(i%n-tile.id%n)<=1&&Math.abs(Math.floor(i/n)-Math.floor(tile.id/n))<=1);
   if(original[i].isGold||original[i].k===0)assert.equal(tile,original[i]);
  }
 }finally{Math.random=native;}
});

for(const method of methods)test(`${method}: combined replay marker is deterministic and independent of sample cap`,()=>{
 const native=Math.random;
 try {
  const run=(limit,recorded)=>{resetMagnetCaches();Math.random=random(19);const n=61,board=boardFor(n),rules=magnetRecordingRules({method,anchorColorIndex:0},limit,true);
   for(let frame=0;frame<5;frame++){board[(frame*71)%board.length].k=0;runMagnetGeneration({n,currentBoardState:board,currentPalette:palette,magnetRules:recorded?rules:{method,anchorColorIndex:0},...(recorded?{}:{combinedField:true,anchorLimit:limit})});}return board;};
  assert.deepEqual(run(300,false),run(2000,true));
 }finally{Math.random=native;}
});

test('experiment records a versioned opt-in, defaults old recordings to off and never enters profile rules',()=>{
 const rules={method:'magnet',anchorColorIndex:0};
 assert.deepEqual(magnetRecordingRules(rules,300,false),rules);
 assert.deepEqual(magnetRecordingRules({...rules,fieldModel:'combined-v1'},300,false),rules,'stale replay metadata cannot leak into a new recording');
 const recorded=magnetRecordingRules(rules,600,true);assert.equal(recorded.fieldModel,'combined-v1');assert.equal(recorded.anchorLimit,600);assert(recordedMagnetCombinedField(recorded));assert.equal(recordedMagnetCombinedField(rules),false);assert.equal(rules.fieldModel,undefined);
 for(const value of ['combined-v2',true,null,1])assert.throws(()=>recordedMagnetCombinedField({fieldModel:value}));
 const preferences=defaultWorkspaceSettings();assert(!serializeWorkspaceSettings(preferences).includes('fieldModel'));preferences.rules.magnet.fieldModel='combined-v1';assert.throws(()=>serializeWorkspaceSettings(preferences));
});

test('combined fields treat wrapped palette aliases as the same visible color in all modes',()=>{
 const native=Math.random;
 try {for(const method of methods){
  const run=aliases=>{resetMagnetCaches();Math.random=random(23);const n=19,board=boardFor(n);if(aliases)board.forEach((tile,i)=>tile.k+=(i%5-2)*64);
   for(let frame=0;frame<5;frame++)runMagnetGeneration({n,currentBoardState:board,currentPalette:palette,magnetRules:{method,anchorColorIndex:0},combinedField:true});
   return board.map(tile=>({id:tile.id,k:((tile.k%64)+64)%64,v:tile.v,isGold:tile.isGold,prevK:tile.prevK}));};
  assert.deepEqual(run(true),run(false),method);
 }}finally{Math.random=native;}
});
