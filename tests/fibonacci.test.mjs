import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createFibonacciState, getFibonacciBranchSchedule, setFibonacciMode, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';
import { CLASSIC_CRYSTAL_SETTINGS, DEFAULT_CRYSTAL_PREFERENCES, DEFAULT_CRYSTAL_SETTINGS, growFibonacciCrystal } from '../js/simulations/fibonacci-crystal.js';
import { DEFAULT_MAP_PREFERENCES, FIBONACCI_MAPS, seedFibonacciMap } from '../js/simulations/fibonacci-maps.js';
import { restorePatternGrowthPreference } from '../js/simulations/pattern-growth.js';

function simulate(n, orientation = 0, mode = 'continuous', colorAdvance = 100, seed = 0, version) {
    const currentBoardState = Array.from({ length: n * n }, () => ({ k: 0, v: 0 }));
    const currentPalette = Array(4096).fill('#000');
    const state = createFibonacciState(n, orientation, mode, colorAdvance, seed, version);
    const step = () => runFibonacciGeneration({ currentBoardState, currentPalette }, state);
    const occupied = () => currentBoardState.flatMap(({ k }, index) => k > 0 ? [index] : []);
    return { currentBoardState, currentPalette, state, step, occupied };
}

test('pattern Auto growth follows palette sizes without resetting the front and survives recorded checkpoints', () => {
    for (const mode of ['crystal', ...FIBONACCI_MAPS]) {
        const { state, currentBoardState } = simulate(21, 0, mode);
        const settings = { ...(mode === 'crystal' ? DEFAULT_CRYSTAL_PREFERENCES : DEFAULT_MAP_PREFERENCES[mode]), growthSpeed: 75 };
        if (state.map) state.map.settings = settings;
        else state.crystalSettings = settings;
        const front = snapshot => snapshot.map?.front ?? snapshot.crystalFront ?? 0;
        let expectedFront = 0;
        for (const [size, increment] of [[23, 10], [25, 10], [64, 25], [264, 100], [36, 25], [96, 100]]) {
            const palette = Array(size).fill('#000');
            const replay = validateFibonacciState(JSON.parse(JSON.stringify(state)));
            const replayBoard = structuredClone(currentBoardState);
            runFibonacciGeneration({ currentBoardState, currentPalette: palette }, state);
            runFibonacciGeneration({ currentBoardState: replayBoard, currentPalette: palette }, replay);
            expectedFront += increment;
            assert.equal(front(state), expectedFront, mode);
            assert.deepEqual(replay, validateFibonacciState(state));
            assert.deepEqual(replayBoard, currentBoardState);
        }
        // A playback palette override recolors the pattern while retaining the recorded growth pace.
        runFibonacciGeneration({ currentBoardState, currentPalette: Array(264).fill('#000'), growthPaletteSize: 23 }, state);
        assert.equal(front(state), expectedFront += 10);
        settings.growthSpeedAuto = false;
        runFibonacciGeneration({ currentBoardState, currentPalette: Array(23).fill('#000') }, state);
        assert.equal(front(validateFibonacciState(state)), expectedFront += 75);
        delete settings.growthSpeedAuto;
        runFibonacciGeneration({ currentBoardState, currentPalette: Array(264).fill('#000') }, state);
        assert.equal(front(validateFibonacciState(state)), expectedFront + 75);
    }
});

test('older profile speeds retain manual choices and gain Auto for factory values', () => {
    assert.deepEqual(restorePatternGrowthPreference(DEFAULT_CRYSTAL_SETTINGS, DEFAULT_CRYSTAL_PREFERENCES), DEFAULT_CRYSTAL_PREFERENCES);
    const manual = { ...DEFAULT_CRYSTAL_SETTINGS, growthSpeed: 75 };
    assert.deepEqual(restorePatternGrowthPreference(manual, DEFAULT_CRYSTAL_PREFERENCES), { ...manual, growthSpeedAuto: false });
    const fixedDefault = { ...DEFAULT_CRYSTAL_PREFERENCES, growthSpeedAuto: false };
    assert.deepEqual(restorePatternGrowthPreference(fixedDefault, DEFAULT_CRYSTAL_PREFERENCES), fixedDefault);
});

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

