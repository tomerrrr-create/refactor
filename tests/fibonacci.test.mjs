import test from 'node:test';
import assert from 'node:assert/strict';
import { createFibonacciState, setFibonacciMode, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';

function simulate(n, orientation = 0, mode = 'continuous', colorAdvance = 100, seed = 0, useTail = false) {
    const currentBoardState = Array.from({ length: n * n }, () => ({ k: 0, v: 0 }));
    const currentPalette = Array(4096).fill('#000');
    const state = createFibonacciState(n, orientation, mode, colorAdvance, seed);
    if (mode === 'sequence' || mode === 'primes') {
        if (useTail !== true) delete state.sequenceColorWave;
        if (!useTail) {
            delete state.sequenceLineShifts;
            delete state.sequenceLinePhase;
            delete state.sequenceTailLength;
            delete state.sequenceTailPhase;
            state.sequenceTrailFrames = [];
        } else if (useTail === 'legacy') {
            delete state.sequenceLineShifts;
            delete state.sequenceLinePhase;
            Object.assign(state, { sequenceTailLength: 0, sequenceTailPhase: 0 });
        }
    }
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

test('sequence modes reveal the Fibonacci and prime positions in the same square spiral', () => {
    for (const [mode, expected] of [['sequence', [1, 4, 5, 6, 8]], ['primes', [0, 5, 6, 8]]]) {
        const sim = simulate(3, 0, mode);
        sim.state.sequenceInterval = 10;
        sim.step();
        assert(sim.occupied().length > 0 && sim.occupied().length < expected.length);
        sim.step();
        sim.step();
        assert.deepEqual(sim.occupied(), expected);
    }
    const even = simulate(4, 0, 'sequence');
    even.step();
    assert.deepEqual(even.occupied(), [5, 6]);
});

test('number patterns shift after the board width, overlap without double advances and keep gold', () => {
    const sim = simulate(3, 0, 'primes');
    sim.currentBoardState[0].isGold = true;
    for (let i = 0; i < 3; i++) sim.step();
    assert.equal(sim.state.sequenceOffset, 1);
    assert.equal(sim.state.sequenceElapsed, 0);
    const previous = sim.currentBoardState.map(cell => cell.k);
    sim.step();
    const advanced = sim.currentBoardState.flatMap((cell, i) => cell.k === previous[i] + 1 ? [i] : []);
    assert.deepEqual(advanced, [5, 6, 7, 8]);
    assert.equal(sim.currentBoardState[0].k, 0);
    assert(sim.currentBoardState.every((cell, i) => cell.k <= previous[i] + 1));
});

test('number sequence checkpoints reproduce progressive reveal, offsets and wraps', () => {
    const sim = simulate(4, 0, 'branching');
    sim.step();
    setFibonacciMode(sim.state, 'sequence', 2);
    for (let i = 0; i < 31; i++) sim.step();
    assert.equal(sim.state.sequenceOffset, 15);
    const restored = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    assert.throws(() => validateFibonacciState({ ...restored, sequenceElapsed: 2 }));
    const replayed = structuredClone(sim.currentBoardState);
    for (let i = 0; i < 40; i++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: replayed, currentPalette: sim.currentPalette }, restored);
        assert.deepEqual(replayed, sim.currentBoardState);
        assert.deepEqual(restored, sim.state);
    }
    setFibonacciMode(sim.state, 'primes', 2);
    assert.equal(sim.state.sequenceOffset, 0);
    setFibonacciMode(sim.state, 'restart');
    assert.equal(sim.state.sequenceOffset, undefined);
    assert.equal(sim.state.frame, 1);
    assert.deepEqual(validateFibonacciState(sim.state), sim.state);
});

test('both number modes keep departed cells changing at the two trail rates, then freeze', () => {
    for (const mode of ['sequence', 'primes']) {
        const current = simulate(9, 0, mode);
        current.state.sequenceInterval = 32;
        const legacy = simulate(9, 0, mode);
        legacy.state.sequenceInterval = 32;
        delete legacy.state.sequenceTrailFrames;
        const activeStep = () => {
            const before = legacy.currentBoardState.map(cell => cell.k);
            legacy.step();
            current.step();
            return new Set(legacy.currentBoardState.flatMap((cell, index) => cell.k !== before[index] ? [index] : []));
        };
        let active;
        for (let gen = 0; gen < 32; gen++) active = activeStep();
        assert.deepEqual(current.currentBoardState, legacy.currentBoardState);

        let departed;
        for (let gen = 0; gen < 4 && departed === undefined; gen++) {
            const previous = active;
            active = activeStep();
            departed = [...previous].find(index => !active.has(index));
        }
        assert.notEqual(departed, undefined, mode);
        const start = current.currentBoardState[departed].k;
        assert.equal(start, legacy.currentBoardState[departed].k, 'age one does not advance');

        const originalSnapshot = JSON.stringify(current.state);
        const checkpoint = validateFibonacciState(JSON.parse(originalSnapshot));
        const replayed = structuredClone(current.currentBoardState);
        const snapshot = { ...current.state };
        for (let age = 2; age <= 18; age++) {
            const before = current.currentBoardState[departed].k;
            assert(!activeStep().has(departed));
            const advances = age <= 16 && age % (age <= 8 ? 2 : 4) === 0;
            assert.equal(current.currentBoardState[departed].k - before, Number(advances), mode + ' age ' + age);
            runFibonacciGeneration({ currentBoardState: replayed, currentPalette: current.currentPalette }, checkpoint);
        }
        assert.equal(current.currentBoardState[departed].k, start + 6);
        assert.deepEqual(replayed, current.currentBoardState);
        assert.equal(JSON.stringify(snapshot), originalSnapshot);
        assert.equal(validateFibonacciState(legacy.state).sequenceTrailFrames, undefined);
        assert.throws(() => validateFibonacciState({ ...checkpoint, sequenceTrailFrames: [[0, 0, 999]] }));
    }
});

