import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { defaultWorkspaceSettings } from '../js/workspace-settings.js';

const source = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const apply = source.slice(source.indexOf('function applyWorkspacePreferences('), source.indexOf('function captureProfileSettings('));
function harness() {
    const noop = () => {};
    const context = vm.createContext({
        gameOfLifeRules: {}, validateEvolutionTuning: value => value, islandsSession: null, armedSimulation: null,
        applySimulationTheme: noop, applySimulationPlaybackTheme: noop,
        normalizeSeparatorCycle: () => null, DEFAULT_SEPARATOR_CYCLE: [5, 3, 1, 0],
        updateGravitationalSortButtonUI: noop, updateSpiralButtonUI: noop,
        updateMagnetButtonUI: noop, updateDlaButtonUI: noop, updateErosionButtonUI: noop,
        resolveSavedBloom: () => ({ enabled: true, intensity: 32 }), softBloom: null,
        document: { getElementById: () => ({}) }, dom: { saveSmoothImage: {} },
        brushSize: 1, updateSymmetryUI: noop, renderToScreen: noop,
        setBrushMode: (paint, continuous) => { context.mode = continuous ? 'continuous' : paint ? 'paint' : 'copy'; }
    });
    vm.runInContext(apply, context);
    return context;
}

test('app opening uses Startup brush and symmetry despite conflicting working profile values', () => {
    for (const mode of ['paint', 'continuous', 'copy']) {
        for (const symmetry of ['off', 'vertical', 'horizontal', 'mandala', 'kaleidoscope']) {
            const settings = defaultWorkspaceSettings();
            Object.assign(settings.startup, { brushMode: mode, symmetry });
            settings.brush = { size: 9, mode: mode === 'copy' ? 'paint' : 'copy', symmetry: symmetry === 'off' ? 'vertical' : 'off' };
            const h = harness();
            h.applyWorkspacePreferences(settings, { startup: true });
            assert.equal(h.mode, mode);
            assert.equal(h.symmetryMode, symmetry);
            assert.equal(h.brushSize, 1, 'Startup brush size already applied must remain intact');
        }
    }
});

test('applying a profile during the session restores its working brush and symmetry', () => {
    const settings = defaultWorkspaceSettings();
    Object.assign(settings.startup, { brushMode: 'continuous', symmetry: 'off' });
    settings.brush = { size: 9, mode: 'copy', symmetry: 'vertical' };
    const h = harness();
    h.applyWorkspacePreferences(settings);
    assert.equal(h.mode, 'copy');
    assert.equal(h.symmetryMode, 'vertical');
    assert.equal(h.brushSize, 9);
});
