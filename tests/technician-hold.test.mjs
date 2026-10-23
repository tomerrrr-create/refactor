import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { bindPickerGestures } from '../js/picker-gestures.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness(t, pointerType = 'touch') {
    const original = { document: globalThis.document, window: globalThis.window, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
    t.after(() => Object.assign(globalThis, original));
    let now = 0, nextId = 0;
    const timers = new Map(), classes = new Set(), actions = [], handlers = new Map(), captured = new Set();
    const button = { id: 'btnToggleSimMode', contains: node => node === button, getBoundingClientRect: () => ({left: 0, top: 0, right: 50, bottom: 50}),
        setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id),
        addEventListener(type, fn) { handlers.set(type, fn); },
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, on) { if(on) classes.add(c); else classes.delete(c); } } };
    const context = vm.createContext({isBreathing: false, isSimModeActive: false, C: {LONG_PRESS_SHOW_MS: 600}, dom: {btnToggleSimMode: button},
        bindPickerGestures, hideLongPressDisplay() {},
        toggleSimMode() { context.isSimModeActive = !context.isSimModeActive; actions.push('toggle'); },
        prepareBoardForSimMode() { actions.push('init'); },
        goDarkAction() { actions.push('dark'); },
        modals: { openTechnicianMenu(trigger) { assert.equal(trigger, button); actions.push('technicians'); } } });
    Object.assign(globalThis, {document: {addEventListener() {}, elementFromPoint: (x,y) => x >= 0 && x <= 50 && y >= 0 && y <= 50 ? button : null}, window: {addEventListener() {}},
        setTimeout(fn, ms) { const id = ++nextId; timers.set(id, {fn, at: now + ms}); return id; }, clearTimeout: id => timers.delete(id)});
    const start = app.indexOf('bindPickerGestures(dom.btnToggleSimMode,');
    vm.runInContext(app.slice(start, app.indexOf('// A swipe opens settings', start)), context);
    const event = (type, x = 25, y = 25) => handlers.get(type)?.({pointerId: 1, pointerType, isPrimary: true, button: 0, clientX: x, clientY: y, detail: 1});
    return {actions, classes, context, event, down: () => event('pointerdown'),
        release() {event('pointerup'); event('click');},
        advance(time) {for (;;) {const next = [...timers].filter(([,v]) => v.at <= time).sort((a,b) => a[1].at-b[1].at)[0]; if(!next) break; now=next[1].at; timers.delete(next[0]); next[1].fn();} now=time;}};
}
for (const pointerType of ['touch', 'mouse']) test(`${pointerType} prolonged hold initializes once and never opens technicians`, t => {
    const h=harness(t,pointerType); h.down(); h.advance(599); assert.deepEqual(h.actions,[]);
    h.advance(600); assert.deepEqual(h.actions,['toggle','init']);
    h.advance(1800); h.advance(10000); h.release(); h.advance(20000);
    assert.deepEqual(h.actions,['toggle','init']); assert(!h.classes.has('technician-hold'));
});
test('short click and normal long press retain their actions', t => {
    const h=harness(t); h.down(); h.advance(100); h.release(); h.advance(3000); assert.deepEqual(h.actions,['toggle']);
    h.down(); h.advance(4000); h.release(); h.advance(7000); assert.deepEqual(h.actions,['toggle','init']); assert(!h.classes.has('technician-hold'));
});
test('cancelling after initialization triggers no further hold action', t => {
    const h=harness(t); h.down(); h.advance(900); h.event('pointercancel'); h.advance(3000);
    assert.deepEqual(h.actions,['toggle','init']); assert(!h.classes.has('technician-hold'));
});
test('active simulation mode initializes without toggling off', t => {
    const h=harness(t); h.context.isSimModeActive=true; h.down(); h.advance(1800); assert.deepEqual(h.actions,['init']);
});
for(const pointerType of ['touch','mouse']) test(`${pointerType} upward swipe opens technicians without toggle or init`, t => {
    const h=harness(t,pointerType); h.down(); h.advance(200); h.event('pointermove',25,-10); h.advance(2000); h.event('pointerup',25,-10); h.event('click');
    assert.deepEqual(h.actions,['technicians']); assert(!h.classes.has('technician-hold'));
});

for (const pointerType of ['touch', 'mouse']) {
    for (const [direction, x, y] of [['left', -10, 25], ['right', 60, 25], ['down', 25, 60]]) {
        test(`${pointerType} ${direction} swipe runs Go Dark once without toggling or initializing`, t => {
            const h = harness(t, pointerType);
            h.down(); h.advance(200); h.event('pointermove', x, y);
            assert(h.classes.has('picker-swipe-glow'));
            h.advance(2000); h.event('pointerup', x, y); h.event('click');
            assert.deepEqual(h.actions, ['dark']);
            assert.equal(h.context.isSimModeActive, false);
            assert(!h.classes.has('picker-swipe-glow'));
        });
    }
}
test('cancelled Go Dark swipe and blocked breathing interaction do not change the board', t => {
    const h = harness(t);
    h.down(); h.event('pointermove', 60, 25); h.event('pointercancel'); h.event('click');
    assert.deepEqual(h.actions, []);
    h.context.isBreathing = true;
    h.down(); h.event('pointermove', 25, 60); h.event('pointerup', 25, 60); h.event('click');
    assert.deepEqual(h.actions, []);
});

test('simulation initialization preserves current symmetry by default and honors explicit settings', () => {
    const start = app.indexOf('function prepareBoardForSimMode()');
    const end = app.indexOf('function handlePointerDownCtrl', start);
    for (const current of ['off', 'horizontal', 'vertical', 'mandala', 'kaleidoscope']) {
        for (const configured of [undefined, 'off', 'horizontal', 'kaleidoscope']) {
            const context = vm.createContext({
                symmetryMode: current, n: 249, separatorPx: 3, selectedRelativeSeparator: 3,
                separatorIsSnapshot: true, selectedColorIndex: -1, selectedColor: null,
                brushSize: 1, isRainbowModeActive: false, artRecipeLog: [], historyRecipeCursor: 0,
                activePaletteIndex: 0, currentSortMethod: 'luminance', boardState: [],
                simulationInitSettings: { boardSize: 249, brushSize: 7,
                    ...(configured === undefined ? {} : { symmetry: configured }) },
                animateBoardTransition: fn => fn(), performAction: fn => fn(),
                applySeparator() {}, goDark() {}, palette: () => ['#000', '#fff'],
                document: { getElementById: () => null }, updateSymmetryUI() {},
                updateColorPickerButtonUI() {}, updateGlowEffect() {}, compressBoardState: () => [],
                window: { logArtEvent() {} }
            });
            vm.runInContext(app.slice(start, end) + '\nprepareBoardForSimMode();', context);
            assert.equal(context.symmetryMode, configured ?? current);
            assert.equal(context.brushSize, 7);
            assert.equal(context.separatorPx, 0);
        }
    }
});
