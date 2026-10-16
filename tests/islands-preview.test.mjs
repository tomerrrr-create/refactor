import test from 'node:test';
import assert from 'node:assert/strict';
import { runIslandsPreview } from '../js/simulations/islands-preview.js';
const tile = k => ({ k, v: k, isGold: false, prevK: null });
const sequence = values => { let i = 0; return () => values[i++ % values.length]; };

test('a step copies a direct neighbor without swapping or sharing tile objects', () => {
    const board = [tile(2), tile(7), tile(3), tile(4)], objects = [...board];
    assert.equal(runIslandsPreview({ n: 2, currentBoardState: board, random: sequence([0, .9]) }), board);
    assert.deepEqual(board.map(t => t.k), [7, 7, 3, 4]);
    assert.equal(board[0].v, 7);
    board.forEach((t, i) => assert.equal(t, objects[i]));
});
test('gold cells neither change nor spread and boundaries do not wrap', () => {
    for (const gold of [0, 1]) {
        const board = [tile(2), tile(7), tile(3), tile(4)]; board[gold].isGold = true;
        const before = structuredClone(board);
        runIslandsPreview({ n: 2, currentBoardState: board, random: sequence([0, .9]) });
        assert.deepEqual(board, before);
    }
    const board = [tile(2), tile(7), tile(3), tile(4)], before = structuredClone(board);
    runIslandsPreview({ n: 2, currentBoardState: board, random: sequence([0, .6]) });
    assert.deepEqual(board, before);
    const single = [tile(9)]; assert.equal(runIslandsPreview({ n: 1, currentBoardState: single }), single);
});