test('recursive spirals wait for 21 and branch through 34 and 55 on a 249-cell board', () => {
    for (let orientation = 0; orientation < 4; orientation++) {
        const { state } = simulate(249, orientation, 'recursive');
        const { primary, branches } = getFibonacciBranchSchedule(249, state);
        const rootMilestones = primary.squares.filter(square => [21, 34, 55].includes(square.side));
        assert.deepEqual(branches.filter(branch => branch.depth === 1).map(branch => branch.start),
            rootMilestones.map(square => square.frame));
        assert(branches.some(branch => branch.depth >= 3), 'offspring branch recursively');
        assert(new Set(branches.map(branch => branch.origin)).size === branches.length);
        for (const { start } of branches) {
            assert(branches.filter(branch => branch.start <= start && branch.end > start).length <= 3);
        }
        const earlyBoard = simulate(13, orientation, 'recursive');
        assert.equal(getFibonacciBranchSchedule(13, earlyBoard.state).branches.length, 0);
    }
});

test('recursive growth advances overlaps once and resumes from checkpoints through wraparound', () => {
    const sim = simulate(249, 0, 'recursive');
    const { primary, branches } = getFibonacciBranchSchedule(249, sim.state);
    const first = branches[0];
    sim.currentBoardState[sim.state.origin].isGold = true;
    sim.currentBoardState[first.origin].k = sim.currentBoardState[first.origin].v = 120;
    for (let frame = 1; frame < first.start; frame++) sim.step();
    assert.equal(sim.currentBoardState[first.origin].k, 120);
    sim.step();
    assert.equal(sim.currentBoardState[first.origin].k, 121);
    assert.equal(sim.currentBoardState[sim.state.origin].k, 0);
    const overlapFrame = branches[2].start + 220;
    while (sim.state.frame < overlapFrame) sim.step();
    const snapshot = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    const board = structuredClone(sim.currentBoardState);
    const before = board.map(cell => cell.k);
    sim.step();
    runFibonacciGeneration({ currentBoardState: board, currentPalette: sim.currentPalette }, snapshot);
    assert.deepEqual(snapshot, sim.state);
    assert.deepEqual(board, sim.currentBoardState);
    assert(before.every((color, index) => [color, color + 1].includes(board[index].k)));

    while (sim.state.frame < primary.frameEnds.length - 1) sim.step();
    const atFullBoard = sim.currentBoardState.map(cell => cell.k);
    sim.step();
    assert.equal(sim.state.frame, 1);
    assert.equal(sim.state.filledAt, sim.state.generation);
    assert.equal(sim.state.outgoing, undefined);
    assert(sim.currentBoardState.every((cell, index) => cell.k === atFullBoard[index] + Number(!cell.isGold)));
    while (sim.state.frame < 40) sim.step();
    const next = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    const nextBoard = structuredClone(sim.currentBoardState);
    const colors = nextBoard.map(cell => cell.k);
    for (let frame = 0; frame < 3; frame++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: nextBoard, currentPalette: sim.currentPalette }, next);
    }
    assert.deepEqual(next, sim.state);
    assert.deepEqual(nextBoard, sim.currentBoardState);
    assert(nextBoard.every((cell, index) => cell.isGold ? cell.k === colors[index] : [2, 3].includes(cell.k - colors[index])));
    assert(nextBoard.some((cell, index) => cell.k - colors[index] === 2), 'background has a slower cadence');
    assert(nextBoard.some((cell, index) => cell.k - colors[index] === 3), 'new spirals keep their full pace');
    setFibonacciMode(sim.state, 'restart');
    assert.equal(sim.state.filledAt, undefined);
    assert.equal(validateFibonacciState(sim.state).version, 8);
});

test('version 8 recursive recordings retain the original strip handoff', () => {
    const sim = simulate(45, 3, 'recursive', 100, 0, 8);
    const end = getFibonacciBranchSchedule(45, sim.state).primary.frameEnds.length - 1;
    while (sim.state.frame < end) sim.step();
    sim.step();
    assert.equal(sim.state.frame, 1);
    assert(sim.state.outgoing);
    assert.equal(sim.state.filledAt, undefined);

    const replay = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    const board = structuredClone(sim.currentBoardState);
    for (let i = 0; i < end && replay.outgoing; i++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: board, currentPalette: sim.currentPalette }, replay);
    }
    assert.equal(replay.outgoing, undefined);
    assert.deepEqual(replay, sim.state);
    assert.deepEqual(board, sim.currentBoardState);
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

