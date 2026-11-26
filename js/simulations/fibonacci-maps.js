// Geometry and replay state for the four map-based Fibonacci modes.
export const FIBONACCI_MAPS = Object.freeze(['pinwheel-map', 'octagonal', 'apollonian', 'voronoi']);
const SCALE = [1, 3, 1];
export const MAP_LIMITS = {
    growthSpeed: [25, 200, 25],
    tileSize: SCALE,
    circleMinimum: SCALE,
    seedDensity: SCALE,
    crystalEdges: [0, 200, 25]
};
export const MAP_DEFAULTS = {
    'pinwheel-map': { growthSpeed: 50, tileSize: 2, crystalEdges: 75 },
    octagonal: { growthSpeed: 50, tileSize: 2, crystalEdges: 50 },
    apollonian: { growthSpeed: 50, circleMinimum: 2, crystalEdges: 100 },
    voronoi: { growthSpeed: 75, seedDensity: 2, crystalEdges: 75 }
};
const MAX_SEEDS = 32;
const FRAME_MAX = 0xffffffff;
let cachedPlan;

export function validateMapSettings(mode, settings) {
    const clean = {};
    for (const key of Object.keys(MAP_DEFAULTS[mode])) {
        const [min, max, step] = MAP_LIMITS[key];
        const value = settings?.[key];
        if (!Number.isInteger(value) || value < min || value > max || (value - min) % step !== 0) {
            throw new Error('Invalid Fibonacci map setting: ' + key);
        }
        clean[key] = value;
    }
    return clean;
}

export function createFibonacciMap(mode) {
    return { version: 1, frame: 0, front: 0, settings: { ...MAP_DEFAULTS[mode] }, ...(mode === 'voronoi' ? { seeds: [] } : {}) };
}

export function validateFibonacciMap(mode, n, map) {
    const { version, frame, front, seeds, settings } = map ?? {};
    if (version !== 1 || frame !== (frame >>> 0) || !Number.isSafeInteger(front) ||
        front < frame * 25 || front > frame * 200) throw new Error('Invalid Fibonacci map checkpoint');
    if (mode === 'voronoi') {
        if (!Array.isArray(seeds) || seeds.length > MAX_SEEDS || new Set(seeds).size !== seeds.length ||
            seeds.some(index => !Number.isInteger(index) || index < 0 || index >= n * n)) {
            throw new Error('Invalid Voronoi seeds');
        }
    } else if (seeds !== undefined) throw new Error('Unexpected Fibonacci map seeds');
    return { version, frame, front, settings: validateMapSettings(mode, settings), ...(seeds ? { seeds: [...seeds] } : {}) };
}

export function seedFibonacciMap(state, changes) {
    if (state?.mode !== 'voronoi') return;
    const seeds = state.map.seeds;
    const samples = Array.from(changes, change => change.i);
    if (!samples.length) return;
    const point = samples[Math.floor(samples.length / 2)];
    const n = state.n;
    if (!Number.isInteger(point) || point < 0 || point >= n * n) return;
    const distance = Math.max(1, n / 30);
    if (seeds.some(index => Math.hypot(index % n - point % n, (index / n | 0) - (point / n | 0)) < distance)) return;
    state.map = { ...state.map, seeds: [...seeds.slice(1 - MAX_SEEDS), point] };
}

const phase = (x, y) => Math.round(Math.hypot(x, y) * 1.1 + Math.atan2(y, x) * 7);
function makePlan(n) {
    const size = n * n;
    const period = new Uint8Array(size);
    period.fill(7);
    const edge = new Float32Array(size);
    edge.fill(Infinity);
    return { period, edge, offsets: new Int16Array(size), delay: new Uint16Array(size) };
}

function rasterPolygon(n, plan, vertices, interval, offset) {
    const polygon = vertices.map(([x, y]) => [x + (n - 1) / 2, y + (n - 1) / 2]);
    const columns = polygon.map(point => point[0]), rows = polygon.map(point => point[1]);
    const left = Math.max(0, Math.ceil(Math.min(...columns) - 1e-6));
    const right = Math.min(n - 1, Math.floor(Math.max(...columns) + 1e-6));
    const top = Math.max(0, Math.ceil(Math.min(...rows) - 1e-6));
    const bottom = Math.min(n - 1, Math.floor(Math.max(...rows) + 1e-6));
    if (left > right || top > bottom) return;
    const centerX = columns.reduce((sum, x) => sum + x, 0) / columns.length;
    const centerY = rows.reduce((sum, y) => sum + y, 0) / rows.length;
    const sides = polygon.map(([x, y], i) => {
        const [nextX, nextY] = polygon[(i + 1) % polygon.length];
        const dx = nextX - x, dy = nextY - y;
        const sign = Math.sign(dx * (centerY - y) - dy * (centerX - x)) / Math.hypot(dx, dy);
        return [-dy * sign, dx * sign, (dy * x - dx * y) * sign];
    });
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            let distance = Infinity;
            for (let side = 0; side < sides.length; side++) {
                const coefficients = sides[side];
                const edge = coefficients[0] * x + coefficients[1] * y + coefficients[2];
                if (edge < distance) distance = edge;
                if (distance < -1e-6) break;
            }
            if (distance < -1e-6) continue;
            const index = y * n + x;
            plan.edge[index] = Math.max(0, distance);
            plan.period[index] = interval;
            plan.offsets[index] = offset;
        }
    }
}

