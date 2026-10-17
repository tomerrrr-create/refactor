import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createIslandsSession, restoreIslandsSession, runIslandsGeneration} from '../js/simulations/islands.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const board=n=>Array.from({length:n*n},(_,i)=>({k:i%23,v:i%23,isGold:i===Math.floor(n*n/2)}));
function advance(tiles,session,steps){for(let i=0;i<steps;i++)runIslandsGeneration({n:Math.sqrt(tiles.length),currentBoardState:tiles,currentPalette:Array(23)},session);}

test('proximity reproduces the original acceptance experiment, without weighted selection or strengthening',()=>{
 const tiles=board(21),session=createIslandsSession(42,{},'proximity');advance(tiles,session,80);
 assert.equal(session.state,2959450474);
 // Captured independently from the original ae14e3b engine, before the later experiments.
 assert.equal(createHash('sha256').update(JSON.stringify(tiles.map(t=>t.k))).digest('hex'),'fdb7b3becfda98e3b9e140974c7a9dbac22840e17d5c5184f1b3a4eb1e278465');
 assert.equal(tiles[220].k,13);assert.equal(tiles[220].isGold,true);
});
test('custom activity survives pause/resume and both mode transitions without resetting the random cursor',()=>{
 const tiles=board(21),session=createIslandsSession(123,{activity:.2},'proximity');advance(tiles,session,17);
 const snapshot=JSON.parse(JSON.stringify(session)),copy=structuredClone(tiles);
 advance(tiles,session,23);advance(copy,restoreIslandsSession(snapshot),23);assert.deepEqual(copy,tiles);
 const classic=restoreIslandsSession({...session,islandsVersion:1,mode:'classic'});
 assert.equal(classic.state,session.state);assert.equal(classic.steps,session.steps);assert.equal(classic.activity,.2);
 assert.equal('mode' in classic,false);advance(tiles,classic,1);
 const proximity=restoreIslandsSession({...classic,islandsVersion:2,mode:'proximity'});
 assert.equal(proximity.state,classic.state);assert.equal(proximity.steps,classic.steps);assert.equal(proximity.activity,.2);
});
test('only proximity responds to changing palette ranks while keeping initial visible colors identical',()=>{
 const orders=[Array.from({length:23},(_,i)=>i),Array.from({length:23},(_,i)=>i%2===0?i/2:22-Math.floor(i/2)),Array.from({length:23},(_,i)=>(i*7)%23)];
 const run=(order,mode)=>{
  const tiles=board(21).map(tile=>({...tile,k:order.indexOf(tile.k),v:order.indexOf(tile.k)}));
  const session=createIslandsSession(321,{activity:.2},mode);advance(tiles,session,60);
  return tiles.map(tile=>order[tile.k]);
 };
 const classic=orders.map(order=>run(order,'classic'));assert.deepEqual(classic[0],classic[1]);assert.deepEqual(classic[0],classic[2]);
 const proximity=orders.map(order=>run(order,'proximity'));assert.notDeepEqual(proximity[0],proximity[1]);assert.notDeepEqual(proximity[0],proximity[2]);
});
test('invalid or mismatched proximity formats fail before advancing, while old sessions remain classic',()=>{
 const classic=createIslandsSession(0);assert.deepEqual(restoreIslandsSession(classic),classic);
 for(const bad of [{...classic,mode:'proximity'},{...classic,islandsVersion:2},{...classic,islandsVersion:3,mode:'proximity'},
  {...classic,islandsVersion:2,mode:'proximity',activity:2}])assert.throws(()=>restoreIslandsSession(bad));
 assert.throws(()=>createIslandsSession(1,{},'weighted'));
 const proximity=createIslandsSession(1,{},'proximity');
 assert.throws(()=>runIslandsGeneration({n:2,currentBoardState:board(2)},proximity),/palette/);assert.equal(proximity.steps,0);
});
function cycleHarness(){
 const logs=[];
 const c=vm.createContext({createIslandsSession,restoreIslandsSession,armedSimulation:null,islandsSession:null,isLifePlaying:false,
  isMacroLoaded:false,isExecutingMacroCommand:false,currentGenerationCount:97,boardState:board(21),
  window:{logArtEvent:(name,details)=>logs.push({name,details:JSON.parse(details)})},
  armSimulation(sim){assert.equal(c.isLifePlaying,false);c.armedSimulation=sim;if(sim==='islands')c.islandsSession=createIslandsSession(77,{activity:.17});},
  updateIslandsButtonUI(){},pauseLife(){throw Error('cycling must never pause');},stopMacro(){c.isMacroLoaded=false;}});
 vm.runInContext(source.slice(source.indexOf('function nextEvolutionMode('),source.indexOf('function cycleBrightnessEvoMode(')),c);
 vm.runInContext(source.slice(source.indexOf('function cycleIslandsMode('),source.indexOf('function updateBreatheEvoButtonUI(')),c);
 return {c,logs};
}
test('paused Islands cycle is Classic, Proximity, Off and preserves configured activity',()=>{
 const {c,logs}=cycleHarness();c.cycleIslandsMode();assert.equal(c.armedSimulation,'islands');assert.equal(c.islandsSession.islandsVersion,1);
 c.cycleIslandsMode();assert.equal(c.islandsSession.mode,'proximity');assert.equal(c.islandsSession.activity,.17);
 c.cycleIslandsMode();assert.equal(c.armedSimulation,null);
 assert.deepEqual(logs.map(e=>e.details.mode),['classic','proximity','off']);
});
test('live Islands cycle skips Off and keeps board, random cursor, steps and generation counter',()=>{
 const {c}=cycleHarness();c.cycleIslandsMode();advance(c.boardState,c.islandsSession,8);c.isLifePlaying=true;
 const tiles=c.boardState,cursor=c.islandsSession.state;
 for(const expected of ['proximity','classic','proximity','classic']){
  c.cycleIslandsMode();assert.equal(c.armedSimulation,'islands');assert.equal(c.isLifePlaying,true);
  assert.equal(c.islandsSession.mode??'classic',expected);assert.equal(c.islandsSession.state,cursor);
  assert.equal(c.islandsSession.steps,8);assert.equal(c.islandsSession.activity,.17);
  assert.equal(c.currentGenerationCount,97);assert.equal(c.boardState,tiles);
 }
 c.armedSimulation='gameOfLife';c.cycleIslandsMode();assert.equal(c.armedSimulation,'gameOfLife');
});
