import { getBrushTiles } from './brush-footprint.js';
import { hexToRgb } from './colors.js';
import { runCenterLineGravity } from './simulations/line-gravity.js';

export const MAX_RELIEF_HEIGHT = 24;
const GOLD = [255, 215, 0];

function smoothLightness(values, n) {
    const radius = Math.max(1, Math.round(n * .035));
    let input = values;
    for (const stride of [1, n]) {
        const output = new Float32Array(values.length);
        const laneStride = stride === 1 ? n : 1;
        for (let lane = 0; lane < n; lane++) {
            const start = lane * laneStride;
            const sample = offset => input[start + Math.min(n - 1, Math.max(0, offset)) * stride];
            let sum = 0;
            for (let offset = -radius; offset <= radius; offset++) sum += sample(offset);
            for (let offset = 0; offset < n; offset++) {
                output[start + offset * stride] = sum / (2 * radius + 1);
                sum += sample(offset + radius + 1) - sample(offset - radius);
            }
        }
        input = output;
    }
    return input;
}

export function createReliefStudy({ n, tiles, palette, brushSize, brushShape, selectedColor }) {
    const colors = palette.map(hexToRgb);
    const board = tiles.map(({ k, isGold }) => ({ k, isGold }));
    const luminance = [...colors, GOLD].map(([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255);
    const values = board.map(tile => luminance[tile.isGold ? colors.length : tile.k] ?? 0);
    const lightness = smoothLightness(values, n);
    // Seed broad shapes and keep the full height range available for sculpting.
    const heights = Int8Array.from(lightness, value => Math.round(value * 18 - 9));
    const initialBrushSize = Math.max(brushSize, n >= 150 ? 9 : n >= 48 ? 5 : 1);
    return { n, board, colors, heights, phase: 0, brushSize: initialBrushSize, brushShape,
        color: selectedColor >= 0 && selectedColor < colors.length ? selectedColor : Math.floor(colors.length / 2) };
}

export function paintRelief(study, from, to, tool, visited) {
    const { n, board, heights, brushSize, brushShape, color } = study;
    let x = from % n, y = Math.floor(from / n);
    const endX = to % n, endY = Math.floor(to / n);
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    while (true) {
        for (const index of getBrushTiles(y * n + x, n, brushSize, brushShape)) {
            // Color can be drawn again if the running flow has moved it away.
            if (tool === 'color') {
                board[index].k = color;
                board[index].isGold = false;
            } else if (!visited.has(index)) {
                visited.add(index);
                const delta = tool === 'raise' ? 8 : -8;
                heights[index] = Math.min(MAX_RELIEF_HEIGHT, Math.max(-MAX_RELIEF_HEIGHT, heights[index] + delta));
            }
        }
        if (x === endX && y === endY) break;
        const step = 2 * error;
        if (step >= dy) { error += dy; x += sx; }
        if (step <= dx) { error += dx; y += sy; }
    }
}

export function stepReliefStudy(study) {
    runCenterLineGravity(study.n, study.board, study.phase++, true, study.heights);
}

export function createReliefRenderer(canvas) {
    const context = canvas.getContext('2d', { alpha: false });
    let pixels, pick, width, height;
    function render({ n, heights, board, colors }, tilted) {
        const nextWidth = Math.max(160, Math.ceil(n * 1.2));
        const nextHeight = Math.max(180, n * 2);
        if (width !== nextWidth || height !== nextHeight) {
            width = canvas.width = nextWidth;
            height = canvas.height = nextHeight;
            pixels = context.createImageData(width, height);
            pick = new Int32Array(width * height);
        }
        pick.fill(-1);
        const data = pixels.data;
        for (let offset = 0; offset < data.length; offset += 4) {
            data[offset] = 13;
            data[offset + 1] = 17;
            data[offset + 2] = 17;
            data[offset + 3] = 255;
        }

        const inset = Math.max(3, Math.floor(width * .035));
        const left = inset, right = width - inset, boardWidth = right - left;
        const top = height * (tilted ? .19 : .035);
        const pitch = height * (tilted ? .61 : .93) / n;
        const lift = tilted ? height * .13 / MAX_RELIEF_HEIGHT : 0;
        const project = (row, elevation) => Math.round(top + pitch * row - lift * elevation);
        function strip(x, start, end, rgb, light, highlight, index) {
            const red = rgb[0] * light + highlight;
            const green = rgb[1] * light + highlight;
            const blue = rgb[2] * light + highlight;
            for (let y = Math.max(0, start); y < Math.min(height, end); y++) {
                const sample = y * width + x, offset = sample * 4;
                data[offset] = red;
                data[offset + 1] = green;
                data[offset + 2] = blue;
                pick[sample] = index;
            }
        }
        for (let x = left; x < right; x++) {
            const sampleX = (x - left + .5) * n / boardWidth;
            const col = Math.min(n - 1, Math.floor(sampleX));
            const lateral = tilted ? (sampleX - col - .5) / 8 : 0;
            const west = col > 0 ? 1 : 0, east = col < n - 1 ? 1 : 0;
            const crossSlope = index => heights[index + east] - heights[index - west];
            for (let row = 0; row < n; row++) {
                const index = row * n + col, elevation = heights[index];
                const north = row > 0 ? index - n : index;
                const south = row < n - 1 ? index + n : index;
                const sideways = crossSlope(index);
                const near = project(row + 1, (elevation + heights[south]) / 2 + lateral * (sideways + crossSlope(south)));
                const far = project(row, (elevation + heights[north]) / 2 + lateral * (sideways + crossSlope(north)));
                const slope = tilted ? Math.tanh((heights[north] - heights[south] - sideways * .65) * .13) : 0;
                const color = board[index].isGold ? GOLD : colors[board[index].k] ?? colors[0];
                const light = tilted ? .87 + slope * .29 : 1;
                const highlight = tilted ? 9 + 11 * Math.max(0, slope) + elevation * .21 : 0;

                if (tilted && row === n - 1) {
                    strip(x, near, Math.max(Math.round(height * .86), near + Math.round(height * .025)), color, .29, 7, index);
                }
                strip(x, Math.min(far, near), Math.max(Math.min(far, near) + 1, far, near),
                    color, near >= far ? light : light * .65, highlight, index);
            }
        }
        context.putImageData(pixels, 0, 0);
    }
    function tileAt(clientX, clientY, samples = pick) {
        const rect = canvas.getBoundingClientRect();
        if (!samples || rect.width <= 0 || rect.height <= 0) return -1;
        const x = Math.floor((clientX - rect.left) * width / rect.width);
        const y = Math.floor((clientY - rect.top) * height / rect.height);
        if (x < 0 || y < 0 || x >= width || y >= height) return -1;
        return samples[y * width + x];
    }
    return { render, tileAt, snapshot: () => pick.slice() };
}
