import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STARTUP, loadStartup, normalizeStartup, persistStartup, fitStartupSeparator, RANDOM_STARTUP_PALETTE, resolveStartupPaletteIndex } from '../js/startup-settings.js';

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

test('random startup round-trips as an option, without persisting a concrete palette as the preference', () => {
    let text;
    const disk = { getItem: () => text, setItem: (_, value) => { text = value; } };
    assert.equal(DEFAULT_STARTUP.paletteName, RANDOM_STARTUP_PALETTE);
    assert.equal(persistStartup({ ...DEFAULT_STARTUP, paletteName: RANDOM_STARTUP_PALETTE }, disk), true);
    assert.equal(loadStartup(disk).paletteName, RANDOM_STARTUP_PALETTE);
});

test('random startup excludes archived palettes and consecutive repeats; fixed choices consume no randomness', () => {
    const palettes = [{ originalName: 'A' }, { originalName: 'Archive', isArchived: true }, { originalName: 'B' }];
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const choose = () => resolveStartupPaletteIndex(RANDOM_STARTUP_PALETTE, { palettes, storage, random: () => 0 });
    assert.deepEqual([choose(), choose(), choose(), choose()], [0, 2, 0, 2]);
    assert.equal(resolveStartupPaletteIndex('B', { palettes, storage, random() { throw Error('Must not draw'); } }), 2);
    const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
    assert.equal(resolveStartupPaletteIndex(RANDOM_STARTUP_PALETTE, { palettes, storage: blocked, random: () => .999 }), 2);
    assert.equal(resolveStartupPaletteIndex(RANDOM_STARTUP_PALETTE, { palettes: [palettes[0]], storage, random: () => 0 }), 0);
});
