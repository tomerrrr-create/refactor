import test from 'node:test';
import assert from 'node:assert/strict';
import { createCycleEditorDraft } from '../js/preset-cycle-editor.js';

const slots = [0, 1, 2].map(i => ({ survival: [i], birth: [3] }));
const defaults = slots.map(x => structuredClone(x));
const state = index => ({ slots: structuredClone(slots), sources: ['paint4', 'shuffle', 'coral'], yoursRules: { survival: [7], birth: [8] }, index });
const make = (index = 2) => createCycleEditorDraft(state(index), defaults, ['paint4', 'shuffle', 'coral']);

for (const index of [0, 1, 2]) {
    test(`opening slot ${index} retains the entry position for preset and manual edits`, () => {
        const draft = make(index), named = { survival: [8], birth: [] };
        assert.equal(draft.index, index); draft.assign(named, 'named');
        assert.equal(draft.index, index); assert.deepEqual(draft.slots[index], named);
        const custom = { survival: [], birth: [7] }; draft.manualChange(custom);
        assert.equal(draft.sources[index], 'custom-' + index); assert.deepEqual(draft.slots[index], custom);
        for(const other of [0,1,2].filter(i => i !== index)) assert.deepEqual(draft.slots[other], slots[other]);
    });
}
test('switching selected positions preserves all pending edits', () => {
    const draft = make(0), first = { survival: [6], birth: [4] }, third = { survival: [5], birth: [7] };
    draft.manualChange(first); draft.selectSlot(2); draft.assign(third, 'other'); draft.selectSlot(0);
    assert.deepEqual(draft.slots[0], first); assert.deepEqual(draft.slots[2], third);
    draft.selectSlot(99); assert.equal(draft.index, 0);
});
test('reset restores all three original presets and keeps the selected position', () => {
    const draft = make(1); draft.manualChange({survival: [], birth: []}); draft.selectSlot(0); draft.assign({survival: [8], birth: [8]}, 'other');
    draft.selectSlot(2); draft.reset();
    assert.deepEqual(draft.slots, defaults); assert.deepEqual(draft.sources, ['paint4','shuffle','coral']); assert.equal(draft.index,2);
});
test('discarded drafts never mutate saved snapshots or source identity', () => {
    const saved = state(2), before = structuredClone(saved), draft = createCycleEditorDraft(saved, defaults, ['paint4','shuffle','coral']);
    draft.manualChange({survival:[4],birth:[5]}); draft.reset(); assert.deepEqual(saved,before);
});
test('no active entry position falls back to the first position', () => {
    assert.equal(make(-1).index,0);
});
