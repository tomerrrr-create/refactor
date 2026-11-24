import test from 'node:test';
import assert from 'node:assert/strict';
import { createFibonacciState, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';

function simulate(n, mode, orientation = 0) {
    const currentBoardState = Array.from({ length: n * n }, () => ({ k: 0, v: 0 }));
    const currentPalette = Array(4096).fill('#000');
    const state = createFibonacciState(n, mode, orientation);
    const step = () => runFibonacciGeneration({ currentBoardState, currentPalette }, state);
    const occupied = () => currentBoardState.flatMap(({ k }, index) => k > 0 ? [index] : []);
    return { currentBoardState, currentPalette, state, step, occupied };
}

test('Square Spiral starts at the center and grows exact Fibonacci rectangles in all orientations', () => {
    for (let orientation = 0; orientation < 4; orientation++) {
        const { step, occupied } = simulate(41, 'squares', orientation);
        const milestones = new Set([1, 2, 6, 15, 40, 104]);
        step();
        assert.deepEqual(occupied(), [840]);
        step();
        assert.deepEqual(occupied(), [840, 840 + [1, 41, -1, -41][orientation]].sort((a, b) => a - b));
        for (let frame = 2; frame < 110; frame++) {
            const cells = occupied();
            if (milestones.has(cells.length)) {
                const rows = cells.map(i => Math.floor(i / 41));
                const cols = cells.map(i => i % 41);
                assert.equal((Math.max(...rows) - Math.min(...rows) + 1) * (Math.max(...cols) - Math.min(...cols) + 1), cells.length);
                milestones.delete(cells.length);
            }
            step();
        }
        assert.deepEqual([...milestones], [1]);
    }
});

test('Flower has distinct petal counts of 1, 1, 2, 3, 5, 8 and 13', () => {
    const n = 141, center = 70;
    const sim = simulate(n, 'flower');
    for (let frame = 0; frame < 300; frame++) sim.step();
    const layerCounts = Array.from({ length: 7 }, (_, layer) => {
        const radius = (layer + .5) * 10;
        const ring = Array.from({ length: 720 }, (_, sample) => {
            const angle = sample * Math.PI / 360;
            const row = center + Math.round(radius * Math.sin(angle));
            const column = center + Math.round(radius * Math.cos(angle));
            return sim.currentBoardState[row * n + column].k > 0;
        });
        return ring.filter((occupied, i) => occupied && !ring.at(i - 1)).length;
    });
    assert.deepEqual(layerCounts, [1, 1, 2, 3, 5, 8, 13]);
});

test('each Fibonacci mode advances individual colors, protects gold and resumes from its cursor', () => {
    for (const mode of ['squares', 'flower']) {
        const sim = simulate(41, mode);
        sim.currentBoardState[840].k = 12;
        sim.currentBoardState[0].isGold = true;
        sim.step();
        assert.equal(sim.currentBoardState[840].k, 13);
        while (sim.state.frame < 26) sim.step();
        const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
        const restored = structuredClone(sim.currentBoardState);
        for (let i = 0; i < 80; i++) {
            sim.step();
            runFibonacciGeneration({ currentBoardState: restored, currentPalette: sim.currentPalette }, checkpoint);
        }
        assert.deepEqual(restored, sim.currentBoardState);
        assert.deepEqual(checkpoint, sim.state);
        assert.equal(restored[0].k, 0);
        assert(sim.occupied().length > 20);
    }
});

test('small boards stop expanding and continue cycling ranks without overflow', () => {
    for (const mode of ['squares', 'flower']) {
        const sim = simulate(1, mode);
        sim.currentPalette.length = 2;
        sim.step();
        assert.equal(sim.currentBoardState[0].k, 1);
        sim.step();
        assert.equal(sim.currentBoardState[0].k, 0);
        assert.equal(sim.state.frame, 1);
        assert.throws(() => validateFibonacciState({ ...sim.state, frame: 2 }));
    }
});

test('wrapped square strips cross both edges and recruit each cell only once per generation', () => {
    const sim = simulate(5, 'squares');
    sim.state.origin = 24;
    sim.step();
    assert.deepEqual(sim.occupied(), [24]);
    sim.step();
    assert.deepEqual(sim.occupied(), [20, 24]);
    while (sim.state.frame < 10) sim.step();
    assert.deepEqual(sim.occupied(), [0, 4, 5, 9, 20, 24]);
    const gold = sim.currentBoardState[9];
    gold.k = gold.v = 12;
    gold.isGold = true;
    for (let i = 0; i < 125; i++) {
        const previous = sim.currentBoardState.map(cell => cell.k);
        sim.step();
        const deltas = sim.currentBoardState.map((cell, index) => cell.k - previous[index]);
        assert(deltas.every(delta => delta === 0 || delta === 1));
        assert(deltas.includes(0) && deltas.includes(1));
        assert.equal(gold.k, 12);
    }
});

test('each new round starts at the previous endpoint and leaves the earlier colors on the board', () => {
    const sim = simulate(21, 'squares');
    const origin = sim.state.origin;
    let restarts = 0;
    for (let i = 0; i < 550; i++) {
        const previous = sim.currentBoardState.map(cell => cell.k);
        const previousFrame = sim.state.frame;
        sim.step();
        if (sim.state.frame < previousFrame) {
            const changed = sim.currentBoardState.flatMap((cell, index) => cell.k !== previous[index] ? [index] : []);
            assert.equal(sim.state.frame, 1);
            assert.deepEqual(changed, [sim.state.origin]);
            restarts++;
        }
    }
    assert(restarts >= 3);
    assert.notEqual(sim.state.origin, origin);
    const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    const restored = structuredClone(sim.currentBoardState);
    for (let i = 0; i < 350; i++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: restored, currentPalette: sim.currentPalette }, checkpoint);
    }
    assert.deepEqual(restored, sim.currentBoardState);
    assert.deepEqual(checkpoint, sim.state);
    assert.throws(() => validateFibonacciState({ ...checkpoint, origin: 21 ** 2 }));
});

test('legacy square recordings retain their original finite footprint', () => {
    const sim = simulate(21, 'squares');
    const old = validateFibonacciState({ version: 1, n: 21, mode: 'squares', orientation: 0, frame: 0 });
    for (let i = 0; i < 200; i++) {
        runFibonacciGeneration({ currentBoardState: sim.currentBoardState, currentPalette: sim.currentPalette }, old);
    }
    assert.equal(old.frame, 74);
    assert.equal(sim.occupied().length, 104);
});
