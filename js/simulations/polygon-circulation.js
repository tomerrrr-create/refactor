export const POLYGON_CIRCULATION_MODES = Object.freeze(['triangle_orbit', 'square_orbit']);
export const POLYGON_FLOW_PERIOD = 240;

const TAU = 2 * Math.PI;
const fields = new Map();

export function normalizePolygonFlowPhase(value) {
    return Number.isInteger(value) && value >= 0 && value < POLYGON_FLOW_PERIOD ? value : 0;
}

export function restorePolygonFlowPhase(rules, phase) {
    if (POLYGON_CIRCULATION_MODES.includes(rules.method)) rules.polygonFlowPhase = normalizePolygonFlowPhase(phase);
    else delete rules.polygonFlowPhase;
}

function buildField(n, method) {
    const square = method === 'square_orbit';
    const centerX = (n - 1) / 2;
    const centerY = square ? centerX : (n - 1) * .58;
    const ringLimit = square ? centerX : Math.min(centerY / 2, centerX / Math.sqrt(3), n - 1 - centerY);
    const count = n * n;
    const distance = new Float32Array(count);
    const angle = new Float32Array(count);
    const crest = new Float32Array(count);
    const trough = new Float32Array(count);
    const ranks = new Float32Array(count);
    const contours = new Map();
    const order = Array.from({ length: count }, (_, i) => i);

    for (let i = 0; i < count; i++) {
        const x = i % n - centerX;
        const y = Math.floor(i / n) - centerY;
        const level = square ? Math.max(Math.abs(x), Math.abs(y)) : Math.max(y, Math.sqrt(3) / 2 * Math.abs(x) - .5 * y);
        distance[i] = level;
        angle[i] = Math.atan2(y, x);
        const twist = (square ? 4 : 3) * angle[i] - level / n * (square ? 28 : 30);
        const amplitude = Math.min(level * .48, n * (square ? .062 : .072));
        crest[i] = Math.cos(twist) * amplitude;
        trough[i] = Math.sin(twist) * amplitude;
        // The triangle's outer contours are clipped by the board. Do not wrap
        // across those gaps. The traveling field still moves the outer tiles.
        if (level > ringLimit) continue;
        const ring = Math.floor(level + .5);
        if (!contours.has(ring)) contours.set(ring, []);
        contours.get(ring).push(i);
    }

    const rings = Array.from(contours, ([level, path]) => ({
        path: path.sort((a, b) => angle[a] - angle[b] || distance[a] - distance[b]),
        stride: 1 + Math.floor(level / Math.max(4, n * (square ? .13 : .19)))
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

export function runPolygonCirculation(n, board, rules) {
    const phase = normalizePolygonFlowPhase(rules.polygonFlowPhase);
    rules.polygonFlowPhase = (phase + 1) % POLYGON_FLOW_PERIOD;
    let field = fields.get(rules.method);
    if (field?.n !== n) {
        field = buildField(n, rules.method);
        fields.set(rules.method, field);
    }
    const { distance, crest, trough, ranks, order, gap } = field;
    const cos = Math.cos(phase * TAU / POLYGON_FLOW_PERIOD);
    const sin = Math.sin(phase * TAU / POLYGON_FLOW_PERIOD);
    for (let i = 0; i < board.length; i++) ranks[i] = distance[i] + crest[i] * cos + trough[i] * sin;

    advectRings(board, field);
    // Compare against a traveling, twisted rank field. Reversing the scan
    // avoids a preferred edge while allowing pigment to cross contour ranks.
    for (let i = gap; i < order.length; i++) compare(board, ranks, order[i], order[i - gap]);
    for (let i = order.length - 1; i > 0; i--) compare(board, ranks, order[i], order[i - 1]);
    return board;
}
