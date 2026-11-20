import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYGON_FLOW_MODES } from '../js/simulations/geometric-flow.js';
import { POLYGON_CIRCULATION_MODES, POLYGON_FLOW_PERIOD, restorePolygonFlowPhase } from '../js/simulations/polygon-circulation.js';
import { runSpiralGeneration } from '../js/simulations/spiral.js';
import { defaultWorkspaceSettings, deserializeWorkspaceSettings, serializeWorkspaceSettings } from '../js/workspace-settings.js';
import { validateProfileSnapshot } from '../js/profile-state.js';
import { GEOMETRIC_FLOW_MODES, loadGeometricFlowCycle, nextGeometricFlowMode, persistGeometricFlowCycle } from '../js/geometric-flow-cycle.js';

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
    const spiralRules = { method };
    for (let i = 0; i < generations; i++) {
        runSpiralGeneration({ n, currentBoardState, spiralRules });
    }
    return currentBoardState;
}

function counts(tiles) {
    const result = Array(23).fill(0);
    for (const tile of tiles) result[tile.k]++;
    return result;
}

test('Geometric Flow restores cycle membership in toolbar order and skips excluded modes', () => {
    let stored;
    const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
    assert.deepEqual(loadGeometricFlowCycle(storage), GEOMETRIC_FLOW_MODES);
    persistGeometricFlowCycle(['square_flow', 'down', 'down', 'retired'], storage);
    const enabled = loadGeometricFlowCycle(storage);
    assert.deepEqual(enabled, ['down', 'square_flow']);
    assert.equal(nextGeometricFlowMode('off', enabled, false), 'down');
    assert.equal(nextGeometricFlowMode('triangle_gravity', enabled, false), 'square_flow');
    assert.equal(nextGeometricFlowMode('square_flow', enabled, false), 'off');
    assert.equal(nextGeometricFlowMode('square_flow', enabled, true), 'down');
    assert.equal(nextGeometricFlowMode('square_flow', ['square_flow'], true), 'square_flow');
    stored = JSON.stringify(['triangle_flow', 'square_flow']);
    assert.deepEqual(loadGeometricFlowCycle(storage), ['triangle_gravity', 'square_flow']);
    stored = '[]';
    assert.deepEqual(loadGeometricFlowCycle(storage), GEOMETRIC_FLOW_MODES);
});

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

test('Triangle and Square keep visibly rearranging pigments after hundreds of generations', () => {
    const n = 81;
    const initial = makeBoard(n);
    for (const method of ['triangle_orbit', 'square_orbit', 'triangle_flow', 'square_flow']) {
        const board = initial.slice();
        const rules = { method };
        const step = (currentBoardState, spiralRules) => runSpiralGeneration({ n, currentBoardState, spiralRules });
        for (let i = 0; i < POLYGON_FLOW_PERIOD + 90; i++) step(board, rules);
        const checkpoint = board.slice();
        const savedRules = { method };
        restorePolygonFlowPhase(savedRules, rules.polygonFlowPhase);
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

test('Triangle draws lower palette ranks toward the diagonal from either side', () => {
    const n = 81;
    const initial = makeBoard(n);
    const board = evolve(n, initial, 'triangle_gravity', 270);
    assert.deepEqual(counts(board), counts(initial));
    initial.forEach((tile, index) => {
        if (tile.isGold) assert.strictEqual(board[index], tile);
    });
    for (const side of [-1, 1]) {
        const bands = [[], []];
        board.forEach((tile, index) => {
            const offset = side * (Math.floor(index / n) - index % n);
            if (offset > 0 && offset <= 8) bands[0].push(tile.k);
            if (offset >= 30) bands[1].push(tile.k);
        });
        const [near, far] = bands.map(ranks => ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length);
        assert(far - near > 8, `Diagonal side ${side}: near ${near}, far ${far}`);
    }
});

test('Triangle swaps roughly 60% of eligible neighboring pairs', () => {
    const n = 100;
    // In the first pass every horizontal pair starts in the wrong rank order.
    const initial = Array.from({ length: n * n }, (_, index) => {
        const row = Math.floor(index / n);
        const column = index % n;
        const otherColumn = column ^ 1;
        const k = Number(Math.abs(row - column) < Math.abs(row - otherColumn));
        return { k, v: k, isGold: false };
    });
    const board = evolve(n, initial, 'triangle_gravity', 1);
    const fraction = board.filter((tile, index) => tile !== initial[index]).length / board.length;
    assert(Math.abs(fraction - .6) < .03, `Swapped fraction ${fraction}`);
});

test('Fibonacci starts near the center and resumes the outward flow from a saved phase', () => {
    const n = 81;
    const center = (n - 1) / 2;
    const radius = index => Math.hypot(index % n - center, Math.floor(index / n) - center);
    const initial = makeBoard(n);
    const early = evolve(n, initial, 'fibonacci', 8);
    assert(early.some((tile, index) => tile.k !== initial[index].k));
    assert(early.every((tile, index) => radius(index) <= 8.5 || tile === initial[index]));

    const checkpoint = evolve(n, initial, 'fibonacci', 32);
    const resumed = checkpoint.slice();
    const rules = { method: 'fibonacci' };
    restorePolygonFlowPhase(rules, 32);
    for (let i = 0; i < 118; i++) runSpiralGeneration({ n, currentBoardState: resumed, spiralRules: rules });
    const uninterrupted = evolve(n, initial, 'fibonacci', 150);
    assert(resumed.every((tile, index) => tile === uninterrupted[index]));
    assert(resumed.some((tile, index) => radius(index) > 30 && tile.k !== checkpoint[index].k));
    assert.deepEqual(counts(resumed), counts(initial));
    initial.forEach((tile, index) => {
        if (tile.isGold) assert.strictEqual(resumed[index], tile);
    });
});

test('gradual Triangle and Square develop through sparse, one-cell exchanges', () => {
    const n = 81;
    const initial = makeBoard(n);
    for (const method of ['triangle_flow', 'square_flow']) {
        const board = initial.slice(), rules = { method };
        for (let frame = 0; frame < 690; frame++) {
            const checkMotion = [0, 30, 180, 360, 689].includes(frame);
            const before = checkMotion ? new Map(board.map((tile, index) => [tile, index])) : null;
            runSpiralGeneration({ n, currentBoardState: board, spiralRules: rules });
            if (!before) continue;
            let moved = 0;
            board.forEach((tile, index) => {
                const from = before.get(tile);
                const distance = Math.abs(from % n - index % n) + Math.abs(Math.floor(from / n) - Math.floor(index / n));
                assert(distance <= 1, `${method}, frame ${frame}`);
                moved += distance;
            });
            if (frame === 0) assert(moved > 0 && moved < board.length * .12, method);
        }
        assert(rules.polygonFlowPhase >= 180, 'wrapping the motion never restarts the growth ramp');
    }
});
