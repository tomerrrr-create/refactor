export const FIBONACCI_SEQUENCE_MODES = Object.freeze(['sequence', 'primes']);
export const FIBONACCI_SEQUENCE_INTERVAL_RANGE = Object.freeze([0, 327, 1]);
export const isSequenceMode = mode => FIBONACCI_SEQUENCE_MODES.includes(mode);

export function isSequenceInterval(value) {
    return Number.isInteger(value) && value >= 0 && value <= FIBONACCI_SEQUENCE_INTERVAL_RANGE[1];
}

const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const overlapFrames = 3;
const slowTrailAfter = 8;
const trailDuration = 16;
const revealFrames = n => Math.min(n, 24);
const intervalFor = state => state.sequenceInterval || state.n;
let cachedPlan;
const fadeRuns = new WeakMap();
const fadeOpacity = {
    sequence: Array.from({ length: trailDuration }, (_, age) => {
        const t = age / trailDuration;
        return 1 - t * t * (3 - 2 * t);
    }),
    primes: Array.from({ length: trailDuration }, (_, age) => (1 - age / trailDuration) ** 2)
};

export function getSequenceFadeOverlay(state) {
    if (!state || state.sequenceFade === undefined || !isSequenceMode(state.mode)) return null;
    let fade = fadeRuns.get(state);
    if (fade) return fade;
    const steps = new Uint32Array(state.n ** 2);
    const ages = new Uint8Array(steps.length);
    const indices = [];
    for (let i = 0; i < state.sequenceFade.length; i += 3) {
        const [index, step, age] = state.sequenceFade.slice(i, i + 3);
        steps[index] = step;
        ages[index] = age;
        indices.push(index);
    }
    fade = { steps, ages, indices, nextIndices: [], opacity: fadeOpacity[state.mode] };
    fadeRuns.set(state, fade);
    return fade;
}

export function snapshotFibonacciState(state) {
    const fade = getSequenceFadeOverlay(state);
    if (!fade) return { ...state };
    const { steps, ages, indices } = fade;
    const sequenceFade = [];
    for (const index of indices) sequenceFade.push(index, steps[index], ages[index]);
    return { ...state, sequenceFade };
}

function validateSequenceFade(data, size) {
    if (!Array.isArray(data) || data.length % 3 || data.length > size * 3) {
        throw new Error('Invalid Fibonacci fade');
    }
    const seen = new Set();
    for (let i = 0; i < data.length; i += 3) {
        const index = data[i], step = data[i + 1], age = data[i + 2];
        if (!Number.isInteger(index) || index < 0 || index >= size || seen.has(index) ||
            step !== (step >>> 0) || step === 0 || !Number.isInteger(age) || age < 0 || age >= trailDuration) {
            throw new Error('Invalid Fibonacci fade cell');
        }
        seen.add(index);
    }
    return [...data];
}

function getSequencePlan(n) {
    if (cachedPlan?.n === n) return cachedPlan;
    // Start at the upper-left center on even boards. Skip off-board steps
    // along the final ring so every cell still receives consecutive numbers.
    const size = n * n;
    const cells = new Uint32Array(size);
    let row = Math.floor((n - 1) / 2), col = row;
    cells[0] = row * n + col;
    let count = 1;
    for (let leg = 0; count < size; leg++) {
        const [dr, dc] = directions[leg % directions.length];
        const length = 1 + (leg >> 1);
        for (let step = 0; step < length && count < size; step++) {
            row += dr;
            col += dc;
            if (row >= 0 && row < n && col >= 0 && col < n) cells[count++] = row * n + col;
        }
    }

    const sequence = [];
    for (let a = 1, b = 2; a <= size; [a, b] = [b, a + b]) sequence.push(a - 1);
    const primes = [];
    const composite = new Uint8Array(size + 1);
    for (let value = 2; value <= size; value++) {
        if (composite[value]) continue;
        primes.push(value - 1);
        for (let multiple = value * value; multiple <= size; multiple += value) composite[multiple] = 1;
    }
    cachedPlan = { n, cells, sequence, primes, visited: new Uint8Array(size) };
    return cachedPlan;
}

export function resetSequenceCursor(state, interval) {
    fadeRuns.delete(state);
    delete state.sequenceTrailFrames;
    Object.assign(state, { sequenceInterval: interval, sequenceOffset: 0, sequenceElapsed: 0, sequenceAge: 0, sequenceShifted: false, sequenceFade: [] });
}

export function clearSequenceCursor(state) {
    delete state.sequenceInterval;
    delete state.sequenceOffset;
    delete state.sequenceElapsed;
    delete state.sequenceAge;
    delete state.sequenceShifted;
    delete state.sequenceTrailFrames;
    delete state.sequenceFade;
    fadeRuns.delete(state);
}

export function setSequenceInterval(state, interval) {
    state.sequenceInterval = interval;
    state.sequenceElapsed = Math.min(state.sequenceElapsed, intervalFor(state) - 1);
}

