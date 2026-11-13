// Exact squared-Euclidean nearest-anchor map. Equal distances keep the first
// sampled anchor, matching the engine's original strict-less-than scan.
export function createMagnetNearestMap() {
    let verticalIds = new Int32Array(0);
    let nearestIds = new Int32Array(0);
    let candidates = new Int32Array(0);
    let borders = new Float64Array(0);
    let costs = new Float64Array(0);

    function clear() {
        verticalIds = new Int32Array(0);
        nearestIds = new Int32Array(0);
        candidates = new Int32Array(0);
        borders = new Float64Array(0);
        costs = new Float64Array(0);
    }

    function build(n, anchors) {
        if (verticalIds.length !== n * n) {
            verticalIds = new Int32Array(n * n);
            nearestIds = new Int32Array(n * n);
            candidates = new Int32Array(n);
            borders = new Float64Array(n + 1);
            costs = new Float64Array(n);
        }
        if (!anchors.length) {
            nearestIds.fill(-1);
            return nearestIds;
        }
        verticalIds.fill(-1);
        // An anchor ID is smaller than scale: it breaks distance ties without
        // ever outweighing one unit of squared distance.
        const scale = anchors.length + 1;
        for (let id = 0; id < anchors.length; id++) {
            const point = anchors[id];
            const position = point.r * n + point.c;
            if (verticalIds[position] === -1) verticalIds[position] = id;
        }

        // Vertical nearest anchors, with original-ID tie breaking.
        for (let col = 0; col < n; col++) {
            let last = -1;
            for (let row = 0; row < n; row++) {
                const position = row * n + col;
                if (verticalIds[position] >= 0) last = verticalIds[position];
                verticalIds[position] = last;
            }
            last = -1;
            for (let row = n - 1; row >= 0; row--) {
                const position = row * n + col;
                const id = verticalIds[position];
                if (id >= 0 && anchors[id].r === row) last = id;
                if (last < 0) continue;
                const distance = row - anchors[last].r;
                const previousDistance = id < 0 ? Infinity : row - anchors[id].r;
                if (distance * distance * scale + last < previousDistance * previousDistance * scale + id) {
                    verticalIds[position] = last;
                }
            }
        }

        // Each occupied column contributes a parabola. Its lower envelope gives
        // the exact horizontal minimum in linear time per row (no approximation).
        for (let row = 0; row < n; row++) {
            const offset = row * n;
            let count = -1;
            for (let col = 0; col < n; col++) {
                const id = verticalIds[offset + col];
                if (id < 0) continue;
                const distance = row - anchors[id].r;
                costs[col] = distance * distance * scale + id;
                let intersection = -Infinity;
                while (count >= 0) {
                    const previous = candidates[count];
                    intersection = (costs[col] + scale * col * col - costs[previous] - scale * previous * previous)
                        / (2 * scale * (col - previous));
                    if (intersection > borders[count]) break;
                    count--;
                }
                count++;
                candidates[count] = col;
                borders[count] = count === 0 ? -Infinity : intersection;
                borders[count + 1] = Infinity;
            }
            count = 0;
            for (let col = 0; col < n; col++) {
                while (borders[count + 1] < col) count++;
                nearestIds[offset + col] = verticalIds[offset + candidates[count]];
            }
        }
        return nearestIds;
    }
    return { build, clear };
}
