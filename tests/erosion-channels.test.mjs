import test from 'node:test';
import assert from 'node:assert/strict';
import { runErosionGeneration } from '../js/simulations/erosion.js';

const palette = Array.from({ length: 10 }, (_, i) => `#${String(i).repeat(6)}`);
const board = values => values.map(k => ({ k, v: k, isGold: false }));
const run = (state, strength = 0, colors = palette) => runErosionGeneration({
    n: Math.sqrt(state.length), currentBoardState: state, currentPalette: colors,
    erosionRules: { mode: 'channels', erosionStrength: strength }
});

test('water prefers falling and moves at most one cell per generation', () => {
    const input = board([7, 8, 7, 0, 0, 0, 0, 0, 0]);
    const before = structuredClone(input), next = run(input);
    assert.equal(next[4].k, 8); assert.equal(next[7].k, 0);
    assert.deepEqual(input, before);
});

test('diagonal descent wins over sideways flow', t => {
    t.mock.method(Math, 'random', () => 0.9);
    const next = run(board([0, 8, 0, 0, 7, 7, 7, 7, 7]));
    assert.equal(next[3].k, 8); assert.equal(next[0].k, 0);
});

test('blocked water spreads sideways only once even toward unprocessed cells', t => {
    t.mock.method(Math, 'random', () => 0.9);
    const next = run(board([7, 7, 7, 8, 0, 0, 7, 7, 7]));
    assert.equal(next[4].k, 8); assert.equal(next[5].k, 0);
});

test('soil gradually moves backward into air, opening a channel for water', t => {
    t.mock.method(Math, 'random', () => 0);
    const first = run(board([7, 8, 7, 7, 3, 7, 7, 7, 7]), 1);
    assert.equal(first[4].k, 2); assert.equal(first[1].k, 8);
    const second = run(first, 1);
    assert.equal(second[4].k, 8); assert.equal(second[1].k, 1);
});

test('water erodes adjacent banks even while falling, at most one contact per step', t => {
    t.mock.method(Math, 'random', () => 0);
    const next = run(board([7, 8, 7, 7, 0, 7, 7, 7, 7]), 1);
    assert.equal(next[0].k, 6); assert.equal(next[2].k, 7); assert.equal(next[4].k, 8);
});

test('floor water stays on the board and protected tiles remain intact', () => {
    const input = board([0, 8, 0, 0, 7, 0, 8, 0, 9]); input[4].isGold = true;
    const next = run(input, 1);
    assert.equal(next[6].k, 8); assert.equal(next[8].k, 9);
    assert.deepEqual(next[4], input[4]);
});

test('roles use palette positions, and water colors and count survive repeated steps', () => {
    let state = board([9, 8, 0, 3, 0, 7, 0, 0, 0]);
    for (let i = 0; i < 80; i++) {
        state = run(state, 0.1, [...palette].reverse());
        assert.deepEqual(state.filter(t => t.k >= 8).map(t => t.k).sort(), [8, 9]);
        assert(state.every(t => t.k >= 0 && t.k < palette.length && t.v === t.k));
    }
});

test('legacy mode and old settings retain the original earth/air groups and movement', t => {
    t.mock.method(Math, 'random', () => 0.3);
    const input = board([2, 8, 2, 2, 0, 2, 2, 2, 2]);
    for (const mode of [undefined, 'legacy']) {
        const next = runErosionGeneration({ n: 3, currentBoardState: input, currentPalette: palette,
            erosionRules: { erosionStrength: 0.1, mode } });
        // Index 0 remains solid earth; index 2 is air, so water falls diagonally right.
        assert.deepEqual(next.map(t => t.k), [2, 2, 2, 2, 0, 8, 2, 2, 2]);
    }
});

const solid = (state, strength = 0) => runErosionGeneration({
    n: Math.sqrt(state.length), currentBoardState: state, currentPalette: palette,
    erosionRules: { mode: 'channels-solid', erosionStrength: strength }
});

test('forward carving retains the material groups and movement priorities', t => {
    t.mock.method(Math, 'random', () => 0.9);
    assert.equal(solid(board([1, 8, 1, 2, 2, 2, 2, 2, 2]))[4].k, 8);
    assert.equal(solid(board([2, 8, 2, 2, 1, 1, 1, 1, 1]))[3].k, 8);
    const lateral = solid(board([1, 1, 1, 8, 2, 2, 1, 1, 1]));
    assert.equal(lateral[4].k, 8); assert.equal(lateral[5].k, 2);
});

test('forward carving erodes earth toward air while keeping water and indices valid', t => {
    t.mock.method(Math, 'random', () => 0);
    let state = board([1, 8, 1, 1, 0, 1, 1, 1, 1]);
    state = solid(state, 1);
    assert.equal(state[4].k, 1); assert.equal(state[1].k, 8);
    state = solid(state, 1);
    assert.equal(state[4].k, 8); assert.equal(state[1].k, 2);
    for (let i = 0; i < 100; i++) state = solid(state, 1);
    assert(state.every(t => t.k >= 0 && t.k < palette.length && t.v === t.k));
    assert.deepEqual(state.filter(t => t.k >= 8).map(t => t.k), [8]);
});

test('forward carving retains water colors, floor accumulation and gold protection', () => {
    let state = board([9, 8, 2, 1, 2, 0, 8, 2, 9]); state[3].isGold = true;
    const original = structuredClone(state);
    for (let i = 0; i < 60; i++) state = solid(state, 1);
    assert.deepEqual(state.filter(t => t.k >= 8).map(t => t.k).sort(), [8, 8, 9, 9]);
    assert.equal(state[6].k, 8); assert.equal(state[8].k, 9);
    assert.deepEqual(state[3], original[3]);
});
