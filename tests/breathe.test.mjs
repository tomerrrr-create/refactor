import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandomBreatheSession, getBreatheBrightnessFactor } from '../js/simulations/breathe.js';

const board = () => [{ k: 1, isGold: false }, { k: 2, isGold: false }, { k: 1, isGold: false }, { k: 3, isGold: true }];
test('legacy solo and group brightness retain their existing formulas', () => {
    const tile = { k: 7, startDelay: 543 };
    for (const elapsed of [0, 500, 1500, 4000, 12000]) {
        const fade = Math.min(elapsed / 2000, 1), duration = 2 * Math.PI / .0015;
        for (const mode of ['solo', 'group']) {
            const wave = mode === 'solo' ? Math.sin(((elapsed - tile.startDelay + duration) % duration) * .0015) : Math.sin(elapsed * .0015 + tile.k * .8);
            assert.equal(getBreatheBrightnessFactor(tile, elapsed + 100, 100, mode), 1 - fade + (.7 + wave * .3) * fade);
        }
    }
});
test('all cells join within four seconds and continue breathing without changing the board', () => {
    let seed = 27;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const tiles = Array.from({ length: 4096 }, (_, k) => ({ k: k % 264, isGold: false }));
    const before = JSON.stringify(tiles), seen = new Set();
    const session = createRandomBreatheSession(tiles, 'random-cell', random);
    session.update(0);
    assert(tiles.every((_, i) => session.factor(i) === 1));
    for (let t = 25; t <= 4000; t += 25) {
        session.update(t);
        tiles.forEach((_, i) => { if (session.factor(i) !== 1) seen.add(i); });
    }
    assert.equal(seen.size, tiles.length);
    for (let t = 4025; t <= 6000; t += 25) session.update(t);
    assert(tiles.filter((_, i) => session.factor(i) !== 1).length > tiles.length * .7);
    assert(new Set(tiles.map((_, i) => session.factor(i))).size > 1000);
    assert.equal(JSON.stringify(tiles), before);
});
test('pulse lifts to 105%, smoothly darkens, and returns to the original color', () => {
    const session = createRandomBreatheSession(board(), 'random-cell', () => 0);
    session.update(0); assert.equal(session.factor(0), 1);
    session.update(900); assert.equal(session.factor(0), 1.05);
    session.update(2100); assert.equal(session.factor(0), .65);
    session.update(3000); assert.equal(session.factor(0), 1);
    session.update(3900); assert.equal(session.factor(0), 1.05);
    assert.equal(session.factor(3), 1);
});
test('duration, rest and depth are chosen again for every new pulse', () => {
    let calls = 0;
    const random = () => { calls++; return calls <= 3 ? 0 : .8; };
    const session = createRandomBreatheSession([{ k: 1 }], 'random-cell', random);
    session.update(2100); assert.equal(session.factor(0), .65);
    session.update(3000); assert.equal(calls, 6);
    session.update(3700); assert.equal(session.factor(0), 1); // New rest interval.
    session.update(3800 + 5400 * .7);
    assert(Math.abs(session.factor(0) - .45) < 1e-12);
});
test('color groups share one rhythm, gold stays untouched and empty boards are safe', () => {
    let value = 0;
    const session = createRandomBreatheSession(board(), 'random-color', () => (value = (value + .17) % 1));
    for (let t = 0; t < 15000; t += 25) {
        session.update(t);
        assert.equal(session.factor(0), session.factor(2));
        assert.equal(session.factor(3), 1);
        for (const i of [0, 1, 2]) assert(session.factor(i) >= .4 && session.factor(i) <= 1.05);
    }
    for (const tiles of [[], [{ k: 1, isGold: true }]]) {
        const empty = createRandomBreatheSession(tiles, 'random-cell');
        empty.update(1000000); assert.equal(empty.factor(0), 1);
    }
});
