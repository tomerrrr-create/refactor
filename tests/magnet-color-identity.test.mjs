import test from 'node:test';
import assert from 'node:assert/strict';
import { runMagnetGeneration, resetMagnetCaches } from '../js/simulations/magnet.js';

const methods = ['magnet', 'cosmic_magnet', 'time_magnet', 'expand'];
const palette = Array.from({length:64}, (_, i) => '#' + (255 - Math.round(i * 255 / 63)).toString(16).padStart(2, '0').repeat(3));
const norm = (k, length) => ((k % length) + length) % length;

for (const method of methods) test(`${method}: freshly painted black remains an anchor beside an older wrapped black`, () => {
    const native = Math.random;
    try {
        Math.random = () => 0;
        resetMagnetCaches();
        const board = Array.from({length:81}, (_, id) => ({id, k:0, v:0, isGold:false}));
        board[37].k = board[37].v = 127; // Black after a 264 → 64 palette switch.
        const context = {n:9, currentPalette:palette, magnetRules:{method, anchorColor:'luminance', anchorColorIndex:-1}, currentBoardState:board};
        runMagnetGeneration(context); // Prime fallback before live drawing.
        const painted = board[43];
        painted.k = painted.v = 63;
        runMagnetGeneration(context);
        assert.equal(board[43], painted);
        assert(board.some(tile => tile.k === 127), 'stored artwork index is preserved');
    } finally { Math.random = native; }
});

for (const method of methods) test(`${method}: wrapped and canonical boards follow identical movement and randomness through live edits and palette resize`, () => {
    const native = Math.random;
    try {
        const n = 19;
        const initial = Array.from({length:n*n}, (_, id) => {
            const k = id % 3 === 0 ? 63 : (id * 7) % 64;
            return {id, k:k + (id % 5 - 2) * 64, v:id, isGold:id % 37 === 0};
        });
        const run = canonical => {
            resetMagnetCaches();
            let seed = 19, calls = 0;
            Math.random = () => { calls++; return ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296); };
            const board = structuredClone(initial);
            if (canonical) board.forEach(tile => tile.k = norm(tile.k, 64));
            const frames = [];
            for (let frame = 0; frame < 16; frame++) {
                const colors = frame < 8 ? palette : palette.slice(0, 32);
                const anchor = colors.length - 1;
                // Resize without resetting caches; a new black stroke arrives every frame.
                if (canonical) board.forEach(tile => tile.k = norm(tile.k, colors.length));
                const tile = board[(frame * 17) % board.length];
                tile.k = canonical ? anchor : anchor + colors.length * (frame % 3 - 1);
                const rawValues = new Map(board.map(tile => [tile.id, tile.k]));
                runMagnetGeneration({n, currentBoardState:board, currentPalette:colors, magnetRules:{method, anchorColorIndex:frame < 12 ? 0 : 7}});
                for (const tile of board) assert.equal(tile.k, rawValues.get(tile.id), 'engine only swaps tiles');
                frames.push({ids:board.map(tile => tile.id), colors:board.map(tile => norm(tile.k, colors.length)), calls});
            }
            return frames;
        };
        assert.deepEqual(run(false), run(true));
    } finally { Math.random = native; }
});

test('growing the palette invalidates a fallback even when the requested anchor and old target remain present', () => {
    const native = Math.random;
    try {
        for (const method of methods) {
            Math.random = () => 0;
            resetMagnetCaches();
            const board = Array.from({length:81}, (_, id) => ({id, k:id % 2 ? 3 : 4, v:id, isGold:false}));
            const rules = {method, anchorColorIndex:7};
            runMagnetGeneration({n:9, currentBoardState:board, currentPalette:palette.slice(0,32), magnetRules:rules});
            board[40].k = 40; // Better fallback only in the larger palette's cyclic order.
            const fresh = structuredClone(board);
            runMagnetGeneration({n:9, currentBoardState:board, currentPalette:palette, magnetRules:rules});
            resetMagnetCaches();
            runMagnetGeneration({n:9, currentBoardState:fresh, currentPalette:palette, magnetRules:rules});
            assert.deepEqual(board, fresh, method);
        }
    } finally { Math.random = native; }
});
