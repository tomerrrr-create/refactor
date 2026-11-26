import test from 'node:test';
import assert from 'node:assert/strict';
import { createFibonacciState, setFibonacciMode, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';
import { growFibonacciCrystal } from '../js/simulations/fibonacci-crystal.js';

function simulate(n, orientation = 0, mode = 'continuous', colorAdvance = 100, seed = 0) {
    const currentBoardState = Array.from({ length: n * n }, () => ({ k: 0, v: 0 }));
    const currentPalette = Array(4096).fill('#000');
    const state = createFibonacciState(n, orientation, mode, colorAdvance, seed);
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

test('version 7 restart and continuous modes diverge after the original three-generation hold', () => {
    const continuous = simulate(21);
    const restart = simulate(21, 0, 'restart');
    restart.state.version = 7;
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
    const sim = simulate(21, 2, 'restart', 85, 27);
    sim.currentPalette.length = 23;
    sim.currentBoardState[220].isGold = true;
    while (!sim.state.outgoing) sim.step();
    for (let i = 0; i < 4; i++) sim.step();
    const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    assert.equal(checkpoint.colorAdvance, 85);
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
    for (const mode of ['restart', 'branching', 'continuous']) {
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

test('Color Advance defaults to 95% and nearby recruited cells advance together', () => {
    assert.equal(createFibonacciState(8).colorAdvance, 95);
    const sim = simulate(8, 0, 'continuous', 99, 27);
    const compare = simulate(8, 0, 'continuous', 91, 27);
    for (let i = 0; i < 100; i++) {
        sim.step();
        compare.step();
    }
    let advanced = 0;
    let advancedAtNinetyOne = 0;
    let held = 0;
    const completedFrame = sim.state.frame;
    for (let i = 0; i < 50; i++) {
        const before = sim.currentBoardState.map(cell => cell.k);
        const beforeAtNinetyOne = compare.currentBoardState.map(cell => cell.k);
        sim.step();
        compare.step();
        for (let index = 0; index < 64; index++) {
            const delta = sim.currentBoardState[index].k - before[index];
            const groupOrigin = index - (index % 2) - (Math.floor(index / 8) % 2) * 8;
            assert.equal(delta, sim.currentBoardState[groupOrigin].k - before[groupOrigin]);
            assert(delta === 0 || delta === 1);
            advanced += delta;
            held += 1 - delta;
            advancedAtNinetyOne += compare.currentBoardState[index].k - beforeAtNinetyOne[index];
        }
    }
    assert.equal(sim.state.frame, completedFrame);
    assert.equal(sim.state.generation, 150);
    assert(held > 0 && advanced > advancedAtNinetyOne && advancedAtNinetyOne > 0);
    for (const invalid of [0, 89, 91.5, 101, '90']) {
        assert.throws(() => validateFibonacciState({ ...sim.state, colorAdvance: invalid }));
    }
});

test('branching starts the two spirals from the previous path and keeps the old spiral moving', () => {
    const sim = simulate(21, 0, 'branching');
    const original = simulate(21, 0, 'restart');
    while (original.occupied().length < 21 ** 2) {
        sim.step();
        original.step();
        assert.deepEqual(sim.currentBoardState, original.currentBoardState);
        assert.equal(sim.state.branch, undefined);
    }
    const oldOrigin = sim.state.origin;
    for (let frame = 1; frame <= 7; frame++) {
        const before = sim.currentBoardState.map(cell => cell.k);
        sim.step();
        assert.equal(sim.state.frame, frame);
        assert.equal(sim.state.outgoing.origin, oldOrigin);
        assert.equal(sim.state.origin, 104);
        assert.deepEqual(sim.state.branch, { origin: 102, orientation: 1 });
        assert.equal(sim.state.orientation, 3);
        assert(sim.currentBoardState.every((cell, index) => cell.k === before[index] + 1));
    }
    while (sim.state.outgoing) sim.step();

    const primary = simulate(21, sim.state.orientation);
    const secondary = simulate(21, sim.state.branch.orientation);
    primary.state.origin = sim.state.origin;
    secondary.state.origin = sim.state.branch.origin;
    const nextFrame = sim.state.frame + 1;
    for (let frame = 1; frame <= nextFrame; frame++) {
        primary.step();
        if (frame > 4) secondary.step();
    }
    const before = sim.currentBoardState.map(cell => cell.k);
    sim.step();
    assert(secondary.occupied().some(index => !primary.currentBoardState[index].k));
    assert(sim.currentBoardState.every((cell, index) => {
        const covered = primary.currentBoardState[index].k > 0 || secondary.currentBoardState[index].k > 0;
        return cell.k === before[index] + Number(covered);
    }));
});

test('branching checkpoints keep both outgoing spirals and replay deterministically', () => {
    for (const n of [2, 21]) {
        const sim = simulate(n, 0, 'branching', 95, 27);
        sim.currentPalette.length = 23;
        sim.currentBoardState[0].isGold = true;
        for (let i = 0; i < 500 && !sim.state.outgoing?.branch; i++) sim.step();
        assert(sim.state.outgoing?.branch);
        const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
        assert.throws(() => validateFibonacciState({ ...checkpoint, branch: { ...checkpoint.branch, origin: checkpoint.origin } }));
        const replayed = structuredClone(sim.currentBoardState);
        for (let i = 0; i < 500; i++) {
            sim.step();
            runFibonacciGeneration({ currentBoardState: replayed, currentPalette: sim.currentPalette }, checkpoint);
        }
        assert.deepEqual(checkpoint, sim.state);
        assert.deepEqual(replayed, sim.currentBoardState);
        assert.equal(replayed[0].k, 0);
        const before = structuredClone(sim.currentBoardState);
        const origin = sim.state.origin;
        setFibonacciMode(sim.state, 'restart');
        assert.equal(sim.state.origin, origin);
        assert.equal(sim.state.branch, undefined);
        assert.equal(sim.state.outgoing?.branch, undefined);
        assert.deepEqual(sim.currentBoardState, before);
        assert.deepEqual(validateFibonacciState(sim.state), sim.state);
    }
});

test('both current modes keep the whole outgoing spiral moving until each incoming spiral covers 5%', () => {
    for (const mode of ['restart', 'branching']) {
        const n = 41;
        const sim = simulate(n, 0, mode);
        while (!sim.state.outgoing) sim.step();

        const primary = simulate(n, sim.state.orientation);
        primary.state.origin = sim.state.origin;
        primary.step();
        let secondary;
        if (sim.state.branch) {
            secondary = simulate(n, sim.state.branch.orientation);
            secondary.state.origin = sim.state.branch.origin;
        }
        const target = Math.ceil(n ** 2 * .05);
        const covered = () => primary.occupied().length >= target && (!secondary || secondary.occupied().length >= target);
        while (!covered()) {
            const before = sim.currentBoardState.map(cell => cell.k);
            sim.step();
            primary.step();
            if (secondary && sim.state.frame > 4) secondary.step();
            assert(sim.currentBoardState.every((cell, i) => cell.k === before[i] + 1),
                `${mode} retires too soon at frame ${sim.state.frame}`);
        }
        const beforeFade = sim.currentBoardState.map(cell => cell.k);
        sim.step();
        const moving = sim.currentBoardState.filter((cell, i) => cell.k === beforeFade[i] + 1).length;
        assert(moving < n ** 2 && moving >= target, mode);
        assert(sim.state.outgoing);
        assert.deepEqual(validateFibonacciState(sim.state), sim.state);
    }
});

test('Penrose Crystal recruits the whole board from the center and keeps facets and edges moving', () => {
    for (const [n, orientation] of [[1, 0], [22, 2], [149, 3], [327, 1]]) {
        const state = createFibonacciState(n, orientation, 'crystal', 100);
        const counts = new Uint8Array(n * n);
        const advance = index => counts[index]++;
        growFibonacciCrystal(state, advance);
        const center = Math.floor((n - 1) / 2);
        assert.equal(counts[center * n + center], 1);
        if (n > 1) assert.equal(counts[0], 0);
        for (let frame = 1; frame < 160; frame++) growFibonacciCrystal(state, advance);
        assert(counts.every(count => count > 0), `${n}×${n} has unreached pixels`);
        const previous = counts.slice();
        for (let frame = 0; frame < 20; frame++) growFibonacciCrystal(state, advance);
        assert(counts.every((count, index) => count > previous[index]));
        if (n >= 149) assert(new Set(counts.map((count, index) => count - previous[index])).size >= 3);
    }
});

test('Penrose Crystal uses current brush colors and resumes exactly from a serialized checkpoint', () => {
    const sim = simulate(45, 2, 'branching', 95, 7);
    sim.currentPalette.length = 64;
    for (let frame = 0; frame < 20; frame++) sim.step();
    const before = structuredClone(sim.currentBoardState);
    setFibonacciMode(sim.state, 'crystal');
    assert.deepEqual(sim.currentBoardState, before);
    for (let frame = 0; frame < 120; frame++) sim.step();
    const saved = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    assert.throws(() => validateFibonacciState({ ...saved, crystalFrame: -1 }));
    const replayed = structuredClone(sim.currentBoardState);
    for (const board of [sim.currentBoardState, replayed]) {
        board[0] = { k: 22, v: 22, isGold: true };
        board[1] = { k: 40, v: 40 };
    }
    for (let frame = 0; frame < 10; frame++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: replayed, currentPalette: sim.currentPalette }, saved);
    }
    assert.deepEqual(sim.currentBoardState[0], { k: 22, v: 22, isGold: true });
    assert(sim.currentBoardState[1].k > 40 && sim.currentBoardState[1].k <= 50);
    assert.deepEqual(sim.currentBoardState, replayed);
    assert.deepEqual(sim.state, saved);
    setFibonacciMode(sim.state, 'restart');
    assert.deepEqual(validateFibonacciState(sim.state), sim.state);
});
