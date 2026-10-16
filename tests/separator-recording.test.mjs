import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSeparatorWidth } from '../js/separator-recording.js';

test('whole, fractional and zero widths retain their exact numeric value', () => {
    for (const width of [0, 1, 2, 3, 5, 6, .81, 327 / 299 * .05, 720 / 101 * .15]) {
        assert.equal(parseSeparatorWidth(width), width);
        assert.equal(parseSeparatorWidth(String(width)), width);
    }
    assert.equal(parseSeparatorWidth(' 0.81 '), .81);
});
test('invalid widths are rejected instead of truncating or corrupting the board', () => {
    for (const value of ['', ' ', '2px', '0.5extra', '-1', -1, NaN, Infinity, 'Infinity', null, undefined, {}, true]) {
        assert.equal(parseSeparatorWidth(value), null);
    }
});
