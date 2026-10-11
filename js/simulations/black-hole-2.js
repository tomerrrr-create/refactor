// Local radial sorting with a visible journey between matched grid cells.
export const BLACK_HOLE_2_DURATION = 180;
const transitions = new WeakMap();
let geometry;
const OFFSETS = [];
for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
        if (dr || dc) OFFSETS.push([dr, dc]);
    }
}

function geometryFor(n) {
    if (geometry?.n === n) return geometry;
    const center = (n - 1) / 2, length = n * n;
    const radiusSquared = new Float64Array(length);
    const targets = new Int32Array(length * 24).fill(-1);
    const weights = new Float32Array(length * 24);
    for (let i = 0; i < length; i++) {
        const y = Math.floor(i / n) - center, x = i % n - center;
        radiusSquared[i] = x * x + y * y;
    }
    for (let i = 0; i < length; i++) {
        const row = Math.floor(i / n), col = i % n;
        const y = row - center, x = col - center, r = Math.sqrt(radiusSquared[i]);
        if (!r) continue;
        // Velocities are measured in cells, rather than an angle that produces
        // increasingly distant targets on large boards. Clockwise + inward.
        const vx = (-0.85 * x - 1.35 * y) / r;
        const vy = (-0.85 * y + 1.35 * x) / r;
        for (let j = 0; j < 24; j++) {
            const [dr, dc] = OFFSETS[j], nr = row + dr, nc = col + dc;
            if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
            const target = nr * n + nc;
            if (radiusSquared[target] >= radiusSquared[i]) continue;
            const slot = i * 24 + j;
            targets[slot] = target;
            // Every eligible direction has a chance: no hard angular sectors.
            weights[slot] = Math.exp(-0.9 * ((dc - vx) ** 2 + (dr - vy) ** 2));
        }
    }
    geometry = { n, targets, weights };
    return geometry;
}

export function getBlackHole2Transition(board, now = performance.now()) {
    const state = transitions.get(board);
    return state?.count && now < state.startedAt + BLACK_HOLE_2_DURATION ? state : null;
}

export function finishBlackHole2Transition(board) {
    const state = transitions.get(board);
    if (state) state.count = 0;
}

export function runBlackHole2Generation(n, board, now = performance.now()) {
    if (getBlackHole2Transition(board, now)) return board;
    const { targets, weights } = geometryFor(n);
    let state = transitions.get(board);
    if (!state || state.n !== n) {
        state = { n, pairs: new Uint32Array(n * n), moving: new Uint8Array(n * n), count: 0, batch: 0, reverse: false, startedAt: now };
        transitions.set(board, state);
    }
    state.moving.fill(0);
    state.count = 0;
    state.reverse = !state.reverse;
    state.batch++;
    state.startedAt = now;
    // A random origin plus alternating traversal avoids a persistent row bias.
    const origin = Math.floor(Math.random() * board.length);
    // Quiet, sparse currents rather than a whole-board pulse of exchanges.
    const budget = Math.max(1, Math.ceil(board.length / 12));
    for (let step = 0; step < board.length; step++) {
        if (state.count >= budget) break;
        const i = (origin + (state.reverse ? board.length - 1 - step : step)) % board.length;
        if (state.moving[i] || board[i].isGold) continue;
        let chosen = -1, totalWeight = 0;
        for (let j = 0; j < 24; j++) {
            const slot = i * 24 + j, target = targets[slot];
            if (target < 0 || state.moving[target] || board[target].isGold || board[i].k >= board[target].k) continue;
            const weight = weights[slot];
            totalWeight += weight;
            if (Math.random() * totalWeight < weight) chosen = target;
        }
        if (chosen < 0) continue;
        const tile = board[i];
        board[i] = board[chosen];
        board[chosen] = tile;
        state.moving[i] = state.moving[chosen] = 1;
        state.pairs[state.count * 2] = i;
        state.pairs[state.count * 2 + 1] = chosen;
        state.count++;
    }
    return board;
}

