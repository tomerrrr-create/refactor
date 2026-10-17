import {createHash} from 'node:crypto';
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

test('weighted proximity favors nearby neighbors without discarding eligible attempts',()=>{
    function outcomes(near,far,length){
        const counts={near:0,far:0,unchanged:0};
        for(let seed=0;seed<6000;seed++){
            const tiles=[{k:0},{k:near},{k:far},{k:far,isGold:true}];
            runIslandsGeneration({n:2,currentBoardState:tiles,currentPalette:Array(length)},createIslandsSession(seed,'proximity'));
            if(tiles[0].k===near)counts.near++;
            else if(tiles[0].k===far)counts.far++;
            else counts.unchanged++;
        }
        return counts;
    }
    const near=outcomes(1,263,264),equal=outcomes(263,263,264);
    assert(near.near>near.far*10);assert(near.near<near.far*15);
    assert.equal(near.unchanged,equal.unchanged); // Same target choices; no rejection step.
    assert.deepEqual(outcomes(1,22,23),outcomes(2,44,45));
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

test('version-two rejection recordings retain their original fingerprint',()=>{
    const tiles=board(21),session=restoreIslandsSession({islandsVersion:2,seed:42,state:42,steps:0,mode:'proximity'});
    for(let i=0;i<100;i++)runIslandsGeneration({n:21,currentBoardState:tiles,currentPalette:Array(23)},session);
    assert.equal(session.state,3447336444);
    assert.equal(createHash('sha256').update(JSON.stringify(tiles)).digest('hex'),
        '25e0ece947be8dc55d1a40a8dfca3d529d4a3771fe5183ba8ec5272ca620f1c5');
});

test('weighted copying respects gold, single neighbors and board boundaries',()=>{
    for(let seed=0;seed<200;seed++){
        const tiles=[{k:0},{k:7},{k:0,isGold:true},{k:0,isGold:true}];
        runIslandsGeneration({n:2,currentBoardState:tiles,currentPalette:Array(23)},createIslandsSession(seed,'proximity'));
        assert(tiles[0].k===0||tiles[0].k===7);assert(tiles[1].k===0||tiles[1].k===7);
        assert.equal(tiles[2].k,0);assert.equal(tiles[3].k,0);
    }
    const tile={k:7};const session=createIslandsSession(42,'proximity');
    runIslandsGeneration({n:1,currentBoardState:[tile],currentPalette:Array(1)},session);
    assert.equal(tile.k,7);assert.equal(session.steps,1);
});

test('version-three weighted recordings retain strength-four evolution',()=>{
    const tiles=board(21),session=restoreIslandsSession({islandsVersion:3,seed:42,state:42,steps:0,mode:'proximity'});
    for(let i=0;i<100;i++)runIslandsGeneration({n:21,currentBoardState:tiles,currentPalette:Array(23)},session);
    assert.equal(session.state,331199803);
    assert.equal(createHash('sha256').update(JSON.stringify(tiles)).digest('hex'),
        '101e221b949684c064ba8c951ac38fb3c32604f181c1c0ef459c2ab51ac773d6');
    const stronger=board(21),fresh=createIslandsSession(42,'proximity');
    assert.equal(fresh.islandsVersion,4);
    for(let i=0;i<100;i++)runIslandsGeneration({n:21,currentBoardState:stronger,currentPalette:Array(23)},fresh);
    assert.notDeepEqual(stronger,tiles);
});