export function validateSequenceCursor(state) {
    const { n, sequenceInterval, sequenceOffset, sequenceElapsed, sequenceAge, sequenceShifted } = state;
    if (!isSequenceInterval(sequenceInterval) || !Number.isInteger(sequenceOffset) || sequenceOffset < 0 || sequenceOffset >= n ** 2 ||
        !Number.isInteger(sequenceElapsed) || sequenceElapsed < 0 || sequenceElapsed >= intervalFor(state) ||
        !Number.isInteger(sequenceAge) || sequenceAge < 0 || sequenceAge > revealFrames(n) ||
        typeof sequenceShifted !== 'boolean') {
        throw new Error('Invalid Fibonacci sequence cursor');
    }
    const cursor = { sequenceInterval, sequenceOffset, sequenceElapsed, sequenceAge, sequenceShifted };
    if (state.sequenceFade !== undefined) {
        cursor.sequenceFade = validateSequenceFade(state.sequenceFade, n ** 2);
        return cursor;
    }
    // Missing history marks a recording from before the trails were introduced.
    if (state.sequenceTrailFrames === undefined) return cursor;
    const maxCount = getSequencePlan(n)[state.mode].length;
    if (!Array.isArray(state.sequenceTrailFrames) || state.sequenceTrailFrames.length > trailDuration) {
        throw new Error('Invalid Fibonacci sequence trail');
    }
    cursor.sequenceTrailFrames = state.sequenceTrailFrames.map(frame => {
        if (!Array.isArray(frame) || frame.length !== 3 ||
            !Number.isInteger(frame[0]) || frame[0] < 0 || frame[0] >= n ** 2 ||
            !frame.slice(1).every(count => Number.isInteger(count) && count >= 0 && count <= maxCount)) {
            throw new Error('Invalid Fibonacci sequence trail frame');
        }
        return [...frame];
    });
    return cursor;
}

export function runNumberSequence(board, colorCount, state) {
    const { n, mode, sequenceOffset, sequenceElapsed } = state;
    const { cells, visited, [mode]: numbers } = getSequencePlan(n);
    const visible = Math.ceil(numbers.length * Math.min(1, (state.sequenceAge + 1) / revealFrames(n)));
    const interval = intervalFor(state);
    const overlap = Math.min(interval, overlapFrames);
    const transitioning = state.sequenceShifted && sequenceElapsed < overlap;
    const footprint = [sequenceOffset,
        transitioning ? Math.ceil(visible * (overlap - sequenceElapsed) / overlap) : 0,
        transitioning ? Math.ceil(visible * (sequenceElapsed + 1) / overlap) : visible];
    const fade = getSequenceFadeOverlay(state);
    const visit = (offset, count, advancesColor) => {
        for (let rank = 0; rank < count; rank++) {
            const index = cells[(numbers[rank] + offset) % cells.length];
            if (visited[index]) continue;
            // The newest footprint owns the cell on this generation, even
            // when its trail age does not call for a color change.
            visited[index] = 1;
            const cell = board[index];
            if (cell.isGold) continue;
            if (fade) {
                fade.steps[index] = ((fade.steps[index] + 1) >>> 0) || 1;
                fade.ages[index] = 0;
                fade.nextIndices.push(index);
            } else if (advancesColor) cell.k = cell.v = (cell.k + 1) % colorCount;
        }
    };
    const visitFootprint = ([offset, outgoing, incoming], advancesColor) => {
        if (outgoing) visit((offset + cells.length - 1) % cells.length, outgoing, advancesColor);
        visit(offset, incoming, advancesColor);
    };
    visited.fill(0);
    visitFootprint(footprint, true);

    if (fade) {
        const { steps, ages, indices, nextIndices } = fade;
        for (const index of indices) {
            if (board[index].isGold) {
                steps[index] = 0;
                continue;
            }
            if (visited[index]) continue;
            const age = ++ages[index];
            if (age >= trailDuration) {
                steps[index] = 0;
                continue;
            }
            if (age % (age <= slowTrailAfter ? 2 : 4) === 0) steps[index] = ((steps[index] + 1) >>> 0) || 1;
            nextIndices.push(index);
        }
        fade.indices = nextIndices;
        fade.nextIndices = indices;
        indices.length = 0;
    } else if (state.sequenceTrailFrames) {
        const frames = state.sequenceTrailFrames;
        let newest = footprint;
        for (let i = frames.length - 1; i >= 0; i--) {
            const frame = frames[i];
            if (frame[0] === newest[0] && frame[1] === newest[1] && frame[2] === newest[2]) continue;
            const age = frames.length - i;
            visitFootprint(frame, age % (age <= slowTrailAfter ? 2 : 4) === 0);
            newest = frame;
        }

        // Keep compact footprint descriptors and replace the array, so Undo
        // and replay checkpoints never share a mutable queue with the engine.
        state.sequenceTrailFrames = [...frames.slice(1 - trailDuration), footprint];
    }
    state.sequenceAge = Math.min(state.sequenceAge + 1, revealFrames(n));
    state.sequenceElapsed++;
    if (state.sequenceElapsed === interval) {
        state.sequenceElapsed = 0;
        state.sequenceOffset = (sequenceOffset + 1) % cells.length;
        state.sequenceShifted = true;
    }
    return board;
}
