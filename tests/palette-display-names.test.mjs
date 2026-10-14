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
