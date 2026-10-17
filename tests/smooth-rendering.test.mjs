import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isSmoothDisplayAvailable } from '../js/smooth-rendering-settings.js';
import { hexToRgb, lerp } from '../js/colors.js';
import { prepareDisplayCanvas } from '../js/display-canvas.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness(size = 149) {
    const screen = { drawImage() {}, fillRect() {}, setTransform() {} };
    const h = vm.createContext({ prepareDisplayCanvas, window: { devicePixelRatio: 1 }, isSmoothDisplayAvailable, n: size, separatorPx: 0, isSmoothRendering: false, softBloom: null, breatheDisplay: {isActive:()=>false}, isLifePlaying: false,
        boardState: Array.from({ length: size * size }, (_, i) => i % 2).map(k => ({ k, v: k, isGold: false, prevK: null })),
        palette: () => ['#000000', '#ffffff'], norm: k => k % 2,
        hexToRgb, lerp, performance: { now: () => 0 }, C: {}, ctx: screen,
        canvas: { clientWidth: 720, clientHeight: 720 },
        document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({
            createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}
        }) }) }
    });
    vm.runInContext('function getRenderedSeparatorWidth() { return separatorPx; }', h);
    vm.runInContext(source.slice(source.indexOf('let offscreenRenderCanvas = null;'), source.indexOf('function updatePaletteHeader()')), h);
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
    const h = harness(2); let rectangles = 0;
    h.getPaletteColor = k => h.palette()[h.norm(k)];
    h.separatorPx = 2; h.isSmoothRendering = true;
    h.ctx.fillRect = () => rectangles++;
    h.ctx.drawImage = () => { throw Error('Separated tiles must not be resampled'); };
    h.renderToScreen(null); assert.equal(rectangles, 5);
});

for (const screenSmooth of [false, true]) for (const exportSmooth of [false, true]) {
    test(`save checkbox ${exportSmooth} controls actual export independently of screen ${screenSmooth}`, async () => {
        const h = harness();
        h.isSmoothRendering = screenSmooth; h.renderToScreen(null);
        const exported = { drawImage() {}, fillRect() {}, save() {}, translate() {}, restore() {} };
        h.document.createElement = () => ({ getContext: () => exported, toBlob: cb => cb({}) });
        h.dom = { btnSaveImage: { innerHTML: 'icon', disabled: false }, saveSmoothImage: { checked: exportSmooth } };
        h.setTimeout = fn => fn(); h.navigator = {}; h.getSanitizedFileName = () => 'test.png';
        h.File = class { constructor(bytes, name) { this.name = name; } };
        let closed = false, downloaded = false;
        h.triggerDownload = () => { downloaded = true; };
        h.modals = { closeModal: () => { closed = true; } };
        const start = source.indexOf('async function shareOrDownloadImage()');
        vm.runInContext(source.slice(start, source.indexOf('async function handleSaveProject()', start)), h);
        await h.shareOrDownloadImage();
        assert.equal(exported.imageSmoothingEnabled, exportSmooth);
        assert.equal(h.ctx.imageSmoothingEnabled, screenSmooth);
        assert(closed && downloaded); assert.equal(h.dom.btnSaveImage.disabled, false);
    });
}


test('small boards stay sharp without overwriting preference or changing smooth PNG export', () => {
    for (const size of [7, 101, 148, 149]) {
        const h = harness(size);
        h.isSmoothRendering = true;
        const before = JSON.stringify(h.boardState);
        h.renderToScreen(null);
        assert.equal(h.ctx.imageSmoothingEnabled, size >= 149);
        assert.equal(h.isSmoothRendering, true);
        const exported = { drawImage() {} };
        h.renderBoard(exported, 2048, 2048, null, true);
        assert.equal(exported.imageSmoothingEnabled, true);
        assert.equal(JSON.stringify(h.boardState), before);
    }
});


for (const size of [9, 21]) for (const gap of [6, 5, 3, 2]) test(`PNG export ${size}×${size} scales gap ${gap} while retaining screen and board values`, async () => {
    const h = harness(size), rectangles = [];
    h.separatorPx = gap;
    h.getPaletteColor = k => h.palette()[h.norm(k)];
    const board = JSON.stringify(h.boardState);
    const exported = { fillRect: (...args) => rectangles.push(args), save() {}, translate() {}, restore() {} };
    h.document.createElement = () => ({ getContext: () => exported, toBlob: cb => cb({}) });
    h.dom = { btnSaveImage: { innerHTML: 'icon' }, saveSmoothImage: { checked: false } };
    h.setTimeout = fn => fn(); h.navigator = {}; h.getSanitizedFileName = () => 'test.png';
    h.File = class {}; h.triggerDownload = () => {}; h.modals = { closeModal() {} };
    const start = source.indexOf('async function shareOrDownloadImage()');
    vm.runInContext(source.slice(start, source.indexOf('async function handleSaveProject()', start)), h);
    await h.shareOrDownloadImage();
    const firstTile = rectangles[2], secondTile = rectangles[3];
    const exportedGap = secondTile[0] - firstTile[0] - firstTile[2];
    assert(Math.abs(exportedGap - gap * 4014 / 720) < 1e-9);
    assert.equal(h.separatorPx, gap);
    assert.equal(JSON.stringify(h.boardState), board);
});
