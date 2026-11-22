// Distance to a closed heart contour gives the standing field a single nodal line.
const SAMPLE_COUNT = 64;
const points = Array.from({length: SAMPLE_COUNT}, (_, i) => {
    const angle = 2 * Math.PI * i / SAMPLE_COUNT;
    return [
        .8 * Math.sin(angle) ** 3,
        -.05 * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle)
            - 2 * Math.cos(3 * angle) - Math.cos(4 * angle) + 2.5)
    ];
});
const segments = points.map(([x, y], i) => {
    const [endX, endY] = points[(i + 1) % points.length];
    const dx = endX - x, dy = endY - y;
    return {x, y, dx, dy, inverseLengthSquared: 1 / (dx * dx + dy * dy)};
});
let cachedSize, cachedFrequency, distances, field;

function heartDistance(x, y) {
    let best = Infinity;
    for (const segment of segments) {
        const fromX = x - segment.x, fromY = y - segment.y;
        const t = Math.max(0, Math.min(1,
            (fromX * segment.dx + fromY * segment.dy) * segment.inverseLengthSquared));
        const a = fromX - t * segment.dx, b = fromY - t * segment.dy;
        best = Math.min(best, a * a + b * b);
    }
    return Math.sqrt(best);
}

export function createHeartField(n, frequency) {
    if (!Number.isInteger(n) || n < 1 || n > 327 ||
        !Number.isInteger(frequency) || frequency < 20 || frequency > 20000) throw new Error('Invalid heart field');
    if (cachedSize === n && cachedFrequency === frequency) return field;
    if (cachedSize !== n) {
        distances = new Float32Array(n * n);
        for (let y = 0; y < n; y++) for (let x = 0; x <= (n - 1) / 2; x++) {
            const u = (2 * x + 1) / n - 1, v = (2 * y + 1) / n - 1;
            distances[y * n + x] = distances[y * n + n - 1 - x] = heartDistance(u, v);
        }
    }
    // Higher frequencies tighten the band without changing the silhouette.
    const width = .16 - .12 * Math.log(frequency / 20) / Math.log(1000);
    field = Uint16Array.from(distances, distance => Math.round(65535 * distance / (distance + width)));
    cachedSize = n;
    cachedFrequency = frequency;
    return field;
}

// Coordinates and scales are in plate units. Off-axis sources are mirrored.
// Each source is [x, y, size, tilt]; the center adds its own ring count.
const harmonics = [
    {frequency: 20, center: [.84, -.06, 2], overtones: 1, sources: [
        [.58, -.68, .21, -.22], [.82, .06, .16, -.25], [.52, .67, .24, .5], [0, .82, .14, 0]
    ]},
    {frequency: 123, center: [.65, .025, 5], overtones: 2, sources: [
        [.58, -.64, .34, -.38], [.76, .09, .24, -.54], [.53, .59, .28, .34], [0, .79, .18, 0]
    ]},
    {frequency: 800, center: [.46, .12, 3], overtones: 2.4, sources: [
        [.48, -.52, .45, -.54], [.75, .22, .28, -.19], [.48, .67, .20, .58], [0, .81, .20, 0]
    ]},
    {frequency: 4000, center: [.52, -.23, 4], overtones: 2.7, sources: [
        [.68, -.63, .27, -.68], [.65, .16, .38, -.25], [.48, .73, .24, .56], [0, .52, .33, 0]
    ]},
    {frequency: 20000, center: [.69, -.025, 6], overtones: 3, sources: [
        [.57, -.70, .29, -.61], [.78, .10, .24, -.46], [.52, .66, .30, .76], [0, .83, .15, 0]
    ]}
];
let constellation;

