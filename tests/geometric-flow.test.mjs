import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYGON_CIRCULATION_MODES, POLYGON_FLOW_PERIOD, restorePolygonFlowPhase } from '../js/simulations/polygon-circulation.js';
import { DEFAULT_GRAVITY_CYCLE, LINE_GRAVITY_MODES, loadGravityCycle, saveGravityCycle } from '../js/gravity-cycle.js';
import { runGravitationalSortGeneration } from '../js/simulations/gravitational_sort.js';
import { runSpiralGeneration } from '../js/simulations/spiral.js';
import { defaultWorkspaceSettings, deserializeWorkspaceSettings, serializeWorkspaceSettings } from '../js/workspace-settings.js';
import { validateProfileSnapshot } from '../js/profile-state.js';
import { DEFAULT_GEOMETRIC_FLOW_CYCLE, GEOMETRIC_FLOW_MODES, loadGeometricFlowCycle, nextGeometricFlowMode, persistGeometricFlowCycle } from '../js/geometric-flow-cycle.js';

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
    const stored = new Map();
    const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
    const defaults = ['radial', 'down'];
    assert.deepEqual(loadGeometricFlowCycle(storage), defaults);
    assert.deepEqual(DEFAULT_GEOMETRIC_FLOW_CYCLE, defaults);
    assert.deepEqual(loadGravityCycle(storage), DEFAULT_GRAVITY_CYCLE);
    assert.equal(nextGeometricFlowMode('off', defaults, false), 'radial');
    assert.equal(nextGeometricFlowMode('radial', defaults, false), 'down');
    assert.equal(nextGeometricFlowMode('down', defaults, false), 'off');
    assert.equal(nextGeometricFlowMode('down', defaults, true), 'radial');
    assert.equal(nextGeometricFlowMode('triangle_gravity', defaults, false), 'radial');
    stored.set('colorGridGravityCycleV1', JSON.stringify(['reverse_right', 'up']));
    stored.set('colorGridGeometricFlowCycleV1', JSON.stringify(['radial', 'triangle_flow']));
    assert.deepEqual(loadGravityCycle(storage), ['up', 'horizontal_gravity', 'vertical_gravity', 'triangle_gravity', 'reverse_right']);
    assert.deepEqual(loadGeometricFlowCycle(storage), ['radial']);
    stored.set('colorGridGeometricFlowCycleV2', JSON.stringify(['triangle_gravity_mirror', 'down']));
    assert.deepEqual(loadGravityCycle(storage), ['up', 'triangle_gravity_mirror', 'reverse_right']);
    assert.deepEqual(loadGeometricFlowCycle(storage), ['down']);
    persistGeometricFlowCycle(['down', 'radial', 'triangle_gravity_mirror', 'down'], storage);
    assert.deepEqual(loadGeometricFlowCycle(storage), GEOMETRIC_FLOW_MODES);
    saveGravityCycle(['right'], storage);
    assert.deepEqual(loadGravityCycle(storage), ['right']);
});

test('moved modes produce exactly the same board as Spiral and resume from a Gravity checkpoint', () => {
    const n = 31;
    for (const direction of LINE_GRAVITY_MODES) {
        const initial = makeBoard(n);
        const currentBoardState = initial.slice();
        let gravitationalSortRules = { direction, strength: 1, polygonFlowPhase: 0 };
        for (let generation = 1; generation <= 40; generation++) {
            runGravitationalSortGeneration({ n, currentBoardState, gravitationalSortRules });
            assert.equal(gravitationalSortRules.polygonFlowPhase, generation);
            if (generation === 19) gravitationalSortRules = JSON.parse(JSON.stringify(gravitationalSortRules));
        }
        assert.deepEqual(currentBoardState, evolve(n, initial, direction, 40), direction);
    }
});

