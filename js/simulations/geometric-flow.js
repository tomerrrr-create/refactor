const TRIANGLE = [[0, 1], [Math.sqrt(3) / 2, -.5], [-Math.sqrt(3) / 2, -.5]];
const NEIGHBORS = [[-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [1, -1], [1, 1], [-1, 1]];
const EPSILON = 1e-9;
let field;

function buildField(n) {
    const count = n * n;
    const inward = new Int32Array(count).fill(-1);
    const along = new Int32Array(count).fill(-1);
    const levels = new Float64Array(count);
    const normalX = new Float64Array(count);
    const normalY = new Float64Array(count);
    const order = Array.from({ length: count }, (_, index) => index);
    const center = n / 2;

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const index = row * n + col;
            const x = col + .5 - center;
            const y = row + .5 - center;
            let level = -Infinity;
            for (const [nx, ny] of TRIANGLE) {
                const distance = x * nx + y * ny;
                if (distance <= level) continue;
                level = distance;
                normalX[index] = nx;
                normalY[index] = ny;
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
    order.sort((a, b) => levels[a] - levels[b]);
    return { n, inward, along, order, gap: Math.max(2, Math.floor(n / 2)) };
}

function exchange(board, from, to) {
    if (to < 0 || board[from].isGold || board[to].isGold || board[from].k >= board[to].k) return;
    const next = board[to];
    board[to] = board[from];
    board[from] = next;
}

export function runPolygonFlowGeneration(n, board) {
    if (field?.n !== n) field = buildField(n);
    // Local motion traces the sides before a ring-ordered pass equalizes color
    // rank across corners. The latter keeps independent rays from hardening.
    for (let i = 0; i < board.length; i++) exchange(board, i, field.along[i]);
    for (let i = 0; i < board.length; i++) exchange(board, i, field.inward[i]);
    const { order, gap } = field;
    for (let i = gap; i < order.length; i++) exchange(board, order[i], order[i - gap]);
    for (let i = order.length - 1; i > 0; i--) exchange(board, order[i], order[i - 1]);
    return board;
}
