export const BRUSH_SIZES = Object.freeze([1, 3, 5, 7, 9, 11, 13, 15, 21]);
export const BRUSH_SHAPES = Object.freeze(['circle', 'square', 'diamond']);
export const brushSizeLabel = size => size === 21 ? 'XL' : String(size);
const cache = new Map();

export function getBrushOffsets(size, shape = 'circle') {
    if (!BRUSH_SIZES.includes(size) || !BRUSH_SHAPES.includes(shape)) throw new RangeError('Invalid brush');
    const key = `${size}:${shape}`;
    if (!cache.has(key)) {
        const r = Math.floor(size / 2), cells = [];
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
            if (shape === 'square' || (shape === 'diamond' ? Math.abs(x) + Math.abs(y) <= r : x*x + y*y <= r*r)) cells.push(Object.freeze([x || 0,y || 0]));
        }
        cache.set(key, Object.freeze(cells));
    }
    return cache.get(key);
}

// Row-major order preserves the legacy circle's random-color draw order.
export function getBrushTiles(centerIndex, n, size, shape = 'circle') {
    if (!Number.isInteger(centerIndex) || centerIndex < 0 || centerIndex >= n*n) return [];
    const cx = centerIndex % n, cy = Math.floor(centerIndex / n), cells = [];
    for (const [dx,dy] of getBrushOffsets(size, shape)) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < n && y < n) cells.push(y*n+x);
    }
    return cells;
}
