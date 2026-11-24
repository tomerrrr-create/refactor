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

test('continuous Fibonacci keeps the completed footprint moving without restarting', () => {
    const sim = simulate(21);
    for (let i = 0; i < 126; i++) sim.step();
    const footprint = sim.occupied();
    assert.equal(footprint.length, 273);
    const rows = new Set(footprint.map(i => Math.floor(i / 21)));
    const columns = new Set(footprint.map(i => i % 21));
    assert((rows.has(0) && rows.has(20)) || (columns.has(0) && columns.has(20)));
    for (let i = 0; i < 500; i++) {
        const before = sim.currentBoardState.map(cell => cell.k);
        sim.step();
        assert.deepEqual(sim.occupied(), footprint);
        assert.equal(sim.state.frame, 126);
        assert.equal(sim.state.waveFrame, 0);
        assert.equal(sim.currentBoardState.filter((cell, index) => cell.k === before[index] + 1).length, footprint.length);
    }
});

test('Color Wave grows the same shape, then moves the cadence along its strips', () => {
    const continuous = simulate(21);
    const wave = simulate(21, 0, 'wave');
    const strips = [];
    for (let frame = 0; frame < 126; frame++) {
        const previous = new Set(wave.occupied());
        wave.step();
        continuous.step();
        const recruited = wave.occupied().filter(index => !previous.has(index));
        if (recruited.length) strips.push(recruited);
        assert.deepEqual(wave.currentBoardState, continuous.currentBoardState);
    }

    for (let frame = 0; frame < 24; frame++) wave.step();
    const footprint = wave.occupied();
    const lead = strips[0][0], middle = strips[Math.floor(strips.length / 2)][0];
    let leadMovesMore = false, middleMovesMore = false;
    for (let window = 0; window < 8; window++) {
        const leadStart = wave.currentBoardState[lead].k, middleStart = wave.currentBoardState[middle].k;
        for (let frame = 0; frame < 12; frame++) {
            const before = wave.currentBoardState.map(cell => cell.k);
            wave.step();
            assert.deepEqual(wave.occupied(), footprint);
            for (const strip of strips) {
                const moves = wave.currentBoardState[strip[0]].k - before[strip[0]];
                assert(moves === 0 || moves === 1);
                assert(strip.every(index => wave.currentBoardState[index].k - before[index] === moves));
            }
        }
        const leadMoves = wave.currentBoardState[lead].k - leadStart;
        const middleMoves = wave.currentBoardState[middle].k - middleStart;
        leadMovesMore ||= leadMoves > middleMoves;
        middleMovesMore ||= middleMoves > leadMoves;
    }
    assert(leadMovesMore && middleMovesMore);
});

test('wave checkpoints preserve the completed footprint and phase across palette wraps', () => {
    const sim = simulate(21, 2, 'wave');
    sim.currentPalette.length = 23;
    sim.currentBoardState[220].isGold = true;
    for (let i = 0; i < 175; i++) sim.step();
    const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    const restored = structuredClone(sim.currentBoardState);
    for (let i = 0; i < 500; i++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: restored, currentPalette: sim.currentPalette }, checkpoint);
    }
    assert.deepEqual(restored, sim.currentBoardState);
    assert.deepEqual(checkpoint, sim.state);
    assert.equal(restored[220].k, 0);
    assert.throws(() => validateFibonacciState({ ...checkpoint, waveFrame: 505 }));
    assert.throws(() => validateFibonacciState({ ...checkpoint, mode: 'continuous' }));
});

test('one-cell boards cycle within the palette in both modes', () => {
    for (const mode of ['continuous', 'wave']) {
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
