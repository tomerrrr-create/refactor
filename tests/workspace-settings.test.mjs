import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings,
    isWorkspaceSettingsText, persistWorkspaceSettings, loadWorkspaceSettings, migrateEvolutionSelections } from '../js/workspace-settings.js';

test('settings-only format omits defaults and restores complete preferences in a new browser', () => {
    const settings = defaultWorkspaceSettings();
    const defaults = serializeWorkspaceSettings(settings);
    assert.deepEqual(JSON.parse(defaults.split('\n').slice(1).join('\n')).settings, {});
    settings.simulationInit.brushSize = 11;
    settings.startup.paletteName = 'Hearts';
    settings.cycles.chiFlow[2].reachPercent = 400;
    settings.cycles.gameOfLife[1] = { survival: [0, 8], birth: [4] };
    settings.rules.turing.feed = .029;
    settings.nudgeIntervalMs = 25;
    settings.smoothing.display = true;
    const text = serializeWorkspaceSettings(settings);
    assert.deepEqual(deserializeWorkspaceSettings('\uFEFF' + text.replaceAll('\n', '\r\n')), settings);
    for (const forbidden of ['tiles', 'boardState', 'isGold', 'INIT_STATE']) assert(!text.includes(forbidden));
    let stored;
    const browser = { setItem: (_, text) => { stored = text; }, getItem: () => stored };
    assert(persistWorkspaceSettings(settings, browser));
    assert.deepEqual(loadWorkspaceSettings(browser), settings);
});
test('header distinguishes preferences from macro text and rejects unsupported or malformed settings', () => {
    assert(!isWorkspaceSettingsText('[00:00:00.000] INIT_STATE -> {}'));
    assert(isWorkspaceSettingsText('FYI_SETTINGS_V2\n{}'));
    for (const text of ['FYI_SETTINGS_V2\n{}', 'FYI_SETTINGS_V1\n{', 'FYI_SETTINGS_V1\n{"version":1,"settings":{"tiles":[]}}',
        'FYI_SETTINGS_V1\n{"version":1,"settings":{"nudgeIntervalMs":-1}}',
        'FYI_SETTINGS_V1\n{"version":1,"settings":{"smoothing":{"display":"true"}}}']) {
        assert.throws(() => deserializeWorkspaceSettings(text));
    }
});
test('invalid nested rules cannot fall back silently or enter storage', () => {
    const settings = defaultWorkspaceSettings();
    settings.cycles.chiFlow[1].reachPercent = 999;
    assert.throws(() => serializeWorkspaceSettings(settings));
    let writes = 0;
    assert.equal(persistWorkspaceSettings(settings, { setItem() { writes++; } }), false);
    assert.equal(writes, 0);
    settings.cycles.chiFlow[1].reachPercent = 150;
    assert.doesNotThrow(() => serializeWorkspaceSettings(settings));
    settings.rules.gravity.direction = 'unknown';
    assert.throws(() => serializeWorkspaceSettings(settings));
});

test('optional profile themes round-trip without changing legacy V1 settings semantics', () => {
    assert.equal(Object.hasOwn(defaultWorkspaceSettings(), 'simulationTheme'), false);
    for (const simulationTheme of ['blue', 'gold', 'teal', 'silver', 'ice']) {
        const settings = { ...defaultWorkspaceSettings(), simulationTheme };
        assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    }
    assert.throws(() => serializeWorkspaceSettings({ ...defaultWorkspaceSettings(), simulationTheme: 'unknown' }));
});

test('retired swipe selections remain readable and migrate into ordinary cycle slots',()=>{
 const original=defaultWorkspaceSettings();original.nudgeIntervalMs=37;
 original.evolutionSelections={gameOfLife:{survival:[1,8],birth:[0,4]},chiFlow:{awakening:[2,3],flow:[4],reach:0,reachPercent:400}};
 const imported=deserializeWorkspaceSettings(serializeWorkspaceSettings(original));
 const migrated=migrateEvolutionSelections(imported,{gameOfLife:2,chiFlow:1});
 assert.equal(migrated.evolutionSelections,undefined);assert.equal(migrated.nudgeIntervalMs,37);
 assert.deepEqual(migrated.cycles.gameOfLife[2],original.evolutionSelections.gameOfLife);
 assert.deepEqual(migrated.cycles.chiFlow[1],original.evolutionSelections.chiFlow);
 assert.deepEqual(migrated.cycles.gameOfLife.slice(0,2),original.cycles.gameOfLife.slice(0,2));
 assert.deepEqual(imported,original,'reader migration cannot mutate an existing file snapshot');
 assert.deepEqual(migrateEvolutionSelections(imported).cycles.gameOfLife[0],original.evolutionSelections.gameOfLife);
 for(const bad of [null,[],{unknown:{}},{gameOfLife:{survival:[9],birth:[]}},{chiFlow:{awakening:[0],flow:[],reach:0}}])assert.throws(()=>serializeWorkspaceSettings({...original,evolutionSelections:bad}));
 assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(migrated)),migrated);
});
