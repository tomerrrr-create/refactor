import { defaultGravitationalSortRules } from '../constants.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const SPIRAL_TWIST = (Math.PI / 2) / Math.log(PHI);
let fibonacciField;

function makeFibonacciField(n) {
    const radius = new Float32Array(n * n);
    const rank = new Float32Array(n * n);
    const center = (n - 1) / 2;
    for (let index = 0; index < radius.length; index++) {
        const x = index % n - center, y = Math.floor(index / n) - center;
        const r = Math.hypot(x, y);
        const angle = Math.atan2(y, x);
        // The arm grows by phi each quarter turn. Unwrap the innermost
        // subpixel turn so even a small grid has a readable center.
        const arm = SPIRAL_TWIST * Math.log(Math.max(r, 1) / Math.max(1, n * .16));
        const depth = Math.min(r * .85, n * .12);
        radius[index] = r;
        rank[index] = r * .36 + (1 - Math.cos(angle - arm)) * depth;
    }
    return { n, radius, rank };
}

function sample(index, salt) {
    let bits = Math.imul(index ^ salt, 0x85ebca6b);
    bits = Math.imul(bits ^ (bits >>> 16), 0xc2b2ae35);
    return ((bits ^ (bits >>> 13)) >>> 0) / 4294967296;
}

export function runGeometricSorting(n, board, method, phase) {
    const fibonacci = method === 'fibonacci';
    if (fibonacci && fibonacciField?.n !== n) fibonacciField = makeFibonacciField(n);
    const front = 1.5 + phase * Math.max(1, n / 300);
    const horizontal = (phase & 1) === 0;
    const offset = (phase >>> 1) & 1;
    const salt = Math.imul(phase + 1, 0x9e3779b9);
    const strength = fibonacci ? .82 : defaultGravitationalSortRules.strength;

    // Alternate between four nonoverlapping matchings. Each particle can
    // move by one cell per generation; the seed belongs to the saved phase.
    for (let lane = 0; lane < n; lane++) {
        for (let step = offset; step + 1 < n; step += 2) {
            const a = horizontal ? lane * n + step : step * n + lane;
            const b = a + (horizontal ? 1 : n);
            if (board[a].isGold || board[b].isGold) continue;
            if (fibonacci && (fibonacciField.radius[a] > front || fibonacciField.radius[b] > front)) continue;
            const range = fibonacci ? fibonacciField.rank[a] - fibonacciField.rank[b] : Math.abs(lane - step) - Math.abs(lane - step - 1);
            if ((board[a].k - board[b].k) * range >= 0 || sample(a, salt) >= strength) continue;
            const first = board[a];
            board[a] = board[b];
            board[b] = first;
        }
    }
    return board;
}
