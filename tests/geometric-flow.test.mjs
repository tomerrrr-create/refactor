import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYGON_FLOW_MODES } from '../js/simulations/geometric-flow.js';
import { POLYGON_CIRCULATION_MODES, POLYGON_FLOW_PERIOD } from '../js/simulations/polygon-circulation.js';
import { runSpiralGeneration } from '../js/simulations/spiral.js';
import { defaultWorkspaceSettings, deserializeWorkspaceSettings, serializeWorkspaceSettings } from '../js/workspace-settings.js';
import { validateProfileSnapshot } from '../js/profile-state.js';

function makeBoard(n) {
    let seed = 84;
    return Array.from({ length: n * n }, (_, index) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const k = Math.floor(seed / 2 ** 32 * 23);
        return { k, v: k, isGold: index % 523 === 0 };
    });
}

function evolve(n, tiles, method, generations) {
    const currentBoardState = tiles.slice();
    for (let i = 0; i < generations; i++) {
        runSpiralGeneration({ n, currentBoardState, spiralRules: { method } });
    }
    return currentBoardState;
}

function counts(tiles) {
    const result = Array(23).fill(0);
    for (const tile of tiles) result[tile.k]++;
    return result;
}

test('polygon modes preserve colors and anchored gold, including across board-size changes', () => {
    for (const method of POLYGON_FLOW_MODES) {
        for (const n of [1, 16, 249, 16]) {
            const tiles = makeBoard(n);
            const after = evolve(n, tiles, method, 10);
            assert.deepEqual(after, evolve(n, tiles, method, 10), method);
            assert.deepEqual(counts(after), counts(tiles), method);
            tiles.forEach((tile, index) => {
                if (tile.isGold) assert.strictEqual(after[index], tile);
            });
            if (n > 1) assert.notDeepEqual(after, tiles, method);
        }
    }
});

test('the three polygon modes arrange the same board differently', () => {
    const n = 49;
    const initial = makeBoard(n);
    const signatures = POLYGON_FLOW_MODES.map(method =>
        evolve(n, initial, method, 40).map(tile => tile.k).join(','));
    assert.equal(new Set(signatures).size, POLYGON_FLOW_MODES.length);
});

test('new Geometric Flow modes round-trip through settings files and profiles', () => {
    for (const method of [...POLYGON_FLOW_MODES, ...POLYGON_CIRCULATION_MODES]) {
        const settings = defaultWorkspaceSettings();
        settings.rules.spiral.method = method;
        assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.spiral.method, method);
        assert.equal(validateProfileSnapshot({ settings }).settings.rules.spiral.method, method);
    }
});

test('Triangle and Square keep visibly rearranging pigments after over one full cycle', () => {
    const n = 81;
    const initial = makeBoard(n);
    for (const method of POLYGON_CIRCULATION_MODES) {
        const board = initial.slice();
        const rules = { method };
        const step = (currentBoardState, spiralRules) => runSpiralGeneration({ n, currentBoardState, spiralRules });
        for (let i = 0; i < POLYGON_FLOW_PERIOD + 90; i++) step(board, rules);
        const checkpoint = board.slice();
        const savedRules = { ...rules };
        const restored = checkpoint.slice();
        for (let i = 0; i < 24; i++) {
            step(board, rules);
            step(restored, savedRules);
        }
        const visiblyMoved = board.filter(({ k }, index) => Math.abs(k - checkpoint[index].k) > 1).length;
        assert(visiblyMoved > board.length * .15, method);
        assert.deepEqual(restored, board);
        assert.deepEqual(savedRules, rules);
        assert.deepEqual(counts(board), counts(initial));
        initial.forEach((tile, index) => {
            if (tile.isGold) assert.strictEqual(board[index], tile);
        });
    }
});
