// Geometry is reconstructed from the initial orientation. Only the growth
// cursor is saved, so a checkpoint stays small even on a large board.
export const FIBONACCI_MODES = Object.freeze(['squares', 'flower']);
const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const turn = Math.PI * 2;
let cachedPlan;

export function createFibonacciState(n, mode = FIBONACCI_MODES[0], orientation = 0) {
    return { version: 1, n, mode, orientation, frame: 0 };
}

function addSquares(n, center, orientation, addBatch) {
    let top = center, bottom = center, left = center, right = center;
    for (let direction = orientation; ; direction = (direction + 1) % directions.length) {
        const [dr, dc] = directions[direction];
        const side = dr ? right - left + 1 : bottom - top + 1;
        const edge = dr > 0 ? bottom : dr < 0 ? top : dc > 0 ? right : left;
        const end = edge + (dr || dc) * side;
        if (end < 0 || end >= n) return;
        for (let strip = 1; strip <= side; strip++) {
            const batch = [];
            for (let along = 0; along < side; along++) {
                const row = dr ? edge + dr * strip : top + along;
                const column = dc ? edge + dc * strip : left + along;
                batch.push(row * n + column);
            }
            addBatch(batch);
        }
        if (dr > 0) bottom = end;
        if (dr < 0) top = end;
        if (dc > 0) right = end;
        if (dc < 0) left = end;
    }
}

function addPetals(n, center, orientation, addBatch) {
    const radius = Math.min(center, n - 1 - center);
    if (!radius) return;
    const layers = Math.min(7, Math.max(2, Math.floor(radius / 3) + 2));
    const band = radius / layers;
    let previous = 0, count = 1;
    for (let layer = 0; layer < layers; layer++) {
        const inner = layer * band;
        const outer = (layer + 1) * band;
        const pitch = turn / count;
        const rotation = orientation * turn / 4 + layer * turn / 8;
        const steps = Math.min(4, Math.ceil(band));
        const petals = Array.from({ length: count }, () => Array.from({ length: steps }, () => []));
        for (let row = center - Math.floor(outer); row <= center + Math.floor(outer); row++) {
            for (let column = center - Math.floor(outer); column <= center + Math.floor(outer); column++) {
                const dy = row - center, dx = column - center;
                const distance = Math.hypot(dy, dx);
                if (distance <= inner || distance > outer) continue;
                const angle = (Math.atan2(dy, dx) - rotation + 2 * turn + pitch / 2) % turn;
                const petal = Math.floor(angle / pitch);
                const progress = (distance - inner) / band;
                const shape = Math.sin(Math.PI * progress);
                const width = Math.min(.09 + .34 * shape, (.16 + .7 * shape) / pitch);
                if (Math.abs(angle / pitch - petal - .5) > width) continue;
                const step = Math.min(steps - 1, Math.floor(progress * steps));
                petals[petal][step].push(row * n + column);
            }
        }
        // Each layer opens in the two groups whose sum produces its count.
        for (const group of [petals.slice(0, previous), petals.slice(previous)]) {
            for (let step = 0; step < steps; step++) {
                addBatch(group.flatMap(petal => petal[step]));
            }
        }
        [previous, count] = [count, previous + count];
    }
}

function getPlan({ n, mode, orientation }) {
    if (cachedPlan?.n === n && cachedPlan.mode === mode && cachedPlan.orientation === orientation) return cachedPlan;
    const center = Math.floor((n - 1) / 2);
    const cells = [center * n + center];
    const ends = [0, 1];
    const addBatch = batch => {
        if (batch.length) {
            if (ends.length > 2) ends.push(...Array(3).fill(cells.length));
            cells.push(...batch);
            ends.push(cells.length);
        }
    };
    if (mode === 'squares') addSquares(n, center, orientation, addBatch);
    else addPetals(n, center, orientation, addBatch);
    cachedPlan = { n, mode, orientation, cells, ends };
    return cachedPlan;
}

export function validateFibonacciState(state) {
    if (state?.version !== 1 || !Number.isSafeInteger(state.n) || state.n < 1 || state.n > 327 ||
        !FIBONACCI_MODES.includes(state.mode) || !Number.isInteger(state.orientation) ||
        state.orientation < 0 || state.orientation >= directions.length ||
        !Number.isSafeInteger(state.frame) || state.frame < 0 || state.frame > 4 * state.n ** 2) {
        throw new Error('Invalid Fibonacci checkpoint');
    }
    const copy = createFibonacciState(state.n, state.mode, state.orientation);
    if (state.frame && state.frame >= getPlan(copy).ends.length) throw new Error('Invalid Fibonacci growth frame');
    copy.frame = state.frame;
    return copy;
}

export function runFibonacciGeneration({ currentBoardState, currentPalette }, state) {
    const { cells, ends } = getPlan(state);
    state.frame = Math.min(state.frame + 1, ends.length - 1);
    const colorCount = currentPalette.length;
    for (let i = 0; i < ends[state.frame]; i++) {
        const cell = currentBoardState[cells[i]];
        if (!cell.isGold) cell.k = cell.v = (cell.k + 1) % colorCount;
    }
    return currentBoardState;
}
