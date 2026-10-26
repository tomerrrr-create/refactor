import test from 'node:test';
import assert from 'node:assert/strict';
import { getPalettePreviewColors, getPalettePreviewSort } from '../js/palette-preview.js';
import { sortColorsArray, SORT_MODES } from '../js/colors.js';
const warn = console.warn;
let PALETTES;
try { console.warn=()=>{}; ({PALETTES}=await import('../js/data/palettes.js')); }
finally { console.warn=warn; }

test('gradient previews preserve the authored path, colorful collections use the existing rainbow sort',()=>{
    for(const name of ['Hearts','Mono','Opaline Trance 264','Baby First Gaze']) {
        const palette=PALETTES.find(p=>p.originalName===name);
        assert.equal(getPalettePreviewSort(palette),'original');
        assert.deepEqual(getPalettePreviewColors(palette),palette.colors);
    }
    for(const name of ['Journey','Ancient','Ancient 264','Focus 64','Focus 264','Argentine Spring']) {
        const palette=PALETTES.find(p=>p.originalName===name);
        assert.equal(getPalettePreviewSort(palette),'dark-rainbow');
        assert.deepEqual(getPalettePreviewColors(palette),sortColorsArray(palette.colors,'dark-rainbow'));
    }
});
test('all catalogue previews are stable under every board sort, without changing source arrays or colors',()=>{
    for(const palette of PALETTES) {
        const originalColors=Object.freeze([...palette.colors]);
        const p={...palette,originalColors,colors:[...originalColors]};
        const preview=getPalettePreviewColors(p),expected=[...preview];
        assert(Object.isFrozen(preview));assert.notEqual(preview,originalColors);
        assert.deepEqual([...preview].sort(),[...originalColors].sort(),'no invented, lost or duplicated colours');
        for(const {method} of SORT_MODES) {
            p.colors=sortColorsArray(originalColors,method);const board=[...p.colors];
            assert.deepEqual(getPalettePreviewColors(p),expected,`${palette.originalName}/${method}`);
            assert.deepEqual(p.colors,board,'preview must not sort the board palette');
            assert.deepEqual(p.originalColors,originalColors);
        }
        assert.equal(getPalettePreviewColors(p),preview,'cached independently of the live sort');
    }
});
test('preview order is independent of translations and updates when the source palette is replaced',()=>{
    const p={originalName:'Hearts',name:'A translated label',colors:['#000000','#FF0000','#FFFFFF']};
    assert.deepEqual(getPalettePreviewColors(p),p.colors);p.name='Another label';
    const next=['#000000','#0000FF','#FFFFFF'];p.originalColors=next;
    assert.deepEqual(getPalettePreviewColors(p),next);
});
