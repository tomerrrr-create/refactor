export const POLYGON_FLOW_MODES = Object.freeze(['triangle', 'square', 'triangle_weave']);

const DIAGONAL = Math.SQRT1_2;
const TRIANGLE = [[0, 1], [Math.sqrt(3) / 2, -.5], [-Math.sqrt(3) / 2, -.5]];
const SQUARE = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const UPPER_TRIANGLE = [[1, 0], [0, -1], [-DIAGONAL, DIAGONAL]];
const LOWER_TRIANGLE = [[-1, 0], [0, 1], [DIAGONAL, -DIAGONAL]];
const NEIGHBORS = [[-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [1, -1], [1, 1], [-1, 1]];
const EPSILON = 1e-9;
const fields = new Map();

function buildField(n, mode) {
    const count = n * n;
    const inward = new Int32Array(count).fill(-1);
    const along = new Int32Array(count).fill(-1);
    const levels = new Float64Array(count);
    const normalX = new Float64Array(count);
    const normalY = new Float64Array(count);
    const regions = new Int16Array(count);
    const regionOrders = new Map();
    const weave = mode === 'triangle_weave';
    const tiles = n >= 120 ? 4 : n >= 45 ? 3 : n >= 15 ? 2 : 1;
    const tileSize = weave ? n / tiles : n;
    const inset = tileSize * (1 - DIAGONAL);

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const index = row * n + col;
            const tileRow = Math.floor((row + .5) / tileSize);
            const tileCol = Math.floor((col + .5) / tileSize);
            const x = col + .5 - tileCol * tileSize;
            const y = row + .5 - tileRow * tileSize;
            const lower = weave && y > x;
            const normals = weave ? (lower ? LOWER_TRIANGLE : UPPER_TRIANGLE) : mode === 'square' ? SQUARE : TRIANGLE;
            const centerX = weave ? (lower ? inset : tileSize - inset) : n / 2;
            const centerY = weave ? tileSize - centerX : n / 2;
            const turn = lower ? -1 : 1;
            regions[index] = 2 * (tileRow * tiles + tileCol) + Number(lower);
            const region = regions[index];
            if (!regionOrders.has(region)) regionOrders.set(region, []);
            regionOrders.get(region).push(index);
            let level = -Infinity;
            for (const [nx, ny] of normals) {
                const distance = (x - centerX) * nx + (y - centerY) * ny;
                if (distance <= level) continue;
                level = distance;
                normalX[index] = nx * turn;
                normalY[index] = ny * turn;
            }
            levels[index] = level;
        }
    }

    // Follow the nearest side around each ring. Only inward and level moves can
    // bring a lower palette rank to its destination, so the polygon stays legible.
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const index = row * n + col;
            let inwardScore = EPSILON;
            let alongScore = EPSILON;
            for (const [dx, dy] of NEIGHBORS) {
                const x = col + dx, y = row + dy;
                if (x < 0 || x >= n || y < 0 || y >= n) continue;
                const next = y * n + x;
                if (regions[next] !== regions[index]) continue;
                const drop = levels[index] - levels[next];
                if (drop < -EPSILON) continue;
                const length = dx && dy ? Math.SQRT2 : 1;
                const progress = drop / length;
                if (progress > inwardScore) {
                    inwardScore = progress;
                    inward[index] = next;
                }
                const tangent = (normalX[index] * dy - normalY[index] * dx) / length;
                const score = tangent - progress * .85;
                if (score > alongScore) {
                    alongScore = score;
                    along[index] = next;
                }
            }
            if (along[index] === inward[index]) along[index] = -1;
        }
    }
    const rings = Array.from(regionOrders.values(), order => {
        order.sort((a, b) => levels[a] - levels[b]);
        return { order, gap: Math.max(2, Math.floor(Math.sqrt(order.length) / 2)) };
    });
    return { n, inward, along, rings };
}

function exchange(board, from, to) {
    if (to < 0 || board[from].isGold || board[to].isGold || board[from].k >= board[to].k) return;
    const next = board[to];
    board[to] = board[from];
    board[from] = next;
}

export function runPolygonFlowGeneration(n, board, mode) {
    let field = fields.get(mode);
    if (field?.n !== n) {
        field = buildField(n, mode);
        fields.set(mode, field);
    }
    // Local motion traces the sides before a ring-ordered pass equalizes color
    // rank across corners. The latter keeps independent rays from hardening.
    for (let i = 0; i < board.length; i++) exchange(board, i, field.along[i]);
    for (let i = 0; i < board.length; i++) exchange(board, i, field.inward[i]);
    for (const { order, gap } of field.rings) {
        for (let i = gap; i < order.length; i++) exchange(board, order[i], order[i - gap]);
        for (let i = order.length - 1; i > 0; i--) exchange(board, order[i], order[i - 1]);
    }
    return board;
}
