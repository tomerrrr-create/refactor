import { validateEvolutionTuning } from '../evolution-tuning.js';
// Version 1: asynchronous voter model. Keep old versions stable for recipe replay.
const VERSION = 1;
const PROXIMITY_VERSION = 2;
const UINT32_MAX = 0xffffffff;
const isUint32 = value => Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;

export function createIslandsSession(seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0], rules = {}, mode = 'classic') {
    if (!isUint32(seed)) throw new Error('Invalid Islands seed');
    if (!['classic', 'proximity'].includes(mode)) throw new Error('Invalid Islands mode');
    const { activity } = validateEvolutionTuning({ islands: rules }).islands;
    return { islandsVersion: mode === 'proximity' ? PROXIMITY_VERSION : VERSION, seed, state: seed, steps: 0,
        ...(mode === 'proximity' ? { mode } : {}), ...(activity === .05 ? {} : { activity }) };
}

export function restoreIslandsSession(snapshot) {
    if (!snapshot || ![VERSION, PROXIMITY_VERSION].includes(snapshot.islandsVersion) ||
        (snapshot.islandsVersion === PROXIMITY_VERSION && snapshot.mode !== 'proximity') ||
        (snapshot.islandsVersion === VERSION && snapshot.mode !== undefined && snapshot.mode !== 'classic') || !isUint32(snapshot.seed) ||
        !isUint32(snapshot.state) || !Number.isSafeInteger(snapshot.steps) || snapshot.steps < 0) {
        throw new Error('Unsupported or invalid Islands recording');
    }
    if (Object.hasOwn(snapshot, 'activity')) validateEvolutionTuning({ islands: { activity: snapshot.activity } });
    return { islandsVersion: snapshot.islandsVersion, seed: snapshot.seed, state: snapshot.state, steps: snapshot.steps,
        ...(snapshot.islandsVersion === PROXIMITY_VERSION ? { mode: 'proximity' } : {}),
        ...(Object.hasOwn(snapshot, 'activity') ? { activity: snapshot.activity } : {}) };
}

// Mulberry32: explicit 32-bit arithmetic gives the same sequence on every device.
function random(session) {
    session.state = (session.state + 0x6D2B79F5) >>> 0;
    let value = session.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function runIslandsGeneration({ n, currentBoardState, currentPalette }, session) {
    if (!session) throw new Error('Islands session is missing');
    const proximity = session.islandsVersion === PROXIMITY_VERSION;
    if (proximity && !currentPalette?.length) throw new Error('Islands proximity needs a palette');
    const paletteLength = currentPalette?.length || 1;
    const span = Math.max(1, paletteLength - 1);
    if (n >= 2 && currentBoardState.length) {
        const count = Math.max(1, Math.floor(currentBoardState.length * (session.activity ?? .05)));
        for (let attempt = 0; attempt < count; attempt++) {
            const index = Math.floor(random(session) * currentBoardState.length);
            const row = Math.floor(index / n), col = index % n;
            const direction = Math.floor(random(session) * 4);
            let neighbor;
            if (direction === 0 && row > 0) neighbor = index - n;
            else if (direction === 1 && row < n - 1) neighbor = index + n;
            else if (direction === 2 && col > 0) neighbor = index - 1;
            else if (direction === 3 && col < n - 1) neighbor = index + 1;
            else continue;
            const target = currentBoardState[index], source = currentBoardState[neighbor];
            if (!target || !source || target.isGold || source.isGold) continue;
            // Original proximity rule: choose a random neighbor, then accept by
            // normalized rank distance. No weighted neighbor selection or strength setting.
            // Keep classic's random sequence completely unchanged.
            if (proximity) {
                const targetRank = ((target.k % paletteLength) + paletteLength) % paletteLength;
                const sourceRank = ((source.k % paletteLength) + paletteLength) % paletteLength;
                if (random(session) >= span / (span + 4 * Math.abs(targetRank - sourceRank))) continue;
            }
            target.k = source.k;
            target.v = source.k;
            target.prevK = null;
        }
    }
    session.steps++;
    return currentBoardState;
}

// One compact starting board per session, never a board snapshot per generation.
export function recordIslandsBoard(tiles) {
    const runs = [];
    for (const tile of tiles) {
        const gold = tile.isGold ? 1 : 0, v = tile.v ?? tile.k;
        const last = runs[runs.length - 1];
        if (last && last[1] === tile.k && last[2] === v && last[3] === gold) last[0]++;
        else runs.push([1, tile.k, v, gold]);
    }
    return runs;
}

export function restoreIslandsBoard(n, runs) {
    if (!Number.isInteger(n) || n < 1 || n > 327 || !Array.isArray(runs)) throw new Error('Invalid Islands board');
    const tiles = [];
    for (const run of runs) {
        if (!Array.isArray(run) || run.length !== 4 || !Number.isInteger(run[0]) || run[0] < 1 ||
            !Number.isInteger(run[1]) || run[1] < 0 || !Number.isFinite(run[2]) ||
            ![0, 1].includes(run[3]) || tiles.length + run[0] > n * n) throw new Error('Invalid Islands board run');
        for (let i = 0; i < run[0]; i++) tiles.push({ k: run[1], v: run[2], isGold: !!run[3] });
    }
    if (tiles.length !== n * n) throw new Error('Incomplete Islands board');
    return tiles;
}
