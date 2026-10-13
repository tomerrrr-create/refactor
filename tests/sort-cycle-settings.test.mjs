import test from 'node:test';
import assert from 'node:assert/strict';
import { SORT_MODES, normalizeSortMethod, sortColorsArray } from '../js/colors.js';
import { DEFAULT_SORT_CYCLE, normalizeSortCycle, loadSortCycle, persistSortCycle, nextSortMethod, moveSortMethod } from '../js/sort-cycle-settings.js';

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
    assert.equal(nextSortMethod('temperature', selected), 'luminance');
    assert.equal(nextSortMethod('unknown', selected), 'luminance');
    assert.equal(nextSortMethod('hue', ['hue']), 'hue');
});

test('saved selections round-trip, deduplicate and recover from unavailable methods', () => {
    let text; const storage = { setItem: (_, value) => { text = value; }, getItem: () => text };
    assert(persistSortCycle(['zen-void', 'hue', 'zen-void', 'deleted'], storage));
    assert.deepEqual(loadSortCycle(storage), ['zen-void', 'hue']);
    assert.deepEqual(normalizeSortCycle([]), DEFAULT_SORT_CYCLE);
    assert.equal(persistSortCycle(['hue'], { setItem() { throw Error('Quota'); } }), false);
});

test('custom order survives saves and drives every step of the cycle', () => {
    let text; const storage = { setItem: (_, value) => { text = value; }, getItem: () => text };
    const selected = ['temperature', 'hue', 'luminance'];
    assert(persistSortCycle(selected, storage));
    const restored = loadSortCycle(storage);
    assert.deepEqual(restored, selected);
    assert.equal(nextSortMethod('temperature', restored), 'hue');
    assert.equal(nextSortMethod('hue', restored), 'luminance');
    assert.equal(nextSortMethod('luminance', restored), 'temperature');
    assert.equal(nextSortMethod('outside-in', restored), 'temperature');
});

test('direct positions move either end across the cycle without changing other relative order', () => {
    const selected = ['luminance', 'hue', 'temperature', 'zen-void'];
    assert.deepEqual(moveSortMethod(selected, 'zen-void', 0), ['zen-void', 'luminance', 'hue', 'temperature']);
    assert.deepEqual(moveSortMethod(selected, 'luminance', 3), ['hue', 'temperature', 'zen-void', 'luminance']);
    assert.deepEqual(moveSortMethod(selected, 'hue', 2), ['luminance', 'temperature', 'hue', 'zen-void']);
    for (const [method, target] of [['hue', -1], ['hue', 4], ['hue', 1.5], ['unknown', 0], ['hue', 1]]) {
        assert.deepEqual(moveSortMethod(selected, method, target), selected);
    }
    assert.deepEqual(selected, ['luminance', 'hue', 'temperature', 'zen-void']);
    assert.deepEqual(moveSortMethod(['hue'], 'hue', 0), ['hue']);
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


test('rainbow fold uses rainbow order and folds it inward without changing colors', () => {
    const spectrum = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];
    assert.deepEqual(sortColorsArray(spectrum, 'rainbow-fold'),
        ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffff00']);
    for (const input of [[], ['#ff0000'], spectrum.slice(0, 5), spectrum,
        ['#ffffff', '#000000', '#808080', ...spectrum, '#ff0000']]) {
        const before = [...input], rainbow = sortColorsArray(input, 'dark-rainbow');
        const folded = sortColorsArray(input, 'rainbow-fold');
        assert.deepEqual(input, before);
        assert.deepEqual([...folded].sort(), [...input].sort());
        // Walking alternately from the left and right recovers the rainbow.
        const recovered = []; let left = 0, right = folded.length - 1;
        while (left <= right) {
            recovered.push(folded[left++]);
            if (left <= right) recovered.push(folded[right--]);
        }
        assert.deepEqual(recovered, rainbow);
    }
});

test('rainbow fold is optional and can be saved and cycled only after selection', () => {
    assert.equal(normalizeSortMethod('rainbow-fold'), 'rainbow-fold');
    assert(!DEFAULT_SORT_CYCLE.includes('rainbow-fold'));
    assert(!loadSortCycle({ getItem: () => null }).includes('rainbow-fold'));
    let text; const storage = { setItem: (_, value) => { text = value; }, getItem: () => text };
    const selected = ['luminance', 'rainbow-fold'];
    assert(persistSortCycle(selected, storage));
    assert.deepEqual(loadSortCycle(storage), selected);
    assert.equal(nextSortMethod('luminance', loadSortCycle(storage)), 'rainbow-fold');
    assert.equal(nextSortMethod('rainbow-fold', loadSortCycle(storage)), 'luminance');
});
