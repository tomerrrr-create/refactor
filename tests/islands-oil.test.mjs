import test from 'node:test';import assert from 'node:assert/strict';
import {createIslandsSession,restoreIslandsSession,runIslandsGeneration,ISLANDS_OIL_RULES} from '../js/simulations/islands.js';
import {INITIAL_OIL_RULES,createOilState,runOilGeneration} from '../js/simulations/oil.js';
const palette=Array.from({length:64},(_,i)=>'#'+(i*221991).toString(16).padStart(6,'0'));
const board=n=>Array.from({length:n*n},(_,i)=>({id:i,k:(i*13+Math.floor(i/n)*7)%64,v:i/3,prevK:i%5,isGold:i%137===0}));
const context=(n,b)=>({n,currentBoardState:b,currentPalette:palette});
test('Islands Oil is exactly standalone B with the fixed default rules, including live painting and sorting',()=>{
 assert.deepEqual(ISLANDS_OIL_RULES,INITIAL_OIL_RULES);assert(Object.isFrozen(ISLANDS_OIL_RULES));
 const n=31,a=board(n),b=structuredClone(a),session=createIslandsSession(42,{},'oil'),oil=createOilState(n);
 for(let f=0;f<80;f++){
  if(f===10){a[100].k=b[100].k=63;}if(f===25){for(const list of [a,b])list.forEach(t=>t.k=(t.k*17)%64);}
  runIslandsGeneration(context(n,a),session);runOilGeneration({...context(n,b),oilRules:INITIAL_OIL_RULES},oil);
  assert.deepEqual(a,b);assert.deepEqual(session.oilState,oil);
 }
 assert.equal(session.state,42,'Oil does not advance the Classic random cursor');assert.equal(session.steps,80);
});
test('Classic activity and independently running custom B settings cannot affect embedded Oil',()=>{
 const n=21,a=board(n),b=structuredClone(a),custom=board(17),customState=createOilState(17),sa=createIslandsSession(42,{activity:.01},'oil'),sb=createIslandsSession(99,{activity:.5},'oil');
 for(let f=0;f<50;f++){
  runIslandsGeneration(context(n,a),sa);
  runOilGeneration({...context(17,custom),oilRules:{tension:10,drift:100,mobility:100}},customState);
  runIslandsGeneration(context(n,b),sb);assert.deepEqual(a,b);
 }
});
test('Oil checkpoints are independent copies and cold continuation is exact',()=>{
 const n=31,a=board(n),s=createIslandsSession(42,{},'oil');for(let i=0;i<20;i++)runIslandsGeneration(context(n,a),s);
 const frozen=restoreIslandsSession(s),json=JSON.stringify(frozen),b=structuredClone(a),t=restoreIslandsSession(JSON.parse(json));
 for(let i=0;i<30;i++)runIslandsGeneration(context(n,a),s);
 assert.equal(JSON.stringify(frozen),json,'runtime mutation cannot alter a history checkpoint');
 for(let i=0;i<30;i++)runIslandsGeneration(context(n,b),t);assert.deepEqual(a,b);assert.deepEqual(s,t);
});
test('returning to Classic retains its original seed/cursor/activity and preserves the Oil frame',()=>{
 let s=createIslandsSession(42,{activity:.17});const n=21,b=board(n);runIslandsGeneration(context(n,b),s);const cursor=s.state;
 s=restoreIslandsSession({...s,islandsVersion:3,mode:'oil'});for(let i=0;i<10;i++)runIslandsGeneration(context(n,b),s);
 s=restoreIslandsSession({...s,islandsVersion:1,mode:'classic'});assert.equal(s.state,cursor);assert.equal(s.activity,.17);assert.equal(s.oilState.frame,10);
 runIslandsGeneration(context(n,b),s);assert.notEqual(s.state,cursor);assert.equal(s.oilState.frame,10);
 s=restoreIslandsSession({...s,islandsVersion:3,mode:'oil'});runIslandsGeneration(context(n,b),s);assert.equal(s.oilState.frame,11);
 const resized=board(17);runIslandsGeneration(context(17,resized),s);assert.equal(s.oilState.n,17);assert.equal(s.oilState.frame,1);
});
test('invalid Oil session versions and nested checkpoints are rejected, while old proximity still restores',()=>{
 const s=createIslandsSession(42,{},'oil');for(const bad of [{...s,islandsVersion:2},{...s,mode:'classic'},{...s,oilState:{oilVersion:2,n:21,frame:0}}])assert.throws(()=>restoreIslandsSession(bad));
 const old=createIslandsSession(42,{},'proximity');assert.deepEqual(restoreIslandsSession(old),old);
});
