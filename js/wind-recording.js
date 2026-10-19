import { normalizeWindSettings, WIND_MODE_SEQUENCE } from './wind-settings.js';
import { createWindWave, advanceWindWave, WIND_MAX_WAVES } from './wind-paint.js';

export const isWindCommand = action => ['WIND_WAVE', 'WIND_END'].includes(action.eventName);
const fields = ['mode', 'speed', 'range', 'colorSpan', 'strength', 'trail'];

export function recordWindWave(wave, settings, batch, elapsed) {
    const config = normalizeWindSettings(settings);
    return { windVersion: 1, batch, elapsed, n: wave.n, index: wave.y * wave.n + wave.x,
        base: wave.base, paletteLength: wave.paletteLength,
        settings: Object.fromEntries(fields.map(key => [key, config[key]])) };
}

export function validateWindCommand(action) {
    const value = JSON.parse(action.details);
    if (!value || value.windVersion !== 1 || typeof value.batch !== 'string' ||
        !/^[\w-]{1,80}$/.test(value.batch) || !Number.isFinite(value.elapsed) || value.elapsed < 0) {
        throw new Error('Invalid Wind recording');
    }
    if (action.eventName === 'WIND_END') {
        if (!['complete', 'stop'].includes(value.reason)) throw new Error('Invalid Wind end');
    } else {
        if (!Number.isInteger(value.n) || value.n < 1 || value.n > 327 ||
            !Number.isInteger(value.index) || value.index < 0 || value.index >= value.n * value.n ||
            !Number.isInteger(value.paletteLength) || value.paletteLength < 1 || value.paletteLength > 4096 ||
            !Number.isInteger(value.base) || value.base < 0 || value.base >= value.paletteLength ||
            !WIND_MODE_SEQUENCE.includes(value.settings?.mode)) throw new Error('Invalid Wind wave');
        const normalized = normalizeWindSettings(value.settings);
        if (fields.some(field => normalized[field] !== value.settings[field])) throw new Error('Invalid Wind settings');
    }
    return value;
}

// Only the first wave waits for a generation. Drag samples and the batch end
// keep their recorded milliseconds, even when history redo collapses log dates.
export function prepareWindMacro(actions) {
    let active = null, group = 0, previous = 0;
    for (const action of actions) {
        if (!isWindCommand(action)) continue;
        const value = validateWindCommand(action);
        if (!active) {
            if (action.eventName !== 'WIND_WAVE' || value.elapsed !== 0) throw new Error('Missing Wind start');
            active = value.batch; previous = 0; group++;
        } else {
            if (value.batch !== active || value.elapsed < previous) throw new Error('Invalid Wind sequence');
            action.isGenBased = false;
        }
        action.windGroup = group;
        action.windElapsed = value.elapsed;
        previous = value.elapsed;
        if (action.eventName === 'WIND_END') active = null;
    }
    return actions;
}

// The same wave engine and bounded front count as touch painting. Replay has
// its own transient settings; it never changes the viewer's Wind preferences.
export function createWindReplay({ context, paint, onFrame, onIdle = () => {},
    now = () => performance.now(), requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame,
    reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches }) {
    let waves = [], frame = null;
    function advance(time = now()) {
        waves = waves.filter(wave => !advanceWindWave(wave, reducedMotion() ? wave.duration : time - wave.time,
            (index, rank) => paint(index, rank, wave)));
        onFrame();
    }
    function tick(time) {
        frame = null; advance(time);
        if (waves.length) frame = requestFrame(tick);
        else onIdle();
    }
    return {
        emit(record, time = now()) {
            const { n, paletteLength } = context();
            const x = record.index % record.n, y = Math.floor(record.index / record.n);
            const scale = coordinate => record.n === 1 ? 0 : Math.round(coordinate / (record.n - 1) * (n - 1));
            const index = scale(y) * n + scale(x);
            const base = Math.floor(record.base / record.paletteLength * paletteLength);
            if (waves.length === WIND_MAX_WAVES) waves.shift();
            waves.push(createWindWave(n, index, paletteLength, base, time, record.settings));
            if (frame === null) frame = requestFrame(tick);
        },
        advance,
        stop() { if (frame !== null) cancelFrame(frame); frame = null; waves = []; },
        get activeWaves() { return waves.length; }
    };
}
