import test from 'node:test';
import assert from 'node:assert/strict';
import { getPalettePreviewColors } from '../js/palette-picker.js';
import { sortColorsArray, SORT_MODES } from '../js/colors.js';
const warn=console.warn;
let PALETTES;
try { console.warn=()=>{}; ({PALETTES}=await import('../js/data/palettes.js')); }
finally { console.warn=warn; }

test('every palette uses rainbow previews regardless of the current board sort',()=>{
    for(const palette of PALETTES) {
        const originalColors=Object.freeze([...palette.colors]);
        const p={...palette,originalColors,colors:[...originalColors]};
        const expected=sortColorsArray(originalColors,'dark-rainbow');
        const preview=getPalettePreviewColors(p);
        assert.deepEqual(preview,expected,p.originalName);
        assert(Object.isFrozen(preview));assert.notEqual(preview,originalColors);
        assert.deepEqual([...preview].sort(),[...originalColors].sort(),'preserve all colors and duplicates');
        for(const {method} of SORT_MODES) {
            p.colors=sortColorsArray(originalColors,method);const board=[...p.colors];
            assert.deepEqual(getPalettePreviewColors(p),expected,`${p.originalName}/${method}`);
            assert.equal(getPalettePreviewColors(p),preview,'reuse the preview independently of the board order');
            assert.deepEqual(p.colors,board);assert.deepEqual(p.originalColors,originalColors);
        }
    }
});
test('rainbow preview also works without originalColors and refreshes when the source is replaced',()=>{
    const p={colors:['#FFFFFF','#0000FF','#000000','#FF0000']};
    assert.deepEqual(getPalettePreviewColors(p),sortColorsArray(p.colors,'dark-rainbow'));
    p.originalColors=['#00FF00','#000000','#FFFFFF'];
    assert.deepEqual(getPalettePreviewColors(p),sortColorsArray(p.originalColors,'dark-rainbow'));
});
