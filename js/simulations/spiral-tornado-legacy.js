// Version 1 recordings retain their original geometry and swaps.
// A clockwise helix seen from the side, wide above and narrow at its foot.
// Geometry only is cached: edits, Undo, resizing and replay need no engine clock.
let geometry;
function tornadoGeometry(n) {
    const count = n * n, center = (n - 1) / 2;
    const progress = new Float64Array(count).fill(-1);
    const nearest = new Int32Array(count).fill(-1);
    // Rasterize the projected helix. Positive angles rotate clockwise in canvas
    // coordinates; the small vertical ellipse reveals the front/back of each turn.
    const samples = Math.max(1, n * 80);
    for (let s = 0; s <= samples; s++) {
        const t = s / samples, angle = Math.PI + t * Math.PI * 10;
        const radius = (n - 1) * .46 * (1 - .94 * t);
        const col = Math.round(center + radius * Math.cos(angle));
        const row = Math.round((n - 1) * (.08 + .84 * t + .055 * (1 - t) * Math.sin(angle)));
        const i = row * n + col;
        if (progress[i] < 0) { progress[i] = t; nearest[i] = i; }
    }
    // Spread each turn into a ribbon, inside the tapered silhouette only.
    const inside = i => {
        const y = Math.floor(i / n) / Math.max(1, n - 1);
        const t = Math.max(0, Math.min(1, (y - .08) / .84));
        return y >= .025 && y <= .97 && Math.abs(i % n - center) <= Math.max(.5, (n - 1) * .46 * (1 - .94 * t));
    };
    // Euclidean nearest-curve propagation keeps ribbons rounded rather than
    // giving them the rectangular corners of Manhattan-distance flood filling.
    for (let pass = 0; pass < 4; pass++) {
        const reverse = pass % 2;
        for (let p = 0; p < count; p++) {
            const i = reverse ? count - 1 - p : p;
            const row = Math.floor(i / n), col = i % n;
            let seed = nearest[i];
            let distance = seed < 0 ? Infinity : (Math.floor(seed / n) - row) ** 2 + (seed % n - col) ** 2;
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr, c = col + dc;
                if (r < 0 || r >= n || c < 0 || c >= n) continue;
                const candidate = nearest[r * n + c];
                if (candidate < 0) continue;
                const d = (Math.floor(candidate / n) - row) ** 2 + (candidate % n - col) ** 2;
                if (d < distance) { distance = d; seed = candidate; }
            }
            nearest[i] = seed;
        }
    }
    const order = Array.from({length: count}, (_, i) => i);
    // The surrounding colors form the quiet background. Within the funnel,
    // increasing palette rank travels along the helix from crown to foot.
    const key = i => !inside(i) ? -2 + Math.floor(i / n) / Math.max(1, n) : progress[nearest[i]];
    order.sort((a, b) => key(a) - key(b) || a - b);
    return {n, order, movable: new Uint32Array(count)};
}
export function runLegacyTornadoGeneration(n, board) {
    if (!geometry || geometry.n !== n) geometry = tornadoGeometry(n);
    const {order, movable} = geometry;
    let length = 0;
    for (const i of order) if (!board[i].isGold) movable[length++] = i;
    // Coarse exchanges feed each turn; adjacent exchanges smooth the flowing
    // ribbons. Fixed work per generation, independent of random/time/cache state.
    for (const gap of new Set([Math.max(1, n), Math.max(1, Math.floor(Math.sqrt(n))), 1])) {
        for (let reverse = 0; reverse < 2; reverse++) {
            for (let p = 0; p < length - gap; p++) {
                const a = reverse ? length - gap - 1 - p : p;
                const i = movable[a], j = movable[a + gap];
                if (board[i].k > board[j].k) {
                    const tile = board[i]; board[i] = board[j]; board[j] = tile;
                }
            }
        }
    }
    return board;
}
