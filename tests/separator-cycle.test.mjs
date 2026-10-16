import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SEPARATOR_CYCLE, normalizeSeparatorCycle, nextSeparatorWidth } from '../js/separator-cycle.js';

test('the default cycle uses 5, 3, 1 and 0 in descending order', () => {
    assert.deepEqual(DEFAULT_SEPARATOR_CYCLE, [5, 3, 1, 0]);
    let current = 0;
    const visited = Array.from({ length: 6 }, () => current = nextSeparatorWidth(current, DEFAULT_SEPARATOR_CYCLE));
    assert.deepEqual(visited, [5, 3, 1, 0, 5, 3]);
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

import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';
import { createProfileState } from '../js/profile-state.js';

test('cycle extends V1 settings without changing the original baseline or old files', () => {
    const initial = defaultWorkspaceSettings();
    assert.equal(Object.hasOwn(initial, 'separatorCycle'), false);
    assert.deepEqual(JSON.parse(serializeWorkspaceSettings(initial).split('\n').slice(1).join('\n')).settings, {});
    const settings = { ...initial, separatorCycle: [4, 1, 0] };
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    const old = deserializeWorkspaceSettings('FYI_SETTINGS_V1\n{"version":1,"settings":{}}');
    assert.equal(Object.hasOwn(old, 'separatorCycle'), false);
    assert.equal(nextSeparatorWidth(2, old.separatorCycle), 5);
    for (const invalid of [[], [7], [-1], [1.5], ['2'], [4, 4], [0, 4], null]) {
        assert.throws(() => deserializeWorkspaceSettings('FYI_SETTINGS_V1\n' + JSON.stringify({ version: 1, settings: { separatorCycle: invalid } })));
    }
});
test('profiles persist independent cycles and support returning to the omitted default', () => {
    let saved;
    const storage = { getItem: () => saved ?? null, setItem: (_, value) => { saved = value; } };
    const initial = { settings: defaultWorkspaceSettings() };
    const state = createProfileState(initial, storage);
    state.capture({ settings: { ...initial.settings, separatorCycle: [4, 1, 0] } }); state.save();
    state.select(1); state.observe(initial);
    state.capture({ settings: { ...initial.settings, separatorCycle: [6, 2] } });
    const restored = createProfileState(initial, storage);
    assert.deepEqual(restored.draft(0).settings.separatorCycle, [4, 1, 0]);
    assert.deepEqual(restored.draft(1).settings.separatorCycle, [6, 2]);
    restored.observe(restored.draft()); restored.capture(initial);
    assert.equal(Object.hasOwn(restored.draft().settings, 'separatorCycle'), false);
    assert.deepEqual(createProfileState(initial, storage).draft(0).settings.separatorCycle, [4, 1, 0]);
});


import { availableSeparatorCycle, maximumSeparatorWidth } from '../js/separator-cycle.js';
import { fitStartupSeparator } from '../js/startup-settings.js';
test('one-pixel rule preserves small boards and filters dense cycles by actual display width', () => {
    assert.deepEqual(availableSeparatorCycle(9, 327), [5, 3, 1, 0]);
    assert.deepEqual(availableSeparatorCycle(55, 379, [6, 5, 3, 2, 0]), [6, 5, 3, 2, 0]);
    assert.deepEqual(availableSeparatorCycle(55, 378, [6, 5, 3, 2, 0]), [5, 3, 2, 0]);
    assert.deepEqual(availableSeparatorCycle(101, 327), [1, 0]);
    assert.deepEqual(availableSeparatorCycle(101, 720), [5, 3, 1, 0]);
    assert.deepEqual(availableSeparatorCycle(299, 327, [6, 4, 1]), [0]);
    assert.deepEqual(availableSeparatorCycle(101, 327, [6, 4, 1]), [1]);
    assert.deepEqual(availableSeparatorCycle(1, 327), [5, 3, 1, 0]);
});
test('fitting keeps valid absolute values outside the personal cycle and selects only safe lower fallbacks', () => {
    assert.equal(fitStartupSeparator(9, 4, 327, [6, 2, 0]), 4);
    assert.equal(fitStartupSeparator(101, 6, 327, [6, 4, 1]), 1);
    assert.equal(fitStartupSeparator(299, 6, 327, [6]), 0);
    for (const size of [1, 3, 9, 21, 55, 101, 149, 299]) for (const width of [300, 327, 379, 720]) {
        for (const gap of [0, 1, 2, 3, 4, 5, 6]) {
            const fitted = fitStartupSeparator(size, gap, width, [6, 5, 4, 3, 2, 1, 0]);
            assert(fitted <= gap);
            assert.equal(fitted === 0 || (width - (size - 1) * fitted) / size >= 1, true);
            if (gap === 0) assert.equal(fitted, 0);
        }
        assert(availableSeparatorCycle(size, width).every(gap => gap <= maximumSeparatorWidth(size, width)));
    }
});
