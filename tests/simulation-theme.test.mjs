import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';
import { validateProfileSnapshot } from '../js/profile-state.js';
const source = readFileSync(new URL('../js/simulation-theme.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/, '').replaceAll('export ', '');
const themes = ['blue', 'gold', 'teal', 'moon-silver', 'ivory', 'dark-gray'];
function harness(saved = {}, blocked = false) {
    const storage = new Map(Object.entries(saved)), attributes = new Set();
    const hierarchy = {
        checked: false, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }
    };
    const pulse = { handlers: {}, setAttribute() {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
    const pulseValue = {};
    const transition = { handlers: {}, setAttribute() {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
    const transitionValue = {};
    const sortToggle = { checked: false, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
    const keepDrawers = { checked: false, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
    const individualDrawers = { checked: false, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
    const sortButton = {
        excluded: false,
        toggleAttribute(name, value) {
            assert.equal(name, 'data-gold-hierarchy-exempt');
            this.excluded = value;
        }
    };
    const styles = new Map();
    const root = { dataset: {}, hasAttribute: k => attributes.has(k),
        toggleAttribute(k, enabled) { if (enabled) attributes.add(k); else attributes.delete(k); },
        style: { setProperty: (name, value) => styles.set(name, value) } };
    const controls = { goldPlaybackHierarchyToggle: hierarchy, glowPulse: pulse, glowPulseValue: pulseValue,
        goldTransitionDuration: transition, goldTransitionDurationValue: transitionValue,
        goldExcludeSortToggle: sortToggle, btnCycleSort: sortButton, keepSimulationDrawersToggle: keepDrawers, individualDrawerColorsToggle: individualDrawers };
    const context = vm.createContext({ document: { documentElement: root,
        getElementById: id => controls[id] },
        localStorage: { getItem(k) { if (blocked) throw Error(); return storage.get(k); },
            setItem(k, v) { if (blocked) throw Error(); storage.set(k, v); } },
        getCurrentLang: () => 'he', onLanguageChange() {} });
    vm.runInContext(source, context);
    return { context, root, storage, hierarchy, pulse, transition, sortToggle, sortButton, keepDrawers, individualDrawers, styles, run: code => vm.runInContext(code, context) };
}

test('drawer switches start on every load and colors survive independently', () => {
    const h = harness({ colorGridKeepSimulationDrawers: 'false' });h.run('initializeSimulationTheme()');
    assert(h.keepDrawers.checked);assert(h.root.hasAttribute('data-keep-simulation-drawers'));
    h.keepDrawers.checked = false;h.keepDrawers.handlers.change();
    assert(!h.root.hasAttribute('data-keep-simulation-drawers'));
    assert(h.individualDrawers.checked);assert(h.root.hasAttribute('data-individual-drawer-colors'));
    h.individualDrawers.checked = false;h.individualDrawers.handlers.change();
    assert(!h.root.hasAttribute('data-individual-drawer-colors'));
    assert.equal(h.run('drawerColors.join()'), 'pine-green,blue,burgundy');
    h.run("setDrawerColor(0, 'pine-green'); setDrawerColor(1, 'ink-violet'); setDrawerColor(2, 'warm-charcoal'); setDrawerColor(2, 'ivory'); setDrawerColor(3, 'blue')");
    assert.equal(h.run("['pine-green','ink-violet','warm-charcoal'].some(isSimulationTheme)"), false);
    const reopened = harness(Object.fromEntries(h.storage));reopened.run('initializeSimulationTheme()');
    assert(reopened.keepDrawers.checked);assert(reopened.root.hasAttribute('data-keep-simulation-drawers'));
    assert(reopened.individualDrawers.checked);assert(reopened.root.hasAttribute('data-individual-drawer-colors'));
    assert.equal(reopened.run('drawerColors.join()'), 'pine-green,ink-violet,warm-charcoal');
    reopened.run('resetDrawerColors()');
    assert.equal(reopened.run('drawerColors.join()'), 'pine-green,blue,burgundy');
    assert.equal(reopened.storage.get('colorGridSimulationDrawerColors'), '["pine-green","blue","burgundy"]');
    const invalid = harness({colorGridSimulationDrawerColors:'["gold","invalid",null]'});
    invalid.run('initializeSimulationTheme()');
    assert.equal(invalid.run('drawerColors.join()'), 'gold,blue,burgundy');
    const blocked = harness({},true);blocked.run('initializeSimulationTheme()');assert(blocked.keepDrawers.checked);
});

test('Glow Pulse defaults to 3.2 seconds and saves the selected duration', () => {
    const h = harness();
    h.run('initializeSimulationTheme()');
    assert.equal(h.styles.get('--simulation-halo-duration'), '3.2s');
    const savedMaximum = harness({ colorGridGlowPulseSeconds: '4.8' });
    savedMaximum.run('initializeSimulationTheme()');
    assert.equal(savedMaximum.styles.get('--simulation-halo-duration'), '4.8s');
    h.pulse.value = '0';
    h.pulse.handlers.input();
    assert.equal(h.styles.get('--simulation-halo-duration'), '0.6s');
    const reload = harness(Object.fromEntries(h.storage));
    reload.run('initializeSimulationTheme()');
    assert.equal(reload.styles.get('--simulation-halo-duration'), '0.6s');
});
test('playback is gold even with a legacy device preference and restores the resting theme', () => {
    for (const rest of themes) for (const legacy of themes) {
        const h = harness({colorGridSimulationPlaybackTheme:legacy}); h.run('initializeSimulationTheme()');
        h.run(`applySimulationTheme('${rest}')`);
        assert.equal(h.root.dataset.simulationEffectiveTheme, rest);
        const saved = [...h.storage];
        h.run('setSimulationRunning(true)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'gold');
        assert.equal(h.root.dataset.simulationTheme, rest);
        h.run('setSimulationRunning(false)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, rest);
        assert.deepEqual([...h.storage], saved);
    }
});

test('Gold transition duration defaults to 1.6 seconds and persists independently of the pulse', () => {
    const h = harness();
    h.run('initializeSimulationTheme()');
    assert.equal(h.run('goldTransitionMs'), 1600);
    assert.equal(h.transition.max, 4);
    h.transition.value = '4';
    h.transition.handlers.input();
    assert.equal(h.run('goldTransitionMs'), 3200);
    const reload = harness(Object.fromEntries(h.storage));
    reload.run('initializeSimulationTheme()');
    assert.equal(reload.run('goldTransitionMs'), 3200);
    assert.equal(reload.styles.get('--simulation-halo-duration'), '3.2s');
});

test('Sort is excluded by default and remembers an explicit choice independently of the hierarchy', () => {
    const h = harness();
    h.run('initializeSimulationTheme()');
    assert.equal(h.hierarchy.checked, false);
    assert.equal(h.sortToggle.checked, true);
    assert.equal(h.sortButton.excluded, true);
    h.sortToggle.checked = false;
    h.sortToggle.handlers.change();
    assert.equal(h.sortButton.excluded, false);
    const reopened = harness(Object.fromEntries(h.storage));
    reopened.run('initializeSimulationTheme()');
    assert.equal(reopened.sortToggle.checked, false);
    assert.equal(reopened.sortButton.excluded, false);
});
test('fresh or blocked storage defaults to gold at rest and while running', () => {
    for (const blocked of [false, true]) {
        const h = harness({}, blocked); h.run('initializeSimulationTheme()');
        assert.equal(h.root.dataset.simulationTheme, 'gold');
        h.run('setSimulationRunning(true); applySimulationTheme("blue")');
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'gold');
        h.run('setSimulationRunning(false)');
        assert.equal(h.root.dataset.simulationEffectiveTheme, 'blue');
    }
});
test('both colors round-trip through settings and profiles; legacy playback uses gold', () => {
    for (const [index, simulationTheme] of themes.entries()) {
        const simulationPlaybackTheme = themes[(index + 1) % themes.length];
        const settings = { ...defaultWorkspaceSettings(), simulationTheme, simulationPlaybackTheme };
        assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)), settings);
        const profile = validateProfileSnapshot({ settings });
        assert.equal(profile.settings.simulationTheme, simulationTheme);
        assert.equal(profile.settings.simulationPlaybackTheme, simulationPlaybackTheme);
    }
    assert.equal(validateProfileSnapshot({ settings: defaultWorkspaceSettings() }).settings.simulationPlaybackTheme, 'gold');
    assert.throws(() => serializeWorkspaceSettings({ ...defaultWorkspaceSettings(), simulationPlaybackTheme: 'red' }));
    assert.throws(() => serializeWorkspaceSettings({ ...defaultWorkspaceSettings(), simulationTheme: ['gold'] }));
});

test('retired device choices fall back independently and replace only appearance preferences', () => {
    for (const removed of ['silver', 'ice', 'pink']) {
        const h = harness({ colorGridSimulationTheme: removed, colorGridSimulationPlaybackTheme: removed, untouched: 'keep' });
        h.run('initializeSimulationTheme()');
        assert.equal(h.root.dataset.simulationTheme, 'gold');
        assert.equal(h.storage.get('colorGridSimulationTheme'), 'gold');
        assert.equal(h.storage.get('untouched'), 'keep');
    }
    const h = harness({colorGridSimulationTheme:'teal',colorGridSimulationPlaybackTheme:'pink'});
    h.run('initializeSimulationTheme()');assert.equal(h.root.dataset.simulationTheme,'teal');
    for (const removed of ['graphite', 'graphite-edge', 'graphite-dust', 'deep-blue']) {
        const h = harness({ colorGridSimulationTheme: removed, colorGridSimulationPlaybackTheme: removed });
        h.run('initializeSimulationTheme()');
        assert.equal(h.storage.get('colorGridSimulationTheme'), 'blue');
    }
});

test('old settings and profiles retain other choices while retired appearances normalize to defaults', () => {
    for (const removed of ['silver', 'ice', 'pink', 'graphite', 'graphite-edge', 'graphite-dust', 'deep-blue']) {
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


test('Gold playback hierarchy defaults off and preserves explicit choices across openings', () => {
    const h = harness();
    h.run('initializeSimulationTheme()');
    assert.equal(h.hierarchy.checked, false);
    assert.equal(h.root.hasAttribute('data-gold-playback-hierarchy'), false);
    for (const enabled of [true, false]) {
        h.hierarchy.checked = enabled;
        h.hierarchy.handlers.change();
        assert.equal(h.root.hasAttribute('data-gold-playback-hierarchy'), enabled);
        const reload = harness(Object.fromEntries(h.storage));
        reload.run('initializeSimulationTheme()');
        assert.equal(reload.hierarchy.checked, enabled);
        assert.equal(reload.root.hasAttribute('data-gold-playback-hierarchy'), enabled);
    }
});
