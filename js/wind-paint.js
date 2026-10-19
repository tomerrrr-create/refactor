import { DEFAULT_WIND_SETTINGS, normalizeWindSettings } from './wind-settings.js';
// Wind can exchange existing colors or paint ranks from the currently sorted palette.
// Each front visits a tile once. Local ripples additionally return paired cells behind the front.
export const WIND_DURATION = 2200;
export const WIND_MAX_WAVES = 6;
const wrap = (value, size) => ((value % size) + size) % size;

export function createWindWave(n, index, paletteLength, base, time, settings = DEFAULT_WIND_SETTINGS) {
    const x = index % n, y = Math.floor(index / n);
    const config = normalizeWindSettings(settings);
    const local = config.mode === 'ripple' ? { paired: new Set(), returns: [], returnCursor: 0, frontRadius: 0 } : {};
    return { ...local, x, y, n, paletteLength, base: wrap(base, paletteLength), time, radius: -1, duration: WIND_DURATION / config.speed, colorSpan: config.colorSpan, mode: config.mode, strength: config.strength,
        maxRadius: Math.max(...[[0,0],[n-1,0],[0,n-1],[n-1,n-1]].map(([cx,cy]) => Math.hypot(cx-x,cy-y))) * config.range };
}

export function advanceWindWave(wave, elapsed, paint) {
    const progress = Math.min(1, Math.max(0, elapsed / wave.duration));
    const radius = wave.maxRadius * progress, previous = wave.radius;
    if (radius <= previous) return progress === 1;
    const { n, x: cx, y: cy, paletteLength, base } = wave;
    if (wave.mode === 'ripple') wave.frontRadius = radius;
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
            const rank = wrap(base + Math.round(distance / Math.max(1, n - 1) * paletteLength * wave.colorSpan), paletteLength);
            paint(y * n + x, rank);
        }
    }
    wave.radius = radius;
    if (wave.mode === 'ripple') {
        // Return most pairs after the front has passed. Never re-use a paired cell
        // in this wave: a color cannot ride the front all the way to the edge.
        while (wave.returnCursor < wave.returns.length) {
            const pair = wave.returns[wave.returnCursor];
            if (progress < 1 && pair.releaseRadius > radius) break;
            wave.returningPair = pair;
            try { paint(pair.index, 0); }
            finally { wave.returningPair = null; }
            wave.returnCursor++;
        }
    }
    return progress === 1;
}

// Exchange existing colors across the moving front. Gold cells remain protected.
// Swaps preserve the complete color histogram; no palette colors are generated.
export function applyWindCell(board, index, rank, wave, now) {
    const tile = board[index];
    if (!tile) return false;
    if (wave.mode === 'ripple' && wave.returningPair) {
        return exchangeWindColors(tile, board[wave.returningPair.other], now);
    }
    if (wave.mode === 'displace' || wave.mode === 'ripple') {
        const x = index % wave.n, y = Math.floor(index / wave.n);
        const dx = x - wave.x, dy = y - wave.y, distance = Math.hypot(dx, dy);
        if (!distance || tile.isGold || (wave.mode === 'ripple' && wave.paired.has(index))) return false;
        const shift = Math.max(1, wave.n * .015 * wave.strength);
        const tx = Math.max(0, Math.min(wave.n - 1, x + Math.round(dx / distance * shift)));
        const ty = Math.max(0, Math.min(wave.n - 1, y + Math.round(dy / distance * shift)));
        const other = ty * wave.n + tx;
        if (wave.mode === 'ripple' && wave.paired.has(other)) return false;
        const neighbor = board[other];
        if (!neighbor || neighbor === tile || neighbor.isGold || neighbor.k === tile.k) return false;
        if (wave.mode === 'ripple') {
            wave.paired.add(index); wave.paired.add(other);
            // Fixed spatial selection, independent of color/palette order. Return
            // roughly three quarters of pairs; the rest leave a small permanent drawing.
            const pairHash = Math.imul(index + 1, 73856093) ^ Math.imul(other + 1, 19349663);
            if (((pairHash ^ (pairHash >>> 16)) >>> 0) % 4 !== 0) {
                wave.returns.push({ index, other, releaseRadius: wave.frontRadius + Math.max(2, wave.n * .06) });
            }
        }
        return exchangeWindColors(tile, neighbor, now);
    }
    if (tile.k === rank && !tile.isGold && tile.v === rank) return false;
    tile.prevK = tile.k; tile.animStart = now;
    tile.k = tile.v = rank; tile.isGold = false;
    return true;
}

function exchangeWindColors(tile, neighbor, now) {
    if (!tile || !neighbor || tile === neighbor || tile.isGold || neighbor.isGold || tile.k === neighbor.k) return false;
    const old = tile.k;
    tile.prevK = tile.k; neighbor.prevK = neighbor.k;
    tile.k = tile.v = neighbor.k; neighbor.k = neighbor.v = old;
    tile.animStart = neighbor.animStart = now;
    return true;
}

export function createWindPainter({ context, paint, onStart, onCommit, onFrame, onWave = () => {}, settings = () => DEFAULT_WIND_SETTINGS, onRunningChange = () => {},
    now = () => performance.now(), requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame,
    reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches }) {
    let waves = [], frame = null, batch = false, pointer = null, lastIndex = -1, lastTime = -Infinity, serial = 0, stoppingGesture = false;
    function commit(reason = 'complete') { if (batch) { batch = false; onCommit(reason); } }
    function tick(time) {
        frame = null;
        waves = waves.filter(wave => !advanceWindWave(wave, reducedMotion() ? wave.duration : time - wave.time, (index, rank) => paint(index, rank, wave)));
        onFrame();
        if (!waves.length) onRunningChange(false);
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
        const config = settings();
        const wave = createWindWave(n, index, paletteLength, base + Math.round(serial++ * paletteLength * .11), time, config);
        waves.push(wave);
        onWave(wave, config);
        onRunningChange(true);
        lastIndex = index; lastTime = time;
        if (frame === null) frame = requestFrame(tick);
    }
    function stop() {
        if (frame !== null) cancelFrame(frame);
        frame = null; waves = []; pointer = null; stoppingGesture = false; lastIndex = -1; lastTime = -Infinity;
        commit('stop'); onRunningChange(false);
    }
    return {
        down(id, index) {
            if (pointer !== null || index < 0) return false;
            if (waves.length) { stop(); pointer = id; stoppingGesture = true; }
            else { pointer = id; stoppingGesture = false; emit(index, true); }
            return true;
        },
        move(id, index) { if (pointer === id && !stoppingGesture && settings().trail && index >= 0) emit(index); },
        up(id) { if (pointer !== id) return; pointer = null; stoppingGesture = false; if (!waves.length) commit(); },
        stop,
        get activeWaves() { return waves.length; }
    };
}
