import { BLACK_HOLE_2_DURATION } from './simulations/black-hole-2.js';

let surface, surfaceCtx, frame, source, destination, flowX, flowY, cellAt;
let cachedBoard, cachedBatch, cachedPalette, cachedWidth, cachedGap;

// Backward sampling keeps the image fully covered during a swap. Moving
// independent squares left holes and overlapped, causing dark rhythmic flashes.
function sample(data, size, x, y, out, offset, weight) {
    x = Math.max(0, Math.min(size - 1, x));
    y = Math.max(0, Math.min(size - 1, y));
    const left = Math.floor(x), top = Math.floor(y);
    const right = Math.min(size - 1, left + 1), bottom = Math.min(size - 1, top + 1);
    const fx = x - left, fy = y - top;
    const a = (top * size + left) * 4, b = (top * size + right) * 4;
    const c = (bottom * size + left) * 4, d = (bottom * size + right) * 4;
    for (let channel = 0; channel < 3; channel++) {
        const above = data[a + channel] * (1 - fx) + data[b + channel] * fx;
        const below = data[c + channel] * (1 - fx) + data[d + channel] * fx;
        out[offset + channel] += (above * (1 - fy) + below * fy) * weight;
    }
}

export function renderBlackHole2Frame(ctx, width, height, board, colors, gap, state, now) {
    const n = state.n, size = n * 2;
    const tileSize = (width - (n - 1) * gap) / n;
    const pitch = (tileSize + gap) * size / width;
    if (!surface) {
        surface = document.createElement('canvas');
        surfaceCtx = surface.getContext('2d');
    }
    if (cachedBoard !== board || cachedBatch !== state.batch || cachedWidth !== width || cachedGap !== gap || cachedPalette !== colors) {
        if (!frame || surface.width !== size || surface.height !== size) {
            surface.width = surface.height = size;
            frame = surfaceCtx.createImageData(size, size);
            source = new Uint8ClampedArray(frame.data.length);
            destination = new Uint8ClampedArray(frame.data.length);
            cellAt = new Uint32Array(size * size);
        }
        const rgb = colors.map(hex => parseInt(hex.slice(1), 16));
        const origins = Uint32Array.from(board, (_, i) => i);
        flowX = new Float32Array(board.length);
        flowY = new Float32Array(board.length);
        for (let j = 0; j < state.count * 2; j += 2) {
            const a = state.pairs[j], b = state.pairs[j + 1];
            origins[a] = b; origins[b] = a;
            flowX[a] = (b % n - a % n) * pitch;
            flowY[a] = (Math.floor(b / n) - Math.floor(a / n)) * pitch;
            flowX[b] = -flowX[a]; flowY[b] = -flowY[a];
        }
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = Math.min(n - 1, Math.floor((y + 0.5) / pitch)) * n + Math.min(n - 1, Math.floor((x + 0.5) / pitch));
                const p = y * size + x, offset = p * 4;
                cellAt[p] = i;
                const before = board[origins[i]], after = board[i];
                const from = before.isGold ? 0xFFD700 : rgb[before.k];
                const to = after.isGold ? 0xFFD700 : rgb[after.k];
                for (let c = 0; c < 3; c++) {
                    source[offset + c] = (from >> (16 - c * 8)) & 255;
                    destination[offset + c] = (to >> (16 - c * 8)) & 255;
                }
                source[offset + 3] = destination[offset + 3] = 255;
            }
        }
        cachedBoard = board; cachedBatch = state.batch; cachedWidth = width; cachedGap = gap; cachedPalette = colors;
    }
    const linear = Math.max(0, Math.min(1, (now - state.startedAt) / BLACK_HOLE_2_DURATION));
    const t = linear * linear * (3 - 2 * linear);
    const bend = 0.18 * 4 * t * (1 - t);
    const data = frame.data;
    data.set(destination);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const p = y * size + x, offset = p * 4, i = cellAt[p];
            const dx = flowX[i], dy = flowY[i];
            if (dx || dy) {
                data[offset] = data[offset + 1] = data[offset + 2] = 0;
                sample(source, size, x - dx * t + dy * bend, y - dy * t - dx * bend, data, offset, 1 - t);
                sample(destination, size, x - dx * (1 - t) - dy * bend, y - dy * (1 - t) + dx * bend, data, offset, t);
            }
            // Keep separators and protected cells stationary throughout the flow.
            if (gap > 0 && ((x + 0.5) % pitch >= tileSize * size / width || (y + 0.5) % pitch >= tileSize * size / width)) {
                data[offset] = data[offset + 1] = data[offset + 2] = 0;
            }
        }
    }
    surfaceCtx.putImageData(frame, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surface, 0, 0, width, height);
}
