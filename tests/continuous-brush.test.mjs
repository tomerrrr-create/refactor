import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const n = 31;
let painted = [];
const context = vm.createContext({ n, handleDragPaint: i => painted.push(i) });
vm.runInContext(source.slice(source.indexOf('function paintBrushLine('), source.indexOf('function handleContinuousDrag(')), context);
const index = (x, y) => y * n + x;

for (const [x, y] of [[25, 15], [25, 20], [20, 25], [15, 25], [10, 25],
    [5, 20], [5, 15], [5, 10], [10, 5], [15, 5], [20, 5], [25, 10]]) {
    test(`completes segment toward (${x}, ${y}) without duplicate endpoints`, () => {
        painted = [];
        const start = index(15, 15), end = index(x, y);
        context.paintBrushLine(start, end);
        assert.equal(painted.at(-1), end);
        assert.ok(!painted.includes(start));
        assert.equal(new Set(painted).size, painted.length);
        assert.equal(painted.length, Math.max(Math.abs(x - 15), Math.abs(y - 15)));
        for (let i = 1; i < painted.length; i++) {
            assert.ok(Math.abs(painted[i] % n - painted[i - 1] % n) <= 1);
            assert.ok(Math.abs(Math.floor(painted[i] / n) - Math.floor(painted[i - 1] / n)) <= 1);
        }
    });
}

test('stationary input does no painting; adjoining segments paint the join once', () => {
    painted = [];
    context.paintBrushLine(index(0, 0), index(0, 0));
    assert.equal(painted.length, 0);
    context.paintBrushLine(index(0, 0), index(3, 0));
    context.paintBrushLine(index(3, 0), index(6, 0));
    assert.deepEqual(painted, [1, 2, 3, 4, 5, 6]);
});
