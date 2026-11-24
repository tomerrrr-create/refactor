export const FRACTAL_MODES = Object.freeze(['julia', 'xor']);
const DEFAULT_REAL = -.745;
const DEFAULT_IMAGINARY = .113;

export function createFractalState(n, mode = FRACTAL_MODES[0]) {
    return { version: 1, n, mode, frame: 0, real: DEFAULT_REAL, imaginary: DEFAULT_IMAGINARY,
        targetReal: DEFAULT_REAL, targetImaginary: DEFAULT_IMAGINARY };
}

export function validateFractalState(state) {
    if (state?.version !== 1 || !Number.isInteger(state.n) || state.n < 1 || state.n > 327 ||
        !FRACTAL_MODES.includes(state.mode) || state.frame !== (state.frame >>> 0) ||
        ![state.real, state.imaginary, state.targetReal, state.targetImaginary].every(value => Number.isFinite(value) && Math.abs(value) <= 1)) {
        throw new Error('Invalid Fractals checkpoint');
    }
    const { version, n, mode, frame, real, imaginary, targetReal, targetImaginary } = state;
    return { version, n, mode, frame, real, imaginary, targetReal, targetImaginary };
}

export function steerJulia(state, index) {
    if (state.mode !== 'julia' || !Number.isInteger(index) || index < 0 || index >= state.n ** 2) return;
    const x = (index % state.n + .5) / state.n - .5;
    const y = (Math.floor(index / state.n) + .5) / state.n - .5;
    state.targetReal = DEFAULT_REAL + .48 * x;
    state.targetImaginary = DEFAULT_IMAGINARY + .54 * y;
}

function runJulia(board, colors, state) {
    state.real += (state.targetReal - state.real) * .08;
    state.imaginary += (state.targetImaginary - state.imaginary) * .08;
    const { n, real, imaginary, frame } = state;
    const zoom = (1 - Math.cos(2 * Math.PI * (frame % 540) / 540)) / 2;
    const scale = 3.3 / (2 ** (4 * zoom) * n);
    // Zoom toward a repelling fixed point of z² + c so its boundary remains in view.
    const discriminantRe = 1 - 4 * real;
    const discriminantIm = -4 * imaginary;
    const rootRe = Math.sqrt((Math.hypot(discriminantRe, discriminantIm) + discriminantRe) / 2);
    const rootIm = discriminantIm / (2 * rootRe);
    const centerX = zoom * (1 + rootRe) / 2;
    const centerY = zoom * rootIm / 2;
    for (let row = 0; row < n; row++) {
        const y = centerY + (row + .5 - n / 2) * scale;
        for (let col = 0; col < n; col++) {
            const cell = board[row * n + col];
            if (cell.isGold) continue;
            let xOrbit = centerX + (col + .5 - n / 2) * scale;
            let yOrbit = y;
            let squareX = xOrbit * xOrbit;
            let squareY = yOrbit * yOrbit;
            let iterations = 0;
            for (; iterations < 40 && squareX + squareY <= 16; iterations++) {
                yOrbit = 2 * xOrbit * yOrbit + imaginary;
                xOrbit = squareX - squareY + real;
                squareX = xOrbit * xOrbit;
                squareY = yOrbit * yOrbit;
            }
            const band = Math.floor((iterations + 1 - Math.log2(Math.log2(Math.max(16, squareX + squareY)) / 2)) * 2.5);
            cell.k = cell.v = iterations === 40 || colors < 2 ? 0 : 1 + (Math.max(0, band) + (frame >>> 3)) % (colors - 1);
        }
    }
}

let xorInput = new Uint8Array(0);

function runXor(board, colors, { n, frame }) {
    if (colors < 2) return;
    if (xorInput.length !== board.length) xorInput = new Uint8Array(board.length);
    let anyAlive = false;
    for (let i = 0; i < board.length; i++) {
        xorInput[i] = Number(!board[i].isGold && board[i].k !== 0);
        anyAlive ||= xorInput[i] !== 0;
    }
    if (!anyAlive && frame === 0) {
        const center = Math.floor(n / 2) * (n + 1);
        const seed = board[center].isGold ? board.findIndex(cell => !cell.isGold) : center;
        if (seed !== -1) board[seed].k = board[seed].v = 1;
        return;
    }
    const accent = 1 + frame % (colors - 1);
    for (let row = 0; row < n; row++) {
        const top = ((row + n - 1) % n) * n;
        const bottom = ((row + 1) % n) * n;
        const line = row * n;
        for (let col = 0; col < n; col++) {
            const cell = board[line + col];
            if (cell.isGold) continue;
            const alive = xorInput[line + col] ^ xorInput[top + col] ^ xorInput[bottom + col] ^
                xorInput[line + (col + n - 1) % n] ^ xorInput[line + (col + 1) % n];
            cell.k = cell.v = alive ? accent : 0;
        }
    }
}

export function runFractalGeneration({ currentBoardState, currentPalette }, state) {
    const evolve = state.mode === 'julia' ? runJulia : runXor;
    evolve(currentBoardState, currentPalette.length, state);
    state.frame = (state.frame + 1) >>> 0;
    return currentBoardState;
}
