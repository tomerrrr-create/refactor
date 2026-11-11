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
    const buttons = () => ['blue', 'gold', 'teal'].map(theme => ({ dataset: { theme }, attrs: {}, handlers: {},
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
    for (const rest of ['blue', 'gold', 'teal']) for (const playback of ['blue', 'gold', 'teal']) {
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
test('fresh/blocked storage defaults to gold at rest and while running; independent controls work', () => {
    for (const blocked of [false, true]) {
        const h = harness({}, blocked); h.run('initializeSimulationTheme()');
        assert.equal(h.root.dataset.simulationTheme, 'gold');
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
    for (const simulationPlaybackTheme of ['blue', 'gold', 'teal']) {
        const settings = { ...defaultWorkspaceSettings(), simulationPlaybackTheme };
        assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
        assert.equal(validateProfileSnapshot({ settings }).settings.simulationPlaybackTheme, simulationPlaybackTheme);
    }
    assert.equal(validateProfileSnapshot({ settings: defaultWorkspaceSettings() }).settings.simulationPlaybackTheme, 'gold');
    assert.throws(() => serializeWorkspaceSettings({ ...defaultWorkspaceSettings(), simulationPlaybackTheme: 'red' }));
});

test('retired device choices fall back independently and replace only appearance preferences', () => {
    for (const removed of ['silver', 'ice', 'pink']) {
        const h = harness({ colorGridSimulationTheme: removed, colorGridSimulationPlaybackTheme: removed, untouched: 'keep' });
        h.run('initializeSimulationTheme()');
        assert.equal(h.root.dataset.simulationTheme, 'gold');
        assert.equal(h.root.dataset.simulationPlaybackTheme, 'gold');
        assert.equal(h.storage.get('colorGridSimulationTheme'), 'gold');
        assert.equal(h.storage.get('colorGridSimulationPlaybackTheme'), 'gold');
        assert.equal(h.storage.get('untouched'), 'keep');
    }
    const h = harness({colorGridSimulationTheme:'teal',colorGridSimulationPlaybackTheme:'pink'});
    h.run('initializeSimulationTheme()');assert.equal(h.root.dataset.simulationTheme,'teal');assert.equal(h.root.dataset.simulationPlaybackTheme,'gold');
});

test('old settings and profiles retain other choices while retired appearances normalize to defaults', () => {
    for (const removed of ['silver', 'ice', 'pink']) {
        const settings = {...defaultWorkspaceSettings(), simulationTheme:removed, simulationPlaybackTheme:removed};
        settings.brush.size=7;settings.startup.boardSize=27;
        const text='FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings});
        for (const normalized of [deserializeWorkspaceSettings(text),validateProfileSnapshot({settings}).settings]) {
            assert.equal(normalized.simulationTheme,'blue');assert.equal(normalized.simulationPlaybackTheme,'gold');
            assert.equal(normalized.brush.size,7);assert.equal(normalized.startup.boardSize,27);
            assert.deepEqual(normalized.rules,settings.rules);
        }
    }
    assert.throws(()=>serializeWorkspaceSettings({...defaultWorkspaceSettings(),simulationTheme:'red'}));
});
