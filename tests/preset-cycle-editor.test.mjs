import test from 'node:test';
import assert from 'node:assert/strict';
import { createCycleEditorDraft } from '../js/preset-cycle-editor.js';

const slots = [0, 1, 2].map(i => ({ survival: [i], birth: [3] }));
const defaults = slots.map(x => structuredClone(x));
const state = () => ({ slots: structuredClone(slots), sources: ['yours', 'shuffle', 'coral'], yoursRules: { survival: [7], birth: [8] }, index: 2 });
const make = s => createCycleEditorDraft(s || state(), defaults, ['yours', 'shuffle', 'coral']);

test('ordinary preset choice targets the first slot and preserves Yours and other slots', () => {
    const draft = make(), personal = structuredClone(draft.yoursRules);
    draft.assign({ survival: [8], birth: [] }, 'named');
    assert.equal(draft.index, 0); assert.equal(draft.sources[0], 'named');
    assert.deepEqual(draft.slots.slice(1), slots.slice(1)); assert.deepEqual(draft.yoursRules, personal);
});
test('ordinary manual edits target the first slot and remember personal rules', () => {
    const draft = make(), rules = { survival: [], birth: [7] };
    draft.manualChange(rules);
    assert.equal(draft.index, 0); assert.equal(draft.sources[0], 'yours');
    assert.deepEqual(draft.slots[0], rules); assert.deepEqual(draft.yoursRules, rules);
});
test('explicit assignments and custom edits target any chosen slot without moving others', () => {
    for (const target of [0, 1, 2]) {
        const draft = make(); draft.target = target;
        draft.assign({ survival: [4], birth: [6] }, 'preset');
        assert.equal(draft.index, target); assert.equal(draft.sources[target], 'preset');
        draft.manualChange({ survival: [5], birth: [7] });
        assert.equal(draft.index, target); assert.equal(draft.sources[target], 'yours');
        for (const index of [0, 1, 2].filter(i => i !== target)) assert.deepEqual(draft.slots[index], slots[index]);
    }
});
test('reset restores cycle shortcuts but retains personal rules', () => {
    const draft = make(), yours = structuredClone(draft.yoursRules);
    draft.target = 2; draft.assign({ survival: [], birth: [] }, 'other'); draft.reset();
    assert.deepEqual(draft.slots, [yours, ...defaults.slice(1)]);
    assert.deepEqual(draft.sources, ['yours', 'shuffle', 'coral']); assert.equal(draft.target, null);
});
test('discarded drafts never mutate saved snapshots or source identity', () => {
    const saved = state(), before = structuredClone(saved), draft = make(saved);
    draft.manualChange({ survival: [4], birth: [5] }); draft.reset();
    assert.deepEqual(saved, before);
});
