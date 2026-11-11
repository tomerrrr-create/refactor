import test from 'node:test';
import assert from 'node:assert/strict';
import {createMacroPaletteContext} from '../js/macro-palette-context.js';
test('drawing history retains the viewer palette only with a known unchanged recorded anchor',()=>{
 const c=createMacroPaletteContext(),selection={selected:73,current:73};
 assert.equal(c.historyPalette(75,selection),75,'unknown provenance keeps existing restoration');
 c.record(75);assert.equal(c.historyPalette(75,selection),73);assert.equal(c.historyPalette(67,selection),67);
 assert.equal(c.historyPalette(75,{selected:null,current:73}),75,'no override is unmodified');
 assert.equal(c.historyPalette(75,{selected:75,current:75}),75);
});
test('real recorded changes and an explicit return to the original palette remain effective',()=>{
 const c=createMacroPaletteContext();c.record(75);
 c.record(67);assert.equal(c.historyPalette(67,{selected:73,current:67}),67);
 assert.equal(c.historyPalette(75,{selected:73,current:67}),75,'a recorded restoration can genuinely change palette');
 c.record(75);assert.equal(c.historyPalette(75,{selected:73,current:75}),75,'explicit Jade is never remapped to opening Autumn');
});
test('new files, Stop, restart and invalid anchors cannot inherit previous provenance',()=>{
 const c=createMacroPaletteContext();c.record(75);c.reset();assert.equal(c.historyPalette(75,{selected:73,current:73}),75);
 for(const invalid of [null,undefined,-1,NaN,1.5]){c.record(75);c.record(invalid);assert.equal(c.historyPalette(75,{selected:73,current:73}),75);}
});