function heartHarmonic(frequency) {
    const upperIndex = Math.max(1, harmonics.findIndex(harmonic => frequency <= harmonic.frequency));
    const lower = harmonics[upperIndex - 1], upper = harmonics[upperIndex];
    const position = Math.log(frequency / lower.frequency) / Math.log(upper.frequency / lower.frequency);
    const blend = position * position * (3 - 2 * position);
    const mix = (from, to) => from + (to - from) * blend;
    return {
        center: lower.center.map((value, i) => mix(value, upper.center[i])),
        overtones: mix(lower.overtones, upper.overtones),
        sources: lower.sources.map((source, i) => {
            const [x, y, size, tilt] = source.map((value, j) => mix(value, upper.sources[i][j]));
            return { x, y, size, cos: Math.cos(tilt), sin: Math.sin(tilt) };
        })
    };
}

function heartRings(count) {
    return Array.from({length: Math.ceil(count)}, (_, i) => ({
        scale: 1 - .9 * i / count,
        weight: Math.min(1, count - i)
    }));
}

function ringResponse(x, y, size, rings, width) {
    let response = 0;
    for (const ring of rings) {
        const scale = size * ring.scale;
        if (Math.max(Math.abs(x), Math.abs(y)) > scale + 2.8 * width) continue;
        const distance = scale * heartDistance(x / scale, y / scale);
        response = Math.max(response, ring.weight * Math.exp(-((distance / width) ** 2)));
    }
    return response;
}

function buildConstellation(n, frequency) {
    const base = new Float32Array(n * n);
    const outward = new Float32Array(base.length), inward = new Float32Array(base.length);
    const detail = Math.log(frequency / 20) / Math.log(1000);
    const width = Math.max(1 / n, .017 - .007 * detail);
    const waveNumber = Math.min(2 * Math.PI * (1.25 + Math.sqrt(frequency / 55)), n * .75);
    const {center: [centerSize, centerY, ringCount], overtones, sources} = heartHarmonic(frequency);
    const centralRings = heartRings(ringCount), satelliteRings = heartRings(overtones);
    for (let row = 0; row < n; row++) for (let col = 0; col <= (n - 1) / 2; col++) {
        const x = Math.abs((2 * col + 1) / n - 1), y = (2 * row + 1) / n - 1;
        const central = ringResponse(x, y - centerY, centerSize, centralRings, width);
        let satellite = 0;
        for (const source of sources) {
            const dx = x - source.x, dy = y - source.y;
            const u = dx * source.cos + dy * source.sin;
            const v = dy * source.cos - dx * source.sin;
            satellite = Math.max(satellite, ringResponse(u, v, source.size, satelliteRings, width * .83));
        }
        // Interference of two foci adds a weak standing wave between the contours.
        const left = Math.hypot(x + .32, y + .15), right = Math.hypot(x - .32, y + .15);
        const interference = Math.cos((left - right) * waveNumber);
        const phase = (left + right) * waveNumber;
        const ripple = .045 * interference * (1 - .75 * Math.max(central, satellite));
        const falloff = Math.min(1, Math.hypot(x, y) / 1.25);
        const energy = .77 + .17 * falloff - Math.max(.69 * central, .64 * satellite);
        const i = row * n + col, mirror = row * n + n - 1 - col;
        base[i] = base[mirror] = energy;
        outward[i] = outward[mirror] = ripple * Math.cos(phase) - .035 * central;
        inward[i] = inward[mirror] = ripple * Math.sin(phase) + .033 * satellite;
    }
    return { n, frequency, base, outward, inward, phase: -1, field: null };
}

export function createHeartConstellationField(n, frequency, steps) {
    if (!Number.isInteger(n) || n < 1 || n > 327 || !Number.isInteger(frequency) ||
        frequency < 20 || frequency > 20000 || !Number.isSafeInteger(steps) || steps < 0) {
        throw new Error('Invalid Heart resonance field');
    }
    if (constellation?.n !== n || constellation.frequency !== frequency) {
        constellation = buildConstellation(n, frequency);
    }
    const phase = steps % 1200;
    if (constellation.phase === phase) return constellation.field;
    const angle = phase * 2 * Math.PI / 1200;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const { base, outward, inward } = constellation;
    const result = new Uint16Array(base.length);
    for (let i = 0; i < result.length; i++) {
        result[i] = Math.round(65535 * (base[i] + cos * outward[i] + sin * inward[i]));
    }
    constellation.phase = phase;
    constellation.field = result;
    return result;
}
