import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { SORT_MODES, normalizeSortMethod, sortColorsArray } from '../js/colors.js';
import { nextSortMethod } from '../js/sort-cycle-settings.js';
import { createFibonacciState, runFibonacciGeneration, validateFibonacciState } from '../js/simulations/fibonacci.js';
import { MAP_DEFAULTS } from '../js/simulations/fibonacci-maps.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function excerpt(start, end) {
    const offset = source.indexOf(start);
    return source.slice(offset, source.indexOf(end, offset));
}
function harness() {
    const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffffff'];
    const ctx = vm.createContext({clearPaletteColorTransition() {}, capturePaletteColors() { return null; }, showPaletteColorTransition() {},
        C: { PALETTES: [
            { originalName: 'First', originalColors: colors, colors: sortColorsArray(colors, 'luminance') },
            { originalName: 'Second', originalColors: ['#ff0000', '#ffffff'], colors: ['#ff0000', '#ffffff'] }
        ] }, SORT_MODES, normalizeSortMethod, sortColorsArray,
        currentSortMethod: 'luminance', activePaletteIndex: 0,
        selectedColor: '#000000', selectedColorIndex: 0, isRainbowModeActive: false,
        boardState: [{ k: 0, v: 0, prevK: 1 }], magnetRules: { anchorColorIndex: -1 },
        dom: { sortIconGroup: {}, btnGap: { setAttribute() {} } },
        modals: {}, window: { logArtEvent() {} }, n: 1, separatorPx: 0,
        updateGlowEffect() {}, updateColorPickerButtonUI() {}, updatePaletteHeader() {},
        updateSortButtonUI() {}, updateSeparatorButtonUI() {}, updateErosionButtonUI() {}, applySeparator() {}, updateSymmetryUI() {}, renderToScreen() {},
        getText: key => key, spiralMode: 'off', spiralRules: {}, fibonacciState: null, armedSimulation: null
    });
    vm.runInContext('function palette() { return C.PALETTES[activePaletteIndex].colors; }', ctx);
    vm.runInContext('function restoreSeparatorWidth(value) { separatorPx = value; } function fitCurrentSeparator() {}', ctx);
    vm.runInContext(excerpt('function applySortMethod(', '// ------------------------------------------'), ctx);
    vm.runInContext(excerpt('function syncSelectedColorWithPalette(', 'function resetSelectedColor('), ctx);
    vm.runInContext(excerpt('function applyState(', 'function pushHistory('), ctx);
    vm.runInContext(excerpt('function validateHistorySettings(', 'function parseHistoryMacro('), ctx);
    return ctx;
}

test('all sorting methods keep the exact brush color and visible board colors', () => {
    const h = harness();
    const before = h.C.PALETTES[0].colors[h.boardState[0].k];
    const previous = h.C.PALETTES[0].colors[h.boardState[0].prevK];
    for (const { method } of SORT_MODES) {
        h.applySortMethod(method);
        assert.equal(h.selectedColor, '#000000');
        assert.equal(h.C.PALETTES[0].colors[h.selectedColorIndex], h.selectedColor);
        assert.equal(h.C.PALETTES[0].colors[h.boardState[0].k], before);
        assert.equal(h.C.PALETTES[0].colors[h.boardState[0].prevK], previous);
    }
});

test('sort hold returns to the first configured method, preserves colors and logs once', () => {
    const h = harness(), events = [];
    h.window.logArtEvent = (...args) => events.push(args);
    h.sortCycleMethods = ['reversed', 'temperature', 'luminance'];
    h.nextSortMethod = nextSortMethod;
    h.animationLoopId = null;
    h.hideLongPressDisplay = () => {};
    h.bindPickerGestures = (_button, options) => { h.sortGestures = options; };
    vm.runInContext(excerpt('function cycleSortMethod(', '// --- Art Logger: Export Functionality ---'), h);
    vm.runInContext(excerpt('bindPickerGestures(dom.btnCycleSort,', "dom.btnCycleSort.addEventListener('keydown'"), h);
    const color = h.C.PALETTES[0].colors[h.boardState[0].k];
    h.sortGestures.onHold();
    assert.equal(h.currentSortMethod, 'reversed');
    assert.equal(h.C.PALETTES[0].colors[h.boardState[0].k], color);
    assert.equal(h.C.PALETTES[0].colors[h.selectedColorIndex], h.selectedColor);
    assert.deepEqual(events, [['Sort by', 'reversed']]);
    h.sortGestures.onHold();
    assert.equal(events.length, 1);
    h.sortGestures.onTap();
    assert.equal(h.currentSortMethod, 'temperature');
    assert.deepEqual(h.sortCycleMethods, ['reversed', 'temperature', 'luminance']);
});

