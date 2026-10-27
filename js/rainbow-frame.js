import { hexToRgb } from './colors.js';

// A smooth decorative frame, independent of palette data and randomness.
export function getColorFrameGradient(color) {
    const rgb = hexToRgb(color);
    const encode = components => '#' + components.map(channel => channel.toString(16).padStart(2, '0')).join('');
    const base = encode(rgb);
    const dark = encode(rgb.map(channel => Math.round(channel * .45)));
    return `conic-gradient(${base} 0%, ${dark} 25%, ${base} 50%, ${dark} 75%, ${base} 100%)`;
}

// Presentation only: keep decorative randomness separate from simulation randomness.
const frameKeys = new WeakMap();

export function updateColorFrame(board, color) {
    board.style.setProperty('--rainbow-frame-pattern', getColorFrameGradient(color));
    // Returning to rainbow must restore its pattern even at the same size.
    frameKeys.delete(board);
}

export function updateRainbowFrame(board, colors) {
    const bounds = board.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(bounds.width + 34));
    const height = Math.max(1, Math.ceil(bounds.height + 34));
    const key = `${width}:${height}:${colors.join(',')}`;
    if (board.classList.contains('glowing-border-rainbow') && frameKeys.get(board) === key) return;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context || !colors.length) return;
    const segment = 3, edge = 9;
    const random = new Uint32Array(2 * (Math.ceil(width / segment) + Math.ceil(height / segment)));
    crypto.getRandomValues(random);
    let index = 0;
    function paint(x, y, w, h) {
        context.fillStyle = colors[random[index++] % colors.length];
        context.fillRect(x, y, w, h);
    }
    // Paint only the perimeter; CSS clips this to a rounded, one-pixel frame.
    for (let x = 0; x < width; x += segment) {
        paint(x, 0, segment, edge);
        paint(x, height - edge, segment, edge);
    }
    for (let y = edge; y < height - edge; y += segment) {
        paint(0, y, edge, segment);
        paint(width - edge, y, edge, segment);
    }
    board.style.setProperty('--rainbow-frame-pattern', `url("${canvas.toDataURL()}")`);
    frameKeys.set(board, key);
}
