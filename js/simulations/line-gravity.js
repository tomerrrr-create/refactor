import { defaultGravitationalSortRules } from '../constants.js';

const swapThreshold = defaultGravitationalSortRules.strength * 2 ** 32;

function pullTowardLine(board, from, target, stride, salt, key, keyStride, heights) {
    for (; from !== target; from += stride, key += keyStride) {
        const next = from + stride;
        const farther = board[from], nearer = board[next];
        if (farther.k >= nearer.k || farther.isGold || nearer.isGold) continue;
        // Use the saved generation so the same sweep can be replayed.
        // Use the unreflected index so mirrored boards make identical choices.
        let bits = Math.imul(key ^ salt, 0x85ebca6b);
        bits = Math.imul(bits ^ (bits >>> 16), 0xc2b2ae35);
        const climb = heights ? Math.max(0, heights[next] - heights[from]) : 0;
        const threshold = climb ? swapThreshold / (1 + (climb * .32) ** 2) : swapThreshold;
        if (((bits ^ (bits >>> 13)) >>> 0) >= threshold) continue;
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
        pullTowardLine(board, first, target, stride, salt, keyFirst, keyStride);
        pullTowardLine(board, last, target, -stride, salt, keyFirst + (n - 1) * keyStride, -keyStride);
    }
    return board;
}

export function runCenterLineGravity(n, board, phase, towardHorizontalLine, heights) {
    const salt = Math.imul(phase + 1, 0x9e3779b9);
    const stride = towardHorizontalLine ? n : 1;
    const laneStride = towardHorizontalLine ? 1 : n;
    // Even boards have two equally central lines, one for each half.
    const nearFromStart = Math.floor((n - 1) / 2);
    const nearFromEnd = Math.floor(n / 2);
    for (let lane = 0; lane < n; lane++) {
        const first = lane * laneStride;
        const last = first + (n - 1) * stride;
        // Both axes use the same random decisions when transposing the board.
        const keyFirst = lane * n;
        pullTowardLine(board, first, first + nearFromStart * stride, stride, salt, keyFirst, 1, heights);
        pullTowardLine(board, last, first + nearFromEnd * stride, -stride, salt, keyFirst + n - 1, -1, heights);
    }
    return board;
}
