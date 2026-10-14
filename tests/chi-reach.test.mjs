import test from 'node:test';
import assert from 'node:assert/strict';
import { getAutoChiReach, resolveChiReach } from '../js/chi-reach.js';
import { normalizeEvolutionCycle, loadCycleIdentity } from '../js/evolution-cycle-settings.js';
import { generateSandpile } from '../js/simulations/chi_flow.js';

test('relative reach tracks palette Auto with positive, zero and negative adjustments', () => {
    assert.equal(getAutoChiReach(24), 4);
    assert.equal(resolveChiReach({reach: 0, reachOffset: 4},24),8);
    assert.equal(resolveChiReach({reach: 0, reachOffset: 10},24),14);
    assert.equal(resolveChiReach({reach: 0, reachOffset: -2},24),2);
    for(const size of [23,64,264]) for(const offset of [-2,0,4]) {
        assert.equal(resolveChiReach({reach:0,reachOffset:offset},size),getAutoChiReach(size)+offset);
    }
});
test('small palette bounds stay valid without altering the saved offset', () => {
    const rules={reach:0,reachOffset:-10};
    assert.equal(resolveChiReach(rules,23),1); assert.equal(resolveChiReach(rules,264),34); assert.equal(rules.reachOffset,-10);
    assert.equal(resolveChiReach({reach:0,reachOffset:10},3),2);
});
test('old absolute values and Auto retain their original meanings', () => {
    for(const size of [23,64,264]) {
        assert.equal(resolveChiReach({reach:4},size),4);
        assert.equal(resolveChiReach({reach:0},size),getAutoChiReach(size));
    }
});
test('signed offsets survive cycle storage and legacy personal snapshot loading', () => {
    const legacy={awakening:[3],flow:[2],reach:4}, relative={...legacy,reach:0,reachOffset:-4};
    const normalized=normalizeEvolutionCycle([legacy,relative,relative],[legacy,legacy,legacy]);
    assert.deepEqual(normalized,[legacy,relative,relative]);
    const saved=globalThis.localStorage;
    try {
        globalThis.localStorage={getItem:()=>JSON.stringify({sources:['custom-0','custom-1','custom-2'],yoursRules:relative})};
        assert.deepEqual(loadCycleIdentity('test',normalized,{}).yoursRules,relative);
    } finally {globalThis.localStorage=saved;}
    assert.deepEqual(normalizeEvolutionCycle([{...relative,reachOffset:-11},relative,relative],[legacy,legacy,legacy])[0],legacy);
});
test('resolved reach controls actual Chi Flow pulls, not just displayed metadata', () => {
    const palette=Array(24).fill('#000000');
    const board=Array.from({length:256},()=>({k:9,v:9}));
    const index=8*16+8;board[index]={k:1,v:1};
    const rules={awakening:[],flow:[8],reach:0,reachOffset:4};
    assert.equal(generateSandpile(board,palette,rules).nextBoardState[index].k,2);
    assert.equal(generateSandpile(board,palette,{...rules,reachOffset:-2}).nextBoardState[index].k,1);
    assert.equal(board[index].k,1);
});

test('percentage stations scale across palette groups with nearest-integer rounding', () => {
    const percentages=[50,75,100,125,150,200,300,400];
    const expected=[[2,2,3,4,5,6,9,12],[5,8,10,13,15,20,30,40],[22,33,44,55,66,88,132,176]];
    [23,64,264].forEach((size,i)=>percentages.forEach((reachPercent,j)=>{
        assert.equal(resolveChiReach({reach:0,reachPercent},size),expected[i][j]);
    }));
    assert.equal(resolveChiReach({reach:0,reachPercent:400},3),2);
});
test('percentage snapshots survive cycle normalization and identity while legacy snapshots remain intact', () => {
    const old={awakening:[3],flow:[2],reach:0,reachOffset:-10};
    const relative={awakening:[3],flow:[2],reach:0,reachPercent:75};
    assert.deepEqual(normalizeEvolutionCycle([old,relative,relative],[old,relative,relative]),[old,relative,relative]);
    assert.deepEqual(normalizeEvolutionCycle([{...relative,reachPercent:76},old,old],[old,old,old])[0],old);
});
test('percentage changes affect actual engine pulls', () => {
    const board=Array.from({length:256},()=>({k:9,v:9}));
    const index=8*16+8;board[index]={k:1,v:1};
    const rules={awakening:[],flow:[8],reach:0,reachPercent:200};
    const palette=Array(24).fill('#000000');
    assert.equal(generateSandpile(board,palette,rules).nextBoardState[index].k,2);
    assert.equal(generateSandpile(board,palette,{...rules,reachPercent:50}).nextBoardState[index].k,1);
});
