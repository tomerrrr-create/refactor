import test from 'node:test';
import assert from 'node:assert/strict';
import { runSpiralGeneration } from '../js/simulations/spiral.js';

function fixture(n, colors = 23) {
    let seed = 12345;
    return Array.from({ length: n * n }, (_, id) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return { id, k: seed % colors, isGold: true };
    });
}
function step(board, n) {
    runSpiralGeneration({ n, currentBoardState: board, spiralRules: { method: 'white_hole' } });
}
function circular(board, n) {
    const center = (n - 1) / 2;
    const shells = new Map();
    board.forEach((tile, i) => {
        const radius = (Math.floor(i / n) - center) ** 2 + (i % n - center) ** 2;
        const shell = shells.get(radius) || { low: Infinity, high: -Infinity };
        shell.low = Math.min(shell.low, tile.k);
        shell.high = Math.max(shell.high, tile.k);
        shells.set(radius, shell);
    });
    let previousMax = -Infinity;
    for (const [, shell] of [...shells].sort((a, b) => a[0] - b[0])) {
        if (shell.low < previousMax) return false;
        previousMax = shell.high;
    }
    return true;
}
function settle(board, n, verifyMovement = false) {
    let stable = 0;
    for (let generation = 0; generation < 30000; generation++) {
        const previous = [...board];
        step(board, n);
        stable = board.every((tile, i) => tile === previous[i]) ? stable + 1 : 0;
        if (verifyMovement) {
            const locations = new Map(board.map((tile, i) => [tile, i]));
            let moved = 0;
            previous.forEach((tile, before) => {
                const after = locations.get(tile);
                assert(after !== undefined, 'no tile can disappear');
                const dr = Math.abs(Math.floor(after / n) - Math.floor(before / n));
                const dc = Math.abs(after % n - before % n);
                assert(Math.max(dr, dc) <= 1, 'a tile must not jump farther than one neighbor');
                if (after !== before) {
                    moved++;
                    assert.equal(board[before], previous[after], 'each generation must consist of disjoint swaps');
                }
            });
            assert(moved <= 2 * Math.max(1, Math.floor(board.length / 8)), 'per-step movement budget');
        }
        if (stable >= 5 && circular(board, n)) return;
    }
    assert.fail(`No circular convergence at ${n} x ${n}`);
}

for (const n of [1, 2, 3, 16, 31, 64, 100]) {
    test(`gradual, conserving circular flow at ${n} x ${n}`, () => {
        const board = fixture(n, n >= 64 ? 264 : 23), tiles = [...board];
        settle(board, n, n <= 31);
        assert.deepEqual([...board].sort((a, b) => a.id - b.id), tiles);
        const final = [...board];
        for (let i = 0; i < 20; i++) step(board, n);
        assert.deepEqual(board, final, 'final circle must stay still');
    });
}

test('a first step is local and leaves most of the board in place', () => {
    const n = 64, board = fixture(n, 264), initial = [...board];
    step(board, n);
    const changed = board.filter((tile, i) => tile !== initial[i]).length;
    assert(changed > 0);
    assert(changed <= board.length / 4);
    assert(!circular(board, n), 'one step must not produce the final circle');
});

test('recovers from edits and another mode interrupting an active route', () => {
    const n = 16, board = fixture(n);
    for (let i = 0; i < 80; i++) step(board, n);
    runSpiralGeneration({ n, currentBoardState: board, spiralRules: { method: 'black_hole' } });
    settle(board, n, true);
    for (const tile of board) tile.k = 22 - tile.k;
    settle(board, n, true);
    const other = fixture(3);
    settle(other, 3, true);
    step(board, n);
    assert(circular(board, n));
});

for (const pattern of ['split', 'reversed-rings']) {
    test(`converges from a structured ${pattern} board`, () => {
        const n = 31, center = (n - 1) / 2, board = fixture(n);
        board.forEach((tile, i) => {
            const row = Math.floor(i / n), col = i % n;
            tile.k = pattern === 'split' ? (col < center ? 0 : 22)
                : 22 - Math.floor(22 * ((row - center) ** 2 + (col - center) ** 2) / (2 * center ** 2));
        });
        const histogram = board.map(tile => tile.k).sort((a, b) => a - b);
        settle(board, n, true);
        assert.deepEqual(board.map(tile => tile.k).sort((a, b) => a - b), histogram);
    });
}
