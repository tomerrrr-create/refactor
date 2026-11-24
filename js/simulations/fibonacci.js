export const FIBONACCI_MODES = Object.freeze(['restart', 'continuous']);
export const DEFAULT_FIBONACCI_COLOR_ADVANCE = 90;
export const FIBONACCI_COLOR_ADVANCE_RANGE = Object.freeze([60, 100, 5]);

export function isFibonacciColorAdvance(value) {
    const [min, max, step] = FIBONACCI_COLOR_ADVANCE_RANGE;
    return Number.isInteger(value) && value >= min && value <= max && (value - min) % step === 0;
}
const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const HANDOFF_HOLD = 3;
// A handoff needs the two most recent growth plans.
const plans = [];
let colorGroups;

export function createFibonacciState(n, orientation = 0, mode = FIBONACCI_MODES[0],
    colorAdvance = DEFAULT_FIBONACCI_COLOR_ADVANCE, seed = 0) {
    const center = Math.floor((n - 1) / 2);
    return { version: 7, n, orientation, mode, frame: 0, origin: center * n + center, colorAdvance, seed, generation: 0 };
}

const wrap = (coordinate, n) => (coordinate % n + n) % n;

function addSquares(n, origin, orientation, addBatch) {
    let top = Math.floor(origin / n), bottom = top, left = origin % n, right = left;
    let lastCell = origin;
    if (n === 1) return { origin, orientation };
    for (let direction = orientation; ; direction = (direction + 1) % directions.length) {
        const [dr, dc] = directions[direction];
        const side = dr ? right - left + 1 : bottom - top + 1;
        const edge = dr > 0 ? bottom : dr < 0 ? top : dc > 0 ? right : left;
        const end = edge + (dr || dc) * side;
        // Keep the Fibonacci bounds in unwrapped space. Limit both axes to
        // one pass across the board so an oversized square can finish filling it.
        const depth = dr ? bottom - top + 1 : right - left + 1;
        const strips = Math.min(side, n - depth);
        const width = Math.min(side, n);
        for (let strip = 1; strip <= strips; strip++) {
            const batch = [];
            for (let along = 0; along < width; along++) {
                const row = dr ? edge + dr * strip : top + along;
                const column = dc ? edge + dc * strip : left + along;
                lastCell = wrap(row, n) * n + wrap(column, n);
                batch.push(lastCell);
            }
            addBatch(batch);
        }
        if (dr > 0) bottom = end;
        if (dr < 0) top = end;
        if (dc > 0) right = end;
        if (dc < 0) left = end;
        if (bottom - top + 1 >= n && right - left + 1 >= n) {
            return { origin: lastCell, orientation: (direction + 1) % directions.length };
        }
    }
}

function getPlan(n, { orientation, origin }) {
    const cached = plans.find(plan => plan.n === n && plan.orientation === orientation && plan.origin === origin);
    if (cached) return cached;

    const cells = [origin];
    const frameEnds = [0, 1];
    const stripEnds = [0, 1];
    const nextRound = addSquares(n, origin, orientation, batch => {
        if (frameEnds.length > 2) frameEnds.push(cells.length, cells.length, cells.length);
        cells.push(...batch);
        frameEnds.push(cells.length);
        stripEnds.push(cells.length);
    });

    const rank = new Int32Array(n * n);
    cells.forEach((cell, index) => { rank[cell] = index + 1; });
    const visibleFrame = frameEnds.findIndex(count => count >= cells.length * .01);
    const handoffEnd = Math.min(frameEnds.length - 1, HANDOFF_HOLD + Math.max(24, visibleFrame));
    const plan = { n, orientation, origin, cells, frameEnds, stripEnds, rank, nextRound, handoffEnd };
    if (plans.length === 2) plans.shift();
    plans.push(plan);
    return plan;
}

function validateOrigin(n, { origin, orientation }) {
    if (!Number.isInteger(origin) || origin < 0 || origin >= n ** 2 ||
        !Number.isInteger(orientation) || orientation < 0 || orientation >= directions.length) {
        throw new Error('Invalid Fibonacci origin');
    }
    return { origin, orientation };
}

