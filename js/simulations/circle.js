// Shared Circle engine. Keep legacy Spiral black_hole playback unchanged.
let blackHoleGeometry = null;
const blackHoleProgress = new WeakMap();

export function runBlackHoleGeneration(n, board) {
    if (!blackHoleGeometry || blackHoleGeometry.n !== n) {
        const center = (n - 1) / 2;
        const radiusSquared = new Float64Array(n * n);
        const inwardNeighbor = new Int32Array(n * n).fill(-1);
        const order = Array.from({ length: n * n }, (_, i) => i);

        for (let i = 0; i < order.length; i++) {
            const row = Math.floor(i / n), col = i % n;
            const dy = row - center, dx = col - center;
            const radius = Math.hypot(dx, dy);
            radiusSquared[i] = dx * dx + dy * dy;
            if (radius === 0) continue;

            // A gentle clockwise spiral. Only inward steps are eligible, so
            // rotation cannot undo the radial ordering that makes circles.
            const angle = Math.atan2(dy, dx) + 0.10 + 0.5 / Math.max(radius, 1);
            const targetRadius = Math.max(0, radius - 0.8);
            const targetR = center + targetRadius * Math.sin(angle);
            const targetC = center + targetRadius * Math.cos(angle);
            let bestDistance = Infinity;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr, nc = col + dc;
                    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                    const nextRadiusSquared = (nr - center) ** 2 + (nc - center) ** 2;
                    if (nextRadiusSquared >= radiusSquared[i]) continue;
                    const distance = (nr - targetR) ** 2 + (nc - targetC) ** 2;
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        inwardNeighbor[i] = nr * n + nc;
                    }
                }
            }
        }
        // Resolve equal radii by angle, without random comparator results.
        order.sort((a, b) => radiusSquared[a] - radiusSquared[b] ||
            Math.atan2(Math.floor(a / n) - center, a % n - center) -
            Math.atan2(Math.floor(b / n) - center, b % n - center));
        blackHoleGeometry = { n, order, inwardNeighbor };
    }

    const { order, inwardNeighbor } = blackHoleGeometry;
    let progress = blackHoleProgress.get(board);
    if (!progress || progress.n !== n) {
        progress = { n, gap: Math.max(1, n * 2), settled: false, reverse: false };
        blackHoleProgress.set(board, progress);
    }
    // A settled board needs no animation. Detect edits, randomization or
    // palette remapping in place and restart the convergence when needed.
    if (progress.settled) {
        let sorted = true;
        for (let j = 1; j < order.length; j++) {
            if (board[order[j - 1]].k > board[order[j]].k) {
                sorted = false;
                break;
            }
        }
        if (sorted) return board;
        progress.gap = Math.max(1, n * 2);
        progress.settled = false;
    }

    // Alternate traversal direction to avoid a persistent scan-direction bias.
    // Every swap preserves the exact colors and includes formerly gold cells.
    progress.reverse = !progress.reverse;
    for (let step = 0; step < order.length; step++) {
        const j = progress.reverse ? order.length - 1 - step : step;
        const outer = order[j], inner = inwardNeighbor[outer];
        if (inner >= 0 && board[outer].k < board[inner].k) {
            const tile = board[inner];
            board[inner] = board[outer];
            board[outer] = tile;
        }
    }

    // Local flow alone can become polygonal or get stuck. Comb-sort passes
    // along exact Euclidean radii remove those traps without replacing colors.
    // At gap 1 a swap-free pass certifies the final radial order.
    for (let pass = 0; pass < 2; pass++) {
        progress.gap = Math.max(1, Math.floor(progress.gap / 1.3));
        let swapped = false;
        for (let j = 0; j + progress.gap < order.length; j++) {
            const inner = order[j], outer = order[j + progress.gap];
            if (board[inner].k > board[outer].k) {
                const tile = board[inner];
                board[inner] = board[outer];
                board[outer] = tile;
                swapped = true;
            }
        }
        if (progress.gap === 1 && !swapped) {
            progress.settled = true;
            break;
        }
    }
    return board;
}

