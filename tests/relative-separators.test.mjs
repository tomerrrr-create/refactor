import test from 'node:test';
import assert from 'node:assert/strict';
import { RELATIVE_SEPARATOR_LEVELS, relativeSeparatorWidth } from '../js/relative-separators.js';

test('relative widths follow the agreed ratios and retain fractional pixels', () => {
    assert.deepEqual(RELATIVE_SEPARATOR_LEVELS.map(level => relativeSeparatorWidth(40, 400, level)), [2.5, 1.5, .5, 0]);
    assert.deepEqual(RELATIVE_SEPARATOR_LEVELS.map(level => relativeSeparatorWidth(9, 400, level)), [5, 3, 1, 0]);
});
test('four distinct levels remain ordered with positive cell space across mobile and desktop sizes', () => {
    for (const width of [300, 327, 393, 720]) for (const size of [3, 9, 21, 55, 101, 149, 299]) {
        const gaps = RELATIVE_SEPARATOR_LEVELS.map(level => relativeSeparatorWidth(size, width, level));
        assert(gaps[0] > gaps[1] && gaps[1] > gaps[2] && gaps[2] > gaps[3]);
        assert.equal(gaps[3], 0);
        assert(gaps[0] <= 5 && gaps[1] <= 3 && gaps[2] <= 1);
        for (const gap of gaps) assert((width - (size - 1) * gap) / size > 0);
    }
});