function drawPinwheel(n, plan, tileSize, refinement) {
    // A 1:2 right triangle, inflated by sqrt(5), has grid vertices
    // (0,0), (4,2), (-1,2). These five children are all similar to it.
    const children = [
        [[0, 2], [-1, 2], [0, 0]], [[0, 1], [0, 0], [2, 1]],
        [[2, 2], [2, 1], [4, 2]], [[2, 1], [2, 2], [0, 1]],
        [[0, 2], [0, 1], [2, 2]]
    ];
    const resolution = Math.max(2.7, Math.min(12, n / 8));
    const depth = Math.max(0, Math.round(Math.log(n / resolution) / Math.log(Math.sqrt(5))) + refinement - tileSize);
    function split(a, b, c, remaining) {
        if (remaining === 0) {
            const [ax, ay] = a, [bx, by] = b;
            const angle = Math.atan2(by - ay, bx - ax);
            rasterPolygon(n, plan, [a, b, c], 4 + Math.abs(Math.round(angle * 3)) % 3, phase(ax, ay) + Math.round(angle * 13));
            return;
        }
        for (const child of children) {
            const points = child.map(([x, y]) => {
                const u = (2 * x + y) / 10, v = (4 * y - 2 * x) / 10;
                return [a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]),
                    a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1])];
            });
            split(points[0], points[2], points[1], remaining - 1);
        }
    }
    split([-n, -n / 2], [n, -n / 2], [-n, n / 2], depth);
    split([n, n / 2], [-n, n / 2], [n, -n / 2], depth);
}

function drawOctagonal(n, plan, tileSize) {
    // Dual of four families of straight lines, at multiples of 45 degrees.
    // Each intersection contributes a square or a 45-degree rhombus.
    const axes = Array.from({ length: 4 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
    const shifts = [.21, .37, .16, .29];
    const side = Math.max(2.5, Math.min(11, n / 8)) * [.72, 1, 1.55][tileSize - 1];
    const extent = Math.ceil(n / side / 2) + 3;
    for (let i = 0; i < axes.length; i++) {
        const [ix, iy] = axes[i];
        for (let j = i + 1; j < axes.length; j++) {
            const [jx, jy] = axes[j], determinant = ix * jy - iy * jx;
            for (let k = -extent; k <= extent; k++) {
                for (let l = -extent; l <= extent; l++) {
                    const a = k + shifts[i], b = l + shifts[j];
                    const x = (a * jy - b * iy) / determinant, y = (ix * b - jx * a) / determinant;
                    if (Math.abs(x) > extent || Math.abs(y) > extent) continue;
                    let px = 0, py = 0;
                    for (let order = 0; order < axes.length; order++) {
                        const [dx, dy] = axes[order];
                        const level = order === i ? k - 1 : order === j ? l - 1 : Math.floor(x * dx + y * dy - shifts[order]);
                        px += dx * level; py += dy * level;
                    }
                    px = (px + 1.1) * side; py = (py + 1.1) * side;
                    const u = ix * side, v = iy * side, w = jx * side, z = jy * side;
                    rasterPolygon(n, plan, [[px, py], [px + u, py + v], [px + u + w, py + v + z], [px + w, py + z]],
                        j - i === 2 ? 4 : 6, phase(px + (u + w) / 2, py + (v + z) / 2));
                }
            }
        }
    }
}

function drawCircles(n, plan, size) {
    const center = (n - 1) / 2;
    const outer = n * .73;
    const inner = outer * Math.sqrt(3) / (2 + Math.sqrt(3));
    // The signed enclosing circle and its three tangent circles start a
    // Descartes configuration. Reflecting one generates the next circle.
    const initial = [{ k: -1 / outer, x: 0, y: 0 }];
    for (let index = 0; index < 3; index++) {
        const angle = index * 2 * Math.PI / 3 - Math.PI / 2;
        initial.push({ k: 1 / inner, x: (outer - inner) * Math.cos(angle), y: (outer - inner) * Math.sin(angle) });
    }
    const minimum = Math.max(1, n / 125) * [1, 2.25, 4][size - 1];
    const speed = Math.max(.5, n / 150);
    function paintCircle({ k, x, y }, order) {
        const radius = 1 / k, cx = x + center, cy = y + center;
        const offset = phase(x, y);
        for (let row = Math.max(0, Math.ceil(cy - radius)); row <= Math.min(n - 1, Math.floor(cy + radius)); row++) {
            for (let col = Math.max(0, Math.ceil(cx - radius)); col <= Math.min(n - 1, Math.floor(cx + radius)); col++) {
                const inward = radius - Math.hypot(col - cx, row - cy);
                if (inward < 0) continue;
                const index = row * n + col;
                plan.edge[index] = inward;
                plan.delay[index] = Math.round(Math.min(65, inward / speed)) + Math.min(65, order * 17);
                plan.period[index] = radius < n / 20 ? 4 : 6;
                plan.offsets[index] = offset;
            }
        }
    }
    for (const circle of initial.slice(1)) paintCircle(circle, 0);
    function fillGap(circles, previous, order) {
        for (let i = 0; i < 4; i++) {
            if (i === previous) continue;
            const old = circles[i], others = circles.filter((_, index) => index !== i);
            const k = 2 * others.reduce((sum, circle) => sum + circle.k, 0) - old.k;
            if (k <= 0 || 1 / k < minimum) continue;
            const reflected = {
                k,
                x: (2 * others.reduce((sum, circle) => sum + circle.k * circle.x, 0) - old.k * old.x) / k,
                y: (2 * others.reduce((sum, circle) => sum + circle.k * circle.y, 0) - old.k * old.y) / k
            };
            paintCircle(reflected, order);
            const next = [...circles];
            next[i] = reflected;
            fillGap(next, i, order + 1);
        }
    }
    fillGap(initial, -1, 1);
}

function drawVoronoi(state, plan) {
    const { n, orientation, map } = state;
    const density = [4, 8, 14][map.settings.seedDensity - 1];
    const center = (n - 1) / 2;
    const points = [[center, center]];
    for (let i = 0; i < density; i++) {
        const angle = (i + orientation / 2) * Math.PI * (3 - Math.sqrt(5));
        const radius = n * .48 * Math.sqrt((i + 1) / density);
        points.push([center + radius * Math.cos(angle), center + radius * Math.sin(angle)]);
    }
    for (const index of map.seeds) points.push([index % n, index / n | 0]);
    const xs = Float64Array.from(points, point => point[0]);
    const ys = Float64Array.from(points, point => point[1]);
    const count = points.length;
    const separation = new Float64Array(count * count);
    const offsets = Int16Array.from(points, ([x, y]) => phase(x - center, y - center));
    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            const gap = Math.hypot(xs[i] - xs[j], ys[i] - ys[j]);
            separation[i * count + j] = separation[j * count + i] = gap;
        }
    }
    const speed = Math.max(.35, n / 120);
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            let first = Infinity, second = Infinity, owner = 0, runnerUp = 0;
            for (let i = 0; i < count; i++) {
                const dx = xs[i] - col, dy = ys[i] - row, distance = dx * dx + dy * dy;
                if (distance < first) {
                    second = first; runnerUp = owner; first = distance; owner = i;
                } else if (distance < second) {
                    second = distance; runnerUp = i;
                }
            }
            const index = row * n + col;
            const gap = separation[owner * count + runnerUp];
            plan.edge[index] = gap ? (second - first) / (2 * gap) : Infinity;
            plan.delay[index] = Math.floor(Math.sqrt(first) / speed);
            plan.period[index] = 4 + owner % 3;
            plan.offsets[index] = offsets[owner];
        }
    }
}