test('history/project restoration remaps shared colors and clears unavailable colors', () => {
    for (const path of ['project', 'history']) {
        const h = harness();
        const restore = (paletteIndex, method) => path === 'project'
            ? h.applyState({ n: 1, activePaletteIndex: paletteIndex, currentSortMethod: method,
                separatorPx: 0, tiles: [{ k: 0, v: 0, isGold: false }] })
            : h.applyHistorySettings({ n: 1, activePaletteIndex: paletteIndex,
                currentSortMethod: method, separatorPx: 0 });
        restore(0, 'reversed');
        assert.equal(h.selectedColor, '#000000');
        assert.equal(h.selectedColorIndex, 4);
        h.selectedColor = '#ff0000'; h.syncSelectedColorWithPalette();
        restore(1, 'luminance');
        assert.equal(h.selectedColor, '#ff0000');
        assert.equal(h.C.PALETTES[1].colors[h.selectedColorIndex], '#ff0000');
        restore(0, 'reversed');
        h.selectedColor = '#000000'; h.syncSelectedColorWithPalette();
        restore(1, 'reversed');
        assert.equal(h.selectedColor, null);
        assert.equal(h.selectedColorIndex, -1);
    }
});

test('Go Dark and board-only restoration restart growth without replacing the selected Fibonacci mode', () => {
    const h = harness();
    Object.assign(h, {
        armedSimulation: 'fibonacci', fibonacciColorAdvance: 95, createFibonacciState,
        performance: { now: () => 1 }, startAnimationLoop() {}, updateFibonacciButtonUI() {}
    });
    vm.runInContext(excerpt('function resetFibonacciRuntime(', 'function restoreFibonacciState('), h);
    vm.runInContext(excerpt('function goDark(', 'function goDarkAction('), h);
    const boardOnly = { n: 1, activePaletteIndex: 0, currentSortMethod: 'luminance',
        separatorPx: 0, tiles: [{ k: 2, v: 2, isGold: false }] };
    for (const mode of ['restart', 'branching', 'crystal']) {
        h.fibonacciState = createFibonacciState(1, 2, mode, 98, 2);
        runFibonacciGeneration({ currentBoardState: h.boardState, currentPalette: h.C.PALETTES[0].colors }, h.fibonacciState);
        h.goDark();
        assert.deepEqual(h.fibonacciState, createFibonacciState(1, 2, mode, 98, 2));
        assert.equal(h.boardState[0].k, 0);
        h.applyState(boardOnly);
        assert.deepEqual(h.fibonacciState, createFibonacciState(1, 2, mode, 98, 2));
        assert.equal(h.boardState[0].k, 2);
        h.goDark({ keepFibonacciMode: false });
        assert.deepEqual(h.fibonacciState, createFibonacciState(1));
    }
});

test('artwork history restores Fibonacci growth with personal settings, while file loads use recorded settings', () => {
    const h = harness();
    const crystal = { growthSpeed: 50, tileSize: 3, crystalEdges: 75 };
    const maps = Object.fromEntries(Object.entries(MAP_DEFAULTS).map(([mode, settings]) => [mode, { ...settings, growthSpeed: 125 }]));
    Object.assign(h, { armedSimulation: 'fibonacci', fibonacciColorAdvance: 98,
        fibonacciCrystalSettings: crystal, fibonacciMapSettings: maps, validateFibonacciState,
        isExecutingMacroCommand: false, isMacroPlaying: false, evolutionTuning: {}, brightnessEvoMode: 'off', updateFibonacciButtonUI() {} });
    vm.runInContext(excerpt('function restoreFibonacciState(', 'function updateFibonacciButtonUI('), h);
    vm.runInContext(excerpt('function applyArtworkHistoryState(', 'function updateUndoRedoButtons('), h);
    const base = { n: 1, activePaletteIndex: 0, currentSortMethod: 'luminance', separatorPx: 0 };
    for (const mode of ['restart', 'branching', 'crystal', ...Object.keys(maps)]) {
        const recorded = createFibonacciState(1, 2, mode, 92, 2);
        if (mode === 'voronoi') recorded.map.seeds.push(0);
        runFibonacciGeneration({ currentBoardState: h.boardState, currentPalette: h.C.PALETTES[0].colors }, recorded);
        const snapshot = { ...base, fibonacciState: recorded, tiles: [{ k: 2, v: 2, isGold: false }] };
        const original = structuredClone(recorded);

        h.applyArtworkHistoryState(snapshot);
        const expected = { ...original, colorAdvance: 98 };
        if (mode === 'crystal') expected.crystalSettings = crystal;
        if (recorded.map) expected.map = { ...original.map, settings: maps[mode] };
        assert.deepEqual(validateFibonacciState(h.fibonacciState), expected);
        assert.equal(h.boardState[0].k, 2);
        assert.deepEqual(recorded, original);

        h.applyState(snapshot);
        assert.deepEqual(h.fibonacciState, original);
        h.applyHistorySettings(snapshot);
        assert.deepEqual(h.fibonacciState, original);
        h.isExecutingMacroCommand = true;
        h.applyArtworkHistoryState(snapshot);
        assert.deepEqual(h.fibonacciState, original);
        h.isExecutingMacroCommand = false;
    }
});

test('sorting keeps rainbow and unselected brushes independent of palette indices', () => {
    for (const rainbow of [false, true]) {
        const h = harness(); h.selectedColor = null; h.selectedColorIndex = -1;
        h.isRainbowModeActive = rainbow;
        h.applySortMethod('reversed');
        assert.equal(h.selectedColor, null); assert.equal(h.selectedColorIndex, -1);
        assert.equal(h.isRainbowModeActive, rainbow);
    }
});
