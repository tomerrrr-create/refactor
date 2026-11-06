import test from 'node:test';
import assert from 'node:assert/strict';
import { createCycleEditorDraft, commitCycleEditorDraft, orderedCyclePresets, adjacentCyclePreset } from '../js/preset-cycle-editor.js';

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

test('preset navigation follows the actual button list, not definition insertion order',()=>{
 const definitions=['a','b','c'].map(id=>({button:{id},source:id,rules:{survival:[1],birth:[Number(id.charCodeAt(0))-97]}}));
 const container={querySelectorAll:()=>[{id:'reset'},definitions[2].button,definitions[0].button,definitions[1].button]};
 assert.deepEqual(orderedCyclePresets(container,definitions).map(p=>p.source),['c','a','b']);
});
for(const index of [0,1,2])test(`navigation and modal Save commit the same slot snapshot (${index})`,()=>{
 const presets=[{source:'first',button:{id:'a'},rules:{survival:[1],birth:[2]}},{source:'next',button:{id:'b'},rules:{survival:[2],birth:[3]}}];
 const saved=state(index);saved.sources[index]='first';saved.slots[index]=structuredClone(presets[0].rules);const before=structuredClone(saved);
 const next=adjacentCyclePreset(saved,presets,1),swipe=createCycleEditorDraft(saved),modal=createCycleEditorDraft(saved,defaults,['a','b','c']);
 swipe.assign(next.rules,next.source);modal.assign(presets[1].rules,presets[1].source);
 let swipeArgs,modalArgs;assert(commitCycleEditorDraft(swipe,(...args)=>{swipeArgs=args}));commitCycleEditorDraft(modal,(...args)=>{modalArgs=args});
 assert.deepEqual(swipeArgs,modalArgs);assert.deepEqual(saved,before);assert.equal(swipe.index,index);assert.deepEqual(swipe.yoursRules,before.yoursRules);
 for(const other of [0,1,2].filter(i=>i!==index))assert.deepEqual(swipe.slots[other],before.slots[other]);
 swipeArgs[0][index].birth.push(8);assert.deepEqual(swipe.slots[index],next.rules,'commit arguments are independent snapshots');
 assert.equal(commitCycleEditorDraft(swipe,()=>false),false);
});
test('navigation wraps, matches manual rules, ignores GoL genetics and handles genuinely custom rules',()=>{
 const presets=[{source:'first',button:{id:'a'},rules:{survival:[1,2],birth:[3]}},{source:'last',button:{id:'b'},rules:{survival:[4],birth:[5]}}];
 const saved=state(0);saved.sources[0]='custom-0';saved.slots[0]={birth:[3],survival:[2,1],genetics:'palette-order'};
 assert.equal(adjacentCyclePreset(saved,presets,-1).source,'last');assert.equal(adjacentCyclePreset(saved,presets,1).source,'last');
 saved.sources[0]='last';assert.equal(adjacentCyclePreset(saved,presets,1).source,'first');
 saved.sources[0]='custom-0';saved.slots[0]={survival:[8],birth:[]};
 assert.equal(adjacentCyclePreset(saved,presets,1).source,'first');assert.equal(adjacentCyclePreset(saved,presets,-1).source,'last');
 assert.equal(adjacentCyclePreset(saved,[],1),null);assert.equal(adjacentCyclePreset(saved,presets,0),null);
});
test('Chi named identity supplies the starting point while choosing a preset loads its full Reach',()=>{
 const presets=[{source:'first',button:{id:'a'},rules:{awakening:[1],flow:[2],reach:0}},{source:'last',button:{id:'b'},rules:{awakening:[3],flow:[4],reach:0,reachPercent:400}}];
 const saved={index:0,sources:['first','custom-1','custom-2'],slots:[{...presets[0].rules,reachPercent:400},{...presets[0].rules},{...presets[1].rules}],yoursRules:presets[0].rules};
 const next=adjacentCyclePreset(saved,presets,1);assert.equal(next.source,'last');const draft=createCycleEditorDraft(saved);draft.assign(next.rules,next.source);assert.equal(draft.slots[0].reachPercent,400);
 saved.sources[0]='custom-0';saved.slots[0]={...presets[0].rules,reachPercent:100};assert.equal(adjacentCyclePreset(saved,presets,1).source,'last');
 saved.slots[0].reachPercent=200;assert.equal(adjacentCyclePreset(saved,presets,1).source,'first');
});
