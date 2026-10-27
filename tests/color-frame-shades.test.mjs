import test from 'node:test';
import assert from 'node:assert/strict';
import {getColorFrameShades} from '../js/rainbow-frame.js';

test('weighted frame favors the chosen color, with small dark/light accents and rare white',()=>{
    for(const color of ['#FF0000','#0000FF','#ffc0cb','#52a68c','#808080']){
        const shades=getColorFrameShades(color);
        assert.equal(shades.length,100);
        assert(shades.slice(0,70).every(shade=>shade===color.toLowerCase()));
        assert.equal(shades.filter(shade=>shade===color.toLowerCase()).length,70);
        assert.equal(shades.filter(shade=>shade==='#ffffff').length,2);
        assert.deepEqual(shades.slice(-2),['#ffffff','#ffffff']);
        assert.deepEqual(getColorFrameShades(color),shades);
    }
});
test('red weights are 70 base, 20 dark, 8 light and 2 white',()=>{
    const counts={};for(const shade of getColorFrameShades('#ff0000')) counts[shade]=(counts[shade]||0)+1;
    assert.deepEqual(counts,{'#ff0000':70,'#000000':5,'#400000':5,'#800000':5,'#bf0000':5,'#ff1f1f':4,'#ff3d3d':4,'#ffffff':2});
});
test('black and white remain valid choices when weighted shades coincide',()=>{
    for(const color of ['#000000','#FFFFFF']){
        const shades=getColorFrameShades(color);
        assert.equal(shades.length,100);
        assert(shades.every(shade=>/^#[0-9a-f]{6}$/.test(shade)));
        assert(shades.slice(0,70).every(shade=>shade===color.toLowerCase()));
    }
});
