// A soft heart contour is sampled where two diagonal waves cross.
const STEPS_PER_CYCLE = 1200;
const SAMPLES = 64;
const points = Array.from({length: SAMPLES}, (_, i) => {
    const angle = 2 * Math.PI * i / SAMPLES;
    return [
        .55 * Math.sin(angle) ** 3,
        -.034 * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle)
            - 2 * Math.cos(3 * angle) - Math.cos(4 * angle) + 2.5)
    ];
});
const segments = points.map(([x, y], i) => {
    const [endX, endY] = points[(i + 1) % SAMPLES];
    const dx = endX - x, dy = endY - y;
    return {x, y, dx, dy, inverseLengthSquared: 1 / (dx * dx + dy * dy)};
});

let geometry;

function buildGeometry(n, frequency) {
    const contour = new Float32Array(n * n);
    const shade = new Float32Array(n * n);
    const phaseOffsets = new Float64Array(2 * n - 1);
    const detail = Math.log(frequency / 20) / Math.log(1000);
    const waveNumber = 2.8 + 4.8 * detail;
    const width = Math.max(1.2 / n, .07 - .023 * detail);
    for (let i = 0; i < phaseOffsets.length; i++) phaseOffsets[i] = waveNumber * (i - n + 1) * Math.SQRT2 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const u = (2 * x + 1) / n - 1, v = (2 * y + 1) / n - 1;
        const i = y * n + x;
        shade[i] = .44 + .15 * Math.min(1, (u * u + v * v) / 1.4);
        if (Math.abs(u) > .82 || Math.abs(v) > .83) continue;
        let best = Infinity;
        for (const segment of segments) {
            const fromX = u - segment.x, fromY = v - segment.y;
            const t = Math.max(0, Math.min(1,
                (fromX * segment.dx + fromY * segment.dy) * segment.inverseLengthSquared));
            const dx = fromX - t * segment.dx, dy = fromY - t * segment.dy;
            best = Math.min(best, dx * dx + dy * dy);
        }
        contour[i] = Math.exp(-best / (width * width));
    }
    return {n, frequency, contour, shade, phaseOffsets, step: -1, field: null};
}

function sampleContour(contour, n, x, y) {
    if (x < 0 || y < 0 || x >= n - 1 || y >= n - 1) return 0;
    const left = Math.floor(x), top = Math.floor(y);
    const rx = x - left, ry = y - top;
    const i = top * n + left;
    return (contour[i] * (1 - rx) + contour[i + 1] * rx) * (1 - ry)
        + (contour[i + n] * (1 - rx) + contour[i + n + 1] * rx) * ry;
}

export function createHeartField(n, frequency, phaseStep = 0) {
    if (!Number.isInteger(n) || n < 1 || n > 327 || !Number.isInteger(frequency) ||
        frequency < 20 || frequency > 20000 || !Number.isSafeInteger(phaseStep) || phaseStep < 0) {
        throw new Error('Invalid Heart resonance field');
    }
    if (geometry?.n !== n || geometry.frequency !== frequency) geometry = buildGeometry(n, frequency);
    const step = phaseStep % STEPS_PER_CYCLE;
    if (geometry.step === step) return geometry.field;

    const phase = 2 * Math.PI * step / STEPS_PER_CYCLE;
    const {contour, shade, phaseOffsets} = geometry;
    const forward = phaseOffsets.map(offset => Math.cos(offset - phase));
    const backward = phaseOffsets.map(offset => Math.cos(offset + phase * 2 + .55));
    const field = new Uint16Array(n * n);
    const drift = n / 2;
    const breath = .08 + .92 * (.5 + .5 * Math.cos(phase + .16));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const a = forward[x + y], b = backward[x - y + n - 1];
        const meeting = .25 * (1 + a) * (1 + b);
        const heart = sampleContour(contour, n,
            x + drift * (.044 * a + .022 * b), y + drift * (.036 * b - .022 * a));
        const i = y * n + x;
        const waves = .12 * a + .11 * b;
        const revealed = heart * breath * (.26 + .26 * meeting);
        field[i] = Math.round(65535 * (shade[i] + waves) * (1 - revealed));
    }
    geometry.step = step;
    geometry.field = field;
    return field;
}
