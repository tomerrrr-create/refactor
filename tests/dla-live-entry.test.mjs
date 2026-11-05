import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { runDlaGeneration } from '../js/simulations/dla.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const initialize = source.slice(source.indexOf('function initializeDla()'), source.indexOf('// Live handoff reuses'));
const sync = source.slice(source.indexOf('function syncDlaCrystalState()'), source.indexOf('      function gameLoop('));
function setup(tiles) {
    const c = vm.createContext({ n: 7, boardState: tiles, dlaState: null, renderToScreen() {},
        // Put initial walkers at the first empty cell so painting beside them
        // gives a reproducible growth check without changing the DLA engine.
        Math: Object.assign(Object.create(Math), { random: () => 0 }) });
    vm.runInContext(initialize + sync, c);
    c.initializeDla();
    return c;
}
const empty = () => Array.from({length:49}, () => ({k:0,v:0,isGold:false}));
const palette = ['#000000','#D03080','#90DDE0'];

for (const genetics of [false,true]) test(`DLA empty entry never inserts a center seed; genetics=${genetics}`, () => {
    const tiles=empty();tiles[24].isGold=true;const before=structuredClone(tiles);
    const c=setup(tiles);
    assert.deepEqual(tiles,before);assert.equal(c.dlaState.crystal.size,0);
    assert.equal(c.dlaState.emptyIndices.length,49);assert(c.dlaState.walkers.length>0);
    for(let i=0;i<5;i++) {
        const result=runDlaGeneration({n:7,currentBoardState:c.boardState,currentPalette:palette,dlaState:c.dlaState,
            dlaRules:{colorGenetics:genetics,fastMode:false},dlaTuning:{batchSize:20}});
        c.boardState=result.nextBoardState;c.dlaState=result.nextDlaState;
    }
    assert.deepEqual(c.boardState,before);assert.equal(c.dlaState.crystal.size,0);
});

test('brush seeding after empty entry lets the existing DLA walkers grow; fresh entry discards stale crystal', t => {
    const c=setup(empty());
    c.boardState[1].k=c.boardState[1].v=1;c.syncDlaCrystalState();
    assert.deepEqual([...c.dlaState.crystal],[1]);
    const random=Math.random;t.after(()=>{Math.random=random;});Math.random=()=>.5;
    const result=runDlaGeneration({n:7,currentBoardState:c.boardState,currentPalette:palette,dlaState:c.dlaState,
        dlaRules:{colorGenetics:false,fastMode:false},dlaTuning:{batchSize:1}});
    assert.equal(result.nextBoardState[0].k>0,true);assert.equal(result.nextDlaState.crystal.has(0),true);
    c.boardState=empty();c.boardState[48].k=c.boardState[48].v=2;
    c.initializeDla();assert.deepEqual([...c.dlaState.crystal],[48]);
    const full=empty().map(t=>({...t,k:1,v:1}));c.boardState=full;c.initializeDla();
    assert.equal(c.dlaState.walkers.length,0);assert.equal(c.dlaState.emptyIndices.length,0);
    assert.equal(c.dlaState.crystal.size,49);
});

test('DLA can resume after Undo or Contours creates empty space on a previously full board',t=>{
 const c=setup(empty().map(t=>({...t,k:1,v:1})));assert.equal(c.dlaState.walkers.length,0);
 c.boardState[0].k=c.boardState[0].v=0;c.syncDlaCrystalState();
 assert(c.dlaState.walkers.length>0,'newly empty cells need walkers even after the previous run exhausted them');
 assert.deepEqual([...c.dlaState.emptyIndices],[0]);assert(!c.dlaState.crystal.has(0));
 const random=Math.random;t.after(()=>{Math.random=random;});Math.random=()=>.5;
 const result=runDlaGeneration({n:7,currentBoardState:c.boardState,currentPalette:palette,dlaState:c.dlaState,dlaRules:{colorGenetics:false,fastMode:false},dlaTuning:{batchSize:1}});assert(result.nextBoardState[0].k>0,'recovered walkers actually grow into reopened space');
});

test('DLA resizing rebuilds walkers for the current dimensions without painting',()=>{
 const c=setup(empty().map(t=>({...t,k:1,v:1})));c.n=9;c.boardState=Array.from({length:81},(_,i)=>({k:i===40?1:0,v:i===40?1:0,isGold:false}));
 const before=structuredClone(c.boardState);c.syncDlaCrystalState();assert(c.dlaState.walkers.length>0);assert.deepEqual(c.boardState,before);
 c.n=3;c.boardState=Array.from({length:9},(_,i)=>({k:i===4?1:0,v:i===4?1:0,isGold:false}));c.syncDlaCrystalState();
 assert.equal(c.dlaState.n,3);assert.equal(c.dlaState.walkers.length,Math.round(1.2*3*Math.sqrt(3)));
 assert(c.dlaState.walkers.every(w=>w.x>=0&&w.x<3&&w.y>=0&&w.y<3),'shrinking cannot retain out-of-board walkers');assert.deepEqual([...c.dlaState.crystal],[4]);
});
