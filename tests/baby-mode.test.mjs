import test from 'node:test';
import assert from 'node:assert/strict';
import { paintBabyStroke, babyDrawingToTiles } from '../js/baby-mode.js';

function draw(from, to, colors = ['#ff0000', '#00ff00', '#0000ff']) {
    const pixels = [];
    let next = 0;
    const ctx = { fillRect(x, y, w, h) { pixels.push({ x, y, w, h, color: this.fillStyle }); } };
    paintBabyStroke(ctx, from, to, colors, () => (next++ % colors.length) / colors.length);
    return pixels;
}

test('baby taps paint exactly one cell from the supplied palette', () => {
    assert.deepEqual(draw({x: 12, y: 24}, {x: 12, y: 24}),
        [{x: 12, y: 24, w: 1, h: 1, color: '#ff0000'}]);
});

test('fast strokes stay connected with a one-cell brush in every direction', () => {
    for (const to of [{x: 248, y: 124}, {x: 0, y: 124}, {x: 124, y: 248},
        {x: 124, y: 0}, {x: 248, y: 230}, {x: 0, y: 20}, {x: 55, y: 240}, {x: 190, y: 0}]) {
        const from = {x: 124, y: 124}, pixels = draw(from, to);
        assert.equal(pixels.length, Math.max(Math.abs(to.x-from.x), Math.abs(to.y-from.y)) + 1);
        assert.deepEqual({x: pixels.at(-1).x, y: pixels.at(-1).y}, to);
        for (const [i, pixel] of pixels.entries()) {
            assert.equal(pixel.w, 1); assert.equal(pixel.h, 1);
            assert(pixel.x >= 0 && pixel.x < 249 && pixel.y >= 0 && pixel.y < 249);
            if (i) assert.equal(Math.max(Math.abs(pixel.x-pixels[i-1].x), Math.abs(pixel.y-pixels[i-1].y)), 1);
        }
    }
});

test('rainbow strokes use fresh palette selections without altering the palette', () => {
    const colors = Object.freeze(['#123456', '#abcdef', '#654321']);
    assert.deepEqual(draw({x: 0, y: 0}, {x: 5, y: 0}, colors).map(p => p.color),
        ['#123456', '#abcdef', '#654321', '#123456', '#abcdef', '#654321']);
});

test('baby drawing preserves exact painted colors and black cells in any palette order', () => {
    const pixels = new Uint8ClampedArray([0,0,0,255, 255,0,0,255, 0,255,0,255, 0,0,0,255]);
    const original = pixels.slice();
    for (const colors of [['#ff0000','#000000','#00ff00'], ['#00ff00','#ff0000','#000000']]) {
        const tiles = babyDrawingToTiles(pixels, colors);
        assert.deepEqual(tiles.map(tile => colors[tile.k]), ['#000000','#ff0000','#00ff00','#000000']);
        assert(tiles.every(tile => tile.v === tile.k && tile.isGold === false));
    }
    assert.deepEqual(pixels, original);
});

test('invalid or unmapped pixels cannot silently change the baby drawing colors', () => {
    assert.throws(() => babyDrawingToTiles([0,0,0], ['#000000']), /Invalid/);
    assert.throws(() => babyDrawingToTiles([255,0,0,255], ['#000000']), /missing/);
});
