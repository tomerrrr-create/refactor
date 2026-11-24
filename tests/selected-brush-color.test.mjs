import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { SORT_MODES, normalizeSortMethod, sortColorsArray } from '../js/colors.js';
import { nextSortMethod } from '../js/sort-cycle-settings.js';
import { createFibonacciState, runFibonacciGeneration } from '../js/simulations/fibonacci.js';
import { createFractalState } from '../js/simulations/fractals.js';

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
        currentSortMethod: 'luminance', activePaletteIndex: 0, armedSimulation: null,
        selectedColor: '#000000', selectedColorIndex: 0, isRainbowModeActive: false,
        boardState: [{ k: 0, v: 0, prevK: 1 }], magnetRules: { anchorColorIndex: -1 },
        dom: { sortIconGroup: {}, btnGap: { setAttribute() {} } },
        modals: {}, window: { logArtEvent() {} }, n: 1, separatorPx: 0,
        updateGlowEffect() {}, updateColorPickerButtonUI() {}, updatePaletteHeader() {},
        updateSortButtonUI() {}, updateSeparatorButtonUI() {}, updateErosionButtonUI() {}, applySeparator() {}, updateSymmetryUI() {}, renderToScreen() {},
        getText: key => key, spiralMode: 'off', spiralRules: {}
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

test('restoring a board-only snapshot keeps the selected experimental cycle mode', () => {
    const boardOnly = { n: 1, activePaletteIndex: 0, currentSortMethod: 'luminance',
        separatorPx: 0, tiles: [{ k: 0, v: 0, isGold: false }] };
    for (const mode of ['sequence', 'primes']) {
        const h = harness();
        h.armedSimulation = 'fibonacci';
        h.fibonacciState = createFibonacciState(1, 2, mode, 95, 0, undefined, 46);
        h.fibonacciMode = mode;
        h.fibonacciColorAdvance = 95;
        h.fibonacciSequenceInterval = 46;
        h.createFibonacciState = createFibonacciState;
        h.updateFibonacciButtonUI = () => {};
        vm.runInContext(excerpt('function resetFibonacciRuntime(', 'function restoreFibonacciState('), h);
        h.applyState(boardOnly);
        assert.equal(h.fibonacciState.mode, mode);
        assert.equal(h.fibonacciState.sequenceInterval, 46);
        assert.equal(h.fibonacciState.sequenceAge, 0);
    }
    const h = harness();
    h.armedSimulation = 'fractals';
    h.fractalState = createFractalState(1, 'xor');
    h.createFractalState = createFractalState;
    h.restoreFractalState = state => { h.fractalState = state; };
    h.applyState(boardOnly);
    assert.equal(h.fractalState.mode, 'xor');
    assert.equal(h.fractalState.frame, 0);
});

test('Go Dark resets growth in the selected Fibonacci mode and keeps the recorded interval', () => {
    for (const mode of ['branching', 'sequence', 'primes']) {
        const h = harness();
        h.n = 3;
        h.armedSimulation = 'fibonacci';
        h.fibonacciMode = mode;
        h.fibonacciColorAdvance = 95;
        h.fibonacciSequenceInterval = 46;
        h.fibonacciState = createFibonacciState(3, 2, mode, 95, 0, undefined, 46);
        h.FIBONACCI_MODES = ['restart'];
        h.createFibonacciState = createFibonacciState;
        h.updateFibonacciButtonUI = () => {};
        h.startAnimationLoop = () => {};
        h.performance = { now: () => 1 };
        h.boardState = Array.from({ length: 9 }, () => ({ k: 2, v: 2 }));
        const context = { currentBoardState: h.boardState, currentPalette: Array(23) };
        runFibonacciGeneration(context, h.fibonacciState);
        vm.runInContext(excerpt('function resetFibonacciRuntime(', 'function restoreFibonacciState('), h);
        vm.runInContext(excerpt('function goDark(', 'function goDarkAction('), h);

        h.goDark();
        assert.equal(h.fibonacciState.mode, mode);
        assert.equal(h.fibonacciState.frame, 0);
        assert(h.boardState.every(cell => cell.k === 0));
        if (mode !== 'branching') {
            assert.equal(h.fibonacciState.sequenceInterval, 46);
            runFibonacciGeneration(context, h.fibonacciState);
            assert.equal(h.fibonacciState.sequenceAge, 1);
            assert.equal(h.fibonacciState.frame, 0);
        }
        h.goDark({ keepCycleMode: false });
        assert.equal(h.fibonacciState.mode, 'restart');
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
