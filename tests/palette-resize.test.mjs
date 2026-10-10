import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES } from '../js/data/palettes.js';
import { SORT_MODES, sortColorsArray } from '../js/colors.js';
import { expandPalette, createPaletteResizeState, PALETTE_RESIZE_SIZES } from '../js/palette-resize.js';

test('every eligible palette reaches each target with exact anchors under every UI sort', () => {
    let combinations = 0;
    for (const p of PALETTES) for (const target of PALETTE_RESIZE_SIZES) {
        if (target <= p.colors.length) continue;
        for (const { method } of SORT_MODES) {
            const source = sortColorsArray(p.colors, method);
            const result = expandPalette(source, target, method);
            assert.equal(result.colors.length, target, `${p.originalName} ${method} ${target}`);
            assert.equal(new Set(result.indexMap).size, source.length);
            assert.deepEqual(result.indexMap.map(i => result.colors[i]), source);
            assert.deepEqual(source, sortColorsArray(p.colors, method), 'input must remain unchanged');
            assert.deepEqual(result, expandPalette(source, target, method), 'deterministic output');
            combinations++;
        }
    }
    assert(combinations > 100);
});

test('duplicate, identical and single-color anchors remain valid distinct indices', () => {
    for (const source of [['#000000'], ['#000000', '#000000'], ['#000000', '#FFFFFF', '#000000']]) {
        const result = expandPalette(source, 64, 'luminance');
        assert.equal(result.colors.length, 64);
        assert.equal(new Set(result.indexMap).size, source.length);
        assert.deepEqual(result.indexMap.map(i => result.colors[i]), source);
    }
});

test('chained growth preserves all intermediate anchors', () => {
    let source = ['#000000', '#FF0000', '#FFFFFF'];
    for (const target of PALETTE_RESIZE_SIZES) {
        const result = expandPalette(source, target, 'dark-rainbow');
        assert.deepEqual(result.indexMap.map(i => result.colors[i]), source);
        source = result.colors;
    }
    assert.throws(() => expandPalette(source, 1024, 'luminance'));
    assert.throws(() => expandPalette(source, 512, 'luminance'));
    assert.throws(() => expandPalette(source, 64, 'luminance'));
});

test('state restores exact palette order across sort changes, undo, redo and JSON round trips', () => {
    const palettes = [{ originalName: 'Fixture', originalColors: ['#000000', '#FF0000', '#FFFFFF'], colors: ['#000000', '#FF0000', '#FFFFFF'] }];
    const state = createPaletteResizeState(palettes);
    const before = state.snapshot();
    state.set(0, expandPalette(palettes[0].colors, 64, 'luminance'));
    palettes[0].colors = sortColorsArray(palettes[0].originalColors, 'reversed');
    const after = JSON.parse(JSON.stringify(state.snapshot()));
    const exact = [...palettes[0].colors];
    state.restore(before, 'luminance');
    assert.equal(palettes[0].colors.length, 3);
    state.restore(after, 'reversed');
    assert.deepEqual(palettes[0].colors, exact);
    after[0].colors[0] = '#123456';
    assert.deepEqual(palettes[0].colors, exact, 'snapshots cannot mutate live state');
    assert.throws(() => state.restore(after, 'luminance'));
    assert.deepEqual(palettes[0].colors, exact, 'invalid snapshots are rejected atomically');
    state.restore(undefined, 'luminance');
    assert.equal(palettes[0].colors.length, 3, 'legacy projects restore the base palette');
});
