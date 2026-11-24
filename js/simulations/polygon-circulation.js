import { runCenterLineGravity, runDiagonalGravity } from './line-gravity.js';

import { LINE_GRAVITY_MODES } from '../gravity-cycle.js';
const CENTER_LINE_MODES = ['horizontal_gravity', 'vertical_gravity'];
const LINE_GRAVITY_PHASE_LIMIT = 65536;
export const POLYGON_CIRCULATION_MODES = Object.freeze(['triangle_orbit', 'triangle_flow', ...LINE_GRAVITY_MODES]);
export const POLYGON_FLOW_PERIOD = 240;
const GROWTH_GENERATIONS = 180;
const LOCAL_PERIOD = 480;

const TAU = 2 * Math.PI;
const fields = new Map();

export function currentPolygonFlowMode(method) {
    if (method === 'triangle' || method === 'triangle_orbit' || method === 'triangle_flow') return 'triangle_gravity';
    return method;
}

export function normalizePolygonFlowPhase(value, method) {
    const limit = LINE_GRAVITY_MODES.includes(method) ? LINE_GRAVITY_PHASE_LIMIT
        : method === 'triangle_flow' ? GROWTH_GENERATIONS + LOCAL_PERIOD : POLYGON_FLOW_PERIOD;
    return Number.isInteger(value) && value >= 0 && value < limit ? value : 0;
}

export function restorePolygonFlowPhase(rules, phase) {
    if (POLYGON_CIRCULATION_MODES.includes(rules.method)) rules.polygonFlowPhase = normalizePolygonFlowPhase(phase, rules.method);
    else delete rules.polygonFlowPhase;
}

function buildField(n, method) {
    const local = method === 'triangle_flow';
    const centerX = (n - 1) / 2;
    const centerY = (n - 1) * .58;
    const ringLimit = Math.min(centerY / 2, centerX / Math.sqrt(3), n - 1 - centerY);
    const count = n * n;
    const distance = new Float32Array(count);
    const angle = local ? null : new Float32Array(count);
    const crest = new Float32Array(count);
    const trough = new Float32Array(count);
    const ranks = new Float32Array(count);
    const contours = new Map();

    for (let i = 0; i < count; i++) {
        const x = i % n - centerX;
        const y = Math.floor(i / n) - centerY;
        const level = Math.max(y, Math.sqrt(3) / 2 * Math.abs(x) - .5 * y);
        distance[i] = level;
        const azimuth = Math.fround(Math.atan2(y, x));
        if (angle) angle[i] = azimuth;
        const twist = 3 * azimuth - level / n * 30;
        const amplitude = Math.min(level * .48, n * .072);
        crest[i] = Math.cos(twist) * amplitude;
        trough[i] = Math.sin(twist) * amplitude;
        // The triangle's outer contours are clipped by the board. Do not wrap
        // across those gaps. The traveling field still moves the outer tiles.
        if (local || level > ringLimit) continue;
        const ring = Math.floor(level + .5);
        if (!contours.has(ring)) contours.set(ring, []);
        contours.get(ring).push(i);
    }

    if (local) return { n, distance, crest, trough, ranks };
    const order = Array.from({ length: count }, (_, i) => i);
    const rings = Array.from(contours, ([level, path]) => ({
        path: path.sort((a, b) => angle[a] - angle[b] || distance[a] - distance[b]),
        stride: 1 + Math.floor(level / Math.max(4, n * .19))
    }));
    order.sort((a, b) => distance[a] - distance[b] || angle[a] - angle[b]);
    const gap = Math.max(2, Math.floor(n * .42));
    return { n, distance, crest, trough, ranks, rings, order, gap, buffer: [] };
}

function advectRings(board, field) {
    const { buffer } = field;
    for (const { path, stride } of field.rings) {
        buffer.length = 0;
        for (const index of path) {
            if (!board[index].isGold) buffer.push(board[index]);
        }
        if (buffer.length < 2) continue;
        const shift = stride % buffer.length;
        let source = buffer.length - shift;
        for (const index of path) {
            if (board[index].isGold) continue;
            if (source === buffer.length) source = 0;
            board[index] = buffer[source++];
        }
    }
    buffer.length = 0;
}

function compare(board, ranks, a, b) {
    const first = board[a], second = board[b];
    if (first.isGold || second.isGold || (first.k - second.k) * (ranks[a] - ranks[b]) >= 0) return;
    board[a] = second;
    board[b] = first;
}

function growThroughNeighbors(n, board, ranks, phase, growth) {
    const horizontal = (phase & 1) === 0;
    const offset = (phase >>> 1) & 1;
    const salt = Math.imul(phase + 1, 0x9e3779b9);
    // Early passes touch only a small fraction of pairs. The same eligibility
    // pattern is reproduced from the phase when replaying or resuming.
    const budget = Math.round(32 + 192 * growth);
    for (let lane = 0; lane < n; lane++) {
        for (let step = offset; step + 1 < n; step += 2) {
            const a = horizontal ? lane * n + step : step * n + lane;
            const b = a + (horizontal ? 1 : n);
            const hash = Math.imul(a ^ salt, 0x85ebca6b);
            if (((hash ^ (hash >>> 16)) & 255) < budget) compare(board, ranks, a, b);
        }
    }
}

export function runPolygonCirculation(n, board, rules) {
    const local = rules.method === 'triangle_flow';
    const phase = normalizePolygonFlowPhase(rules.polygonFlowPhase, rules.method);
    if (LINE_GRAVITY_MODES.includes(rules.method)) {
        rules.polygonFlowPhase = (phase + 1) % LINE_GRAVITY_PHASE_LIMIT;
        return CENTER_LINE_MODES.includes(rules.method)
            ? runCenterLineGravity(n, board, phase, rules.method === 'horizontal_gravity')
            : runDiagonalGravity(n, board, phase, rules.method === 'triangle_gravity_mirror');
    }
    let field = fields.get(rules.method);
    if (field?.n !== n) {
        field = buildField(n, rules.method);
        fields.set(rules.method, field);
    }
    const { distance, crest, trough, ranks } = field;
    const progress = local ? Math.min(phase / GROWTH_GENERATIONS, 1) : 1;
    const growth = progress * progress * (3 - 2 * progress);
    const turn = local ? (phase - GROWTH_GENERATIONS) * TAU / LOCAL_PERIOD : phase * TAU / POLYGON_FLOW_PERIOD;
    const cos = Math.cos(turn) * growth;
    const sin = Math.sin(turn) * growth;
    for (let i = 0; i < board.length; i++) ranks[i] = distance[i] + crest[i] * cos + trough[i] * sin;

    if (local) {
        growThroughNeighbors(n, board, ranks, phase, growth);
        rules.polygonFlowPhase = phase + 1 < GROWTH_GENERATIONS + LOCAL_PERIOD ? phase + 1 : GROWTH_GENERATIONS;
        return board;
    }
    rules.polygonFlowPhase = (phase + 1) % POLYGON_FLOW_PERIOD;
    const { order, gap } = field;
    advectRings(board, field);
    // Compare against a traveling, twisted rank field. Reversing the scan
    // avoids a preferred edge while allowing pigment to cross contour ranks.
    for (let i = gap; i < order.length; i++) compare(board, ranks, order[i], order[i - gap]);
    for (let i = order.length - 1; i > 0; i--) compare(board, ranks, order[i], order[i - 1]);
    return board;
}
