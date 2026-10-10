import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES } from '../js/data/palettes.js';
import { SORT_MODES, sortColorsArray } from '../js/colors.js';
import { expandPalette, createPaletteResizeState, PALETTE_RESIZE_SIZES, temporaryPaletteIcon } from '../js/palette-resize.js';

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

function catalog() {
    const colors = ['#000000', '#FF0000', '#FFFFFF'];
    return [{ originalName: 'Fixture', emoji: '🎨', originalColors: [...colors], colors: [...colors] }];
}

test('temporary palettes keep the base and every intermediate version, with recipe-only snapshots', () => {
    const palettes = catalog(), registry = createPaletteResizeState(palettes);
    const original = [...palettes[0].colors];
    let source = palettes[0];
    for (const target of PALETTE_RESIZE_SIZES) {
        const prepared = registry.prepare(source.id, target, 'luminance');
        const index = registry.add(prepared);
        assert.equal(index, palettes.length - 1);
        assert.equal(prepared.palette.isTemporary, true);
        source = palettes[index];
    }
    assert.deepEqual(palettes[0].colors, original);
    assert.deepEqual(palettes.map(p => p.colors.length), [3, 64, 264, 512]);
    const recipes = registry.snapshot();
    assert(!JSON.stringify(recipes).includes('#'), 'new snapshots contain no color arrays');
    assert.equal(recipes[1].sourceId, recipes[0].id);
    assert.equal(recipes[2].sourceId, recipes[1].id);
    assert.equal(new Set(palettes.map(p => p.id)).size, 4);
    for (const [i, badge] of [[1, 'HQ'], [2, 'HD'], [3, '512']]) assert(palettes[i].iconHTML.includes(`>${badge}</span>`));
});

test('recipe chains reproduce exact colors across source sorts, undo, redo and fresh sessions', () => {
    const palettes = catalog(), registry = createPaletteResizeState(palettes);
    const prepared64 = registry.prepare(palettes[0].id, 64, 'luminance');
    registry.add(prepared64);
    palettes[1].colors = sortColorsArray(palettes[1].originalColors, 'reversed');
    const prepared264 = registry.prepare(palettes[1].id, 264, 'reversed');
    registry.add(prepared264);
    palettes.forEach(p => { p.colors = sortColorsArray(p.originalColors, 'dark-rainbow'); });
    const snapshot = registry.snapshot();
    const exact = palettes.map(p => [...p.colors]);
    registry.restore(snapshot.slice(0, 1), 'dark-rainbow');
    assert.equal(palettes.length, 2);
    registry.restore(snapshot, 'dark-rainbow');
    assert.deepEqual(palettes.map(p => p.colors), exact);
    const fresh = catalog(), freshRegistry = createPaletteResizeState(fresh);
    freshRegistry.restore(JSON.parse(JSON.stringify(snapshot)), 'dark-rainbow');
    assert.deepEqual(fresh.map(p => p.colors), exact);
    assert.deepEqual(fresh.map(p => p.id), palettes.map(p => p.id));
    assert.notEqual(freshRegistry.prepare(fresh[0].id, 64, 'luminance').recipe.id, snapshot[0].id);
    registry.restore([], 'luminance');
    assert.equal(palettes.length, 1);
    assert.equal(palettes[0].colors.length, 3);
});

test('bad dependencies, fingerprints, IDs and versions fail atomically', () => {
    const palettes = catalog(), registry = createPaletteResizeState(palettes);
    registry.add(registry.prepare(palettes[0].id, 64, 'luminance'));
    const snapshot = registry.snapshot(), exact = JSON.stringify(palettes);
    for (const field of ['sourceId', 'algorithmVersion', 'sortVersion', 'sourceFingerprint', 'resultFingerprint', 'baseFingerprint']) {
        const broken = structuredClone(snapshot); broken[0][field] = 'invalid';
        assert.throws(() => registry.restore(broken, 'luminance'), field);
        assert.equal(JSON.stringify(palettes), exact);
    }
    assert.throws(() => registry.restore([...snapshot, ...snapshot], 'luminance'));
    assert.throws(() => registry.restore(snapshot, 'luminance', [], 'temp:missing'));
    assert.equal(JSON.stringify(palettes), exact);
    const newBases = catalog(); newBases[0].originalColors[1] = '#123456';
    assert.throws(() => createPaletteResizeState(newBases).restore(snapshot, 'luminance'));
});

test('older in-place palette snapshots migrate without changing the native palette', () => {
    const palettes = catalog(), registry = createPaletteResizeState(palettes);
    const expanded = expandPalette(palettes[0].colors, 64, 'reversed');
    const old = [{ paletteName: 'Fixture', originalColors: expanded.originalColors, colors: expanded.colors }];
    registry.restore(undefined, 'reversed', old);
    assert.equal(palettes.length, 2);
    assert.equal(palettes[0].colors.length, 3);
    assert.deepEqual(palettes[1].colors, expanded.colors);
    assert.equal(registry.legacyIndex('Fixture'), 1);
    const fresh = catalog(), freshRegistry = createPaletteResizeState(fresh);
    freshRegistry.restore(registry.snapshot(), 'reversed');
    assert.deepEqual(fresh[1].colors, expanded.colors);
});

test('icon overlays replace existing size labels', () => {
    const base = { iconHTML: '<svg><path d="M1 1"/><text>HQ</text><text>HQ</text></svg>' };
    const icon = temporaryPaletteIcon(base, 264);
    assert(!icon.includes('HQ'));
    assert(icon.includes('<path'));
    assert.equal((icon.match(/>HD</g) || []).length, 1);
});
