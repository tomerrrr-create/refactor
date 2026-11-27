import { growFibonacciCrystal, validateCrystalSettings } from './fibonacci-crystal.js';
import { MIN_PATTERN_GROWTH_SPEED } from './pattern-growth.js';
import { createFibonacciMap, FIBONACCI_MAPS, growFibonacciMap, validateFibonacciMap } from './fibonacci-maps.js';

export const FIBONACCI_MODES = Object.freeze(['restart', 'branching']);
const recordedModes = new Set([...FIBONACCI_MODES, 'continuous', 'crystal', ...FIBONACCI_MAPS]);
export const DEFAULT_FIBONACCI_COLOR_ADVANCE = 95;
export const FIBONACCI_COLOR_ADVANCE_RANGE = Object.freeze([90, 100, 1]);

export function isFibonacciColorAdvance(value) {
    const [min, max, step] = FIBONACCI_COLOR_ADVANCE_RANGE;
    return Number.isInteger(value) && value >= min && value <= max && (value - min) % step === 0;
}
// Earlier settings allowed 60–85 in multiples of five. Keep those values
// intact when replaying a checkpoint, and clamp them in editable preferences.
export function normalizeFibonacciColorAdvance(value) {
    if (isFibonacciColorAdvance(value)) return value;
    if (Number.isInteger(value) && value >= 60 && value <= 85 && value % 5 === 0) {
        return FIBONACCI_COLOR_ADVANCE_RANGE[0];
    }
}

const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const FIBONACCI_VERSION = 8;
const HANDOFF_HOLD = 3;
const HANDOFF_COVERAGE = .05;
const HANDOFF_FADE = 24;
const BRANCH_DELAY = 4;
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
// Two incoming and two outgoing spirals can overlap during a handoff.
const plans = [];
let colorGroups;
let branchingCells;

