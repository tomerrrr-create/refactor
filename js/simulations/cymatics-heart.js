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

export function createHeartField(n, frequency) {
    if (!Number.isInteger(n) || n < 1 || n > 327 ||
        !Number.isInteger(frequency) || frequency < 20 || frequency > 20000) throw new Error('Invalid heart field');
    if (cachedSize === n && cachedFrequency === frequency) return field;
    if (cachedSize !== n) {
        distances = new Float32Array(n * n);
        for (let y = 0; y < n; y++) for (let x = 0; x <= (n - 1) / 2; x++) {
            const u = (2 * x + 1) / n - 1, v = (2 * y + 1) / n - 1;
            let best = Infinity;
            for (const segment of segments) {
                const fromX = u - segment.x, fromY = v - segment.y;
                const t = Math.max(0, Math.min(1,
                    (fromX * segment.dx + fromY * segment.dy) * segment.inverseLengthSquared));
                const a = fromX - t * segment.dx, b = fromY - t * segment.dy;
                best = Math.min(best, a * a + b * b);
            }
            distances[y * n + x] = distances[y * n + n - 1 - x] = Math.sqrt(best);
        }
    }
    // Higher frequencies tighten the band without changing the silhouette.
    const width = .16 - .12 * Math.log(frequency / 20) / Math.log(1000);
    field = Uint16Array.from(distances, distance => Math.round(65535 * distance / (distance + width)));
    cachedSize = n;
    cachedFrequency = frequency;
    return field;
}
