import {INITIAL_CYMATICS_RULES,validateCymaticsRules,validateCymaticsFrequencies,createCymaticsFrequencies,rememberCymaticsFrequency,selectCymaticsMap} from '../js/cymatics-settings.js';
import {INITIAL_CRACKS_GROWTH} from '../js/cracks-settings.js';
import {validateEvolutionSlots} from '../js/evolution-drawer-settings.js';
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
        INITIAL_CYMATICS_RULES, validateCymaticsRules, createCymaticsFrequencies, rememberCymaticsFrequency, INITIAL_CRACKS_GROWTH, validateEvolutionSlots, evolutionDrawer:null, evolutionSlots:[], gameOfLifeRules: {}, validateEvolutionTuning: value => value, islandsSession: null, armedSimulation: null,
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

test('each app opening starts with Fibonacci despite saved growth; explicit profile changes retain their values',()=>{
 const settings=defaultWorkspaceSettings();settings.rules.contour.growth={branchChance:40,branchInterval:22,curvature:0};settings.rules.contour.lineColor='lightest';const h=harness();
 h.applyWorkspacePreferences(settings,{startup:true});assert.equal(h.contourRules.lineColor,'brush');assert.equal(settings.rules.contour.lineColor,'lightest');assert.deepEqual(JSON.parse(JSON.stringify(h.contourRules.growth)),INITIAL_CRACKS_GROWTH);
 assert.deepEqual(settings.rules.contour.growth,{branchChance:40,branchInterval:22,curvature:0},'opening override does not mutate the stored input');
 h.applyWorkspacePreferences(settings);assert.equal(h.contourRules.lineColor,'lightest');assert.deepEqual(h.contourRules.growth,settings.rules.contour.growth);
});

test('new map defaults preserve saved frequency tables even when old default rules were omitted',()=>{
 const h=harness(),settings=defaultWorkspaceSettings();h.applyWorkspacePreferences(settings);assert.equal(h.cymaticsRules.frequency,800);assert.equal(h.cymaticsFrequencies.circular,20000);
 settings.cymaticsFrequencies={interference:11831,circular:5000,diagonal:4000,grid:6000};h.applyWorkspacePreferences(settings);assert.equal(h.cymaticsRules.frequency,11831);assert.equal(h.cymaticsFrequencies.circular,5000);
 settings.rules.cymatics={pattern:'petals',strength:60,mode:'resonance',frequency:440,resonanceVersion:4};delete settings.cymaticsFrequencies;h.applyWorkspacePreferences(settings);assert.equal(h.cymaticsRules.frequency,440);assert.deepEqual(JSON.parse(JSON.stringify(h.cymaticsFrequencies)),{diagonal:440,grid:440,circular:440,interference:440});
});
