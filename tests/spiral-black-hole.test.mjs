import test from 'node:test';
import assert from 'node:assert/strict';
import { runSpiralGeneration } from '../js/simulations/spiral.js';

function boardFor(n, colors = 23) {
    let seed = 12345;
    return Array.from({ length: n * n }, (_, id) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return { id, k: seed % colors, isGold: true, prevK: null, animStart: 0 };
    });
}
function orderFor(n) {
    const center = (n - 1) / 2;
    const radius = i => (Math.floor(i / n) - center) ** 2 + (i % n - center) ** 2;
    return Array.from({ length: n * n }, (_, i) => i).sort((a, b) => radius(a) - radius(b));
}
function isRadial(board, order, n) {
    const center = (n - 1) / 2;
    const radius = i => (Math.floor(i / n) - center) ** 2 + (i % n - center) ** 2;
    // All colors on an inner shell must be <= all colors on the next shell.
    let shellRadius = -1, previousMax = -Infinity, shellMin = Infinity, shellMax = -Infinity;
    for (const i of order) {
        const r = radius(i);
        if (r !== shellRadius) {
            if (shellMin < previousMax) return false;
            previousMax = shellMax;
            shellRadius = r;
            shellMin = Infinity;
            shellMax = -Infinity;
        }
        shellMin = Math.min(shellMin, board[i].k);
        shellMax = Math.max(shellMax, board[i].k);
    }
    return shellMin >= previousMax;
}
function step(board, n) {
    return runSpiralGeneration({ n, currentBoardState: board, currentPalette: [], spiralRules: { method: 'black_hole' } });
}
function settle(board, n) {
    const order = orderFor(n);
    for (let generation = 0; generation < 2000; generation++) {
        step(board, n);
        if (isRadial(board, order, n)) return generation + 1;
    }
    assert.fail(`Did not converge for ${n} x ${n}`);
}

for (const n of [1, 2, 3, 16, 31, 64, 100, 300]) {
    test(`converges to circular shells and preserves every tile: ${n} x ${n}`, () => {
        const board = boardFor(n, n >= 64 ? 264 : 23);
        const tiles = [...board];
        settle(board, n);
        assert.equal(board.length, n * n);
        assert.deepEqual([...board].sort((a, b) => a.id - b.id), tiles);
        // Sorting must include gold cells: this fixture marks every tile gold.
        assert.equal(step(board, n), board);
        // Allow ordering within equal radii to finish, then demand exact stability.
        for (let i = 0; i < 30; i++) step(board, n);
        const settled = [...board];
        for (let i = 0; i < 5; i++) step(board, n);
        assert.deepEqual(board, settled);
    });
}

test('restarts after in-place edits and after changing grid size', () => {
    const board = boardFor(31);
    settle(board, 31);
    for (const tile of board) tile.k = 22 - tile.k;
    settle(board, 31);
    const other = boardFor(16);
    settle(other, 16);
    for (const tile of board) tile.k = 22 - tile.k;
    settle(board, 31);
});
