import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const excerpt = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const plain = value => JSON.parse(JSON.stringify(value));
function harness(index = 2) {
    const logs = [], history = [], opened = [];
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
        performance: { now: () => 0 }, dom: {}, modals: { openPaletteModal(options) { opened.push(options || {}); } },
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
    for (const [start, end] of [
        ['function getNextPaletteGroupIndex(', '// --- מערכת מיון'],
        ['function performAction(', 'function undo('],
        ['function applyColorAdaptation(', 'function applyNudgeLogic('],
        ['function switchToPalette(', 'function _performResize('],
        ['function validateIslandsMacroAction(', 'function parseMacroText('],
        ['function executeMacroAction(', 'async function initializeApp('],
        ['bindPickerGestures(dom.btnPalette,', "dom.btnResetBoard.addEventListener('click'"]
    ]) vm.runInContext(excerpt(start, end), h);
    return { h, logs, history, opened };
}

test('palette side swipes cycle only active groups, wrap to Origin, and enter Origin from archive', () => {
    const { h } = harness();
    assert.equal(h.getNextPaletteGroupIndex(0), 1);
    assert.equal(h.getNextPaletteGroupIndex(1), 2);
    assert.equal(h.getNextPaletteGroupIndex(2), 0);
    assert.equal(h.getNextPaletteGroupIndex(3), 0);
    h.C.PALETTE_GROUPS[1].indexes = [];
    assert.equal(h.getNextPaletteGroupIndex(0), 2);
});

test('side swipe captures palette and adaptation together; legacy macro commands reproduce the result', () => {
    const manual = harness();
    const before = plain(manual.h.getCurrentState());
    manual.h.gestures.onSwipeSide();
    assert.equal(manual.h.activePaletteIndex, 0);
    assert.equal(manual.h.boardState[0].k, 10); // Preserve existing modulo adaptation: 263 % 23.
    assert.equal(manual.h.boardState[0].v, 10);
    assert.equal(manual.h.boardState[1].k, 263); // Gold stays protected.
    assert.deepEqual(manual.logs, [['Palette Change', 'Palette0 | Sort: luminance'], ['ADAPT_COLORS', '---']]);
    assert.equal(manual.history.length, 1);
    assert.deepEqual(manual.history[0].before, before);
    assert.deepEqual(manual.history[0].after, plain(manual.h.getCurrentState()));
    const replay = harness();
    for (const [eventName, details] of manual.logs) replay.h.executeMacroAction({ eventName, details });
    assert.deepEqual(replay.h.getCurrentState(), manual.h.getCurrentState());
    assert.deepEqual(replay.logs, manual.logs);
    // Legacy playback still applies its two explicit commands separately.
    assert.equal(replay.history.length, 2);
});

test('growing palette needs no index correction and creates no empty adaptation undo or log', () => {
    const { h, logs, history } = harness(0);
    h.boardState[0].k = h.boardState[0].v = 22;
    h.gestures.onSwipeSide();
    assert.equal(h.activePaletteIndex, 1);
    assert.equal(h.boardState[0].k, 22);
    assert.equal(history.length, 1);
    assert.deepEqual(logs.map(([name]) => name), ['Palette Change']);
});

test('picker adapts only different-size palettes, leaving ordinary cycling and same-size choices unchanged', () => {
    const { h, history, logs } = harness();
    h.switchToPalette(0, { adapt: true });
    assert.equal(h.boardState[0].k, 10);
    assert.equal(history.length, 1);
    h.switchToPalette(0, { adapt: true });
    assert.equal(history.length, 1, 'Selecting the current palette is a no-op');
    const same = harness();
    same.h.C.PALETTES[0].colors = same.h.C.PALETTES[2].colors.slice();
    same.h.switchToPalette(0, { adapt: true });
    assert.equal(same.h.boardState[0].k, 263);
    assert.equal(same.history.length, 1);
    assert.deepEqual(same.logs.map(([name]) => name), ['Palette Change']);
    const ordinary = harness();
    ordinary.h.switchToPalette(0);
    assert.equal(ordinary.h.boardState[0].k, 263);
    assert.deepEqual(ordinary.logs.map(([name]) => name), ['Palette Change']);
    assert.deepEqual(logs.map(([name]) => name), ['Palette Change', 'ADAPT_COLORS']);
});

test('choosing a macro replacement palette never changes or adapts the current board', () => {
    const { h, history, logs } = harness();
    const before = plain(h.getCurrentState());
    h.isSelectingMacroPalette = true;
    h.switchToPalette(0, { adapt: true });
    assert.equal(h.pendingMacroPalette, 0);
    assert.deepEqual(plain(h.getCurrentState()), before);
    assert.equal(history.length, 0);
    assert.equal(logs.length, 0);
});

test('hold and upward swipe open the picker without changing palette, board, history or log', () => {
    const { h, logs, history, opened } = harness();
    const before = plain(h.getCurrentState());
    h.gestures.onHold();
    h.gestures.onOpen();
    assert.deepEqual(plain(opened), [{ guardOpeningClick: true }, {}]);
    assert.deepEqual(plain(h.getCurrentState()), before);
    assert.deepEqual(logs, []);
    assert.deepEqual(history, []);
    assert.equal(h.gestures.canInteract(), true);
    h.isBreathing = true;
    assert.equal(h.gestures.canInteract(), false);
});
