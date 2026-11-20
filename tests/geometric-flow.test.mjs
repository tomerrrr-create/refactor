import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYGON_FLOW_MODES } from '../js/simulations/geometric-flow.js';
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
    for (const method of POLYGON_FLOW_MODES) {
        const settings = defaultWorkspaceSettings();
        settings.rules.spiral.method = method;
        assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.spiral.method, method);
        assert.equal(validateProfileSnapshot({ settings }).settings.rules.spiral.method, method);
    }
});
