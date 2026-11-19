// Turbine's coordinate field is independent of colors and brush input. Cache
// only its static part; the wall-clock eddies still change every generation.
let geometryN = 0;
let baseRadius, baseAngle, rowSines, columnCosines;
const NEIGHBOR_R = [-1, 1, 0, 0, -1, -1, 1, 1];
const NEIGHBOR_C = [0, 0, -1, 1, -1, 1, -1, 1];

function prepareGeometry(n, phase) {
    if (geometryN !== n) {
        geometryN = n;
        baseRadius = new Float64Array(n * n);
        baseAngle = new Float64Array(n * n);
        rowSines = new Float64Array(n);
        columnCosines = new Float64Array(n);
        const center = (n - 1) / 2;
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const dy = row - center, dx = col - center;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const i = row * n + col;
                // Preserve the original operation order and double precision.
                baseRadius[i] = distance - 0.8;
                baseAngle[i] = Math.atan2(dy, dx) + (0.10 + (2.0 / Math.max(distance, 1)));
            }
        }
    }
    for (let row = 0; row < n; row++) rowSines[row] = Math.sin((row * 0.03) + phase);
    for (let col = 0; col < n; col++) columnCosines[col] = Math.cos((col * 0.03) - phase);
}

export function runTurbineGeneration(n, board, strength = 0.6) {
    const center = (n - 1) / 2;
    const phase = Date.now() * 0.0005;
    prepareGeometry(n, phase);

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const i = row * n + col;
            if (board[i].isGold || (row === center && col === center)) continue;
            const turbulence = rowSines[row] * columnCosines[col];
            const targetRadius = Math.max(0, baseRadius[i] + (turbulence * 1.5));
            const targetAngle = baseAngle[i] + (turbulence * 0.25);
            const targetR = center + targetRadius * Math.sin(targetAngle);
            const targetC = center + targetRadius * Math.cos(targetAngle);

            let firstDistance = Infinity, secondDistance = Infinity;
            let first = -1, second = -1;
            for (let direction = 0; direction < 8; direction++) {
                const nr = row + NEIGHBOR_R[direction], nc = col + NEIGHBOR_C[direction];
                if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                const distance = Math.pow(nr - targetR, 2) + Math.pow(nc - targetC, 2);
                const position = nr * n + nc;
                // Strict comparisons keep the original stable-sort tie order.
                if (distance < firstDistance) {
                    secondDistance = firstDistance; second = first;
                    firstDistance = distance; first = position;
                } else if (distance < secondDistance) {
                    secondDistance = distance; second = position;
                }
            }
            if (first < 0) continue;
            let chosen = first;
            if (second >= 0 && Math.random() < 0.60) chosen = second;
            if (!board[chosen].isGold && board[i].k < board[chosen].k && Math.random() < strength) {
                const tile = board[i];
                board[i] = board[chosen];
                board[chosen] = tile;
            }
        }
    }
    return board;
}
