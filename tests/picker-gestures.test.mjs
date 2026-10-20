import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPickerGestures } from '../js/picker-gestures.js';

class Target {
    listeners = new Map();
    addEventListener(type, handler) { const list = this.listeners.get(type) || []; list.push(handler); this.listeners.set(type, list); }
    emit(type, event = {}) { for (const handler of this.listeners.get(type) || []) handler(event); }
}
function harness(t, { pointerType = 'touch', hold = true, extendedHold = false, swipeDown = false, canOpen = () => true } = {}) {
    const original = { document: globalThis.document, window: globalThis.window, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
    t.after(() => Object.assign(globalThis, original));
    const doc = new Target(), win = new Target(), button = new Target();
    const classes = new Set(), captured = new Set(), timers = new Map(), actions = [];
    let now = 0, nextId = 0, allowed = true;
    Object.assign(button, {
        disabled: false,
        classList: { remove: c => classes.delete(c), toggle(c, value) { if (value) classes.add(c); else classes.delete(c); } },
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 50, bottom: 50 }),
        setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id)
    });
    Object.assign(globalThis, { document: doc, window: win,
        setTimeout(fn, ms) { const id = ++nextId; timers.set(id, { fn, at: now + ms }); return id; },
        clearTimeout: id => timers.delete(id) });
    bindPickerGestures(button, { onTap: () => actions.push('tap'), onOpen: () => actions.push('open'),
        onSwipeDown: swipeDown ? () => actions.push('down') : undefined,
        onHold: hold ? () => actions.push('hold') : undefined,
        onExtendedHold: extendedHold ? () => actions.push('extendedHold') : undefined, canInteract: () => allowed, canOpen });
    return { actions, button, doc, win, classes, captured,
        block() { allowed = false; },
        event(type, x = 25, y = 25, extra = {}) { button.emit(type, { pointerId: 1, pointerType, isPrimary: true, button: 0, clientX: x, clientY: y, detail: 1, ...extra }); },
        advance(time) { for (;;) { const next = [...timers].filter(([, t]) => t.at <= time).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); } now = time; }
    };
}
test('touch taps run on release immediately; compatibility clicks and double taps never open', t => {
    const h = harness(t);
    for (let i = 0; i < 2; i++) { h.event('pointerdown'); h.event('pointerup'); h.event('click', 25, 25, { detail: i }); }
    assert.deepEqual(h.actions, ['tap', 'tap']); h.advance(1000); assert.equal(h.actions.length, 2);
});
test('touch swipe captures outside the button and opens only on release', t => {
    const h = harness(t); h.event('pointerdown'); assert(h.captured.has(1));
    h.event('pointermove', 25, 1); h.event('pointerleave', 25, 1);
    assert(h.classes.has('picker-swipe-glow')); assert.deepEqual(h.actions, []);
    h.event('pointerup', 25, -10); h.event('click'); h.advance(1000);
    assert.deepEqual(h.actions, ['open']); assert.equal(h.classes.size, 0); assert.equal(h.captured.size, 0);
});
test('tap jitter is accepted, but meaningful partial, sideways, downward and diagonal drags cancel', t => {
    const h = harness(t); h.event('pointerdown'); h.event('pointerup', 29, 29); h.event('click');
    assert.deepEqual(h.actions, ['tap']);
    for (const [x, y] of [[25, 10], [50, 25], [25, 60], [60, 0]]) {
        h.event('pointerdown'); h.event('pointermove', x, y); h.advance(700); h.event('pointerup', x, y); h.event('click');
    }
    assert.deepEqual(h.actions, ['tap']);
});
test('returning after a valid swipe cancels opening and never becomes a tap', t => {
    const h = harness(t); h.event('pointerdown'); h.event('pointermove', 25, -5); assert(h.classes.has('picker-swipe-glow')); h.event('pointermove');
    assert.equal(h.classes.size, 0); h.event('pointerup'); h.event('click'); assert.deepEqual(h.actions, []);
});
test('movement cancels hold even if the swipe takes longer than 600ms', t => {
    const h = harness(t); h.event('pointerdown'); h.advance(200); h.event('pointermove', 25, 10); h.advance(1000);
    h.event('pointerup', 25, -5); h.event('click'); assert.deepEqual(h.actions, ['open']);
});
test('a completed long hold locks out both swipe and tap', t => {
    const h = harness(t); h.event('pointerdown'); h.advance(599); assert.deepEqual(h.actions, []);
    h.advance(600); h.event('pointermove', 25, -10); h.event('pointerup', 25, -10); h.event('click');
    assert.deepEqual(h.actions, ['hold']); assert.equal(h.classes.size, 0);
});
test('palette stationary hold stays a no-op even if later dragged', t => {
    const h = harness(t, { hold: false }); h.event('pointerdown'); h.advance(600); h.event('pointerup', 25, -10); h.event('click');
    assert.deepEqual(h.actions, []);
});
test('pointer cancel, lost capture, background and blur clean up timers and hints', t => {
    const h = harness(t);
    for (const cancel of [() => h.event('pointercancel'), () => h.event('lostpointercapture'),
        () => { h.doc.hidden = true; h.doc.emit('visibilitychange'); h.doc.hidden = false; }, () => h.win.emit('blur')]) {
        h.event('pointerdown'); h.event('pointermove', 25, -5); cancel(); h.event('pointerup', 25, -5); h.event('click');
        assert.equal(h.classes.size, 0); assert.equal(h.captured.size, 0);
    }
    h.advance(2000); assert.deepEqual(h.actions, []);
    h.event('pointerdown'); h.event('pointerup'); h.event('click'); assert.deepEqual(h.actions, ['tap']);
});
test('blocked, disabled and secondary pointers do not act', t => {
    const h = harness(t); h.event('pointerdown', 25, 25, { isPrimary: false }); h.event('pointerup'); assert.deepEqual(h.actions, []);
    h.button.disabled = true; h.event('pointerdown'); h.event('pointerup'); h.event('click'); h.button.disabled = false;
    h.event('pointerdown'); h.event('pointermove', 25, -5); h.block(); h.event('pointerup', 25, -5); h.event('click');
    h.advance(1000); assert.deepEqual(h.actions, []);
});
test('desktop clicks stay immediate and captured upward drags open on release only', t => {
    const h = harness(t, { pointerType: 'mouse' }); h.event('pointerdown'); h.event('pointerup'); h.event('click');
    assert.deepEqual(h.actions, ['tap']); h.event('pointerdown'); assert(h.captured.has(1));
    h.event('pointermove', 25, -5); h.event('pointerleave', 25, -5);
    assert.deepEqual(h.actions, ['tap']); assert(h.classes.has('picker-swipe-glow'));
    h.event('pointerup', 25, -5); h.event('click');
    assert.deepEqual(h.actions, ['tap', 'open']); assert.equal(h.captured.size, 0);
});
test('desktop return drag and cancellation cannot trigger a tap or open', t => {
    const h = harness(t, { pointerType: 'mouse' });
    h.event('pointerdown'); h.event('pointermove', 25, -5); h.event('pointermove'); h.event('pointerup'); h.event('click');
    h.event('pointerdown'); h.event('pointermove', 25, -5); h.event('pointercancel'); h.event('pointerup', 25, -5); h.event('click');
    h.advance(1000); assert.deepEqual(h.actions, []); assert.equal(h.classes.size, 0);
});
test('desktop color hold remains locked against a later upward drag', t => {
    const h = harness(t, { pointerType: 'mouse' });
    h.event('pointerdown'); h.advance(600); h.event('pointermove', 25, -5); h.event('pointerup', 25, -5); h.event('click');
    assert.deepEqual(h.actions, ['hold']);
});

