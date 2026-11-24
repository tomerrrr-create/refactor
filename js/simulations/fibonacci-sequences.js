export const FIBONACCI_SEQUENCE_MODES = Object.freeze(['sequence', 'primes']);
export const FIBONACCI_SEQUENCE_INTERVAL_RANGE = Object.freeze([0, 327, 1]);
export const isSequenceMode = mode => FIBONACCI_SEQUENCE_MODES.includes(mode);

export function isSequenceInterval(value) {
    return Number.isInteger(value) && value >= 0 && value <= FIBONACCI_SEQUENCE_INTERVAL_RANGE[1];
}

const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const overlapFrames = 3;
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
    cachedPlan = { n, cells, sequence, primes, visited: new Uint8Array(size) };
    return cachedPlan;
}

export function resetSequenceCursor(state, interval) {
    Object.assign(state, { sequenceInterval: interval, sequenceOffset: 0, sequenceElapsed: 0, sequenceAge: 0, sequenceShifted: false });
}

export function clearSequenceCursor(state) {
    delete state.sequenceInterval;
    delete state.sequenceOffset;
    delete state.sequenceElapsed;
    delete state.sequenceAge;
    delete state.sequenceShifted;
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
    return { sequenceInterval, sequenceOffset, sequenceElapsed, sequenceAge, sequenceShifted };
}

export function runNumberSequence(board, colorCount, state) {
    const { n, mode, sequenceOffset, sequenceElapsed } = state;
    const { cells, visited, [mode]: numbers } = getSequencePlan(n);
    const visible = Math.ceil(numbers.length * Math.min(1, (state.sequenceAge + 1) / revealFrames(n)));
    const interval = intervalFor(state);
    const overlap = Math.min(interval, overlapFrames);
    const transitioning = state.sequenceShifted && sequenceElapsed < overlap;
    const advance = (offset, count) => {
        for (let rank = 0; rank < count; rank++) {
            const index = cells[(numbers[rank] + offset) % cells.length];
            if (visited[index]) continue;
            visited[index] = 1;
            const cell = board[index];
            if (!cell.isGold) cell.k = cell.v = (cell.k + 1) % colorCount;
        }
    };
    visited.fill(0);
    if (transitioning) {
        const previous = (sequenceOffset + cells.length - 1) % cells.length;
        advance(previous, Math.ceil(visible * (overlap - sequenceElapsed) / overlap));
    }
    advance(sequenceOffset, transitioning ? Math.ceil(visible * (sequenceElapsed + 1) / overlap) : visible);
    state.sequenceAge = Math.min(state.sequenceAge + 1, revealFrames(n));
    state.sequenceElapsed++;
    if (state.sequenceElapsed === interval) {
        state.sequenceElapsed = 0;
        state.sequenceOffset = (sequenceOffset + 1) % cells.length;
        state.sequenceShifted = true;
    }
    return board;
}
