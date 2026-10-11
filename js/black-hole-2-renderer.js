import { BLACK_HOLE_2_DURATION } from './simulations/black-hole-2.js';

let surface, surfaceCtx, frame, stationary, rgb, protectedCells;
let cachedBoard, cachedBatch, cachedPalette, cachedWidth, cachedGap;

// Rasterize a moving square with fractional edge coverage. This replaces tens
// of thousands of Canvas API calls with one ImageData upload per display frame.
function rectangle(data, size, x, y, width, color) {
    const left = Math.max(0, Math.floor(x)), right = Math.min(size, Math.ceil(x + width));
    const top = Math.max(0, Math.floor(y)), bottom = Math.min(size, Math.ceil(y + width));
    const red = color >> 16, green = (color >> 8) & 255, blue = color & 255;
    for (let row = top; row < bottom; row++) {
        const wy = Math.min(row + 1, y + width) - Math.max(row, y);
        for (let col = left; col < right; col++) {
            const alpha = wy * (Math.min(col + 1, x + width) - Math.max(col, x));
            const offset = (row * size + col) * 4, inverse = 1 - alpha;
            data[offset] = red * alpha + data[offset] * inverse;
            data[offset + 1] = green * alpha + data[offset + 1] * inverse;
            data[offset + 2] = blue * alpha + data[offset + 2] * inverse;
        }
    }
}

export function renderBlackHole2Frame(ctx, width, height, board, colors, gap, state, now) {
    const n = state.n;
    // Two samples per cell retain fractional motion while bounding work on
    // large boards. The completed board uses the app's original crisp renderer.
    const size = n * 2, scale = size / width;
    const tileSize = (width - (n - 1) * gap) / n * scale;
    const pitch = tileSize + gap * scale;
    if (!surface) {
        surface = document.createElement('canvas');
        surfaceCtx = surface.getContext('2d');
    }
    if (cachedBoard !== board || cachedBatch !== state.batch || cachedWidth !== width || cachedGap !== gap || cachedPalette !== colors) {
        if (!frame || surface.width !== size || surface.height !== size) {
            surface.width = surface.height = size;
            frame = surfaceCtx.createImageData(size, size);
            stationary = new Uint8ClampedArray(frame.data.length);
        }
        stationary.fill(0);
        for (let i = 3; i < stationary.length; i += 4) stationary[i] = 255;
        rgb = colors.map(hex => parseInt(hex.slice(1), 16));
        protectedCells = [];
        for (let i = 0; i < board.length; i++) {
            if (state.moving[i]) continue;
            if (board[i].isGold) protectedCells.push(i);
            const color = board[i].isGold ? 0xFFD700 : rgb[board[i].k];
            rectangle(stationary, size, (i % n) * pitch, Math.floor(i / n) * pitch, tileSize, color);
        }
        cachedBoard = board; cachedBatch = state.batch; cachedWidth = width; cachedGap = gap; cachedPalette = colors;
    }
    const data = frame.data;
    data.set(stationary);
    const t = Math.max(0, Math.min(1, (now - state.startedAt) / BLACK_HOLE_2_DURATION));
    const bend = 2 * (1 - t) * t * 0.22;
    for (let j = 0; j < state.count * 2; j += 2) {
        const a = state.pairs[j], b = state.pairs[j + 1];
        const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n);
        const dx = bx - ax, dy = by - ay;
        rectangle(data, size, (ax + dx * t - dy * bend) * pitch, (ay + dy * t + dx * bend) * pitch, tileSize, rgb[board[b].k]);
        rectangle(data, size, (bx - dx * t + dy * bend) * pitch, (by - dy * t - dx * bend) * pitch, tileSize, rgb[board[a].k]);
    }
    // Protected cells remain visible even if another tile's arc passes over them.
    for (const i of protectedCells) {
        rectangle(data, size, (i % n) * pitch, Math.floor(i / n) * pitch, tileSize, 0xFFD700);
    }
    surfaceCtx.putImageData(frame, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surface, 0, 0, width, height);
}