test('opening eligibility gates glow and swipes without blocking ordinary taps', t => {
    let selected = false, playing = false;
    const h = harness(t, { canOpen: () => selected && !playing });
    h.event('pointerdown'); h.event('pointerup'); h.event('click');
    assert.deepEqual(h.actions, ['tap']);
    for (const state of [[false, false], [true, true]]) {
        [selected, playing] = state;
        h.event('pointerdown'); h.event('pointermove', 25, -5);
        assert.equal(h.classes.size, 0);
        h.event('pointerup', 25, -5); h.event('click');
        assert.deepEqual(h.actions, ['tap']);
    }
    selected = true; playing = false;
    h.event('pointerdown'); h.event('pointermove', 25, -5);
    assert(h.classes.has('picker-swipe-glow'));
    playing = true; h.event('pointerup', 25, -5); h.event('click');
    assert.equal(h.classes.size, 0); assert.deepEqual(h.actions, ['tap']);
    playing = false;
    h.event('pointerdown'); h.event('pointermove', 25, -5); h.event('pointerup', 25, -5); h.event('click');
    assert.deepEqual(h.actions, ['tap', 'open']);
});

for (const pointerType of ['touch', 'mouse']) {
    test(`${pointerType} holds select the first stage at 600ms and the second at 1200ms`, t => {
        const h = harness(t, { pointerType, extendedHold: true });
        h.event('pointerdown'); h.advance(599); assert.deepEqual(h.actions, []);
        h.advance(600); assert.deepEqual(h.actions, ['hold']);
        h.advance(1199); assert.deepEqual(h.actions, ['hold']);
        h.advance(1200); assert.deepEqual(h.actions, ['hold', 'extendedHold']);
        h.event('pointerup'); h.event('click'); h.advance(2000);
        assert.deepEqual(h.actions, ['hold', 'extendedHold']);
    });
}
for (const [name, end] of [
    ['release', h => { h.event('pointerup'); h.event('click'); }],
    ['cancel', h => h.event('pointercancel')],
    ['lost capture', h => h.event('lostpointercapture')],
    ['blur', h => h.win.emit('blur')],
    ['background', h => { h.doc.hidden = true; h.doc.emit('visibilitychange'); }],
    ['movement after first hold', h => { h.event('pointermove', 25, -10); h.event('pointerup', 25, -10); h.event('click'); }],
    ['disabled control', h => { h.button.disabled = true; }],
    ['blocked interaction', h => h.block()]
]) {
    test(`${name} prevents the extended hold after the first stage`, t => {
        const h = harness(t, { extendedHold: true });
        h.event('pointerdown'); h.advance(600); end(h); h.advance(2000);
        assert.deepEqual(h.actions, ['hold']);
    });
}
test('an upward swipe cancels both hold stages and still opens the picker', t => {
    const h = harness(t, { extendedHold: true });
    h.event('pointerdown'); h.advance(200); h.event('pointermove', 25, -10);
    h.advance(1500); h.event('pointerup', 25, -10); h.event('click');
    assert.deepEqual(h.actions, ['open']);
});

