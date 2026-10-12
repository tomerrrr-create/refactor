import test from 'node:test';
import assert from 'node:assert/strict';
import { SORT_MODES, normalizeSortMethod, sortColorsArray } from '../js/colors.js';
import { DEFAULT_SORT_CYCLE, normalizeSortCycle, loadSortCycle, persistSortCycle, nextSortMethod } from '../js/sort-cycle-settings.js';

test('existing six-mode cycle is retained without preferences and with invalid storage', () => {
    for (const value of [null, 'null', '{}', '[]', '{broken', '["deleted"]']) {
        assert.deepEqual(loadSortCycle({ getItem: () => value }), DEFAULT_SORT_CYCLE);
    }
    assert.deepEqual(loadSortCycle({ getItem() { throw Error('Blocked'); } }), DEFAULT_SORT_CYCLE);
    let method = DEFAULT_SORT_CYCLE[0];
    for (const expected of [...DEFAULT_SORT_CYCLE.slice(1), DEFAULT_SORT_CYCLE[0]]) {
        method = nextSortMethod(method, DEFAULT_SORT_CYCLE); assert.equal(method, expected);
    }
});

test('selected methods wrap, skip excluded modes and resume after loaded excluded modes', () => {
    const selected = ['luminance', 'hue', 'zen-void'];
    assert.equal(nextSortMethod('luminance', selected), 'hue');
    assert.equal(nextSortMethod('hue', selected), 'zen-void');
    assert.equal(nextSortMethod('zen-void', selected), 'luminance');
    assert.equal(nextSortMethod('temperature', selected), 'hue');
    assert.equal(nextSortMethod('unknown', selected), 'luminance');
    assert.equal(nextSortMethod('hue', ['hue']), 'hue');
});

test('saved selections round-trip, deduplicate and recover from unavailable methods', () => {
    let text; const storage = { setItem: (_, value) => { text = value; }, getItem: () => text };
    assert(persistSortCycle(['zen-void', 'hue', 'zen-void', 'deleted'], storage));
    assert.deepEqual(loadSortCycle(storage), ['hue', 'zen-void']);
    assert.deepEqual(normalizeSortCycle([]), DEFAULT_SORT_CYCLE);
    assert.equal(persistSortCycle(['hue'], { setItem() { throw Error('Quota'); } }), false);
});

test('newly exposed algorithms preserve all palette colors and do not mutate the input', () => {
    const input = ['#ff0000', '#000000', '#00ff00', '#0000ff', '#ffffff', '#808080', '#ffff00'];
    assert.equal(new Set(SORT_MODES.map(mode => mode.method)).size, SORT_MODES.length);
    for (const method of ['hue', 'zig-zag', 'zen-void']) {
        assert(SORT_MODES.some(mode => mode.method === method));
        const before = [...input], result = sortColorsArray(input, method);
        assert.deepEqual(input, before); assert.deepEqual([...result].sort(), [...input].sort());
    }
});


test('retired methods are removed from saved selections and fall back to luminance', () => {
    for (const removed of ['waves', 'biomes']) {
        assert(!SORT_MODES.some(mode => mode.method === removed));
        assert.equal(normalizeSortMethod(removed), 'luminance');
        assert.deepEqual(loadSortCycle({ getItem: () => JSON.stringify([removed]) }), DEFAULT_SORT_CYCLE);
        assert.deepEqual(normalizeSortCycle([removed, 'hue']), ['hue']);
        const colors = ['#ffffff', '#000000', '#ff0000'];
        assert.deepEqual(sortColorsArray(colors, removed), sortColorsArray(colors, 'luminance'));
    }
});
