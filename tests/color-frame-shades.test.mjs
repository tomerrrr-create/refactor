import test from 'node:test';
import assert from 'node:assert/strict';
import {getColorFrameShades} from '../js/rainbow-frame.js';
import {hexToRgb,getLuminance} from '../js/colors.js';

test('color frame shades include black, the exact selected color and white',()=>{
    for(const color of ['#FF0000','#0000FF','#52a68c','#000000','#FFFFFF','#808080']){
        const shades=getColorFrameShades(color);
        assert.equal(shades.length,21);
        assert.equal(shades[0],'#000000');
        assert.equal(shades[10],color.toLowerCase());
        assert.equal(shades.at(-1),'#ffffff');
        for(let i=1;i<shades.length;i++) assert(getLuminance(shades[i])>=getLuminance(shades[i-1]));
        assert.deepEqual(getColorFrameShades(color),shades);
    }
});
test('red shades remain red toward black and pink toward white, never rainbow hues',()=>{
    const shades=getColorFrameShades('#ff0000').map(hexToRgb);
    for(let i=0;i<=10;i++)assert.deepEqual(shades[i],[Math.round(255*i/10),0,0]);
    for(let i=11;i<=20;i++)assert.deepEqual(shades[i],[255,Math.round(255*(i-10)/10),Math.round(255*(i-10)/10)]);
});
