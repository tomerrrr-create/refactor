export const FIBONACCI_MODES = Object.freeze(['continuous', 'wave']);
const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const WAVE_FADE_IN = 24;
const TAU = 2 * Math.PI;
let cachedPlan;

export function createFibonacciState(n, orientation = 0, mode = FIBONACCI_MODES[0]) {
    return { version: 5, n, orientation, mode, frame: 0, waveFrame: 0 };
}

const wrap = (coordinate, n) => (coordinate % n + n) % n;

function addSquares(n, center, orientation, addBatch) {
    let top = center, bottom = center, left = center, right = center;
    for (let direction = orientation; ; direction = (direction + 1) % directions.length) {
        const [dr, dc] = directions[direction];
        const side = dr ? right - left + 1 : bottom - top + 1;
        const edge = dr > 0 ? bottom : dr < 0 ? top : dc > 0 ? right : left;
        const end = edge + (dr || dc) * side;
        if (side >= n) return;
        // The region is a rectangle in unwrapped space. Once its width or
        // height spans the board, further strips would revisit existing cells.
        const depth = dr ? bottom - top + 1 : right - left + 1;
        const strips = Math.min(side, n - depth);
        for (let strip = 1; strip <= strips; strip++) {
            const batch = [];
            for (let along = 0; along < side; along++) {
                const row = dr ? edge + dr * strip : top + along;
                const column = dc ? edge + dc * strip : left + along;
                batch.push(wrap(row, n) * n + wrap(column, n));
            }
            addBatch(batch);
        }
        if (dr > 0) bottom = end;
        if (dr < 0) top = end;
        if (dc > 0) right = end;
        if (dc < 0) left = end;
    }
}

function getPlan({ n, orientation }) {
    if (cachedPlan?.n === n && cachedPlan.orientation === orientation) return cachedPlan;

    const center = Math.floor((n - 1) / 2);
    const cells = [center * n + center];
    const frameEnds = [0, 1];
    const stripEnds = [0, 1];
    addSquares(n, center, orientation, batch => {
        if (frameEnds.length > 2) frameEnds.push(cells.length, cells.length, cells.length);
        cells.push(...batch);
        frameEnds.push(cells.length);
        stripEnds.push(cells.length);
    });

    // A multiple of four keeps the color-step cadence continuous when the wave wraps.
    const wavePeriod = Math.max(96, Math.min(480, Math.ceil((stripEnds.length - 1) / 4) * 4));
    cachedPlan = { n, orientation, cells, frameEnds, stripEnds, wavePeriod };
    return cachedPlan;
}

export function validateFibonacciState(state) {
    if (state?.version !== 5 || !Number.isSafeInteger(state.n) || state.n < 1 || state.n > 327 ||
        !Number.isInteger(state.orientation) || state.orientation < 0 || state.orientation >= directions.length ||
        !FIBONACCI_MODES.includes(state.mode) || !Number.isSafeInteger(state.frame) ||
        state.frame < 0 || state.frame > 4 * state.n ** 2 ||
        !Number.isInteger(state.waveFrame) || state.waveFrame < 0 || state.waveFrame >= WAVE_FADE_IN + 480) {
        throw new Error('Invalid Fibonacci checkpoint');
    }
    const { n, orientation, mode, frame, waveFrame } = state;
    if (frame || waveFrame) {
        const plan = getPlan(state);
        if (frame >= plan.frameEnds.length ||
            (waveFrame > 0 && (mode !== 'wave' || frame !== plan.frameEnds.length - 1 ||
                waveFrame >= WAVE_FADE_IN + plan.wavePeriod))) {
            throw new Error('Invalid Fibonacci growth or wave frame');
        }
    }
    return { version: 5, n, orientation, mode, frame, waveFrame };
}

function advanceCells(board, cells, start, end, colorCount) {
    for (let i = start; i < end; i++) {
        const cell = board[cells[i]];
        if (!cell.isGold) cell.k = cell.v = (cell.k + 1) % colorCount;
    }
}

export function runFibonacciGeneration({ currentBoardState, currentPalette }, state) {
    const { cells, frameEnds, stripEnds, wavePeriod } = getPlan(state);
    const lastFrame = frameEnds.length - 1;
    const colorCount = currentPalette.length;
    if (state.frame < lastFrame || state.mode === 'continuous') {
        state.frame = Math.min(state.frame + 1, lastFrame);
        advanceCells(currentBoardState, cells, 0, frameEnds[state.frame], colorCount);
        return currentBoardState;
    }

    state.waveFrame++;
    if (state.waveFrame === WAVE_FADE_IN + wavePeriod) state.waveFrame = WAVE_FADE_IN;
    const amplitude = Math.min(1, state.waveFrame / WAVE_FADE_IN);
    const phase = (state.waveFrame - WAVE_FADE_IN) / wavePeriod;
    const stripCount = stripEnds.length - 1;
    for (let strip = 0; strip < stripCount; strip++) {
        const crest = Math.cos(TAU * (phase - strip / stripCount));
        // At the crest a strip moves every generation. The trough slows to
        // one in four, with adjacent strips staggered to spread the movement.
        const rate = 4 - Math.round(1.5 * amplitude * (1 - crest));
        if ((state.waveFrame + strip) % 4 < rate) {
            advanceCells(currentBoardState, cells, stripEnds[strip], stripEnds[strip + 1], colorCount);
        }
    }
    return currentBoardState;
}