export function validateFibonacciState(state) {
    if (state?.version !== 7 || !Number.isSafeInteger(state.n) || state.n < 1 || state.n > 327 ||
        !FIBONACCI_MODES.includes(state.mode) || !Number.isSafeInteger(state.frame) ||
        state.frame < 0 || state.frame > 4 * state.n ** 2 ||
        !isFibonacciColorAdvance(state.colorAdvance) ||
        state.seed !== (state.seed >>> 0) || state.generation !== (state.generation >>> 0)) {
        throw new Error('Invalid Fibonacci checkpoint');
    }
    const { n, mode, frame, colorAdvance, seed, generation } = state;
    const { origin, orientation } = validateOrigin(n, state);
    const copy = { version: 7, n, orientation, mode, frame, origin, colorAdvance, seed, generation };
    if (!frame && state.outgoing === undefined) return copy;
    const plan = getPlan(n, copy);
    if (frame >= plan.frameEnds.length) throw new Error('Invalid Fibonacci growth frame');
    if (state.outgoing !== undefined) {
        if (!state.outgoing || frame < 1 || frame >= plan.handoffEnd) throw new Error('Invalid Fibonacci handoff');
        const outgoing = validateOrigin(n, state.outgoing);
        const { nextRound } = getPlan(n, outgoing);
        if (nextRound.origin !== copy.origin || nextRound.orientation !== copy.orientation) {
            throw new Error('Invalid Fibonacci handoff origin');
        }
        copy.outgoing = outgoing;
    }
    return copy;
}

function getColorAdvanceGroups({ n, colorAdvance, seed, generation }) {
    if (colorAdvance === 100) return null;
    if (colorGroups?.n !== n) {
        // Each 2×2 patch shares one decision. Partial patches at the edges
        // use the same rule on odd-sized boards.
        const width = Math.ceil(n / 2);
        const cellGroups = new Uint16Array(n * n);
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                cellGroups[row * n + col] = (row >> 1) * width + (col >> 1);
            }
        }
        colorGroups = { n, cellGroups, advances: new Uint8Array(width * width) };
    }
    const { advances } = colorGroups;
    const salt = Math.imul(generation, 0x9e3779b9) ^ seed;
    const threshold = colorAdvance / 100 * 2 ** 32;
    for (let group = 0; group < advances.length; group++) {
        let bits = Math.imul(group ^ salt, 0x85ebca6b);
        bits = Math.imul(bits ^ (bits >>> 16), 0xc2b2ae35);
        advances[group] = ((bits ^ (bits >>> 13)) >>> 0) < threshold ? 1 : 0;
    }
    return colorGroups;
}

function advanceColor(board, index, colorCount, groups) {
    const cell = board[index];
    if (!cell.isGold && (!groups || groups.advances[groups.cellGroups[index]])) {
        cell.k = cell.v = (cell.k + 1) % colorCount;
    }
}

export function runFibonacciGeneration({ currentBoardState, currentPalette }, state) {
    let plan = getPlan(state.n, state);
    if (state.mode === 'restart' && state.n > 1 && state.frame === plan.frameEnds.length - 1) {
        state.outgoing = { origin: state.origin, orientation: state.orientation };
        Object.assign(state, plan.nextRound, { frame: 0 });
        plan = getPlan(state.n, state);
    }

    state.frame = Math.min(state.frame + 1, plan.frameEnds.length - 1);
    const count = plan.frameEnds[state.frame];
    const colorCount = currentPalette.length;
    const groups = getColorAdvanceGroups(state);
    state.generation = (state.generation + 1) >>> 0;
    if (state.outgoing) {
        if (state.frame >= plan.handoffEnd) {
            delete state.outgoing;
        } else {
            const previous = getPlan(state.n, state.outgoing);
            const stripCount = previous.stripEnds.length - 1;
            const elapsed = Math.max(0, state.frame - HANDOFF_HOLD);
            const retired = elapsed ? Math.ceil(stripCount * elapsed / (plan.handoffEnd - HANDOFF_HOLD)) : 0;
            const remaining = previous.stripEnds[stripCount - retired];
            for (let i = 0; i < remaining; i++) {
                const cell = previous.cells[i];
                if (plan.rank[cell] > count) advanceColor(currentBoardState, cell, colorCount, groups);
            }
        }
    }
    for (let i = 0; i < count; i++) advanceColor(currentBoardState, plan.cells[i], colorCount, groups);
    return currentBoardState;
}
