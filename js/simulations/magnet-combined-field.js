// Experimental combined-v1 field. All eligible perimeter anchors contribute;
// bilinear source deposition/interpolation bounds work independently of their count.
const MAX_SIDE = 25;
const neighbors = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
function normalize(k, length) {
    if (k >= 0 && k < length) return k;
    const value = k % length;
    return value < 0 ? value + length : value;
}

export function createCombinedMagnetField() {
    let n = 0, side = 0, scale = 0, span = 0;
    let mass, fieldX, fieldY, sources, kernelX, kernelY, kernelOffsets;
    let total = 0;
    function clear() {
        n = side = 0;
        mass = fieldX = fieldY = sources = kernelX = kernelY = kernelOffsets = null;
        total = 0;
    }
    function build(size, board, target, paletteLength, anchor) {
        if (size !== n) {
            n = size; side = Math.min(n, MAX_SIDE); scale = n > 1 ? (side - 1) / (n - 1) : 0;
            span = side * 2 - 1;
            mass = new Float64Array(side * side);
            fieldX = new Float64Array(side * side); fieldY = new Float64Array(side * side);
            sources = new Int32Array(side * side);
            kernelOffsets = new Int32Array(side * side);
            for (let i = 0; i < kernelOffsets.length; i++) kernelOffsets[i] = (Math.floor(i / side) + side - 1) * span + i % side + side - 1;
            kernelX = new Float64Array(span * span); kernelY = new Float64Array(span * span);
            for (let dy = 1 - side; dy < side; dy++) for (let dx = 1 - side; dx < side; dx++) {
                const index = (dy + side - 1) * span + dx + side - 1;
                // Softened inverse-square force; no singularity at an anchor.
                const square = dx * dx + dy * dy + .25;
                const weight = 1 / (square * Math.sqrt(square));
                kernelX[index] = dx * weight; kernelY[index] = dy * weight;
            }
        }
        mass.fill(0); fieldX.fill(0); fieldY.fill(0); total = 0;
        const targetRank = normalize(target - anchor, paletteLength);
        for (let i = 0; i < n * n; i++) {
            if (board[i].isGold || normalize(board[i].k, paletteLength) !== target) continue;
            const row = Math.floor(i / n), col = i % n;
            let edge = false;
            for (let j = 0; j < 8; j++) {
                const r = row + neighbors[j][0], c = col + neighbors[j][1];
                if (r >= 0 && r < n && c >= 0 && c < n && normalize(board[r * n + c].k - anchor, paletteLength) > targetRank) { edge = true; break; }
            }
            if (!edge) continue;
            const x = col * scale, y = row * scale, x0 = Math.floor(x), y0 = Math.floor(y);
            const x1 = Math.min(side - 1, x0 + 1), y1 = Math.min(side - 1, y0 + 1), fx = x - x0, fy = y - y0;
            mass[y0 * side + x0] += (1 - fx) * (1 - fy);
            mass[y0 * side + x1] += fx * (1 - fy);
            mass[y1 * side + x0] += (1 - fx) * fy;
            mass[y1 * side + x1] += fx * fy;
            total++;
        }
        if (!total) return false;
        let count = 0;
        for (let i = 0; i < mass.length; i++) if (mass[i] > 0) sources[count++] = i;
        for (let r = 0; r < side; r++) for (let c = 0; c < side; c++) {
            let x = 0, y = 0;
            const offset = -r * span - c;
            for (let j = 0; j < count; j++) {
                const source = sources[j], kernel = kernelOffsets[source] + offset;
                x += mass[source] * kernelX[kernel]; y += mass[source] * kernelY[kernel];
            }
            fieldX[r * side + c] = x; fieldY[r * side + c] = y;
        }
        return true;
    }
    // Caller-owned output avoids allocating an object for every cell.
    function sample(row, col, out) {
        const x = col * scale, y = row * scale, x0 = Math.floor(x), y0 = Math.floor(y);
        const x1 = Math.min(side - 1, x0 + 1), y1 = Math.min(side - 1, y0 + 1), fx = x - x0, fy = y - y0;
        const a = y0 * side + x0, b = y0 * side + x1, c = y1 * side + x0, d = y1 * side + x1;
        out[0] = (fieldX[a] * (1 - fx) + fieldX[b] * fx) * (1 - fy) + (fieldX[c] * (1 - fx) + fieldX[d] * fx) * fy;
        out[1] = (fieldY[a] * (1 - fx) + fieldY[b] * fx) * (1 - fy) + (fieldY[c] * (1 - fx) + fieldY[d] * fx) * fy;
        // Avoid a scan-order preference at a numerically cancelled equilibrium.
        if (Math.abs(out[0]) + Math.abs(out[1]) < total * 1e-12) out[0] = out[1] = 0;
        return out;
    }
    return { build, sample, clear };
}

const field = createCombinedMagnetField();
const vector = new Float64Array(2);
export function resetCombinedMagnetField() { field.clear(); }
export function runCombinedMagnetGeneration({n, board, method, target, anchor, paletteLength, moved}) {
    if (!field.build(n, board, target, paletteLength, anchor)) return board;
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
        const i = row * n + col, tile = board[i];
        if (moved[i] || tile.isGold || normalize(tile.k, paletteLength) === target) continue;
        const rank = normalize(tile.k - anchor, paletteLength);
        const probability = method === 'time_magnet' ? .15 + rank / paletteLength * .8
            : method === 'expand' ? .15 + (1 - rank / paletteLength) * .8 : .8;
        if ((method === 'time_magnet' || method === 'expand') && Math.random() >= probability) continue;
        field.sample(row, col, vector);
        const x = vector[0], y = vector[1];
        if (x === 0 && y === 0) continue;
        let score1 = 0, score2 = 0, score3 = 0, first = -1, second = -1, third = -1;
        for (let j = 0; j < 8; j++) {
            const dr = neighbors[j][0], dc = neighbors[j][1], r = row + dr, c = col + dc;
            if (r < 0 || r >= n || c < 0 || c >= n) continue;
            // Compare direction alignment, compensating for diagonal step length.
            const score = (x * dc + y * dr) * (dr && dc ? Math.SQRT1_2 : 1);
            const targetIndex = r * n + c;
            if (score > score1) { score3 = score2; third = second; score2 = score1; second = first; score1 = score; first = targetIndex; }
            else if (score > score2) { score3 = score2; third = second; score2 = score; second = targetIndex; }
            else if (score > score3) { score3 = score; third = targetIndex; }
        }
        if (first < 0 || ((method === 'magnet' || method === 'cosmic_magnet') && Math.random() >= probability)) continue;
        const attempts = method === 'cosmic_magnet' ? 1 : 3;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const j = attempt === 0 ? first : attempt === 1 ? second : third;
            if (j < 0 || moved[j] || board[j].isGold || rank >= normalize(board[j].k - anchor, paletteLength)) continue;
            const saved = board[i]; board[i] = board[j]; board[j] = saved;
            moved[i] = moved[j] = 1;
            break;
        }
    }
    return board;
}
