import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDisplayCanvas } from '../js/display-canvas.js';

function harness() {
    let width = 300, height = 150, writes = 0;
    const transforms = [];
    const canvas = {
        get width() { return width; }, set width(value) { width = value; writes++; },
        get height() { return height; }, set height(value) { height = value; writes++; }
    };
    const context = { setTransform: (...args) => transforms.push(args) };
    return { canvas, context, transforms, get writes() { return writes; } };
}

test('resizing during drawing aligns the entire board before the next frame', () => {
    const h = harness();
    for (const [width, height, ratio] of [[332, 332, 3], [382, 382, 3], [720, 400, 1.25], [382, 382, 2]]) {
        assert(prepareDisplayCanvas(h.canvas, h.context, width, height, ratio));
        const [sx, , , sy] = h.transforms.at(-1);
        assert.equal(sx * width, h.canvas.width);
        assert.equal(sy * height, h.canvas.height);
        // The visual center remains the bitmap center, including fractional DPR.
        assert.equal(width / 2 * sx, h.canvas.width / 2);
        const writes = h.writes, transforms = h.transforms.length;
        for (let frame = 0; frame < 100; frame++) prepareDisplayCanvas(h.canvas, h.context, width, height, ratio);
        assert.equal(h.writes, writes, 'stable frames must not clear the bitmap');
        assert.equal(h.transforms.length, transforms, 'stable frames must not accumulate scaling');
    }
});

test('hidden canvas does not clear its image and external bitmap resets are repaired', () => {
    const h = harness();
    prepareDisplayCanvas(h.canvas, h.context, 382, 382, 3);
    const writes = h.writes;
    assert.equal(prepareDisplayCanvas(h.canvas, h.context, 0, 0, 3), false);
    assert.equal(h.writes, writes);
    h.canvas.width = 300;
    prepareDisplayCanvas(h.canvas, h.context, 382, 382, 3);
    assert.equal(h.canvas.width, 1146);
    assert.deepEqual(h.transforms.at(-1), [3, 0, 0, 3, 0, 0]);
});
