import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SIM_INIT, loadSimInit, persistSimInit, validateSimInit } from '../js/sim-init-settings.js';

const storageWith = value => ({ getItem: () => value });
test('missing, malformed, and unsupported preferences retain the existing init defaults', () => {
    for (const value of [null, '{', 'null', '{"boardSize":999,"brushSize":7}', '{"boardSize":101,"brushSize":2}', '{"boardSize":"101","brushSize":7}']) {
        assert.deepEqual(loadSimInit(storageWith(value)), DEFAULT_SIM_INIT);
    }
    assert.deepEqual(loadSimInit({ getItem() { throw Error('Storage blocked'); } }), DEFAULT_SIM_INIT);
});
test('valid preferences persist and round-trip without extra properties', () => {
    let value;
    const storage = { setItem: (key, text) => { value = text; }, getItem: () => value };
    const settings = { boardSize: 101, brushSize: 11 };
    assert.equal(persistSimInit(settings, storage), true);
    assert.deepEqual(loadSimInit(storage), settings);
    assert.deepEqual(loadSimInit(storageWith('{"boardSize":3,"brushSize":15,"extra":true}')), { boardSize: 3, brushSize: 15 });
});
test('invalid values are rejected and blocked storage is reported', () => {
    for (const brushSize of [0, 2, 16, 7.5, '7']) assert.equal(Boolean(validateSimInit({ boardSize: 249, brushSize })), false);
    assert.throws(() => persistSimInit({ boardSize: 999, brushSize: 7 }, {}), RangeError);
    assert.equal(persistSimInit(DEFAULT_SIM_INIT, { setItem() { throw Error('Quota exceeded'); } }), false);
});
