import test from 'node:test';
import assert from 'node:assert/strict';
import { createFibonacciState, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';

function simulate(n, orientation = 0) {
    const currentBoardState = Array.from({ length: n * n }, () => ({ k: 0, v: 0 }));
    const currentPalette = Array(4096).fill('#000');
    const state = createFibonacciState(n, orientation);
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

test('one-cell boards continue cycling ranks without an outgoing round', () => {
    const sim = simulate(1);
    sim.currentPalette.length = 2;
    sim.step();
    assert.equal(sim.currentBoardState[0].k, 1);
    sim.step();
    assert.equal(sim.currentBoardState[0].k, 0);
    assert.equal(sim.state.frame, 1);
    assert.equal(sim.state.outgoing, undefined);
    assert.throws(() => validateFibonacciState({ ...sim.state, frame: 2 }));
});

test('wrapped square strips cross both edges and recruit each cell only once per generation', () => {
    const sim = simulate(5);
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

test('the new spiral starts at the previous endpoint and outgoing strips retire gradually', () => {
    const sim = simulate(21);
    const oldOrigin = sim.state.origin;
    const changingCells = () => {
        const previous = sim.currentBoardState.map(cell => cell.k);
        sim.step();
        return sim.currentBoardState.flatMap((cell, index) => cell.k !== previous[index] ? [index] : []);
    };
    let oldFootprint, changed;
    do {
        oldFootprint = changed;
        changed = changingCells();
    } while (sim.state.origin === oldOrigin);

    assert.equal(sim.state.frame, 1);
    assert.equal(sim.state.outgoing.origin, oldOrigin);
    assert.equal(sim.state.origin, 103);
    assert(changed.includes(sim.state.origin));
    assert(changed.length > 1 && changed.length < oldFootprint.length);
    assert(oldFootprint.includes(102) && !changed.includes(102), 'the last strip gives way near the new origin');

    const previousCells = new Set(changed);
    let retiredLater = 0;
    while (sim.state.outgoing) {
        const active = new Set(changingCells());
        if ([...previousCells].some(index => !active.has(index))) retiredLater++;
        previousCells.clear();
        for (const index of active) previousCells.add(index);
    }
    assert(retiredLater > 5);
    assert(sim.state.frame > 1 && sim.state.origin !== oldOrigin);
});

test('a handoff snapshot restores both spirals and replays across multiple later rounds', () => {
    const sim = simulate(21);
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
    assert.throws(() => validateFibonacciState({ ...checkpoint, origin: 21 ** 2 }));
});
