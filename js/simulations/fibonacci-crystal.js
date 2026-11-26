const PHI = (1 + Math.sqrt(5)) / 2;
const mix = ([ax, ay], [bx, by]) => [ax + (bx - ax) / PHI, ay + (by - ay) / PHI];
export const CLASSIC_CRYSTAL_SETTINGS = Object.freeze({ growthSpeed: 100, tileSize: 2, crystalEdges: 100 });
export const DEFAULT_CRYSTAL_SETTINGS = Object.freeze({ growthSpeed: 25, tileSize: 1, crystalEdges: 0 });
export const CRYSTAL_LIMITS = Object.freeze({ growthSpeed: [25, 200, 25], tileSize: [1, 3, 1], crystalEdges: [0, 200, 25] });

export function validateCrystalSettings(settings) {
    const result = {};
    for (const [key, [min, max, step]] of Object.entries(CRYSTAL_LIMITS)) {
        const value = settings?.[key];
        if (!Number.isInteger(value) || value < min || value > max || (value - min) % step !== 0) {
            throw new Error('Invalid Penrose Crystal setting: ' + key);
        }
        result[key] = value;
    }
    return result;
}

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

function getCrystalPlan(n, orientation, tileSize) {
    if (cachedPlan?.n === n && cachedPlan.orientation === orientation && cachedPlan.tileSize === tileSize) return cachedPlan;
    const center = (n - 1) / 2;
    const radius = n * .8;
    const resolution = Math.max(2.6, Math.min(12, n * .12));
    const depth = Math.max(0, Math.round(Math.log(radius / resolution) / Math.log(PHI)) + 2 - tileSize);
    const triangles = penroseTriangles(radius, orientation, depth);
    const baseCounts = new Map();
    for (const triangle of triangles) {
        const base = baseKey(triangle);
        baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
    }

    const arrival = new Uint16Array(n * n);
    const cadence = new Uint8Array(n * n);
    const phase = new Uint8Array(n * n);
    const distanceToEdge = new Float64Array(n * n);
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
                distanceToEdge[index] = Math.min(edgeA, edgeB, seam ? Infinity : edgeC);
                arrival[index] = Math.floor(Math.max(0, Math.hypot(x, y) - 1.5) / speed);
                cadence[index] = 4 + type;
                phase[index] = ((offset % 20) + 20) % 20;
            }
        }
    }
    cachedPlan = { n, orientation, tileSize, arrival, cadence, phase, distanceToEdge };
    return cachedPlan;
}

export function growFibonacciCrystal(state, advance) {
    // Checkpoints recorded before the controls existed used the Classic settings.
    const { growthSpeed, tileSize, crystalEdges } = state.crystalSettings ?? CLASSIC_CRYSTAL_SETTINGS;
    const { arrival, cadence, phase, distanceToEdge } = getCrystalPlan(state.n, state.orientation, tileSize);
    // Track distance independently from the color clock, so changing
    // speed changes the next increment without moving the front backward.
    const front = state.crystalFront ?? state.crystalFrame * 100;
    const nextFront = front + growthSpeed;
    const edgeWidth = crystalEdges === 0 ? -Infinity : .65 * crystalEdges / 100;
    for (let index = 0; index < arrival.length; index++) {
        const arrivalDistance = arrival[index] * 100;
        if (arrivalDistance >= nextFront || !cadence[index]) continue;
        const interval = distanceToEdge[index] <= edgeWidth ? 2 : cadence[index];
        // The front picks up the existing pigment; the facets keep moving
        // at different rates once the same front has crossed the board.
        if (arrivalDistance >= front || (state.crystalFrame - arrival[index] + phase[index]) % interval === 0) advance(index);
    }
    if (state.crystalSettings) state.crystalFront = Math.min(0xffffffff * 200, nextFront);
    state.crystalFrame = Math.min(0xffffffff, state.crystalFrame + 1);
}
