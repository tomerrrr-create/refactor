import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';
import { validateProfileSnapshot } from '../js/profile-state.js';
const source = readFileSync(new URL('../js/simulation-theme.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/, '').replaceAll('export function ', 'function ');
function harness(saved = {}, blocked = false) {
    const storage = new Map(Object.entries(saved)), attributes = new Set();
    const buttons = () => ['blue', 'gold', 'teal', 'silver', 'ice', 'pink'].map(theme => ({ dataset: { theme }, attrs: {}, handlers: {},
        setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, fn) { this.handlers[k] = fn; } }));
    const rest = buttons(), playback = buttons();
    const root = { dataset: {}, hasAttribute: k => attributes.has(k),
        toggleAttribute(k, enabled) { if (enabled) attributes.add(k); else attributes.delete(k); } };
    const select = selector => selector.includes('Playback') ? playback : rest;
    const context = vm.createContext({ document: { documentElement: root,
        getElementById: id => ({ querySelectorAll: () => select(id) }), querySelectorAll: select },
        localStorage: { getItem(k) { if (blocked) throw Error(); return storage.get(k); },
            setItem(k, v) { if (blocked) throw Error(); storage.set(k, v); } },
        getCurrentLang: () => 'he', onLanguageChange() {} });
    vm.runInContext(source, context);
    return { context, root, storage, rest, playback, run: code => vm.runInContext(code, context) };
}
test('all resting/playback color pairs restore the resting selection and never persist running state', () => {
    for (const rest of ['blue', 'gold', 'teal', 'silver', 'ice', 'pink']) for (const playback of ['blue', 'gold', 'teal', 'silver', 'ice', 'pink']) {
        const h = harness(); h.run('initializeSimulationTheme()');
        h.run(`applySimulationTheme('${rest}'); applySimulationPlaybackTheme('${playback}')`);
        assert.equal(h.root.dataset.simulationEffectiveTheme, rest);
        h.run('setSimulationRunning(true)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, playback);
        assert.equal(h.root.dataset.simulationTheme, rest);
        const saved = [...h.storage];
        h.run('setSimulationRunning(false)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, rest);
        assert.deepEqual([...h.storage], saved);
        const reload = harness(Object.fromEntries(saved)); reload.run('initializeSimulationTheme()');
        assert.equal(reload.root.dataset.simulationPlaybackTheme, playback);
        assert.equal(reload.root.dataset.simulationEffectiveTheme, rest);
    }
});
test('legacy/default/blocked storage stays blue at rest and gold while running; independent controls work', () => {
    for (const blocked of [false, true]) {
        const h = harness({}, blocked); h.run('initializeSimulationTheme()');
        assert.equal(h.root.dataset.simulationTheme, 'blue');
        assert.equal(h.root.dataset.simulationPlaybackTheme, 'gold');
        h.run('setSimulationRunning(true)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'gold');
        h.playback[2].handlers.click();
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'teal');
        assert.equal(h.playback[2].attrs['aria-pressed'], 'true');
        h.rest[1].handlers.click();
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'teal');
        h.run('setSimulationRunning(false)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'gold');
    }
});
test('playback color round-trips through settings and profiles; legacy profiles use gold', () => {
    for (const simulationPlaybackTheme of ['blue', 'gold', 'teal', 'silver', 'ice', 'pink']) {
        const settings = { ...defaultWorkspaceSettings(), simulationPlaybackTheme };
        assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
        assert.equal(validateProfileSnapshot({ settings }).settings.simulationPlaybackTheme, simulationPlaybackTheme);
    }
    assert.equal(validateProfileSnapshot({ settings: defaultWorkspaceSettings() }).settings.simulationPlaybackTheme, 'gold');
    assert.throws(() => serializeWorkspaceSettings({ ...defaultWorkspaceSettings(), simulationPlaybackTheme: 'red' }));
});
