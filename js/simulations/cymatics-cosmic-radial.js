// One smooth radial basin. No periodic spatial waves or secondary lobes.
let cachedSize = 0, distances = null, cachedKey = '', cachedField = null;
export function createRadialCosmicField(n, frequency, steps = 0) {
    if (!Number.isInteger(n) || n < 1 || n > 327 || !Number.isInteger(frequency) ||
        frequency < 20 || frequency > 20000 || !Number.isSafeInteger(steps) || steps < 0) {
        throw new Error('Invalid radial cosmic field');
    }
    const step = steps % 1200, key = `${n}:${frequency}:${step}`;
    if (key === cachedKey) return cachedField;
    if (cachedSize !== n) {
        distances = Float64Array.from({ length: n * n }, (_, i) =>
            Math.hypot((2 * (i % n) + 1 - n) / n, (2 * Math.floor(i / n) + 1 - n) / n));
        cachedSize = n;
    }
    const baseRadius = .96 - .36 * Math.log(frequency / 20) / Math.log(1000);
    const radius = baseRadius * (1 + .035 * Math.sin(2 * Math.PI * step / 1200));
    const field = new Uint16Array(n * n);
    for (let i = 0; i < field.length; i++) {
        const r = Math.min(1, distances[i] / radius);
        // Smoothstep has zero slope at the center and outer rim; the flat
        // exterior joins smoothly and never introduces another circular wave.
        field[i] = Math.round(65535 * r * r * (3 - 2 * r));
    }
    cachedKey = key;
    cachedField = field;
    return field;
}
