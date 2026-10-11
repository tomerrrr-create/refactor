import test from 'node:test';
import assert from 'node:assert/strict';
import { runBlackHole2Generation, getBlackHole2Transition, finishBlackHole2Transition, BLACK_HOLE_2_DURATION } from '../js/simulations/black-hole-2.js';
const boardFor = n => Array.from({ length: n * n }, (_, id) => ({ id, k: (id * 73 + 17) % 23, isGold: id === Math.floor(n * n / 2) }));
const radius = (i, n) => (i % n - (n - 1) / 2) ** 2 + (Math.floor(i / n) - (n - 1) / 2) ** 2;
const energy = (board, n) => board.reduce((sum, tile, i) => sum + tile.k * radius(i, n), 0);
for (const n of [1, 2, 31, 249]) {
    test(`local journeys preserve tiles, gold and radial progress at ${n} × ${n}`, () => {
        const board = boardFor(n), tiles = [...board];
        let before = energy(board, n), extendedDirection = false;
        for (let frame = 0; frame < 6; frame++) {
            const original = [...board], now = frame * (BLACK_HOLE_2_DURATION + 1);
            assert.equal(runBlackHole2Generation(n, board, now), board);
            const state = getBlackHole2Transition(board, now);
            if (state) {
                const moved = new Set();
                for (let j = 0; j < state.count * 2; j += 2) {
                    const a = state.pairs[j], b = state.pairs[j + 1];
                    assert(!moved.has(a) && !moved.has(b)); moved.add(a); moved.add(b);
                    assert(Math.abs(a % n - b % n) <= 2 && Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 2);
                    if (Math.abs(a % n - b % n) === 2 || Math.abs(Math.floor(a / n) - Math.floor(b / n)) === 2) extendedDirection = true;
                    assert(radius(a, n) > radius(b, n));
                    assert.equal(board[b], original[a]); assert.equal(board[a], original[b]);
                    assert(!board[a].isGold && !board[b].isGold);
                }
                const inTransit = [...board];
                runBlackHole2Generation(n, board, now + 30);
                assert.deepEqual(board, inTransit, 'no repeated moves during an unfinished journey');
            }
            const after = energy(board, n); assert(after >= before); before = after;
            assert.equal(board[Math.floor(n * n / 2)], tiles[Math.floor(n * n / 2)]);
        }
        if (n >= 31) assert(extendedDirection, 'extended neighborhood is actually used');
        assert.deepEqual([...board].sort((a, b) => a.id - b.id), tiles);
        finishBlackHole2Transition(board); assert.equal(getBlackHole2Transition(board, 0), null);
    });
}
test('a radial arrangement remains stable', () => {
    const n = 31, board = boardFor(n);
    board.forEach((tile, i) => { tile.k = Math.floor(Math.sqrt(radius(i, n))); });
    const before = [...board];
    for (let j = 0; j < 10; j++) runBlackHole2Generation(n, board, j * 121);
    assert.deepEqual(board, before);
});
test('the actual renderer preserves endpoints and draws a distinct intermediate journey', async () => {
    const { renderBlackHole2Frame } = await import('../js/black-hole-2-renderer.js');
    const previousDocument = globalThis.document;
    let pixels;
    globalThis.document = { createElement: () => ({ width: 300, height: 150,
        getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
            putImageData: image => { pixels = new Uint8ClampedArray(image.data); } }) }) };
    try {
        const n = 5, board = Array.from({ length: 25 }, () => ({ k: 1, isGold: false }));
        board[8].k = 0; board[7].isGold = true;
        const state = { n, batch: 1, startedAt: 0, count: 1, pairs: [6, 8], moving: new Uint8Array(25) };
        state.moving[6] = state.moving[8] = 1;
        const ctx = { drawImage() {} }, colors = ['#ff0000', '#0000ff'];
        renderBlackHole2Frame(ctx, 10, 10, board, colors, 0, state, 0);
        const start = pixels;
        assert.deepEqual([...start.slice((3 * 10 + 3) * 4, (3 * 10 + 3) * 4 + 3)], [255, 0, 0]);
        renderBlackHole2Frame(ctx, 10, 10, board, colors, 0, state, BLACK_HOLE_2_DURATION);
        const end = pixels;
        assert.deepEqual([...end.slice((3 * 10 + 7) * 4, (3 * 10 + 7) * 4 + 3)], [255, 0, 0]);
        renderBlackHole2Frame(ctx, 10, 10, board, colors, 0, state, BLACK_HOLE_2_DURATION / 2);
        assert.notDeepEqual(pixels, start); assert.notDeepEqual(pixels, end);
        assert.deepEqual([...pixels.slice((3 * 10 + 5) * 4, (3 * 10 + 5) * 4 + 3)], [255, 215, 0]);
    } finally { globalThis.document = previousDocument; }
});
