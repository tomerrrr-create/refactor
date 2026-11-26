const PHI = (1 + Math.sqrt(5)) / 2;
const mix = ([ax, ay], [bx, by]) => [ax + (bx - ax) / PHI, ay + (by - ay) / PHI];
let cachedPlan;

function penroseTriangles(radius, orientation, depth) {
    const corners = Array.from({ length: 10 }, (_, index) => {
        const angle = (index + orientation / 2) * Math.PI / 5 - Math.PI / 2;
        return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });
    let triangles = corners.map((corner, index) => {
        const next = corners[(index + 1) % corners.length];
        return index % 2 ? [0, [0, 0], next, corner] : [0, [0, 0], corner, next];
    });
    // Robinson triangles subdivide by phi. Equal triangle bases pair
    // to form the two Penrose rhombi.
    for (let level = 0; level < depth; level++) {
        const refined = [];
        for (const [type, a, b, c] of triangles) {
            if (type === 0) {
                const p = mix(a, b);
                refined.push([0, c, p, b], [1, p, c, a]);
            } else {
                const q = mix(b, a);
                const r = mix(b, c);
                refined.push([1, r, c, a], [1, q, r, b], [0, r, q, a]);
            }
        }
        triangles = refined;
    }
    return triangles;
}

const pointKey = point => point.map(value => Math.round(value * 1e6)).join(',');
function baseKey([type, , b, c]) {
    const first = pointKey(b), second = pointKey(c);
    return type + ':' + (first < second ? first + '/' + second : second + '/' + first);
}

function edgeDistance([ax, ay], [bx, by], [px, py]) {
    const dx = bx - ax, dy = by - ay;
    const direction = Math.sign(dx * (py - ay) - dy * (px - ax));
    const scale = direction / Math.hypot(dx, dy);
    return (x, y) => (dx * (y - ay) - dy * (x - ax)) * scale;
}

function getCrystalPlan(n, orientation) {
    if (cachedPlan?.n === n && cachedPlan.orientation === orientation) return cachedPlan;
    const center = (n - 1) / 2;
    const radius = n * .8;
    const resolution = Math.max(2.6, Math.min(12, n * .12));
    const depth = Math.max(0, Math.round(Math.log(radius / resolution) / Math.log(PHI)));
    const triangles = penroseTriangles(radius, orientation, depth);
    const baseCounts = new Map();
    for (const triangle of triangles) {
        const base = baseKey(triangle);
        baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
    }

    const arrival = new Uint16Array(n * n);
    const cadence = new Uint8Array(n * n);
    const phase = new Uint8Array(n * n);
    const speed = Math.max(.5, n / 150);
    for (const triangle of triangles) {
        const [type, a, b, c] = triangle;
        const ab = edgeDistance(a, b, c), ac = edgeDistance(a, c, b), bc = edgeDistance(b, c, a);
        const seam = baseCounts.get(baseKey(triangle)) === 2;
        const tileX = (b[0] + c[0]) / 2, tileY = (b[1] + c[1]) / 2;
        const offset = Math.round(Math.hypot(tileX, tileY) * .8 + Math.atan2(tileY, tileX) * 5);
        const top = Math.max(0, Math.ceil(center + Math.min(a[1], b[1], c[1]) - 1e-6));
        const bottom = Math.min(n - 1, Math.floor(center + Math.max(a[1], b[1], c[1]) + 1e-6));
        const left = Math.max(0, Math.ceil(center + Math.min(a[0], b[0], c[0]) - 1e-6));
        const right = Math.min(n - 1, Math.floor(center + Math.max(a[0], b[0], c[0]) + 1e-6));
        for (let row = top; row <= bottom; row++) {
            const y = row - center;
            for (let col = left; col <= right; col++) {
                const index = row * n + col;
                if (cadence[index]) continue;
                const x = col - center;
                const edgeA = ab(x, y), edgeB = ac(x, y), edgeC = bc(x, y);
                if (Math.min(edgeA, edgeB, edgeC) < -1e-6) continue;
                const edge = Math.min(edgeA, edgeB, seam ? Infinity : edgeC) <= .65;
                arrival[index] = Math.floor(Math.max(0, Math.hypot(x, y) - 1.5) / speed);
                cadence[index] = edge ? 2 : 4 + type;
                phase[index] = ((offset % 20) + 20) % 20;
            }
        }
    }
    cachedPlan = { n, orientation, arrival, cadence, phase };
    return cachedPlan;
}

export function growFibonacciCrystal(state, advance) {
    const { arrival, cadence, phase } = getCrystalPlan(state.n, state.orientation);
    for (let index = 0; index < arrival.length; index++) {
        const age = state.crystalFrame - arrival[index];
        if (age < 0 || !cadence[index]) continue;
        // The front picks up the existing pigment; the facets keep moving
        // at different rates once the same front has crossed the board.
        if (age === 0 || (age + phase[index]) % cadence[index] === 0) advance(index);
    }
    state.crystalFrame = Math.min(0xffffffff, state.crystalFrame + 1);
}
