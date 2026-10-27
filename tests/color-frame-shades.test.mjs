import test from 'node:test';
import assert from 'node:assert/strict';
import {getColorFrameGradient,updateColorFrame,updateRainbowFrame} from '../js/rainbow-frame.js';

test('smooth frame repeats the selected color and a darker shade with a seamless join',()=>{
    assert.equal(getColorFrameGradient('#FF0000'),'conic-gradient(#ff0000 0%, #730000 25%, #ff0000 50%, #730000 75%, #ff0000 100%)');
    assert.equal(getColorFrameGradient('#0000ff'),'conic-gradient(#0000ff 0%, #000073 25%, #0000ff 50%, #000073 75%, #0000ff 100%)');
    for(const color of ['#ffc0cb','#52a68c','#808080']){
        const gradient=getColorFrameGradient(color);
        assert(!gradient.includes('#ffffff'));assert(!gradient.includes('#000000'));
        assert.equal(getColorFrameGradient(color),gradient);
    }
});
test('switching from a smooth frame back to rainbow restores the cached rainbow pattern',()=>{
    let serial=0;
    const oldDocument=globalThis.document;
    globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}}),toDataURL:()=>`data:image/png;base64,${++serial}`})};
    try {
        const styles=new Map();
        const board={getBoundingClientRect:()=>({width:100,height:100}),classList:{contains:()=>true},style:{setProperty:(key,value)=>styles.set(key,value)}};
        updateRainbowFrame(board,['#ff0000','#00ff00']);const initial=styles.get('--rainbow-frame-pattern');
        updateRainbowFrame(board,['#ff0000','#00ff00']);assert.equal(serial,1);
        updateColorFrame(board,'#ff0000');assert(styles.get('--rainbow-frame-pattern').startsWith('conic-gradient('));assert.equal(serial,1,'solid color needs no canvas');
        updateRainbowFrame(board,['#ff0000','#00ff00']);assert.equal(serial,2);assert.notEqual(styles.get('--rainbow-frame-pattern'),initial);assert(styles.get('--rainbow-frame-pattern').startsWith('url('));
    } finally {globalThis.document=oldDocument;}
});
test('black and white choices produce valid monochrome frames',()=>{
    assert(getColorFrameGradient('#000000').includes('#000000'));
    assert(getColorFrameGradient('#ffffff').includes('#737373'));
});