test('Triangle and line gravity preserve colors and anchored gold across board-size changes', () => {
    for (const method of ['triangle', ...LINE_GRAVITY_MODES]) {
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

test('center-line modes pull inward from both halves and transpose exactly', () => {
    for (const n of [1, 40, 41]) {
        const initial = makeBoard(n);
        const transpose = tiles => tiles.map((_, i) => tiles[i % n * n + Math.floor(i / n)]);
        const horizontal = evolve(n, initial, 'horizontal_gravity', 90);
        const vertical = evolve(n, transpose(initial), 'vertical_gravity', 90);
        assert(vertical.every((tile, i) => tile === horizontal[i % n * n + Math.floor(i / n)]));
        if (n === 1) continue;
        const middle = (n - 1) / 2;
        for (const side of [-1, 1]) {
            const near = [], far = [];
            horizontal.forEach((tile, i) => {
                const distance = side * (Math.floor(i / n) - middle);
                if (distance >= 0 && distance < 3) near.push(tile.k);
                if (distance > n * .4) far.push(tile.k);
            });
            const average = ranks => ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
            assert(average(far) - average(near) > 8);
        }
    }
});

test('new Geometric Flow modes round-trip through settings files and profiles', () => {
    for (const method of ['triangle', ...POLYGON_CIRCULATION_MODES]) {
        const settings = defaultWorkspaceSettings();
        settings.rules.spiral.method = method;
        assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.spiral.method, method);
        assert.equal(validateProfileSnapshot({ settings }).settings.rules.spiral.method, method);
    }
    const settings = defaultWorkspaceSettings();
    settings.simulationPreferences = { geometricFlowCycle: ['vertical_gravity', 'triangle_gravity', 'radial'] };
    const snapshot = 'FYI_SETTINGS_V1\n' + JSON.stringify({ version: 1, settings });
    const expected = {
        gravityCycleVersion: 2,
        geometricFlowCycle: ['radial'],
        gravityCycle: ['up', 'right', 'vertical_gravity', 'triangle_gravity', 'center_x', 'pinwheel']
    };
    assert.deepEqual(deserializeWorkspaceSettings(snapshot).simulationPreferences, expected);
    assert.deepEqual(validateProfileSnapshot({ settings }).settings.simulationPreferences, expected);
    const current = deserializeWorkspaceSettings(snapshot);
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(current)), current);
    for (const direction of LINE_GRAVITY_MODES) {
        current.rules.gravity.direction = direction;
        assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(current)).rules.gravity.direction, direction);
    }
});

test('Historical Triangle modes keep visibly rearranging pigments after hundreds of generations', () => {
    const n = 81;
    const initial = makeBoard(n);
    for (const method of ['triangle_orbit', 'triangle_flow']) {
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

test('the opposite diagonal exactly mirrors every generation, including protected tiles', () => {
    for (const n of [1, 16, 49]) {
        const board = makeBoard(n);
        const mirrorIndex = index => index + n - 1 - 2 * (index % n);
        const mirroredBoard = board.map((_, index) => board[mirrorIndex(index)]);
        const spiralRules = { method: 'triangle_gravity' };
        const mirroredRules = { method: 'triangle_gravity_mirror' };
        for (let generation = 0; generation < 40; generation++) {
            runSpiralGeneration({ n, currentBoardState: board, spiralRules });
            runSpiralGeneration({ n, currentBoardState: mirroredBoard, spiralRules: mirroredRules });
            assert(mirroredBoard.every((tile, index) => tile === board[mirrorIndex(index)]));
            assert.equal(mirroredRules.polygonFlowPhase, spiralRules.polygonFlowPhase);
        }
    }
});

test('Triangle swaps roughly 60% of eligible neighboring pairs', () => {
    const n = 102;
    let eligible = 0;
    // Gold separators isolate eligible pairs from the rest of the sweep.
    const initial = Array.from({ length: n * n }, (_, index) => {
        const row = Math.floor(index / n);
        const column = index % n;
        const offset = column % 3;
        if (offset === 2) return { k: 0, v: 0, isGold: true };
        const otherColumn = column + (offset === 0 ? 1 : -1);
        const k = Number(Math.abs(row - column) < Math.abs(row - otherColumn));
        if (k === 0) eligible++;
        return { k, v: k, isGold: false };
    });
    const board = evolve(n, initial, 'triangle_gravity', 1);
    const fraction = board.filter((tile, index) => tile !== initial[index]).length / (eligible * 2);
    assert(Math.abs(fraction - .6) < .03, `Swapped fraction ${fraction}`);
});

test('Triangle can move colors multiple cells in one generation and resumes from a saved phase', () => {
    const n = 81;
    const initial = makeBoard(n);
    const positions = new Map(initial.map((tile, index) => [tile, index]));
    const distance = index => Math.abs(Math.floor(index / n) - index % n);
    const first = evolve(n, initial, 'triangle_gravity', 1);
    assert(first.some((tile, index) => distance(positions.get(tile)) - distance(index) >= 2));

    const checkpoint = evolve(n, initial, 'triangle_gravity', 31);
    const resumed = checkpoint.slice();
    const rules = { method: 'triangle_gravity' };
    restorePolygonFlowPhase(rules, 31);
    for (let i = 0; i < 19; i++) runSpiralGeneration({ n, currentBoardState: resumed, spiralRules: rules });
    const uninterrupted = evolve(n, initial, 'triangle_gravity', 50);
    assert(resumed.every((tile, index) => tile === uninterrupted[index]));
});

test('historical gradual Triangle develops through sparse, one-cell exchanges', () => {
    const n = 81;
    const initial = makeBoard(n);
    const method = 'triangle_flow';
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
});
