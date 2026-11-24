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