test('crystal tuning changes growth without jumping the front and records the exact result', () => {
    const current = simulate(63, 1, 'crystal');
    const baseline = simulate(63, 1, 'crystal');
    current.state.crystalSettings = { growthSpeed: 50, tileSize: 1, crystalEdges: 0 };
    for (let frame = 0; frame < 20; frame++) {
        current.step();
        baseline.step();
    }
    assert.equal(current.state.crystalFront, 1000);
    assert(current.occupied().length < baseline.occupied().length / 2);
    current.state.crystalSettings = { growthSpeed: 200, tileSize: 3, crystalEdges: 175 };
    const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(current.state)));
    const restored = structuredClone(current.currentBoardState);
    current.step();
    assert.equal(current.state.crystalFront, 1200);
    assert(current.occupied().length < baseline.occupied().length);
    runFibonacciGeneration({ currentBoardState: restored, currentPalette: current.currentPalette }, checkpoint);
    assert.deepEqual(checkpoint, current.state);
    assert.deepEqual(restored, current.currentBoardState);
    assert.throws(() => validateFibonacciState({ ...checkpoint, crystalFront: -1 }));
    assert.throws(() => validateFibonacciState({ ...checkpoint, crystalSettings: { ...checkpoint.crystalSettings, crystalEdges: 201 } }));
});

test('crystal checkpoints without tuning retain Classic while new settings use Fine Grain', () => {
    const legacy = simulate(63, 1, 'crystal');
    const classic = simulate(63, 1, 'crystal');
    const fine = simulate(63, 1, 'crystal');
    classic.state.crystalSettings = CLASSIC_CRYSTAL_SETTINGS;
    fine.state.crystalSettings = DEFAULT_CRYSTAL_SETTINGS;
    for (let frame = 0; frame < 24; frame++) {
        legacy.step();
        classic.step();
        fine.step();
    }
    assert.deepEqual(legacy.currentBoardState, classic.currentBoardState);
    assert(fine.occupied().length < classic.occupied().length);
});

test('each Fibonacci map has distinct growth and restores exactly with edited settings', () => {
    const patterns = new Set();
    for (const mode of FIBONACCI_MAPS) {
        const sim = simulate(63, 2, mode, 100);
        for (let frame = 0; frame < 28; frame++) sim.step();
        assert(sim.occupied().length > 0 && sim.occupied().length < 63 ** 2, mode);
        patterns.add(sim.currentBoardState.map(cell => cell.k).join(','));
        const former = sim.state.map;
        if (mode === 'voronoi') {
            seedFibonacciMap(sim.state, [{ i: 18 }]);
            assert.deepEqual(former.seeds, []);
            assert.deepEqual(sim.state.map.seeds, [18]);
            seedFibonacciMap(sim.state, [{ i: 18 }]);
            assert.deepEqual(sim.state.map.seeds, [18]);
        }
        sim.state.map = { ...sim.state.map, settings: { ...sim.state.map.settings, growthSpeed: 200 } };
        const replay = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
        const board = structuredClone(sim.currentBoardState);
        sim.currentBoardState[0].isGold = board[0].isGold = true;
        for (let frame = 0; frame < 140; frame++) {
            sim.step();
            runFibonacciGeneration({ currentBoardState: board, currentPalette: sim.currentPalette }, replay);
        }
        // The gaps in a circle packing leave the original background visible.
        if (mode !== 'apollonian') assert(sim.currentBoardState.every((cell, i) => i === 0 || cell.k > 0), mode);
        assert.equal(sim.currentBoardState[0].k, 0);
        assert.deepEqual(replay, sim.state);
        assert.deepEqual(board, sim.currentBoardState);
        setFibonacciMode(sim.state, 'restart');
        assert.equal(sim.state.map, undefined);
        assert.deepEqual(validateFibonacciState(sim.state), sim.state);
    }
    assert.equal(patterns.size, FIBONACCI_MAPS.length);
});

test('Tangent Circles opens with three different footprints and resumes seeded growth exactly', () => {
    const size = 89;
    const sim = simulate(size, 0, 'apollonian', 100, 24);
    const differentLayout = simulate(size, 0, 'apollonian', 100, 72378818);
    for (let frame = 0; frame < 36; frame++) { sim.step(); differentLayout.step(); }
    const opening = sim.occupied();
    assert.equal(sim.state.map.version, 5);
    assert(opening.length > 0 && opening.length < size ** 2 / 2);
    assert.notDeepEqual(opening, differentLayout.occupied());
    const remaining = new Set(opening);
    const areas = [];
    while (remaining.size) {
        const component = [remaining.values().next().value];
        remaining.delete(component[0]);
        for (const index of component) {
            const neighbors = [index - size, index + size];
            if (index % size > 0) neighbors.push(index - 1);
            if (index % size < size - 1) neighbors.push(index + 1);
            for (const neighbor of neighbors) if (remaining.delete(neighbor)) component.push(neighbor);
        }
        areas.push(component.length);
    }
    assert.equal(areas.length, 3);
    assert.equal(new Set(areas).size, 3);

    const board = structuredClone(sim.currentBoardState);
    const checkpoint = validateFibonacciState(JSON.parse(JSON.stringify(sim.state)));
    assert.equal(checkpoint.map.layoutSeed, 24);
    for (let frame = 0; frame < 360; frame++) {
        sim.step();
        runFibonacciGeneration({ currentBoardState: board, currentPalette: sim.currentPalette }, checkpoint);
    }
    assert.deepEqual(checkpoint, sim.state);
    assert.deepEqual(board, sim.currentBoardState);
    const packed = sim.occupied();
    assert(packed.length > size ** 2 * .9 && packed.length < size ** 2);
    assert([0, size - 1, size * (size - 1), size ** 2 - 1].every(index => sim.currentBoardState[index].k > 0));
    const before = structuredClone(board);
    for (let frame = 0; frame < 20; frame++) sim.step();
    assert(opening.some(index => sim.currentBoardState[index].k > before[index].k));
    assert.throws(() => validateFibonacciState({ ...checkpoint, map: { ...checkpoint.map, layoutSeed: -1 } }), /layout seed/);
});

