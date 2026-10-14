import { CHI_REACH_PERCENTAGES } from '../js/chi-reach.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../js/evolution-cycle-settings.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, 'const CHI_REACH_PERCENTAGES = ' + JSON.stringify(CHI_REACH_PERCENTAGES) + ';').replaceAll('export ', '');
const defaults = [{ survival: [0, 2], birth: [3] }, { survival: [4], birth: [] }, { survival: [8], birth: [2] }];
const plain = x => JSON.parse(JSON.stringify(x));
const c = vm.createContext({}); vm.runInContext(source, c);
test('cycle storage validates shape, bounds, uniqueness and independent rule arrays', () => {
    assert.deepEqual(plain(c.normalizeEvolutionCycle([{}], defaults)), defaults);
    const input = [{ survival: [8, 0, 8], birth: [] }, { survival: [9], birth: [3] }, { survival: [1], birth: [2] }];
    const result = c.normalizeEvolutionCycle(input, defaults);
    assert.deepEqual(plain(result), [{ survival: [0, 8], birth: [] }, defaults[1], input[2]]);
    input[2].survival.push(7); assert.deepEqual(plain(result[2].survival), [1]);
});
test('malformed or unavailable storage falls back safely; valid preferences round-trip', () => {
    c.localStorage = { getItem: () => '{broken', setItem: () => { throw new Error('blocked'); } };
    assert.deepEqual(plain(c.loadEvolutionCycle('test', defaults)), defaults);
    c.persistEvolutionCycle('test', defaults);
    let saved;
    c.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    c.persistEvolutionCycle('test', defaults);
    assert.deepEqual(plain(c.loadEvolutionCycle('test', defaults)), defaults);
});
test('Chi Flow includes Reach validation and rejects zero-valued neighbor rules', () => {
    const rules = { awakening: [3, 4], flow: [2], reach: 0 }, defaults = [rules, rules, rules];
    const result = c.normalizeEvolutionCycle([{ ...rules, reach: -1 }, { ...rules, flow: [0] }, { ...rules, reach: 7 }], defaults);
    assert.deepEqual(plain(result), [rules, rules, { ...rules, reach: 7 }]);
});
test('source identity preserves Yours independently; outdated preset references follow the recorded rules', () => {
    const presets = { Ripple: defaults[1], Nova: defaults[2] };
    assert.deepEqual(plain(c.normalizeCycleSources(['yours', 'Ripple', 'removed'], defaults, presets)), ['yours', 'Ripple', 'Nova']);
    const personal = { survival: [1, 7], birth: [2] };
    c.localStorage = { getItem: () => JSON.stringify({ sources: ['Ripple', 'yours', 'Nova'], yoursRules: personal }) };
    const result = c.loadCycleIdentity('identity', [defaults[1], personal, defaults[2]], presets);
    assert.deepEqual(plain(result), { sources: ['Ripple', 'yours', 'Nova'], yoursRules: personal });
});
