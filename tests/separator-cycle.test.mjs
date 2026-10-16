import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SEPARATOR_CYCLE, normalizeSeparatorCycle, nextSeparatorWidth } from '../js/separator-cycle.js';

test('the default cycle retains all existing widths and ordering', () => {
    assert.deepEqual(DEFAULT_SEPARATOR_CYCLE, [6, 5, 3, 2, 0]);
    let current = 2;
    const visited = Array.from({ length: 6 }, () => current = nextSeparatorWidth(current, DEFAULT_SEPARATOR_CYCLE));
    assert.deepEqual(visited, [0, 6, 5, 3, 2, 0]);
});
test('custom widths include 1 and 4, wrap, and enter at the first chosen width', () => {
    const chosen = [0, 4, 1, 4], before = [...chosen];
    assert.deepEqual(normalizeSeparatorCycle(chosen), [4, 1, 0]);
    assert.equal(nextSeparatorWidth(2, chosen), 4);
    assert.equal(nextSeparatorWidth(4, chosen), 1);
    assert.equal(nextSeparatorWidth(1, chosen), 0);
    assert.equal(nextSeparatorWidth(0, chosen), 4);
    assert.equal(nextSeparatorWidth(4, [4]), 4);
    assert.deepEqual(chosen, before);
});
test('empty, out-of-range and non-integer selections cannot be saved', () => {
    for (const invalid of [[], null, '1', [-1], [7], [1.5], ['2']]) assert.equal(normalizeSeparatorCycle(invalid), null);
});
