import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const excerpt = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const plain = value => JSON.parse(JSON.stringify(value));
function harness(index = 2) {
    const logs = [], history = [], opened = [];
    const h = vm.createContext({clearPaletteColorTransition() {}, capturePaletteColors() { return null; }, showPaletteColorTransition() {},
        C: { PALETTES: [23, 64, 264, 21].map((length, i) => ({ name: `Palette${i}`, colors: Array(length).fill('#000000') })),
            PALETTE_GROUPS: [
                { id: 'classic', indexes: [0] }, { id: 'extended', indexes: [1] },
                { id: 'continuous', indexes: [2] }, { id: 'archive', indexes: [3] }
            ], LONG_PRESS_SHOW_MS: 600 },
        activePaletteIndex: index, currentSortMethod: 'luminance', isAnimating: false,
        isSelectingMacroPalette: false, isMacroPlaying: false, isExecutingMacroCommand: false,
        armedSimulation: null, isBreathing: false, isLifePlaying: false, hasPerformedInitialAutofill: false,
        boardState: [{ k: 263, v: 263, isGold: false }, { k: 263, v: 263, isGold: true }],
        performance: { now: () => 0 }, dom: {}, modals: { openPaletteModal(options) { opened.push(options || {}); }, openColorPickerModal(target, options) { opened.push({colorPicker:true,target,options}); } },
        resetSelectedColor() {}, updatePaletteHeader() {}, renderToScreen() {}, hideLongPressDisplay() {}, cyclePaletteBrushSize() {},
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

test('palette holds cycle only active groups, wrap to Origin, and enter Origin from archive', () => {
    const { h } = harness();
    assert.equal(h.getNextPaletteGroupIndex(0), 1);
    assert.equal(h.getNextPaletteGroupIndex(1), 2);
    assert.equal(h.getNextPaletteGroupIndex(2), 0);
    assert.equal(h.getNextPaletteGroupIndex(3), 0);
    h.C.PALETTE_GROUPS[1].indexes = [];
    assert.equal(h.getNextPaletteGroupIndex(0), 2);
});

test('hold captures palette and adaptation together; legacy macro commands reproduce the result', () => {
    const manual = harness();
    const before = plain(manual.h.getCurrentState());
    manual.h.gestures.onHold();
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
    h.gestures.onHold();
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

test('upward swipe opens colors and downward swipe opens palettes without changing board or log', () => {
    const { h, logs, history, opened } = harness();
    const before = plain(h.getCurrentState());
    h.gestures.onOpen();
    h.gestures.onSwipeDown();
    assert.deepEqual(plain(opened), [{colorPicker:true,target:null,options:{guardOpeningClick:true}}, {}]);
    assert.deepEqual(plain(h.getCurrentState()), before);
    assert.deepEqual(logs, []);
    assert.deepEqual(history, []);
    assert.equal(h.gestures.canInteract(), true);
    h.isBreathing = true;
    assert.equal(h.gestures.canInteract(), false);
});

test('adaptation status matches the operation and ignores protected tiles', () => {
    const {h,logs}=harness();
    h.boardState=[{k:0,isGold:false},{k:263,isGold:false},{k:800,isGold:true}];
    assert.equal(h.needsColorAdaptation(),false);
    assert.equal(logs.length,0);
    h.boardState[0].k=264;
    h.boardState[1].k=-1;
    assert.equal(h.needsColorAdaptation(),true);
    assert.equal(logs.length,0,'checking status must not record an action');
    h.applyColorAdaptation();
    assert.equal(h.boardState[0].k,0);
    assert.equal(h.boardState[1].k,263);
    assert.equal(h.boardState[2].k,800);
    assert.equal(h.needsColorAdaptation(),false);
    assert.equal(logs.filter(([name])=>name==='ADAPT_COLORS').length,1);
});

test('brush swipes wrap all sizes, keep shape and palette, and replace stale feedback timers', () => {
    const timers = new Map(), classes = new Set(), attrs = {};
    let id = 0, captures = 0;
    const button = { innerHTML: '', textContent: '', title: '',
        classList: {add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute:(k,v)=>attrs[k]=v };
    const h = vm.createContext({brushSize:1,brushShape:'ring',paletteBrushFeedbackTimer:null,
        BRUSH_SIZES:[1,3,5,7,9,11,13,15,23],brushSizeLabel:n=>n===23?'XL':String(n),
        settingsProfiles:{scheduleCapture:()=>captures++},getText:k=>k,getPaletteDisplayName:p=>p.name,
        C:{PALETTES:[{name:'Journey',iconHTML:'<svg></svg>'}]},activePaletteIndex:0,dom:{btnPalette:button},
        clearTimeout:key=>timers.delete(key),setTimeout:(callback,delay)=>{timers.set(++id,{callback,delay});return id;}});
    vm.runInContext(excerpt('function updatePaletteHeader(', 'function updateSeparatorButtonUI('),h);
    h.cyclePaletteBrushSize(-1);assert.equal(h.brushSize,23);assert.equal(button.textContent,'XL');
    assert(classes.has('palette-brush-size-feedback'));assert.equal(timers.size,1);
    h.cyclePaletteBrushSize(1);assert.equal(h.brushSize,1);assert.equal(button.textContent,'1');assert.equal(timers.size,1);
    for(const expected of [3,5,7,9,11,13,15,23,1]){h.cyclePaletteBrushSize(1);assert.equal(h.brushSize,expected);}
    assert.equal(h.brushShape,'ring');assert.equal(h.activePaletteIndex,0);assert.equal(captures,11);
    const timer=[...timers.values()][0];assert.equal(timer.delay,900);timer.callback();
    assert(!classes.has('palette-brush-size-feedback'));assert.equal(button.innerHTML,'<svg></svg>');assert.equal(timers.size,0);
    h.cyclePaletteBrushSize(1);h.updatePaletteHeader();assert.equal(timers.size,0,'palette changes cancel obsolete size feedback');
});
