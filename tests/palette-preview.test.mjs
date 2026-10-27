import test from 'node:test';
import assert from 'node:assert/strict';
import { getPalettePreviewColors } from '../js/palette-picker.js';
import { sortColorsArray, SORT_MODES, getLuminance } from '../js/colors.js';
const warn=console.warn;
let PALETTES;
try { console.warn=()=>{}; ({PALETTES}=await import('../js/data/palettes.js')); }
finally { console.warn=warn; }

const lightToDarkNames = [
    'Hearts', 'Amazon Rainforest', 'Magma Flow', 'Sky', 'Golden Midnight',
    'Electric Dreams', 'Desert Sunrise', 'Mono', 'Serenety',
    'Golden Midnight Extended', 'Plasma Overload', 'Jasmine Stardust Aura',
    'Earth & Spirit', 'Air', 'Blue Hypnosis 264', 'Glacier Pulse 264',
    'Northern Lights HD', 'Baby First Gaze'
];

test('all 18 requested palettes exist and their previews run light to dark',()=>{
    for(const name of lightToDarkNames) {
        const palette=PALETTES.find(p=>p.originalName===name);
        assert(palette, name);
        const preview=getPalettePreviewColors(palette);
        for(let i=1;i<preview.length;i++) {
            assert(getLuminance(preview[i])<=getLuminance(preview[i-1]), name);
        }
    }
});

test('each palette keeps its specified preview regardless of the current board sort',()=>{
    for(const palette of PALETTES) {
        const originalColors=Object.freeze([...palette.colors]);
        const p={...palette,originalColors,colors:[...originalColors]};
        const expected=sortColorsArray(originalColors,lightToDarkNames.includes(p.originalName)?'reversed':'dark-rainbow');
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
