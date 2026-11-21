import assert from 'node:assert/strict';
import test from 'node:test';
import { EVOLUTION_CATALOG } from '../js/evolution-drawer-settings.js';
import { defaultSimulationFamilies, nextFamilyMode, SIMULATION_MODES, validateSimulationFamilies, familyCycleFor, updateFamilyCycle } from '../js/simulation-families.js';
import { defaultWorkspaceSettings } from '../js/workspace-settings.js';
import { readProfileFile, serializeProfileFile } from '../js/profile-state.js';

test('the family map includes every drawer control and every original mode exactly once', () => {
    const layout = defaultSimulationFamilies({ gravitationalSort: ['right', 'up'] });
    assert.deepEqual(layout.families.map(group => group.id), EVOLUTION_CATALOG.map(item => item.id));
    assert.equal(layout.families.flatMap(group => group.modes).length, SIMULATION_MODES.size);
    const family = layout.families.find(group => group.id === 'gravitationalSort');
    assert.deepEqual(family.modes.filter(mode => mode.inCycle).map(mode => mode.id), ['gravitationalSort:right', 'gravitationalSort:up']);
    assert.deepEqual(validateSimulationFamilies(layout), layout);
});

test('cross-family moves and empty groups survive settings TXT, while duplicate assignments are rejected', () => {
    const layout = defaultSimulationFamilies();
    const [source, destination] = layout.families;
    destination.name = destination.label = 'Mixed patterns';
    destination.modes.unshift(...source.modes.splice(0));
    destination.modes[0].label = 'Genetics';
    destination.modes[0].inCycle = false;
    layout.enabled = true;
    const encoded = serializeProfileFile({ settings: { ...defaultWorkspaceSettings(), simulationFamilies: layout } });
    assert.deepEqual(readProfileFile(encoded).settings.simulationFamilies, layout);
    source.modes.push(destination.modes[0]);
    assert.throws(() => validateSimulationFamilies(layout), /assignment/);
});

test('family cycling skips excluded modes and Off during playback', () => {
    const rows = [{ id: 'first', inCycle: true }, { id: 'excluded', inCycle: false }, { id: 'last', inCycle: true }];
    assert.equal(nextFamilyMode(rows, undefined, false, 'excluded'), 'first');
    assert.equal(nextFamilyMode(rows, undefined, false, 'last'), 'last');
    assert.equal(nextFamilyMode(rows, 'first', true), 'last');
    assert.equal(nextFamilyMode(rows, 'last', false), undefined);
    assert.equal(nextFamilyMode(rows, 'last', true), 'first');
    assert.equal(nextFamilyMode([], undefined, true), undefined);
});


test('native settings reflect and edit their modes in the displayed family only', () => {
    const layout = defaultSimulationFamilies({ gravitationalSort: ['up', 'right'] });
    const gravity = layout.families.find(group => group.id === 'gravitationalSort');
    const islands = layout.families.find(group => group.id === 'islands');
    islands.modes.unshift(gravity.modes.pop());
    assert.deepEqual(familyCycleFor(islands, 'gravitationalSort'), { available: ['pinwheel'], enabled: [] });
    const updated = updateFamilyCycle(layout, 'islands', 'gravitationalSort', ['pinwheel', 'up']);
    const changed = updated.families.find(group => group.id === 'islands');
    assert.deepEqual(familyCycleFor(changed, 'gravitationalSort'), { available: ['pinwheel'], enabled: ['pinwheel'] });
    assert.deepEqual(familyCycleFor(changed, 'islands'), familyCycleFor(islands, 'islands'));
    assert.equal(updated.families.find(group => group.id === 'gravitationalSort'), gravity);
    assert.equal(islands.modes[0].inCycle, false);
});
