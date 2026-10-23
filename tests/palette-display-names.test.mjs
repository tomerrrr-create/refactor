import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaletteDisplayName } from '../js/palette-display-names.js';

// Palette data still uses the old translation lookup. Suppress its known
// missing-key warnings only while importing the data for this test.
const warn = console.warn;
let PALETTES;
try {
    console.warn = () => {};
    ({ PALETTES } = await import('../js/data/palettes.js'));
} finally {
    console.warn = warn;
}

test('all active and archived palette labels are localized without changing recording identities', () => {
    const before = JSON.stringify(PALETTES);
    for (const palette of PALETTES) {
        const frozen = Object.freeze({ ...palette });
        for (const lang of ['en', 'he', 'ru', 'nl']) {
            const label = getPaletteDisplayName(frozen, lang);
            assert.equal(typeof label, 'string');
            assert.ok(label.length > 0, `${palette.originalName}: ${lang}`);
            if (lang === 'he') assert.match(label, /[א-ת]/, palette.originalName);
            if (lang === 'ru') assert.match(label, /[А-Яа-яЁё]/, palette.originalName);
            if (lang === 'en' || lang === 'nl') assert.doesNotMatch(label, /[א-תА-Яа-яЁё]/);
        }
    }
    assert.equal(JSON.stringify(PALETTES), before);
});

test('a corrected display label preserves the exact original galaxy name used by saved files', () => {
    const palette = Object.freeze({ originalName: 'זוהר הגלסיות', name: 'זוהר הגלסיות' });
    assert.equal(getPaletteDisplayName(palette, 'en'), 'Galactic Glow');
    assert.equal(getPaletteDisplayName(palette, 'he'), 'זוהר הגלקסיות');
    assert.equal(palette.name, 'זוהר הגלסיות');
    assert.equal(palette.originalName, 'זוהר הגלסיות');
});

test('unknown palettes and unsupported languages retain readable fallback labels', () => {
    assert.equal(getPaletteDisplayName({ originalName: 'Journey', name: 'מסע' }, 'fr'), 'Journey');
    assert.equal(getPaletteDisplayName({ originalName: 'Future palette', name: 'Future label' }, 'he'), 'Future label');
    assert.equal(getPaletteDisplayName({ originalName: 'Future palette' }, 'he'), 'Future palette');
});

test('approved family names change presentation only and remain distinct without numeric suffixes', () => {
    const expected = {
        'Focus 64': ['Soft Focus', 'מיקוד רך'],
        'Focus 264': ['Deep Focus', 'מיקוד עמוק'],
        'Ancient 264': ['Ancient Echoes', 'הדי קדם'],
        'Night Rainbow 264': ['Midnight Rainbow', 'קשת חצות'],
        'Zionism 64': ['Zion Light', 'אור ציון'],
        'Zionism 264': ['Zion Spirit', 'רוח ציון']
    };
    for (const [id, labels] of Object.entries(expected)) {
        const palette = PALETTES.find(p => p.originalName === id);
        const before = JSON.stringify(palette);
        assert.deepEqual(['en', 'he'].map(lang => getPaletteDisplayName(palette, lang)), labels);
        for (const lang of ['en', 'he', 'ru', 'nl']) assert.doesNotMatch(getPaletteDisplayName(palette, lang), /\d/u);
        assert.equal(JSON.stringify(palette), before, 'Display names must not alter recording identities or colors');
    }
    for (const family of [['Focus', 'Focus 64', 'Focus 264'], ['Ancient', 'Ancient 264'],
        ['Night Rainbow', 'Night Rainbow 264'], ['Zionism', 'Zionism 64', 'Zionism 264']]) {
        for (const lang of ['en', 'he', 'ru', 'nl']) {
            const names = family.map(originalName => getPaletteDisplayName({ originalName }, lang));
            assert.equal(new Set(names).size, family.length);
        }
    }
});
