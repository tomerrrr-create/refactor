// Painting in palette-rank space: the app supplies the currently sorted palette.
// Each wave visits a tile once, as its expanding front crosses that tile.
export const WIND_DURATION = 2200;
export const WIND_MAX_WAVES = 6;
const wrap = (value, size) => ((value % size) + size) % size;

export function createWindWave(n, index, paletteLength, base, time) {
    const x = index % n, y = Math.floor(index / n);
    return { x, y, n, paletteLength, base: wrap(base, paletteLength), time, radius: -1,
        maxRadius: Math.max(...[[0,0],[n-1,0],[0,n-1],[n-1,n-1]].map(([cx,cy]) => Math.hypot(cx-x,cy-y))) };
}

export function advanceWindWave(wave, elapsed, paint) {
    const progress = Math.min(1, Math.max(0, elapsed / WIND_DURATION));
    const radius = wave.maxRadius * progress, previous = wave.radius;
    if (radius <= previous) return progress === 1;
    const { n, x: cx, y: cy, paletteLength, base } = wave;
    const extent = Math.ceil(radius);
    for (let y = Math.max(0, cy - extent); y <= Math.min(n - 1, cy + extent); y++) {
        const dy = y - cy, outside = Math.sqrt(Math.max(0, radius * radius - dy * dy));
        if (Math.abs(dy) > radius) continue;
        const left = Math.max(0, Math.ceil(cx - outside - 1e-9)), right = Math.min(n - 1, Math.floor(cx + outside + 1e-9));
        const inside = previous >= Math.abs(dy) ? Math.sqrt(Math.max(0, previous * previous - dy * dy)) : -1;
        const spans = inside < 0 ? [[left, right]]
            : [[left, Math.min(right, Math.ceil(cx - inside) - 1)], [Math.max(left, Math.floor(cx + inside) + 1), right]];
        for (const [start, end] of spans) for (let x = start; x <= end; x++) {
            const distance = Math.hypot(x - cx, dy);
            if (distance > radius + 1e-9 || distance <= previous + 1e-9) continue;
            const rank = wrap(base + Math.round(distance / Math.max(1, n - 1) * paletteLength * 1.25), paletteLength);
            paint(y * n + x, rank);
        }
    }
    wave.radius = radius;
    return progress === 1;
}

export function createWindPainter({ context, paint, onStart, onCommit, onFrame,
    now = () => performance.now(), requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame,
    reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches }) {
    let waves = [], frame = null, batch = false, pointer = null, lastIndex = -1, lastTime = -Infinity, serial = 0;
    function commit() { if (batch) { batch = false; onCommit(); } }
    function tick(time) {
        frame = null;
        waves = waves.filter(wave => !advanceWindWave(wave, reducedMotion() ? WIND_DURATION : time - wave.time, paint));
        onFrame();
        if (waves.length) frame = requestFrame(tick);
        else if (pointer === null) commit();
    }
    function emit(index, force = false) {
        const { n, paletteLength, base } = context(index), time = now();
        if (index < 0 || index >= n * n || !paletteLength) return;
        if (!force && (index === lastIndex || time - lastTime < 100 ||
            Math.hypot(index % n - lastIndex % n, Math.floor(index / n) - Math.floor(lastIndex / n)) < Math.max(1, n * .025))) return;
        if (!batch) { onStart(); batch = true; }
        // Replace the oldest front when dragging quickly; never accumulate unbounded work.
        if (waves.length === WIND_MAX_WAVES) waves.shift();
        waves.push(createWindWave(n, index, paletteLength, base + Math.round(serial++ * paletteLength * .11), time));
        lastIndex = index; lastTime = time;
        if (frame === null) frame = requestFrame(tick);
    }
    return {
        down(id, index) { if (pointer !== null || index < 0) return false; pointer = id; emit(index, true); return true; },
        move(id, index) { if (pointer === id && index >= 0) emit(index); },
        up(id) { if (pointer !== id) return; pointer = null; if (!waves.length) commit(); },
        stop() { if (frame !== null) cancelFrame(frame); frame = null; waves = []; pointer = null; lastIndex = -1; lastTime = -Infinity; commit(); },
        get activeWaves() { return waves.length; }
    };
}
