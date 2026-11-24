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
const ribbonTiming = {
    sequence: { length: 6, period: 16, delay: 2 },
    primes: { length: 3, period: 18, delay: 3 }
};
const linePulseStart = 4;
const linePulseLength = 11;
const linePulseStep = 3;
const linePulsePeriod = 32;
const revealFrames = n => Math.min(n, 24);
const intervalFor = state => state.sequenceInterval || state.n;
let cachedPlan;

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
    // Even boards skip over some out-of-bounds cells. Cap any tail at
    // that gap so the visible line never joins two nonadjacent tiles.
    const contiguous = new Uint8Array(size);
    for (let i = 1; i < size; i++) {
        const a = cells[i - 1], b = cells[i];
        const distance = Math.abs(a % n - b % n) + Math.abs(Math.floor(a / n) - Math.floor(b / n));
        if (distance === 1) contiguous[i] = Math.min(contiguous[i - 1] + 1, linePulseLength);
    }
    cachedPlan = { n, cells, sequence, primes, contiguous, visited: new Uint8Array(size) };
    return cachedPlan;
}

export function resetSequenceCursor(state, interval) {
    clearSequenceCursor(state);
    Object.assign(state, { sequenceInterval: interval, sequenceOffset: 0, sequenceElapsed: 0, sequenceAge: 0,
        sequenceShifted: false });
    if (state.mode === 'sequence') Object.assign(state, { sequenceLineShifts: 0, sequenceLinePhase: 0 });
    else Object.assign(state, { sequenceTailLength: 0, sequenceTailPhase: 0 });
}

export function clearSequenceCursor(state) {
    delete state.sequenceInterval;
    delete state.sequenceOffset;
    delete state.sequenceElapsed;
    delete state.sequenceAge;
    delete state.sequenceShifted;
    delete state.sequenceTrailFrames;
    delete state.sequenceTailLength;
    delete state.sequenceTailPhase;
    delete state.sequenceLineShifts;
    delete state.sequenceLinePhase;
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
    if (state.sequenceLineShifts !== undefined || state.sequenceLinePhase !== undefined) {
        const { sequenceLineShifts, sequenceLinePhase } = state;
        if (state.mode !== 'sequence' || !Number.isInteger(sequenceLineShifts) || sequenceLineShifts < 0 || sequenceLineShifts > linePulseLength ||
            !Number.isInteger(sequenceLinePhase) || sequenceLinePhase < 0 || sequenceLinePhase >= linePulsePeriod) {
            throw new Error('Invalid Fibonacci line pulse');
        }
        return { ...cursor, sequenceLineShifts, sequenceLinePhase };
    }
    if (state.sequenceTailLength !== undefined || state.sequenceTailPhase !== undefined) {
        const { length, period } = ribbonTiming[state.mode];
        const { sequenceTailLength, sequenceTailPhase } = state;
        if (!Number.isInteger(sequenceTailLength) || sequenceTailLength < 0 || sequenceTailLength > length ||
            !Number.isInteger(sequenceTailPhase) || sequenceTailPhase < 0 || sequenceTailPhase >= period) {
            throw new Error('Invalid Fibonacci sequence tail');
        }
        return { ...cursor, sequenceTailLength, sequenceTailPhase };
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
    const { cells, visited, contiguous, [mode]: numbers } = getSequencePlan(n);
    const visible = Math.ceil(numbers.length * Math.min(1, (state.sequenceAge + 1) / revealFrames(n)));
    const interval = intervalFor(state);
    const overlap = Math.min(interval, overlapFrames);
    const transitioning = state.sequenceShifted && sequenceElapsed < overlap;
    const footprint = [sequenceOffset,
        transitioning ? Math.ceil(visible * (overlap - sequenceElapsed) / overlap) : 0,
        transitioning ? Math.ceil(visible * (sequenceElapsed + 1) / overlap) : visible];
    const visit = (offset, count, advancesColor) => {
        for (let rank = 0; rank < count; rank++) {
            const index = cells[(numbers[rank] + offset) % cells.length];
            if (visited[index]) continue;
            // The newest footprint owns the cell on this generation, even
            // when its trail age does not call for a color change.
            visited[index] = 1;
            const cell = board[index];
            if (advancesColor && !cell.isGold) cell.k = cell.v = (cell.k + 1) % colorCount;
        }
    };
    const visitFootprint = ([offset, outgoing, incoming], advancesColor) => {
        if (outgoing) visit((offset + cells.length - 1) % cells.length, outgoing, advancesColor);
        visit(offset, incoming, advancesColor);
    };
    visited.fill(0);
    visitFootprint(footprint, true);

    if (state.sequenceLinePhase !== undefined) {
        const phase = state.sequenceLinePhase;
        const distance = linePulseStart + phase / linePulseStep;
        if (phase % linePulseStep === 0 && distance <= state.sequenceLineShifts) {
            for (let rank = 0; rank < footprint[2]; rank++) {
                const head = (numbers[rank] + sequenceOffset) % cells.length;
                if (distance > contiguous[head]) continue;
                const index = cells[head - distance];
                if (visited[index]) continue;
                visited[index] = 1;
                const cell = board[index];
                // Keep blank cells and the light crest intact. The pulse only
                // advances pigments in a part of the line that already formed.
                if (!cell.isGold && cell.k > 0 && cell.k < colorCount - 1) cell.k = cell.v = cell.k + 1;
            }
        }
        state.sequenceLinePhase = (phase + 1) % linePulsePeriod;
    } else if (state.sequenceTailLength !== undefined) {
        const { period, delay } = ribbonTiming[mode];
        // A wave starts beside the head and travels one cell at a time.
        // The nearest head owns shared tail cells, while active heads always win.
        for (let distance = 1; distance <= state.sequenceTailLength; distance++) {
            const due = state.sequenceTailPhase === (distance - 1) * delay;
            for (let rank = 0; rank < footprint[2]; rank++) {
                const head = (numbers[rank] + sequenceOffset) % cells.length;
                if (distance > contiguous[head]) continue;
                const index = cells[head - distance];
                if (visited[index]) continue;
                visited[index] = 1;
                const cell = board[index];
                if (due && !cell.isGold) cell.k = cell.v = (cell.k + 1) % colorCount;
            }
        }
        state.sequenceTailPhase = (state.sequenceTailPhase + 1) % period;
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
        if (state.sequenceLineShifts !== undefined && state.sequenceAge === revealFrames(n)) {
            state.sequenceLineShifts = Math.min(state.sequenceLineShifts + 1, linePulseLength);
        }
        if (state.sequenceTailLength !== undefined) {
            state.sequenceTailLength = Math.min(state.sequenceTailLength + 1, ribbonTiming[mode].length);
        }
    }
    return board;
}
