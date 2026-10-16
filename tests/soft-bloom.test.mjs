import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoftBloom, normalizeBloomIntensity, DEFAULT_SOFT_BLOOM, DEFAULT_BLOOM_INTENSITY, resolveSavedBloom } from '../js/soft-bloom.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';
import { createProfileState } from '../js/profile-state.js';

test('bloom copies only to a bounded overlay and performs no rendering while disabled or zero', () => {
    const source = Object.freeze({ width: 2160, height: 1080 });
    let contexts = 0, draws = 0;
    const overlay = { width: 1, height: 1, hidden: true, style: {}, getContext() {
        contexts++;
        return { clearRect() {}, drawImage(image, x, y, width, height) {
            assert.equal(image, source); assert.equal(width, 160); assert.equal(height, 80); draws++;
        } };
    } };
    const effect = createSoftBloom(source, overlay);
    effect.draw(); assert.equal(contexts, 0);
    effect.setEnabled(true); effect.draw(); assert.equal(draws, 1);
    assert.equal(overlay.width, 160); assert.equal(overlay.height, 80);
    effect.setIntensity(80); effect.draw(); assert.equal(draws, 2);
    assert(Math.abs(Number(overlay.style.opacity) - .36) < 1e-9);
    effect.setIntensity(0); effect.draw(); assert.equal(draws, 2); assert(overlay.hidden);
    effect.setEnabled(false); effect.draw(); assert.equal(contexts, 1);
    assert.equal(overlay.width, 1); assert.equal(overlay.height, 1);
    assert.equal(normalizeBloomIntensity(undefined), 22);
    assert.equal(normalizeBloomIntensity(150), 100);
});

test('bloom settings round-trip and persist per profile without changing V1 defaults', () => {
    const initial = defaultWorkspaceSettings();
    assert(!Object.hasOwn(initial.smoothing, 'bloom'));
    assert.deepEqual(JSON.parse(serializeWorkspaceSettings(initial).split('\n').slice(1).join('\n')).settings, {});
    const settings = structuredClone(initial);
    settings.smoothing.bloom = true; settings.smoothing.bloomIntensity = 65;
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
    for (const bad of ['true', null, 1]) {
        assert.throws(() => serializeWorkspaceSettings({ ...settings, smoothing: { ...settings.smoothing, bloom: bad } }));
    }
    for (const bad of [-1, 101, 35.5, '35', null]) {
        assert.throws(() => serializeWorkspaceSettings({ ...settings, smoothing: { ...settings.smoothing, bloomIntensity: bad } }));
    }
    let saved;
    const storage = { getItem: () => saved ?? null, setItem: (_, text) => { saved = text; } };
    const state = createProfileState({ settings: initial }, storage);
    state.capture({ settings }); state.save();
    state.select(1); assert(!state.draft().settings.smoothing.bloom);
    const restored = createProfileState({ settings: initial }, storage);
    assert.equal(restored.draft(0).settings.smoothing.bloomIntensity, 65);
    assert.equal(restored.draft(0).settings.smoothing.bloom, true);
});

test('new Bloom default is on at 22%, while old V1 settings retain off at 35%', () => {
    assert.equal(DEFAULT_SOFT_BLOOM, true);
    assert.equal(DEFAULT_BLOOM_INTENSITY, 22);
    assert.deepEqual(resolveSavedBloom({}), { enabled: false, intensity: 35 });
    assert.deepEqual(resolveSavedBloom({ bloom: true }), { enabled: true, intensity: 35 });
    for (const enabled of [true, false]) {
        const settings = defaultWorkspaceSettings();
        settings.smoothing.bloom = enabled;
        settings.smoothing.bloomIntensity = 22;
        const restored = deserializeWorkspaceSettings(serializeWorkspaceSettings(settings));
        assert.deepEqual(resolveSavedBloom(restored.smoothing), { enabled, intensity: 22 });
    }
});
