import test from 'node:test';
import assert from 'node:assert/strict';
import { createReliefStudy, paintRelief, stepReliefStudy } from '../js/living-relief.js';
import { runCenterLineGravity } from '../js/simulations/line-gravity.js';

function makeStudy(n, tiles = Array.from({ length: n * n }, () => ({ k: 0, isGold: false }))) {
    return createReliefStudy({ n, tiles, palette: ['#000000', '#ffffff'], brushSize: 1, brushShape: 'circle', selectedColor: 1 });
}

test('seeding derives height from the displayed color and keeps the original tiles independent', () => {
    const tiles = [{ k: 1, isGold: false }, { k: 0, isGold: false }, { k: 0, isGold: true }, { k: 1, isGold: false }];
    const study = makeStudy(2, tiles);
    assert(study.heights[0] > study.heights[1]);
    assert(study.heights[2] > study.heights[1]);
    paintRelief(study, 1, 2, 'color', new Set());
    assert.deepEqual(study.board.slice(1, 3), [{ k: 1, isGold: false }, { k: 1, isGold: false }]);
    assert.deepEqual(tiles.slice(1, 3), [{ k: 0, isGold: false }, { k: 0, isGold: true }]);
});

test('sculpting a connected stroke changes height once per cell and keeps pigment separate', () => {
    const study = makeStudy(7);
    const initial = study.heights.slice();
    const visited = new Set();
    paintRelief(study, 7, 13, 'raise', visited);
    paintRelief(study, 13, 7, 'raise', visited);
    assert.deepEqual(study.heights.slice(7, 14), initial.slice(7, 14).map(height => height + 8));
    const ridge = study.heights.slice();
    paintRelief(study, 10, 10, 'color', new Set());
    assert.equal(study.board[10].k, 1);
    assert.deepEqual(study.heights, ridge);
    paintRelief(study, 10, 10, 'lower', new Set());
    assert.equal(study.heights[10], initial[10]);
    assert.equal(study.board[10].k, 1);
});

test('gravity carries colors through a low pass while a ridge slows adjacent columns', () => {
    const n = 61;
    const study = makeStudy(n);
    const ridge = 16, passStart = 27, passEnd = 33;
    study.heights.fill(0);
    for (let i = 0; i < study.board.length; i++) study.board[i].k = Number(Math.floor(i / n) >= ridge);
    for (let col = 0; col < n; col++) {
        if (col < passStart || col >= passEnd) study.heights[ridge * n + col] = 24;
    }
    const counts = board => board.filter(tile => tile.k === 0).length;
    const beforeCount = counts(study.board), heights = study.heights.slice();
    for (let i = 0; i < 18; i++) stepReliefStudy(study);
    const passed = (start, end) => {
        let count = 0;
        for (let col = start; col < end; col++) {
            if (study.board[Math.floor(n / 2) * n + col].k === 0) count++;
        }
        return count;
    };
    assert(passed(passStart, passEnd) / (passEnd - passStart) > passed(0, passStart) / passStart + .5);
    assert.equal(counts(study.board), beforeCount);
    assert.deepEqual(study.heights, heights);
});

test('flat terrain follows the exact existing Horizontal Gravity sequence', () => {
    const n = 31;
    const study = makeStudy(n, Array.from({ length: n * n }, (_, index) => ({ k: (index >> 2) % 2, isGold: index === 25 })));
    study.heights.fill(0);
    const standard = study.board.map(tile => ({ ...tile }));
    for (let phase = 0; phase < 20; phase++) {
        stepReliefStudy(study);
        runCenterLineGravity(n, standard, phase, true);
        assert.deepEqual(study.board, standard);
    }
});
