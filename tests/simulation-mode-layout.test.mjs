import test from 'node:test';
import assert from 'node:assert/strict';
import { createModeLayout, validateModeLayout, loadModeLayout, nextLayoutMode, LAYOUT_MODES, MODE_LAYOUT_KEY } from '../js/simulation-mode-layout.js';

test('a mode layout is a complete, unique partition with independent order and cycle membership', () => {
    const layout = createModeLayout();
    const { gravitationalSort, spiral, ink } = layout.families;
    const pinwheel = gravitationalSort.pop();
    assert.equal(pinwheel.id, 'reverse_right');
    spiral.unshift(pinwheel);
    assert.deepEqual(validateModeLayout(layout), layout);
    const stored = { getItem: key => key === MODE_LAYOUT_KEY ? JSON.stringify(layout) : null };
    assert.deepEqual(loadModeLayout(stored), layout);
    assert.equal(loadModeLayout({ getItem: () => '[invalid' }), null);
    ink.push(pinwheel);
    assert.equal(validateModeLayout(layout), null);
    ink.pop();
    spiral.pop();
    assert.equal(validateModeLayout(layout), null);
});

test('a draft starts from native cycle preferences and reset restores factory choices', () => {
    const draft = createModeLayout({ gravitationalSort: ['right'], spiral: ['down'], ink: ['a'] });
    assert.deepEqual(draft.families.ink.filter(mode => mode.inCycle).map(mode => mode.id), ['a']);
    const original = createModeLayout();
    assert.equal(original.families.gravitationalSort.filter(mode => mode.inCycle).length, 8);
    assert.equal(original.families.ink.filter(mode => mode.inCycle).some(mode => mode.id === 'a'), false);
    assert.equal(Object.values(original.families).flat().length, LAYOUT_MODES.size);
});

test('cycles follow assigned order and keep parked and empty families selectable through settings', () => {
    const entries = [
        { id: 'pinwheel', inCycle: true }, { id: 'a', inCycle: false },
        { id: 'right', inCycle: true }, { id: 'down', inCycle: false }
    ];
    assert.equal(nextLayoutMode(entries, undefined, 'right', false), 'right');
    assert.equal(nextLayoutMode(entries, undefined, 'a', false), 'pinwheel');
    assert.equal(nextLayoutMode(entries, 'a', undefined, false), 'right');
    assert.equal(nextLayoutMode(entries, 'right', undefined, false), 'off');
    assert.equal(nextLayoutMode(entries, 'right', undefined, true), 'pinwheel');
    assert.equal(nextLayoutMode(entries, 'down', undefined, true), 'pinwheel');
    assert.equal(nextLayoutMode(entries.filter(mode => !mode.inCycle), 'a', undefined, true), undefined);
    assert.equal(nextLayoutMode([], undefined, undefined, false), undefined);
});
