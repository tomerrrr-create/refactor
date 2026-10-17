import { getBreatheBrightnessFactor, createRandomBreatheSession } from './simulations/breathe.js';
import { validateEvolutionTuning } from './evolution-tuning.js';

export const BREATHE_DISPLAY_MODES = ['off', 'random-cell', 'solo', 'random-color'];
export function validateBreatheDisplay(value) {
    if (!value || value.version !== 1 || ![...BREATHE_DISPLAY_MODES, 'group'].includes(value.mode) ||
        Object.keys(value).some(key => !['version', 'mode', 'tuning'].includes(key))) throw Error('Invalid breathing display');
    return { version: 1, mode: value.mode,
        ...(value.mode !== 'off' ? { tuning: validateEvolutionTuning({ breathe: value.tuning ?? {} }).breathe } : {}) };
}

// Owns visual rhythms only. It never changes tiles or simulation playback state.
export function createBreatheDisplay() {
    let mode = 'off', start = 0, now = 0, rules = { speed: 1, depth: 1 };
    let randomSession = null, delays = new Float64Array(0), board = [], palette = null;
    let reset = false;
    function setMode(next, options = {}) {
        if (![...BREATHE_DISPLAY_MODES, 'group'].includes(next)) throw Error('Invalid breathing mode');
        mode = next; start = now = options.now ?? 0;
        rules = { ...rules, ...options.rules };
        randomSession = null; delays = new Float64Array(0); reset = true;
    }
    function prepare(tiles, colors, timestamp, tuning) {
        board = tiles; palette = colors; now = timestamp;
        if (mode === 'off') return;
        if (rules.speed !== tuning.speed || rules.depth !== tuning.depth) {
            rules = { ...tuning }; start = now; reset = true;
        }
        if (reset) {
            randomSession = ['random-cell', 'random-color'].includes(mode)
                ? createRandomBreatheSession(board, mode, Math.random, rules, palette) : null;
            reset = false;
        }
        if (mode === 'solo' && delays.length !== board.length) {
            delays = Float64Array.from({ length: board.length }, () => Math.random() * 2 * Math.PI / .0015);
        }
        randomSession?.update(Math.max(0, now - start), board, palette);
    }
    return {
        setMode, prepare,
        isActive: () => mode !== 'off',
        factor(index) {
            const tile = board[index];
            if (mode === 'off' || !tile || tile.isGold) return 1;
            return randomSession ? randomSession.factor(index)
                : getBreatheBrightnessFactor(tile, now, start, mode, rules, delays[index] ?? 0);
        }
    };
}
