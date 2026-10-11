import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STARTUP, loadStartup, normalizeStartup, persistStartup, fitStartupSeparator } from '../js/startup-settings.js';

test('first visit and unreadable storage preserve original startup defaults', () => {
    for (const text of [null, 'null', '{', '[]']) {
        assert.deepEqual(loadStartup({ getItem: () => text }), DEFAULT_STARTUP);
    }
    assert.deepEqual(loadStartup({ getItem() { throw Error('Blocked'); } }), DEFAULT_STARTUP);
});
test('unknown palette and invalid fields fall back independently while retaining valid choices', () => {
    assert.deepEqual(normalizeStartup({ paletteName: 'Deleted palette', boardSize: 101, separatorPx: -2, brushSize: 4, sortMethod: 'reversed', interfaceMode: 'simulation' }), {
        ...DEFAULT_STARTUP, boardSize: 101, sortMethod: 'reversed', interfaceMode: 'simulation'
    });
});
test('preferences round-trip with stable palette names and blocked saves report failure', () => {
    let text;
    const storage = { setItem: (key, value) => { text = value; }, getItem: () => text };
    const settings = { ...DEFAULT_STARTUP, paletteName: 'Baby First Gaze', fill: 'seed', brushMode: 'continuous', brushColor: 'rainbow', symmetry: 'kaleidoscope' };
    assert.equal(persistStartup(settings, storage), true);
    assert.deepEqual(loadStartup(storage), settings);
    assert.equal(persistStartup(settings, { setItem() { throw Error('Quota'); } }), false);
});
test('dense grids adapt separators to narrower screens without losing tile space', () => {
    assert.equal(fitStartupSeparator(7, 2, 320), 2);
    assert.equal(fitStartupSeparator(299, 6, 320), 0);
    assert.equal(fitStartupSeparator(101, 6, 375), 2);
    assert.equal(fitStartupSeparator(249, 0, 200), 0);
});
