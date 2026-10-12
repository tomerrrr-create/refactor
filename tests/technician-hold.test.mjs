import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness() {
    let now = 0, nextId = 0;
    const timers = new Map(), classes = new Set(), actions = [];
    const button = { id: 'btnToggleSimMode', getBoundingClientRect: () => ({}), setPointerCapture() {}, classList: { add: c => classes.add(c), remove: c => classes.delete(c) } };
    const context = vm.createContext({
        isBreathing: false, isSimModeActive: false, longPressTimer: null, technicianHoldTimer: null, simulationHoldBounds: null, wasLongPress: false,
        C: { LONG_PRESS_SHOW_MS: 600 },
        dom: { btnToggleSimMode: button, longPressOverlay: { classList: { remove() {} } }, longPressDisplay: { classList: { remove() {} } } },
        toggleSimMode() { context.isSimModeActive = !context.isSimModeActive; actions.push('toggle'); },
        prepareBoardForSimMode() { actions.push('init'); },
        modals: { openTechnicianMenu(trigger) { assert.equal(trigger, button); actions.push('technicians'); } },
        setTimeout(fn, ms) { const id = ++nextId; timers.set(id, { fn, at: now + ms }); return id; },
        clearTimeout(id) { timers.delete(id); }
    });
    vm.runInContext(app.slice(app.indexOf('function handlePointerDownCtrl('), app.indexOf('function handleColorPickerClick()')), context);
    vm.runInContext(app.slice(app.indexOf('function hideLongPressDisplay()'), app.indexOf('function prepareBoardForSimMode()')), context);
    return { actions, classes, context,
        down() { context.handlePointerDownCtrl({ currentTarget: button }); },
        release() { context.hideLongPressDisplay(); context.handleCtrlClick({ currentTarget: button }, () => actions.push('click')); },
        advance(time) { for (;;) { const next = [...timers].filter(([, t]) => t.at <= time).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); } now = time; }
    };
}
test('one hold initializes at 600ms then opens technicians at 1800ms without click toggle', () => {
    const h = harness(); h.down(); h.advance(599); assert.deepEqual(h.actions, []);
    h.advance(600); assert.deepEqual(h.actions, ['toggle', 'init']); assert(h.classes.has('technician-hold'));
    h.advance(1799); assert(!h.actions.includes('technicians'));
    h.advance(1800); assert.deepEqual(h.actions, ['toggle', 'init', 'technicians']);
    h.release(); h.advance(5000); assert.equal(h.actions.length, 3); assert(!h.classes.has('technician-hold'));
});
test('short click and normal long press do not open technicians after release', () => {
    const short = harness(); short.down(); short.advance(100); short.release(); short.advance(3000); assert.deepEqual(short.actions, ['click']);
    const long = harness(); long.down(); long.advance(1000); long.release(); long.advance(3000); assert.deepEqual(long.actions, ['toggle', 'init']);
});
test('leaving or cancelling the hold cancels the second stage and its hint', () => {
    const h = harness(); h.down(); h.advance(900); h.context.hideLongPressDisplay(); h.advance(3000);
    assert.deepEqual(h.actions, ['toggle', 'init']); assert(!h.classes.has('technician-hold'));
});
test('already active simulation mode initializes once without toggling off', () => {
    const h = harness(); h.context.isSimModeActive = true; h.down(); h.advance(1800);
    assert.deepEqual(h.actions, ['init', 'technicians']);
});
