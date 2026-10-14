import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SMOOTH_RENDERING, loadSmoothRendering, persistSmoothRendering } from '../js/smooth-rendering-settings.js';
import { defaultWorkspaceSettings, deserializeWorkspaceSettings, serializeWorkspaceSettings } from '../js/workspace-settings.js';

test('Smooth starts on and preserves explicit on/off choices across browser sessions', () => {
    let saved = null;
    const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    assert.equal(DEFAULT_SMOOTH_RENDERING, true);
    assert.equal(loadSmoothRendering(undefined, storage), true);
    for (const value of [false, true, false]) {
        assert.equal(persistSmoothRendering(value, storage), true);
        assert.equal(loadSmoothRendering(!value, storage), value);
    }
});

test('old settings keep their V1 meaning, with local choices overriding only at browser startup', () => {
    const oldSettings = deserializeWorkspaceSettings('FYI_SETTINGS_V1\n{"version":1,"settings":{}}');
    assert.equal(oldSettings.smoothing.display, false);
    assert.equal(loadSmoothRendering(oldSettings.smoothing.display, { getItem: () => null }), false);
    assert.equal(loadSmoothRendering(oldSettings.smoothing.display, { getItem: () => 'true' }), true);
    const currentDefaults = defaultWorkspaceSettings();
    currentDefaults.smoothing.display = DEFAULT_SMOOTH_RENDERING;
    assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(currentDefaults)).smoothing.display, true);
    assert.equal(currentDefaults.smoothing.export, false);
});

test('invalid or blocked storage falls back safely without preventing an immediate display change', () => {
    for (const value of ['null', '0', '{']) assert.equal(loadSmoothRendering(false, { getItem: () => value }), false);
    const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
    assert.equal(loadSmoothRendering(undefined, blocked), true);
    assert.equal(persistSmoothRendering(false, blocked), false);
});