function getPlan(state) {
    const { n, orientation, mode, map } = state;
    const scale = map.settings.tileSize ?? map.settings.circleMinimum ?? map.settings.seedDensity;
    const refinement = mode === 'pinwheel-map' ? Math.min(2, Math.floor(map.front / 2400)) : 0;
    if (cachedPlan?.n === n && cachedPlan.mode === mode && cachedPlan.scale === scale &&
        cachedPlan.orientation === orientation && cachedPlan.seeds === map.seeds && cachedPlan.refinement === refinement) return cachedPlan;
    const plan = makePlan(n);
    if (mode === 'voronoi') drawVoronoi(state, plan);
    else {
        if (mode === 'pinwheel-map') drawPinwheel(n, plan, scale, refinement);
        if (mode === 'octagonal') drawOctagonal(n, plan, scale);
        if (mode === 'apollonian') drawCircles(n, plan, scale);
        const speed = Math.max(.5, n / 150), center = (n - 1) / 2;
        for (let index = 0; index < plan.delay.length; index++) {
            // Circle interiors develop inward after their rims appear.
            const distance = Math.hypot(index % n - center, (index / n | 0) - center);
            plan.delay[index] += Math.floor(Math.max(0, distance - 1.5) / speed);
        }
    }
    cachedPlan = { ...plan, n, mode, scale, orientation, seeds: map.seeds, refinement };
    return cachedPlan;
}

export function growFibonacciMap(state, advance) {
    const { period, edge, offsets, delay } = getPlan(state);
    const { map } = state;
    const nextFront = map.front + map.settings.growthSpeed;
    const edgeWidth = map.settings.crystalEdges ? .65 * map.settings.crystalEdges / 100 : -1;
    for (let index = 0; index < delay.length; index++) {
        const arrival = delay[index] * 100;
        if (arrival >= nextFront) continue;
        const interval = edge[index] <= edgeWidth ? 2 : period[index];
        if (arrival >= map.front || (map.frame - delay[index] + offsets[index]) % interval === 0) advance(index);
    }
    state.map = { ...map, frame: Math.min(FRAME_MAX, map.frame + 1), front: Math.min(FRAME_MAX * 200, nextFront) };
}