test('a cell rejoining a number pattern changes once that generation, even during a trail', () => {
    for (const mode of ['sequence', 'primes']) {
        const current = simulate(5, 0, mode);
        current.state.sequenceInterval = 1;
        const legacy = simulate(5, 0, mode);
        legacy.state.sequenceInterval = 1;
        delete legacy.state.sequenceTrailFrames;
        const lastActive = new Map();
        let observedRejoin = false;
        for (let gen = 0; gen < 40; gen++) {
            const previous = current.currentBoardState.map(cell => cell.k);
            const previousLegacy = legacy.currentBoardState.map(cell => cell.k);
            legacy.step();
            current.step();
            for (let i = 0; i < previous.length; i++) {
                const delta = current.currentBoardState[i].k - previous[i];
                assert(delta === 0 || delta === 1);
                if (legacy.currentBoardState[i].k !== previousLegacy[i]) {
                    assert.equal(delta, 1);
                    const last = lastActive.get(i);
                    if (last !== undefined && gen - last > 1 && gen - last <= 16) observedRejoin = true;
                    lastActive.set(i, gen);
                }
            }
        }
        assert(observedRejoin);
    }
});

test('connected tails grow one cell per shift and retain the wave phase on restore', () => {
    for (const [mode, maxLength] of [['sequence', 6], ['primes', 3]]) {
        const sim = simulate(21, 0, mode, 100, 0, 'legacy');
        sim.state.sequenceInterval = 8;
        for (let shift = 1; shift <= 8; shift++) {
            for (let i = 0; i < 8; i++) sim.step();
            assert.equal(sim.state.sequenceTailLength, Math.min(shift, maxLength));
        }
        const restored = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
        const board = structuredClone(sim.currentBoardState);
        for (let i = 0; i < 34; i++) {
            sim.step();
            runFibonacciGeneration({ currentBoardState: board, currentPalette: sim.currentPalette }, restored);
        }
        assert.deepEqual(board, sim.currentBoardState);
        assert.deepEqual(restored, sim.state);
        assert.throws(() => validateFibonacciState({ ...restored, sequenceTailLength: maxLength + 1 }));
    }
});

test('tail color travels from the nearest predecessor outward without painting distant cells', () => {
    for (const [mode, delay] of [['sequence', 2], ['primes', 3]]) {
        const n = 11;
        const offset = 4;
        const headsAt = shift => {
            const control = simulate(n, 0, mode);
            delete control.state.sequenceTrailFrames;
            Object.assign(control.state, { sequenceInterval: 327, sequenceOffset: shift, sequenceAge: n });
            control.step();
            return new Set(control.occupied());
        };
        const heads = headsAt(offset);
        const first = headsAt(offset - 1);
        const second = headsAt(offset - 2);
        const sim = simulate(n, 0, mode, 100, 0, 'legacy');
        Object.assign(sim.state, { sequenceInterval: 327, sequenceOffset: offset, sequenceAge: n, sequenceTailLength: 2 });
        for (let phase = 0; phase <= delay; phase++) {
            const candidates = phase === 0 ? [...first] : phase === delay ? [...second].filter(index => !first.has(index)) : [];
            const trail = candidates.filter(index => !heads.has(index)).sort((a, b) => a - b);
            if (phase === 0 || phase === delay) assert(trail.length > 0);
            const before = sim.currentBoardState.map(cell => cell.k);
            sim.step();
            const changed = sim.currentBoardState.flatMap((cell, i) => {
                const delta = cell.k - before[i];
                assert(delta === 0 || delta === 1);
                return delta && !heads.has(i) ? [i] : [];
            });
            assert.deepEqual(changed, trail);
        }
    }
});

test('Fibonacci Sequence retains its reveal and sends a bright crest through formed lines', () => {
    const n = 149;
    const current = simulate(n, 0, 'sequence', 100, 7, true);
    current.state.sequenceInterval = 8;
    const original = simulate(n, 0, 'sequence');
    original.state.sequenceInterval = 8;
    delete original.state.sequenceTrailFrames;
    const colorCount = 264;
    current.currentPalette.length = original.currentPalette.length = colorCount;
    for (let i = 0; i < 48; i++) {
        current.step();
        original.step();
        assert(current.currentBoardState.every((cell, index) => cell.k === original.currentBoardState[index].k),
            `The original reveal changed at generation ${i + 1}`);
    }

    const snapshot = validateFibonacciState(JSON.parse(JSON.stringify(current.state)));
    const replayed = structuredClone(current.currentBoardState);
    const brightCells = new Set();
    const waveColors = new Set();
    for (let i = 0; i < 180; i++) {
        const before = current.currentBoardState.map(cell => cell.k);
        const beforeOriginal = original.currentBoardState.map(cell => cell.k);
        current.step();
        original.step();
        runFibonacciGeneration({ currentBoardState: replayed, currentPalette: current.currentPalette }, snapshot);
        for (const [index, cell] of current.currentBoardState.entries()) {
            const head = original.currentBoardState[index].k !== beforeOriginal[index];
            if (head) assert.equal(cell.k, (before[index] + 1) % colorCount);
            else if (cell.k !== before[index]) {
                assert(before[index] > 0 && cell.k > 0);
                waveColors.add(cell.k);
                if (cell.k === colorCount - 1) brightCells.add(index);
            }
        }
    }
    assert(brightCells.size >= 8);
    assert(waveColors.has(Math.round((colorCount - 1) * 0.72)));
    assert.deepEqual(snapshot, current.state);
    assert.deepEqual(replayed, current.currentBoardState);
});
