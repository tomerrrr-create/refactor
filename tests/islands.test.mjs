import test from 'node:test';
import assert from 'node:assert/strict';
import { createIslandsSession, restoreIslandsSession, runIslandsGeneration, recordIslandsBoard, restoreIslandsBoard } from '../js/simulations/islands.js';

const board = n => Array.from({length:n*n}, (_,i)=>({k:i%23,v:i%23,isGold:i===Math.floor(n*n/2),prevK:null}));
const advance = (tiles, session, steps) => { for(let i=0;i<steps;i++) runIslandsGeneration({n:Math.sqrt(tiles.length),currentBoardState:tiles},session); };

test('recorded seed and cursor reproduce all cells, with pause/resume and edits',()=>{
    const a=board(21), b=structuredClone(a), sa=createIslandsSession(123456), sb=createIslandsSession(123456);
    advance(a,sa,40); advance(b,sb,40); assert.deepEqual(a,b);
    const saved=JSON.parse(JSON.stringify(sa));
    a[0].k=7; b[0].k=7;
    advance(a,sa,60); advance(b,restoreIslandsSession(saved),60);
    assert.deepEqual(a,b); assert.equal(sa.steps,100);
    assert.equal(a[220].isGold,true); assert.equal(a[220].k,13);
    assert(a.every(tile=>tile.k>=0&&tile.k<23));
});
test('different seeds produce different trajectories; zero seed is valid',()=>{
    const a=board(21), b=board(21);
    advance(a,createIslandsSession(0),60); advance(b,createIslandsSession(1),60);
    assert.notDeepEqual(a,b);
});
test('version-one random arithmetic has a stable cursor and board fingerprint',()=>{
    const tiles=board(3), session=createIslandsSession(42);
    advance(tiles,session,10);
    assert.equal(session.state,2271577934);
    assert.deepEqual(tiles.map(t=>t.k),[3,0,0,3,4,8,6,6,8]);
});
test('large-board recording is constant size per step and never allocates board copies',()=>{
    const tiles=board(249), session=createIslandsSession(9), first=tiles[0];
    const before=JSON.stringify(session).length;
    advance(tiles,session,100);
    assert.equal(tiles[0],first); assert.equal(session.steps,100);
    assert(JSON.stringify(session).length < before+20);
});
test('starting board codec preserves colors, fractional brightness, and gold',()=>{
    const tiles=[{k:1,v:1,isGold:false},{k:1,v:1,isGold:false},{k:2,v:1.5,isGold:true},{k:3,v:3,isGold:false}];
    const packed=recordIslandsBoard(tiles); assert.equal(packed[0][0],2);
    assert.deepEqual(restoreIslandsBoard(2,JSON.parse(JSON.stringify(packed))),tiles);
    for(const runs of [[[5,0,0,0]],[[3,0,0,0]],[[4,-1,0,0]],[[4,0,0,2]]]) assert.throws(()=>restoreIslandsBoard(2,runs));
    assert.throws(()=>restoreIslandsBoard(301,[]));
});
test('unknown versions and malformed random states fail explicitly',()=>{
    for(const bad of [null,{}, {...createIslandsSession(1),islandsVersion:2}, {...createIslandsSession(1),state:-1}, {...createIslandsSession(1),steps:.5}]) assert.throws(()=>restoreIslandsSession(bad));
    for(const seed of [-1,1.5,2**32,'42']) assert.throws(()=>createIslandsSession(seed));
});

// The largest supported board must also survive recording and replay.
test('327-square Islands recording restores fully and rejects oversized boards', () => {
    const tiles = board(327);
    const restored = restoreIslandsBoard(327, recordIslandsBoard(tiles));
    assert.equal(restored.length, 327 * 327);
    assert.deepEqual(restored.map(({k, v, isGold}) => ({k, v, isGold})),
        tiles.map(({k, v, isGold}) => ({k, v, isGold})));
    assert.throws(() => restoreIslandsBoard(328, [[328 * 328, 0, 0, 0]]), /Invalid Islands board/);
});

test('proximity restores seeded evolution without changing gold or allocating new cells',()=>{
    const n=21, tiles=board(n), session=createIslandsSession(123,'proximity'), palette=Array(23);
    const context={n,currentBoardState:tiles,currentPalette:palette},first=tiles[0];
    for(let i=0;i<50;i++)runIslandsGeneration(context,session);
    const restored=restoreIslandsSession(JSON.parse(JSON.stringify(session))), copy=structuredClone(tiles);
    for(let i=0;i<50;i++){
        runIslandsGeneration(context,session);
        runIslandsGeneration({...context,currentBoardState:copy},restored);
    }
    assert.deepEqual(tiles,copy);assert.deepEqual(session,restored);assert.equal(tiles[0],first);
    assert.equal(tiles[220].isGold,true);assert.equal(tiles[220].k,13);
    assert.throws(()=>runIslandsGeneration({n,currentBoardState:tiles},session),/palette/);
});

test('rank proximity favors near colors and uses the full palette span',()=>{
    function moved(distance,length){
        let changes=0;
        for(let seed=0;seed<4000;seed++){
            const tiles=[{k:0},{k:distance},{k:distance},{k:distance}];
            runIslandsGeneration({n:2,currentBoardState:tiles,currentPalette:Array(length)},createIslandsSession(seed,'proximity'));
            if(tiles[0].k!==0)changes++;
        }
        return changes;
    }
    const near=moved(1,264),far=moved(263,264);
    assert(near>far*3);
    assert.equal(moved(1,24),moved(2,47)); // Same relative distance, exact same seeded choices.
});

test('proximity follows displayed ranks after switching to a shorter palette',()=>{
    const n=21,palette=Array(23),a=board(n),b=board(n);
    for(const tile of b){tile.k+=23*4;tile.v=tile.k;}
    const sa=createIslandsSession(73,'proximity'),sb=createIslandsSession(73,'proximity');
    for(let i=0;i<40;i++){
        runIslandsGeneration({n,currentBoardState:a,currentPalette:palette},sa);
        runIslandsGeneration({n,currentBoardState:b,currentPalette:palette},sb);
    }
    assert.deepEqual(a.map(t=>t.k%23),b.map(t=>t.k%23));
    assert.deepEqual(sa,sb);
});
