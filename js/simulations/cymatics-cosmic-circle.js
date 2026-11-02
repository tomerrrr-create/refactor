// A radial ordering field over the entire square: no inactive exterior.
let cachedSize = 0, squaredRadius = null, cachedKey = '', cachedField = null;
export function cosmicCircleReach(frequency, steps = 0) {
    const radius = .96 - .36 * Math.log(frequency / 20) / Math.log(1000);
    return radius * (1 + .035 * Math.sin(2 * Math.PI * (steps % 1200) / 1200));
}
export function createCosmicCircleField(n, frequency, steps = 0) {
    if (!Number.isInteger(n) || n < 1 || n > 327 || !Number.isInteger(frequency) ||
        frequency < 20 || frequency > 20000 || !Number.isSafeInteger(steps) || steps < 0) {
        throw new Error('Invalid cosmic circle field');
    }
    const key = `${n}:${frequency}:${steps % 1200}`;
    if (cachedKey === key) return cachedField;
    if (cachedSize !== n) {
        squaredRadius = Float64Array.from({ length: n * n }, (_, i) => {
            const x = (2 * (i % n) + 1 - n) / n, y = (2 * Math.floor(i / n) + 1 - n) / n;
            return x * x + y * y;
        });
        cachedSize = n;
    }
    const scale = cosmicCircleReach(frequency, steps) ** 2;
    const field = new Uint16Array(n * n), peak = 2 / (2 + scale);
    for (let i = 0; i < field.length; i++) {
        const r2 = squaredRadius[i];
        field[i] = Math.round(65535 * r2 / (r2 + scale) / peak);
    }
    cachedKey = key;
    cachedField = field;
    return field;
}
