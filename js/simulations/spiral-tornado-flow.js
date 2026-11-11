// Preserve version 2 artwork and recipes.
// A flowing vortex, not a sort into a pre-painted cone. Geometry only is cached;
// every generation is a pure function of the tiles and size (no hidden clock).
let geometry;
function tornadoGeometry(n) {
    const count = n * n, center = (n - 1) / 2;
    const height = Math.max(1, (n - 1) * .72), eye = (n - 1) * .72;
    const width = row => Math.max(1, (n - 1) * (.09 + .46 * (1 - Math.max(0, Math.min(1, row / Math.max(1, n - 1)))) ** 1.4));
    const targets = new Int32Array(count * 2).fill(-1);
    const order = Array.from({length: count}, (_, i) => i);
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / n), col = i % n;
        const x = (col - center) / width(row), y = (row - eye) / height;
        const radius = Math.hypot(x, y);
        if (!radius) continue;
        // Clockwise circulation dominates inward draw. The smooth coordinate
        // warp makes the crown broad and the lower turns compact, with no mask.
        const angle = .12 / Math.max(.6, radius);
        const inward = Math.max(0, 1 - .025 / Math.max(.5, radius));
        const ty = (x * Math.sin(angle) + y * Math.cos(angle)) * inward;
        const tx = (x * Math.cos(angle) - y * Math.sin(angle)) * inward;
        const targetR = eye + ty * height + .22 * (1 - row / Math.max(1, n - 1));
        const targetC = center + tx * width(targetR);
        const dx = targetC - col, dy = targetR - row, scale = Math.hypot(dx, dy);
        if (!scale) continue;
        let first = -Infinity, second = -Infinity;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const r = row + dr, c = col + dc;
            if (r < 0 || r >= n || c < 0 || c >= n) continue;
            const score = (dx * dc + dy * dr) / (scale * Math.hypot(dr, dc));
            if (score <= .25) continue;
            if (score > first) {
                targets[i * 2 + 1] = targets[i * 2]; second = first;
                targets[i * 2] = r * n + c; first = score;
            } else if (score > second) { targets[i * 2 + 1] = r * n + c; second = score; }
        }
    }
    // Distribute work spatially rather than dragging a horizontal scan line.
    const hash = i => Math.imul(i ^ (i >>> 16), 0x45d9f3b) >>> 0;
    order.sort((a, b) => hash(a) - hash(b));
    return {n, targets, order, moved: new Uint8Array(count)};
}
export function runFlowTornadoGeneration(n, board) {
    if (!geometry || geometry.n !== n) geometry = tornadoGeometry(n);
    const {targets, order, moved} = geometry;
    moved.fill(0);
    for (const i of order) {
        if (moved[i] || board[i].isGold) continue;
        for (let choice = 0; choice < 2; choice++) {
            const j = targets[i * 2 + choice];
            if (j < 0 || moved[j] || board[j].isGold || board[i].k <= board[j].k) continue;
            const tile = board[i]; board[i] = board[j]; board[j] = tile;
            moved[i] = moved[j] = 1;
            break;
        }
    }
    return board;
}
