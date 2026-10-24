import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const c = vm.createContext({});
for (const file of ['evolution-cycle-settings.js', 'preset-cycle-membership.js']) {
    vm.runInContext(readFileSync(new URL('../js/' + file, import.meta.url), 'utf8').replace(/^import .*;\n/m, '').replaceAll('export ', ''), c);
}
const slots = [0, 1, 2].map(i => ({ survival: [i], birth: [3] }));
const plain = x => JSON.parse(JSON.stringify(x));
test('full cycle ignores additions; every position can be freed and refilled', () => {
    for (let index = 0; index < 3; index++) {
        const draft = c.createMembershipDraft(slots);
        const replacement = { survival: [7], birth: [] };
        assert.equal(draft.fill(replacement), false);
        assert.equal(draft.remove(index), true);
        assert.equal(draft.vacant, index);
        assert.equal(draft.remove((index + 1) % 3), false);
        assert.equal(draft.fill(replacement), true);
        assert.equal(draft.vacant, null);
        assert.deepEqual(plain(draft.slots[index]), replacement);
        assert.deepEqual(plain(draft.slots[(index + 1) % 3]), slots[(index + 1) % 3]);
    }
});
test('removing a custom slot retains its rules for restoring it; drafts never mutate saved slots', () => {
    const draft = c.createMembershipDraft(slots);
    draft.remove(2);
    assert.deepEqual(plain(draft.removedRules), slots[2]);
    draft.fill(draft.removedRules);
    draft.slots[0].survival.push(8);
    assert.deepEqual(slots[0].survival, [0]);
    assert.deepEqual(plain(draft.slots[2]), slots[2]);
    assert.equal(draft.removedRules, null);
});
