import test from 'node:test';
import assert from 'node:assert/strict';
import { createFibonacciState, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';

function simulate(n, orientation = 0, mode = 'continuous') {
    const currentBoardState = Array.from({ length: n * n }, () => ({ k: 0, v: 0 }));
    const currentPalette = Array(4096).fill('#000');
    const state = createFibonacciState(n, orientation, mode);
    const step = () => runFibonacciGeneration({ currentBoardState, currentPalette }, state);
    const occupied = () => currentBoardState.flatMap(({ k }, index) => k > 0 ? [index] : []);
    return { currentBoardState, currentPalette, state, step, occupied };
}

test('Square Spiral starts at the center and grows exact Fibonacci rectangles in all orientations', () => {
    for (let orientation = 0; orientation < 4; orientation++) {
        const { step, occupied } = simulate(41, orientation);
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

test('protected gold and individual colors survive continuous playback', () => {
    const sim = simulate(41);
    sim.currentBoardState[840].k = 12;
    sim.currentBoardState[0].isGold = true;
    sim.step();
    assert.equal(sim.currentBoardState[840].k, 13);
    for (let i = 0; i < 110; i++) sim.step();
    assert.equal(sim.currentBoardState[0].k, 0);
    assert(sim.occupied().length > 20);
});

test('oversized Fibonacci squares fill the remaining strip in all orientations', () => {
    for (const n of [2, 3, 5, 21, 149, 249]) {
        for (let orientation = 0; orientation < 4; orientation++) {
            if (n > 21 && orientation > 0) break;
            const sim = simulate(n, orientation);
            let previousFrame;
            do {
                previousFrame = sim.state.frame;
                sim.step();
            } while (sim.state.frame !== previousFrame);
            assert.equal(sim.occupied().length, n * n, `${n}/${orientation}`);
            const before = sim.currentBoardState.map(cell => cell.k);
            sim.step();
            assert(sim.currentBoardState.every((cell, index) => cell.k === before[index] + 1));
            assert.equal(sim.state.frame, previousFrame);
        }
    }
});

test('restart and continuous modes have the same growth and diverge after filling the board', () => {
    const continuous = simulate(21);
    const restart = simulate(21, 0, 'restart');
    while (continuous.occupied().length < 21 ** 2) {
        continuous.step();
        restart.step();
        assert.deepEqual(restart.currentBoardState, continuous.currentBoardState);
        assert.equal(restart.state.outgoing, undefined);
    }
    const originalOrigin = restart.state.origin;
    for (let frame = 1; frame <= 3; frame++) {
        continuous.step();
        restart.step();
        assert.equal(restart.state.outgoing.origin, originalOrigin);
        assert.notEqual(restart.state.origin, originalOrigin);
        assert.equal(restart.state.frame, frame);
        assert.deepEqual(restart.currentBoardState, continuous.currentBoardState);
    }
    continuous.step();
    restart.step();
    assert.equal(restart.state.frame, 4);
    assert(restart.currentBoardState.some((cell, index) => cell.k < continuous.currentBoardState[index].k));
    assert(restart.currentBoardState.every((cell, index) => cell.k <= continuous.currentBoardState[index].k));
    assert(restart.occupied().length === 21 ** 2, 'outgoing strips retain their last color');
});

test('restart checkpoints replay across handoffs and palette wraps', () => {
    const sim = simulate(21, 2, 'restart');
    sim.currentPalette.length = 23;
    sim.currentBoardState[220].isGold = true;
    while (!sim.state.outgoing) sim.step();
    for (let i = 0; i < 4; i++) sim.step();
    const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    const restored = structuredClone(sim.currentBoardState);
    let restarts = 0;
    for (let i = 0; i < 550; i++) {
        const previousFrame = sim.state.frame;
        sim.step();
        if (sim.state.frame < previousFrame) restarts++;
        runFibonacciGeneration({ currentBoardState: restored, currentPalette: sim.currentPalette }, checkpoint);
    }
    assert(restarts >= 3);
    assert.deepEqual(restored, sim.currentBoardState);
    assert.deepEqual(checkpoint, sim.state);
    assert.equal(restored[220].k, 0);
    assert.throws(() => validateFibonacciState({ ...checkpoint, origin: 21 ** 2 }));
});

test('one-cell boards cycle within the palette in both modes', () => {
    for (const mode of ['restart', 'continuous']) {
        const sim = simulate(1, 0, mode);
        sim.currentPalette.length = 2;
        sim.step();
        assert.equal(sim.currentBoardState[0].k, 1);
        sim.step();
        assert.equal(sim.currentBoardState[0].k, 0);
        assert.equal(sim.state.frame, 1);
        assert.throws(() => validateFibonacciState({ ...sim.state, frame: 2 }));
    }
});
