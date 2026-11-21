import { defaultGravitationalSortRules } from '../constants.js';

const swapThreshold = defaultGravitationalSortRules.strength * 2 ** 32;

function pullTowardDiagonal(board, from, target, stride, salt, key, keyStride) {
    for (; from !== target; from += stride, key += keyStride) {
        const next = from + stride;
        const farther = board[from], nearer = board[next];
        if (farther.k >= nearer.k || farther.isGold || nearer.isGold) continue;
        // Use the saved generation so the same sweep can be replayed.
        // Use the unreflected index so mirrored boards make identical choices.
        let bits = Math.imul(key ^ salt, 0x85ebca6b);
        bits = Math.imul(bits ^ (bits >>> 16), 0xc2b2ae35);
        if (((bits ^ (bits >>> 13)) >>> 0) >= swapThreshold) continue;
        board[from] = nearer;
        board[next] = farther;
    }
}

export function runDiagonalGravity(n, board, phase, mirrored) {
    const salt = Math.imul(phase + 1, 0x9e3779b9);
    // Sweep both halves from the edges to the diagonal. Alternate rows and
    // columns so the flow is balanced around the diagonal.
    const horizontal = phase % 2 === 0;
    const keyStride = horizontal ? 1 : n;
    const laneStride = horizontal ? n : 1;
    const stride = horizontal && mirrored ? -1 : keyStride;
    for (let lane = 0; lane < n; lane++) {
        const keyFirst = lane * laneStride;
        const first = !mirrored ? keyFirst : horizontal ? keyFirst + n - 1 : n - 1 - lane;
        const target = first + lane * stride;
        const last = first + (n - 1) * stride;
        pullTowardDiagonal(board, first, target, stride, salt, keyFirst, keyStride);
        pullTowardDiagonal(board, last, target, -stride, salt, keyFirst + (n - 1) * keyStride, -keyStride);
    }
    return board;
}
