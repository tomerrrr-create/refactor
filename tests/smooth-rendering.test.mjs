import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { hexToRgb, lerp } from '../js/colors.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness() {
    const screen = { drawImage() {}, fillRect() {} };
    const h = vm.createContext({ n: 2, separatorPx: 0, isSmoothRendering: false, isLifePlaying: false,
        boardState: [0, 1, 1, 0].map(k => ({ k, v: k, isGold: false, prevK: null })),
        palette: () => ['#000000', '#ffffff'], norm: k => k % 2,
        hexToRgb, lerp, performance: { now: () => 0 }, C: {}, ctx: screen,
        canvas: { clientWidth: 720, clientHeight: 720 },
        document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({
            createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}
        }) }) }
    });
    vm.runInContext(source.slice(source.indexOf('let offscreenRenderCanvas = null;'), source.indexOf('// --- startBreatheAnimation')), h);
    return h;
}
test('screen smoothing toggles without modifying the grid or cached pixel data', () => {
    const h = harness(), before = JSON.stringify(h.boardState);
    h.renderToScreen(null); assert.equal(h.ctx.imageSmoothingEnabled, false);
    const initial = vm.runInContext('cachedImgData', h);
    const bytes = [...initial.data];
    h.isSmoothRendering = true; h.renderToScreen(null);
    assert.equal(h.ctx.imageSmoothingEnabled, true); assert.equal(h.ctx.imageSmoothingQuality, 'high');
    assert.equal(vm.runInContext('cachedImgData', h), initial);
    assert.deepEqual([...initial.data], bytes); assert.equal(JSON.stringify(h.boardState), before);
    h.isSmoothRendering = false; h.renderToScreen(null); assert.equal(h.ctx.imageSmoothingEnabled, false);
});
test('export rendering stays crisp even while screen smoothing is enabled', () => {
    const h = harness(), exported = { drawImage() {} };
    h.isSmoothRendering = true; h.renderToScreen(null);
    h.renderBoard(exported, 4096, 4096, null);
    assert.equal(h.ctx.imageSmoothingEnabled, true); assert.equal(exported.imageSmoothingEnabled, false);
});
test('separated tiles retain the direct rectangle rendering path', () => {
    const h = harness(); let rectangles = 0;
    h.getPaletteColor = k => h.palette()[h.norm(k)];
    h.separatorPx = 2; h.isSmoothRendering = true;
    h.ctx.fillRect = () => rectangles++;
    h.ctx.drawImage = () => { throw Error('Separated tiles must not be resampled'); };
    h.renderToScreen(null); assert.equal(rectangles, 5);
});
