import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const windWrapper = source.slice(source.indexOf('function windControlAction('), source.indexOf('function initializeWindMode('));
const excerpt = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const plain = value => JSON.parse(JSON.stringify(value));
function harness(index = 2) {
    const logs = [], history = [];
    const h = vm.createContext({
        C: { PALETTES: [23, 64, 264, 21].map((length, i) => ({ name: `Palette${i}`, colors: Array(length).fill('#000000') })),
            PALETTE_GROUPS: [
                { id: 'classic', indexes: [0] }, { id: 'extended', indexes: [1] },
                { id: 'continuous', indexes: [2] }, { id: 'archive', indexes: [3] }
            ], LONG_PRESS_SHOW_MS: 600 },
        activePaletteIndex: index, currentSortMethod: 'luminance', isAnimating: false,
        isSelectingMacroPalette: false, isMacroPlaying: false, isExecutingMacroCommand: false,
        armedSimulation: null, isBreathing: false, isLifePlaying: false, hasPerformedInitialAutofill: false,
        boardState: [{ k: 263, v: 263, isGold: false }, { k: 263, v: 263, isGold: true }],
        performance: { now: () => 0 }, dom: {}, modals: {},
        resetSelectedColor() {}, updatePaletteHeader() {}, renderToScreen() {}, hideLongPressDisplay() {},
        showPaletteGroupTransition() {},
        capturePaletteGroupBoard() { return null; },
        areStatesEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    });
    h.getCurrentState = () => ({ activePaletteIndex: h.activePaletteIndex, tiles: plain(h.boardState) });
    h.pushHistory = state => history.push(plain(state));
    h.window = { logArtEvent(name, details, force = false) {
        if (!h.isExecutingMacroCommand || force) logs.push([name, details]);
    } };
    h.bindPickerGestures = (_button, options) => { h.gestures = options; };
    vm.runInContext('function paletteLen() { return C.PALETTES[activePaletteIndex].colors.length; } const norm = k => ((k % paletteLen()) + paletteLen()) % paletteLen();', h);
    vm.runInContext(windWrapper, h);
    for (const [start, end] of [
        ['function getNextPaletteGroupIndex(', '// --- מערכת מיון'],
        ['function performAction(', 'function undo('],
        ['function adaptColors(', 'function applyNudgeLogic('],
        ['function switchToPalette(', 'function _performResize('],
        ['function validateIslandsMacroAction(', 'function parseMacroText('],
        ['function executeMacroAction(', 'async function initializeApp('],
        ['bindPickerGestures(dom.btnPalette,', "dom.btnResetBoard.addEventListener('click'"]
    ]) vm.runInContext(excerpt(start, end), h);
    return { h, logs, history };
}

test('palette holds cycle only active groups, wrap to Origin, and enter Origin from archive', () => {
    const { h } = harness();
    assert.equal(h.getNextPaletteGroupIndex(0), 1);
    assert.equal(h.getNextPaletteGroupIndex(1), 2);
    assert.equal(h.getNextPaletteGroupIndex(2), 0);
    assert.equal(h.getNextPaletteGroupIndex(3), 0);
    h.C.PALETTE_GROUPS[1].indexes = [];
    assert.equal(h.getNextPaletteGroupIndex(0), 2);
});

test('hold records separate undoable palette and adaptation actions; macro reproduces both', () => {
    const manual = harness();
    manual.h.gestures.onHold();
    assert.equal(manual.h.activePaletteIndex, 0);
    assert.equal(manual.h.boardState[0].k, 10); // Existing modulo adaptation: 263 % 23.
    assert.equal(manual.h.boardState[1].k, 263); // Gold stays protected.
    assert.deepEqual(manual.logs, [['Palette Change', 'Palette0 | Sort: luminance'], ['ADAPT_COLORS', '---']]);
    assert.equal(manual.history.length, 2);
    const undoAdapt = manual.history[1].before;
    assert.equal(undoAdapt.activePaletteIndex, 0);
    assert.equal(undoAdapt.tiles[0].k, 263);
    const undoPalette = manual.history[0].before;
    assert.equal(undoPalette.activePaletteIndex, 2);
    assert.equal(undoPalette.tiles[0].k, 263);
    const replay = harness();
    for (const [eventName, details] of manual.logs) replay.h.executeMacroAction({ eventName, details });
    assert.deepEqual(replay.h.getCurrentState(), manual.h.getCurrentState());
    assert.deepEqual(replay.logs, manual.logs);
    assert.deepEqual(replay.history, manual.history);
});

test('growing palette needs no index correction and creates no empty adaptation undo or log', () => {
    const { h, logs, history } = harness(0);
    h.boardState[0].k = h.boardState[0].v = 22;
    h.gestures.onHold();
    assert.equal(h.activePaletteIndex, 1);
    assert.equal(h.boardState[0].k, 22);
    assert.equal(history.length, 1);
    assert.deepEqual(logs.map(([name]) => name), ['Palette Change']);
});
