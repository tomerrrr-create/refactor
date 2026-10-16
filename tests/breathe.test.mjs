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
test('random cells rest unchanged except the selected cell and choose anew after each onset', () => {
    const tiles = board(), before = JSON.stringify(tiles);
    const session = createRandomBreatheSession(tiles, 'random-cell', () => 0);
    session.update(0); assert.equal(session.factor(0), 1);
    session.update(2000);
    assert.equal(session.factor(0), .65);
    assert.equal(session.factor(1), 1); assert.equal(session.factor(2), 1);
    session.update(2900); // A fresh cell starts, with a soft overlap.
    session.update(4900);
    assert.equal(session.factor(0), 1); assert.equal(session.factor(1), .65);
    assert.equal(session.factor(3), 1);
    assert.equal(JSON.stringify(tiles), before);
});
test('random colors breathe together by actual board color, excluding gold', () => {
    const session = createRandomBreatheSession(board(), 'random-color', () => 0);
    session.update(0); session.update(2000);
    assert.equal(session.factor(0), .65); assert.equal(session.factor(2), .65);
    assert.equal(session.factor(1), 1); assert.equal(session.factor(3), 1);
    session.update(2900); session.update(4900);
    assert.equal(session.factor(1), .65); assert.equal(session.factor(0), 1);
});
test('empty or gold-only boards stay still and stalled frames do not accumulate pulses', () => {
    for (const tiles of [[], [{ k: 1, isGold: true }]]) {
        const session = createRandomBreatheSession(tiles, 'random-cell', () => 0);
        session.update(0); session.update(1000000); assert.equal(session.factor(0), 1);
    }
    const session = createRandomBreatheSession([{ k: 1 }], 'random-color', () => .5);
    session.update(0);
    for (let t = 0; t < 50000; t += 50) {
        session.update(t);
        assert(session.factor(0) >= .65 && session.factor(0) <= 1);
    }
});