export function createFibonacciState(n, orientation = 0, mode = 'restart',
    colorAdvance = DEFAULT_FIBONACCI_COLOR_ADVANCE, seed = 0, version = FIBONACCI_VERSION) {
    const center = Math.floor((n - 1) / 2);
    return { version, n, orientation, mode, frame: 0, origin: center * n + center, colorAdvance, seed, generation: 0,
        ...(mode === 'crystal' ? { crystalFrame: 0 } : {}),
        ...(FIBONACCI_MAPS.includes(mode) ? { map: createFibonacciMap(mode, seed) } : {}) };
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
    const establishedFrame = frameEnds.findIndex(count => count >= cells.length * HANDOFF_COVERAGE);
    const plan = { n, orientation, origin, cells, frameEnds, stripEnds, rank, nextRound, visibleFrame, establishedFrame };
    if (plans.length === 4) plans.shift();
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

function secondSpiral(plan) {
    return {
        origin: plan.cells[Math.floor((plan.cells.length - 1) / GOLDEN_RATIO)],
        orientation: (plan.nextRound.orientation + 2) % directions.length
    };
}

function handoffTiming(version, primary, secondary) {
    const primaryEnd = primary.frameEnds.length - 1;
    const lastFrame = secondary ? Math.max(primaryEnd, BRANCH_DELAY + secondary.frameEnds.length - 1) : primaryEnd;
    if (version === 7) {
        if (!secondary) {
            return { lastFrame, hold: HANDOFF_HOLD,
                handoffEnd: Math.min(lastFrame, HANDOFF_HOLD + Math.max(HANDOFF_FADE, primary.visibleFrame)) };
        }
        const hold = Math.min(lastFrame - 1, BRANCH_DELAY + Math.max(HANDOFF_HOLD, secondary.visibleFrame));
        return { lastFrame, hold, handoffEnd: Math.min(lastFrame, hold + HANDOFF_FADE) };
    }
    const visible = secondary ? Math.max(primary.establishedFrame, BRANCH_DELAY + secondary.establishedFrame)
        : primary.establishedFrame;
    const hold = Math.min(lastFrame - 1, Math.max(HANDOFF_HOLD, visible));
    return { lastFrame, hold, handoffEnd: Math.min(lastFrame, hold + HANDOFF_FADE) };
}

function validateBranch(n, primary, branch) {
    const copy = validateOrigin(n, branch ?? {});
    if (copy.origin === primary.origin || copy.orientation !== (primary.orientation + 2) % directions.length) {
        throw new Error('Invalid Fibonacci branch');
    }
    return copy;
}

export function setFibonacciMode(state, mode, layoutSeed = state.seed) {
    if (state.mode === mode) return;
    if (state.mode === 'branching' && mode !== 'branching') {
        const plan = getPlan(state.n, state);
        state.frame = Math.min(state.frame, plan.frameEnds.length - 1);
        delete state.branch;
        if (state.frame >= handoffTiming(state.version, plan).handoffEnd) delete state.outgoing;
        else if (state.outgoing?.branch) state.outgoing = validateOrigin(state.n, state.outgoing);
    }
    if (mode === 'crystal') state.crystalFrame = 0;
    else {
        delete state.crystalFrame;
        delete state.crystalSettings;
        delete state.crystalFront;
    }
    if (FIBONACCI_MAPS.includes(mode)) state.map = createFibonacciMap(mode, layoutSeed);
    else delete state.map;
    state.mode = mode;
}

export function validateFibonacciState(state) {
    if ((state?.version !== 7 && state?.version !== FIBONACCI_VERSION) || !Number.isSafeInteger(state.n) || state.n < 1 || state.n > 327 ||
        !recordedModes.has(state.mode) ||
        !Number.isSafeInteger(state.frame) || state.frame < 0 || state.frame > 4 * state.n ** 2 ||
        normalizeFibonacciColorAdvance(state.colorAdvance) === undefined ||
        state.seed !== (state.seed >>> 0) || state.generation !== (state.generation >>> 0)) {
        throw new Error('Invalid Fibonacci checkpoint');
    }
    const { version, n, mode, frame, colorAdvance, seed, generation } = state;
    const { origin, orientation } = validateOrigin(n, state);
    const copy = { version, n, orientation, mode, frame, origin, colorAdvance, seed, generation };
    if (mode === 'crystal') {
        if (state.crystalFrame !== (state.crystalFrame >>> 0)) throw new Error('Invalid Fibonacci crystal frame');
        copy.crystalFrame = state.crystalFrame;
        if (state.crystalSettings !== undefined) copy.crystalSettings = validateCrystalSettings(state.crystalSettings);
        if (state.crystalFront !== undefined) {
            if (!copy.crystalSettings || !Number.isSafeInteger(state.crystalFront) || state.crystalFront < state.crystalFrame * MIN_PATTERN_GROWTH_SPEED ||
                state.crystalFront > state.crystalFrame * 200) throw new Error('Invalid Penrose Crystal front');
            copy.crystalFront = state.crystalFront;
        }
    } else if (state.crystalFrame !== undefined || state.crystalSettings !== undefined || state.crystalFront !== undefined) {
        throw new Error('Unexpected Fibonacci crystal state');
    }
    if (FIBONACCI_MAPS.includes(mode)) copy.map = validateFibonacciMap(mode, n, state.map);
    else if (state.map !== undefined) throw new Error('Unexpected Fibonacci map state');
    if (!frame && state.outgoing === undefined && state.branch === undefined) return copy;
    const plan = getPlan(n, copy);
    let secondary;
    if (state.branch !== undefined) {
        if (mode !== 'branching' || n === 1 || !frame) throw new Error('Invalid Fibonacci branch');
        copy.branch = validateBranch(n, copy, state.branch);
        secondary = getPlan(n, copy.branch);
    }
    const { lastFrame, handoffEnd } = handoffTiming(version, plan, secondary);
    if (frame > lastFrame) throw new Error('Invalid Fibonacci growth frame');
    if (state.outgoing !== undefined) {
        if (!state.outgoing || frame < 1 || frame >= handoffEnd) throw new Error('Invalid Fibonacci handoff');
        const outgoing = validateOrigin(n, state.outgoing);
        const previous = getPlan(n, outgoing);
        const { nextRound } = previous;
        if (nextRound.origin !== copy.origin || nextRound.orientation !== copy.orientation) {
            throw new Error('Invalid Fibonacci handoff origin');
        }
        if (copy.branch) {
            const expected = secondSpiral(previous);
            if (copy.branch.origin !== expected.origin || copy.branch.orientation !== expected.orientation) {
                throw new Error('Invalid Fibonacci branch origin');
            }
        }
        if (state.outgoing.branch !== undefined) {
            if (!copy.branch) throw new Error('Invalid outgoing Fibonacci branch');
            outgoing.branch = validateBranch(n, outgoing, state.outgoing.branch);
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

function runBranchingGeneration(board, colorCount, groups, state, primary) {
    let secondary = state.branch && getPlan(state.n, state.branch);
    let timing = handoffTiming(state.version, primary, secondary);
    if (state.frame === timing.lastFrame) {
        state.outgoing = { origin: state.origin, orientation: state.orientation,
            ...(state.branch ? { branch: state.branch } : {}) };
        state.branch = secondSpiral(primary);
        Object.assign(state, primary.nextRound, { frame: 0 });
        primary = getPlan(state.n, state);
        secondary = getPlan(state.n, state.branch);
        timing = handoffTiming(state.version, primary, secondary);
    }
    state.frame++;

    if (branchingCells?.length !== board.length) branchingCells = new Uint8Array(board.length);
    else branchingCells.fill(0);
    const advanceSpiral = (plan, count) => {
        for (let i = 0; i < count; i++) {
            const cell = plan.cells[i];
            if (branchingCells[cell]) continue;
            branchingCells[cell] = 1;
            advanceColor(board, cell, colorCount, groups);
        }
    };

    if (state.outgoing) {
        const { hold, handoffEnd } = timing;
        if (state.frame >= handoffEnd) {
            delete state.outgoing;
        } else {
            const advanceOutgoing = origin => {
                const plan = getPlan(state.n, origin);
                const strips = plan.stripEnds.length - 1;
                const elapsed = Math.max(0, state.frame - hold);
                const retired = elapsed ? Math.ceil(strips * elapsed / (handoffEnd - hold)) : 0;
                advanceSpiral(plan, plan.stripEnds[strips - retired]);
            };
            advanceOutgoing(state.outgoing);
            if (state.outgoing.branch) advanceOutgoing(state.outgoing.branch);
        }
    }

    advanceSpiral(primary, primary.frameEnds[Math.min(state.frame, primary.frameEnds.length - 1)]);
    if (secondary) {
        const frame = Math.max(0, Math.min(state.frame - BRANCH_DELAY, secondary.frameEnds.length - 1));
        advanceSpiral(secondary, secondary.frameEnds[frame]);
    }
    return board;
}

export function runFibonacciGeneration({ currentBoardState, currentPalette, growthPaletteSize = currentPalette.length }, state) {
    const colorCount = currentPalette.length;
    const groups = getColorAdvanceGroups(state);
    state.generation = (state.generation + 1) >>> 0;
    if (state.mode === 'crystal') {
        growFibonacciCrystal(state, index => advanceColor(currentBoardState, index, colorCount, groups), growthPaletteSize);
        return currentBoardState;
    }
    if (state.map) {
        growFibonacciMap(state, index => advanceColor(currentBoardState, index, colorCount, groups), growthPaletteSize);
        return currentBoardState;
    }
    let plan = getPlan(state.n, state);
    if (state.mode === 'branching' && state.n > 1) {
        return runBranchingGeneration(currentBoardState, colorCount, groups, state, plan);
    }
    if (state.mode === 'restart' && state.n > 1 && state.frame === plan.frameEnds.length - 1) {
        state.outgoing = { origin: state.origin, orientation: state.orientation };
        Object.assign(state, plan.nextRound, { frame: 0 });
        plan = getPlan(state.n, state);
    }

    state.frame = Math.min(state.frame + 1, plan.frameEnds.length - 1);
    const count = plan.frameEnds[state.frame];
    if (state.outgoing) {
        const { hold, handoffEnd } = handoffTiming(state.version, plan);
        if (state.frame >= handoffEnd) {
            delete state.outgoing;
        } else {
            const previous = getPlan(state.n, state.outgoing);
            const stripCount = previous.stripEnds.length - 1;
            const elapsed = Math.max(0, state.frame - hold);
            const retired = elapsed ? Math.ceil(stripCount * elapsed / (handoffEnd - hold)) : 0;
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