for(const pointerType of ['touch','mouse']) {
 test(pointerType+' downward swipe is opt-in, commits on release once, and cancels both hold stages',t=>{
  const h=harness(t,{pointerType,swipeDown:true,extendedHold:true});
  h.event('pointerdown');h.advance(100);h.event('pointermove',25,55);assert(h.classes.has('picker-swipe-glow'));assert.deepEqual(h.actions,[]);
  h.advance(1400);h.event('pointerup',25,55);h.event('click');assert.deepEqual(h.actions,['down']);assert.equal(h.classes.size,0);assert.equal(h.captured.size,0);
 });
 test(pointerType+' down swipe return, sideways drag, cancellation, and completed hold cannot change tools',t=>{
  const h=harness(t,{pointerType,swipeDown:true});
  h.event('pointerdown');h.event('pointermove',25,60);h.event('pointermove');h.event('pointerup');h.event('click');
  h.event('pointerdown');h.event('pointermove',65,55);h.event('pointerup',65,55);h.event('click');
  h.event('pointerdown');h.event('pointermove',25,60);h.event('pointercancel');h.event('pointerup',25,60);h.event('click');
  h.event('pointerdown');h.advance(600);h.event('pointermove',25,60);h.event('pointerup',25,60);h.event('click');
  assert.deepEqual(h.actions,['hold']);assert.equal(h.classes.size,0);
 });
}
