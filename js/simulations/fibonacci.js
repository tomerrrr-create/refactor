const HANDOFF_HOLD = 3;
const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
// Both rounds can be active at once. Reconstruct their geometry only when an
// origin changes or a checkpoint is restored.
const plans = [];

export function createFibonacciState(n, orientation = 0) {
    const center = Math.floor((n - 1) / 2);
    return { version: 4, n, orientation, frame: 0, origin: center * n + center };
}

const wrap = (coordinate, n) => (coordinate % n + n) % n;

function addSquares(n, origin, orientation, addBatch) {
    let top = Math.floor(origin / n), bottom = top, left = origin % n, right = left;
    let lastCell = origin;
    for (let direction = orientation; ; direction = (direction + 1) % directions.length) {
        const [dr, dc] = directions[direction];
        const side = dr ? right - left + 1 : bottom - top + 1;
        const edge = dr > 0 ? bottom : dr < 0 ? top : dc > 0 ? right : left;
        const end = edge + (dr || dc) * side;
        if (side >= n) return { origin: lastCell, orientation: direction };
        // The region is a rectangle in unwrapped space. Once its width or
        // height spans the board, further strips would revisit existing cells.
        const depth = dr ? bottom - top + 1 : right - left + 1;
        const strips = Math.min(side, n - depth);
        for (let strip = 1; strip <= strips; strip++) {
            const batch = [];
            for (let along = 0; along < side; along++) {
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
    }
}

function getPlan(n, { orientation, origin }) {
    const cached = plans.find(plan => plan.n === n && plan.orientation === orientation && plan.origin === origin);
    if (cached) return cached;

    const cells = [origin];
    const frameEnds = [0, 1];
    const stripEnds = [0, 1];
    const nextRound = addSquares(n, origin, orientation, batch => {
        if (frameEnds.length > 2) {
            frameEnds.push(cells.length, cells.length, cells.length);
        }
        cells.push(...batch);
        frameEnds.push(cells.length);
        stripEnds.push(cells.length);
    });

    const rank = new Int32Array(n * n);
    cells.forEach((cell, index) => { rank[cell] = index + 1; });
    // Use a growth milestone to scale the overlap to the board size. Cap the
    // handoff at the end of a small board's incoming round.
    const visibleFrame = frameEnds.findIndex(count => count >= cells.length * .01);
    const handoffFrame = Math.min(frameEnds.length - 1, Math.max(24, visibleFrame));
    const plan = { n, orientation, origin, cells, frameEnds, stripEnds, rank, nextRound, handoffFrame };
    if (plans.length === 2) plans.shift();
    plans.push(plan);
    return plan;
}

function handoffEnd(plan, hold) {
    return Math.min(plan.frameEnds.length - 1, plan.handoffFrame + hold);
}

function validateOrigin(n, { origin, orientation }) {
    if (!Number.isInteger(origin) || origin < 0 || origin >= n ** 2 ||
        !Number.isInteger(orientation) || orientation < 0 || orientation >= directions.length) {
        throw new Error('Invalid Fibonacci origin');
    }
    return { origin, orientation };
}

export function validateFibonacciState(state) {
    if ((state?.version !== 3 && state?.version !== 4) || !Number.isSafeInteger(state.n) || state.n < 1 || state.n > 327 ||
        !Number.isSafeInteger(state.frame) || state.frame < 0 || state.frame > 4 * state.n ** 2) {
        throw new Error('Invalid Fibonacci checkpoint');
    }
    const { version, n, frame } = state;
    const copy = { version, n, orientation: state.orientation, frame, origin: state.origin };
    validateOrigin(n, copy);
    if (!frame && state.outgoing === undefined) return copy;
    const plan = getPlan(n, copy);
    if (frame >= plan.frameEnds.length) throw new Error('Invalid Fibonacci growth frame');
    if (state.outgoing !== undefined) {
        const hold = version === 4 ? HANDOFF_HOLD : 0;
        if (!state.outgoing || frame < 1 || frame >= handoffEnd(plan, hold)) throw new Error('Invalid Fibonacci handoff');
        const outgoing = validateOrigin(n, state.outgoing);
        const { nextRound } = getPlan(n, outgoing);
        if (nextRound.origin !== copy.origin || nextRound.orientation !== copy.orientation) {
            throw new Error('Invalid Fibonacci handoff origin');
        }
        copy.outgoing = outgoing;
    }
    return copy;
}

function advanceColor(cell, colorCount) {
    if (!cell.isGold) cell.k = cell.v = (cell.k + 1) % colorCount;
}

export function runFibonacciGeneration({ currentBoardState, currentPalette }, state) {
    let plan = getPlan(state.n, state);
    if (state.n > 1 && state.frame === plan.frameEnds.length - 1) {
        state.outgoing = { origin: state.origin, orientation: state.orientation };
        Object.assign(state, plan.nextRound, { frame: 0 });
        plan = getPlan(state.n, state);
    }

    state.frame = Math.min(state.frame + 1, plan.frameEnds.length - 1);
    const count = plan.frameEnds[state.frame];
    const colorCount = currentPalette.length;
    if (state.outgoing) {
        const hold = state.version === 4 ? HANDOFF_HOLD : 0;
        const end = handoffEnd(plan, hold);
        if (state.frame >= end) {
            delete state.outgoing;
        } else {
            const previous = getPlan(state.n, state.outgoing);
            const stripCount = previous.stripEnds.length - 1;
            // Retire the latest strips first, starting beside the new origin.
            const elapsed = Math.max(0, state.frame - hold);
            const retired = elapsed ? Math.ceil(stripCount * elapsed / (end - hold)) : 0;
            const remaining = previous.stripEnds[stripCount - retired];
            for (let i = 0; i < remaining; i++) {
                const cell = previous.cells[i];
                if (plan.rank[cell] === 0 || plan.rank[cell] > count) {
                    advanceColor(currentBoardState[cell], colorCount);
                }
            }
        }
    }
    for (let i = 0; i < count; i++) advanceColor(currentBoardState[plan.cells[i]], colorCount);
    return currentBoardState;
}
