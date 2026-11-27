import { SIZES } from './constants.js';

export const DEFAULT_XL_BRUSH_WIDTH = 23;
export const MAX_XL_BRUSH_WIDTH = Math.max(...SIZES);
export const BRUSH_SIZES = Object.freeze([1, 3, 5, 7, 9, 11, 13, 15, DEFAULT_XL_BRUSH_WIDTH]);
export const MIN_XL_BRUSH_WIDTH = BRUSH_SIZES.at(-2) + 1;
const XL_WIDTH_KEY = 'colorGridXlBrushWidth';

const isXlBrushWidth = width => Number.isInteger(width) && width >= MIN_XL_BRUSH_WIDTH && width <= MAX_XL_BRUSH_WIDTH;
export function loadXlBrushWidth(storage = globalThis.localStorage) {
    try {
        const width = Number(storage.getItem(XL_WIDTH_KEY));
        if (isXlBrushWidth(width)) return width;
    } catch { /* Use the default when storage is unavailable. */ }
    return DEFAULT_XL_BRUSH_WIDTH;
}
export function saveXlBrushWidth(width, storage = globalThis.localStorage) {
    if (!isXlBrushWidth(width)) throw new RangeError('Invalid XL brush width');
    try { storage.setItem(XL_WIDTH_KEY, String(width)); } catch { /* Keep the session preference. */ }
    return width;
}
export const BRUSH_SHAPES = Object.freeze(['circle', 'square', 'diamond', 'ring', 'line']);
export const brushSizeLabel = size => size === DEFAULT_XL_BRUSH_WIDTH ? 'XL' : String(size);
// Preserve existing XL preferences when its width changes from 21 to 23.
export const normalizeBrushSize = size => size === 21 ? DEFAULT_XL_BRUSH_WIDTH : size;
const cache = new Map();
const customCache = new Map();
let cachedCustomWidth;

export function getBrushOffsets(size, shape = 'circle') {
    const standard = BRUSH_SIZES.includes(size);
    if ((!standard && !isXlBrushWidth(size)) || !BRUSH_SHAPES.includes(shape)) throw new RangeError('Invalid brush');
    const offsets = standard ? cache : customCache;
    if (!standard && cachedCustomWidth !== size) {
        cachedCustomWidth = size;
        customCache.clear();
    }
    const key = `${size}:${shape}`;
    if (!offsets.has(key)) {
        const r = Math.floor(size / 2);
        const shift = size % 2 === 0 ? 0.5 : 0;
        const start = r - (shift ? 1 : 0);
        const cells = [];
        for (let y = -start; y <= r; y++) for (let x = -start; x <= r; x++) {
            const dx = x - shift, dy = y - shift;
            const distance = dx*dx + dy*dy;
            const included = shape === 'square' ||
                (shape === 'diamond' && Math.abs(dx) + Math.abs(dy) <= r) ||
                (shape === 'circle' && distance <= r*r) ||
                (shape === 'ring' && distance <= r*r && (r === 0 || distance > (r-1)*(r-1))) ||
                (shape === 'line' && y === 0);
            if (included) cells.push(Object.freeze([x || 0,y || 0]));
        }
        offsets.set(key, Object.freeze(cells));
    }
    return offsets.get(key);
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
