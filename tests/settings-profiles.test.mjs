import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES_STORAGE_KEY, readSettingsProfiles, saveProfileSettings, renameSettingsProfile } from '../js/settings-profiles.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';

const browserStorage = () => {
    const data = new Map([['unrelated', 'keep']]);
    return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('three independent settings-only slots and names survive a new store read', () => {
    const storage = browserStorage();
    assert.equal(readSettingsProfiles(storage).length, 3);
    assert(readSettingsProfiles(storage).every(p => p.settingsText === null));
    const settings = defaultWorkspaceSettings();
    for (let i = 0; i < 3; i++) {
        settings.rules.gravity.strength = (i + 1) / 4;
        settings.cycles.chiFlow[i].reachPercent = 400;
        saveProfileSettings(i, serializeWorkspaceSettings(settings), storage);
        renameSettingsProfile(i, ['Quiet', 'שקט', 'Rust'][i], storage);
    }
    const profiles = readSettingsProfiles(storage);
    assert.deepEqual(profiles.map(p => p.name), ['Quiet', 'שקט', 'Rust']);
    assert.deepEqual(profiles.map(p => deserializeWorkspaceSettings(p.settingsText).rules.gravity.strength), [.25, .5, .75]);
    assert.equal(storage.data.get('unrelated'), 'keep');
    assert.equal(storage.data.size, 2, 'profile operations only write their own storage key');
});
test('invalid files, wrong file types and invalid names never replace a profile', () => {
    const storage = browserStorage(), settings = defaultWorkspaceSettings();
    saveProfileSettings(1, serializeWorkspaceSettings(settings), storage);
    const before = storage.getItem(PROFILES_STORAGE_KEY);
    for (const invalid of ['{}', '[00:00:00] INIT_STATE -> {}', 'FYI_SETTINGS_V2\n{}', 'FYI_SETTINGS_V1\n{',
        'FYI_SETTINGS_V1\n{"version":1,"settings":{"brush":{"size":2}}}']) {
        assert.throws(() => saveProfileSettings(1, invalid, storage));
        assert.equal(storage.getItem(PROFILES_STORAGE_KEY), before);
    }
    for (const name of ['', '  ', 'a'.repeat(49)]) assert.throws(() => renameSettingsProfile(1, name, storage));
    assert.throws(() => saveProfileSettings(3, serializeWorkspaceSettings(settings), storage));
    assert.equal(storage.getItem(PROFILES_STORAGE_KEY), before);
});
test('storage failures and corrupt prior data are reported without silently replacing slots', () => {
    const storage = browserStorage();
    const settingsText = serializeWorkspaceSettings(defaultWorkspaceSettings());
    saveProfileSettings(0, settingsText, storage);
    const before = storage.getItem(PROFILES_STORAGE_KEY);
    assert.throws(() => saveProfileSettings(0, settingsText, { getItem: storage.getItem, setItem() { throw new Error('Quota'); } }));
    assert.equal(storage.getItem(PROFILES_STORAGE_KEY), before);
    storage.setItem(PROFILES_STORAGE_KEY, '{');
    assert.throws(() => renameSettingsProfile(0, 'New', storage));
    assert.equal(storage.getItem(PROFILES_STORAGE_KEY), '{');
});
test('a defaults-only file restores baseline settings rather than merging with another slot', () => {
    const storage = browserStorage(), custom = defaultWorkspaceSettings();
    custom.sortCycle = ['hue']; custom.brush.size = 7;
    saveProfileSettings(0, serializeWorkspaceSettings(custom), storage);
    saveProfileSettings(1, serializeWorkspaceSettings(defaultWorkspaceSettings()), storage);
    assert.equal(deserializeWorkspaceSettings(readSettingsProfiles(storage)[1].settingsText).brush.size, 1);
    assert.equal(deserializeWorkspaceSettings(readSettingsProfiles(storage)[0].settingsText).brush.size, 7);
});

test('named profiles grow beyond existing slots and keep the last selection without losing prior data', async () => {
    const { createSettingsProfile, readSelectedProfile, selectSettingsProfile } = await import('../js/settings-profiles.js');
    const storage = browserStorage();
    storage.removeItem = key => storage.data.delete(key);
    const settings = defaultWorkspaceSettings();
    const first = serializeWorkspaceSettings(settings);
    saveProfileSettings(0, first, storage);
    renameSettingsProfile(0, 'Existing', storage);
    assert.equal(readSelectedProfile(storage), null);
    for (let i = 1; i <= 4; i++) {
        settings.brush.size = i * 2 + 1;
        assert.equal(createSettingsProfile('Profile ' + i, serializeWorkspaceSettings(settings), storage), i);
    }
    assert.equal(readSettingsProfiles(storage).length, 5);
    assert.equal(readSettingsProfiles(storage)[0].settingsText, first);
    assert(selectSettingsProfile(3, storage));
    assert.equal(readSelectedProfile(storage), 3);
    assert(selectSettingsProfile(null, storage));
    assert.equal(readSelectedProfile(storage), null);
    assert.equal(readSettingsProfiles(storage).length, 5);
    const before = storage.getItem(PROFILES_STORAGE_KEY);
    assert.throws(() => createSettingsProfile(' ', first, storage));
    assert.equal(storage.getItem(PROFILES_STORAGE_KEY), before);
    assert.equal(selectSettingsProfile(99, storage), false);
});