test('Tangent Circles grows into all four corners without changing the original circles', () => {
    for (const [size, seed, circleMinimum] of [[9, 24, 3], [21, 72378818, 3], [89, 0, 2], [149, 0xffffffff, 2]]) {
        const previous = simulate(size, 2, 'apollonian', 100, seed);
        previous.state.map.version = 2;
        const current = simulate(size, 2, 'apollonian', 100, seed);
        current.state.map.version = 3;
        for (const sim of [previous, current]) sim.state.map.settings.circleMinimum = circleMinimum;
        for (let frame = 0; frame < 40; frame++) { previous.step(); current.step(); }
        assert.deepEqual(previous.currentBoardState, current.currentBoardState);

        for (let frame = 0; frame < 300; frame++) { previous.step(); current.step(); }
        for (const index of previous.occupied()) {
            assert.equal(current.currentBoardState[index].k, previous.currentBoardState[index].k);
        }
        for (const index of [0, size - 1, size * (size - 1), size ** 2 - 1]) {
            assert(current.currentBoardState[index].k > 0, `corner ${index} on ${size}×${size}`);
        }
        assert(current.occupied().length > previous.occupied().length);
    }
});

test('Tangent Circles recordings from all previous versions keep their packing and timing', () => {
    const source = createFibonacciState(45, 2, 'apollonian', 95, 87324);
    source.map.settings = { growthSpeed: 50, circleMinimum: 2, crystalEdges: 100 };
    const { layoutSeed, ...map } = source.map;
    const state = validateFibonacciState({ ...source, map: { ...map, version: 1 } });
    const currentBoardState = Array.from({ length: 45 ** 2 }, () => ({ k: 0, v: 0 }));
    for (let frame = 0; frame < 120; frame++) {
        runFibonacciGeneration({ currentBoardState, currentPalette: Array(23) }, state);
    }
    const hash = createHash('sha256').update(Buffer.from(currentBoardState.map(({ k }) => k))).digest('hex');
    assert.equal(hash, '3ca97f226b6f941b07e2f3354a2e21cd330e2a24e994dd55309a4cfecbae0a19');
    for (const [version, expectedHash] of [
        [2, 'aa05c25ac18330f2605e7820742f1e229d28daca67f72eb1c87c276266990e25'],
        [3, 'a5613f6d19cb99e49e414d57e6a28db6944166c5b8ca846b68e8eeac714ca072'],
        [4, 'a81f1389799defa1e13b7df89c15f1c4fd9901f5016d21b6b4902fa0724f4637']
    ]) {
        const seeded = validateFibonacciState({ ...source, map: { ...source.map, version } });
        for (const cell of currentBoardState) cell.k = cell.v = 0;
        for (let frame = 0; frame < 240; frame++) {
            runFibonacciGeneration({ currentBoardState, currentPalette: Array(23) }, seeded);
        }
        const seededHash = createHash('sha256').update(Buffer.from(currentBoardState.map(({ k }) => k))).digest('hex');
        assert.equal(seededHash, expectedHash);
    }
});

test('Voronoi drawing adds a bounded, deterministic site and changes the evolving pattern', () => {
    const seeded = simulate(39, 0, 'voronoi', 100);
    const original = simulate(39, 0, 'voronoi', 100);
    seedFibonacciMap(seeded.state, [{ i: 1 }, { i: 120 }, { i: 90 }]);
    assert.deepEqual(seeded.state.map.seeds, [120]);
    for (let frame = 0; frame < 40; frame++) { seeded.step(); original.step(); }
    assert.notDeepEqual(seeded.currentBoardState, original.currentBoardState);
    assert.throws(() => validateFibonacciState({ ...seeded.state, map: { ...seeded.state.map, seeds: [120, 120] } }));
});
