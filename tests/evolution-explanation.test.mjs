import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { evolutionExplanations, getEvolutionExplanation } from '../js/evolution-explanation.js';

const source = readFileSync(new URL('../js/evolution-explanation.js', import.meta.url), 'utf8');
test('every evolution has concise display copy in all four languages', () => {
    assert.equal(Object.keys(evolutionExplanations).length, 15);
    for (const id of Object.keys(evolutionExplanations)) {
        for (const lang of ['en', 'he', 'ru', 'nl']) {
            const [title, description] = getEvolutionExplanation(id, lang);
            assert.ok(title.length && description.length && description.length < 150, `${id}/${lang}`);
            if (lang === 'he') assert.match(description, /[א-ת]/);
            if (lang === 'ru') assert.match(description, /[А-Яа-я]/);
        }
        assert.deepEqual(getEvolutionExplanation(id, 'unknown'), getEvolutionExplanation(id, 'en'));
    }
});

function harness() {
    const listeners = new Map(), timers = new Map(); let timerId = 0;
    const element = () => ({hidden: true, classList: {add() {}, remove() {}}, setAttribute() {}, focus() {}});
    const icon = {replaceChildren() {}}, title = {}, text = {}, help = {}, panel = {...element(), firstElementChild: icon, querySelector: s => s === 'h2' ? title : s === 'p' ? text : help};
    const document = {createElement: () => panel, addEventListener(type, fn) {listeners.set(type, fn);}};
    const context = vm.createContext({document, window: {addEventListener() {}, matchMedia: () => ({matches: false})},
        helpCalls: 0, getCurrentLang: () => 'en', onLanguageChange() {}, requestAnimationFrame: fn => fn(),
        setTimeout(fn) {const id = ++timerId; timers.set(id, fn); return id;}, clearTimeout: id => timers.delete(id)});
    vm.runInContext(source.replace(/^import .*;\n/, '').replaceAll('export ', '') + '\nglobalThis.guide = createEvolutionExplanation({append() {}}, {onHelp() {globalThis.helpCalls++;}});', context);
    const emit = (type, data = {}) => {
        const event = {type, clientX: 0, clientY: 0, pointerId: 1, detail: 1, code: 'Space', preventDefault() {this.consumed = true;}, stopImmediatePropagation() {}, ...data};
        listeners.get(type)?.(event); return event;
    };
    return {panel, help, guide: context.guide, emit, helpCalls: () => context.helpCalls, show() {context.guide.show({querySelectorAll: () => [], focus() {}}, 'erosion');},
        flush() {for (const [id, fn] of [...timers]) {timers.delete(id); fn();}}};
}
test('opening release and compatibility click leave explanation open', () => {
    const h = harness(); h.emit('pointerdown'); h.show();
    assert.equal(h.emit('pointerup').consumed, undefined);
    assert.equal(h.emit('click').consumed, true);
    h.flush(); assert.equal(h.guide.isOpen(), true); assert.equal(h.panel.hidden, false);
    h.emit('pointerdown'); h.emit('pointerup'); h.emit('click'); h.flush();
    assert.equal(h.guide.isOpen(), false); assert.equal(h.panel.hidden, true);
});
test('dismissal held beyond fade consumes release and compatibility click', () => {
    const h = harness(); h.show();
    assert.equal(h.emit('pointerdown').consumed, true); h.flush();
    assert.equal(h.guide.isOpen(), true);
    assert.equal(h.emit('pointerup').consumed, true);
    assert.equal(h.emit('click').consumed, true); h.flush(); assert.equal(h.guide.isOpen(), false);
});
test('keyboard dismissal waits for key release, including repeats', () => {
    const h = harness(); h.show();
    assert.equal(h.emit('keydown').consumed, true); h.flush();
    assert.equal(h.guide.isOpen(), true); assert.equal(h.emit('keydown').consumed, true);
    assert.equal(h.emit('keyup').consumed, true); h.flush(); assert.equal(h.guide.isOpen(), false);
});
test('multi-touch dismissal waits for original hold to release', () => {
    const h = harness(); h.emit('pointerdown'); h.show();
    h.emit('pointerdown', {pointerId: 2}); h.emit('pointerup', {pointerId: 2}); h.flush();
    assert.equal(h.guide.isOpen(), true);
    assert.equal(h.emit('pointerup').consumed, undefined); h.flush(); assert.equal(h.guide.isOpen(), false);
});

test('WTF tap opens help once, only after the explanation fades', () => {
    const h = harness(); h.show();
    h.emit('pointerdown', {target: h.help});
    assert.equal(h.helpCalls(), 0); assert.equal(h.panel.hidden, false);
    h.emit('pointerup', {target: h.help}); h.emit('click', {target: h.help});
    assert.equal(h.helpCalls(), 0); h.flush();
    assert.equal(h.panel.hidden, true); assert.equal(h.helpCalls(), 1);
    h.flush(); assert.equal(h.helpCalls(), 1);
});
test('dragging or cancelling a WTF press never opens help', () => {
    for (const cancelled of [false, true]) {
        const h = harness(); h.show(); h.emit('pointerdown', {target: h.help});
        h.emit(cancelled ? 'pointercancel' : 'pointerup', {target: h.help, clientY: cancelled ? 0 : 30});
        h.emit('click', {target: h.help}); h.flush(); assert.equal(h.helpCalls(), 0);
    }
});
test('ordinary dismissal never opens help, even with additional taps during fade', () => {
    const h = harness(); h.show(); h.emit('pointerdown'); h.emit('pointerup');
    h.emit('pointerdown', {target: h.help}); h.emit('pointerup', {target: h.help}); h.flush();
    assert.equal(h.helpCalls(), 0);
});
test('keyboard activation on WTF opens help after key release', () => {
    const h = harness(); h.show(); h.emit('keydown', {target: h.help, code: 'Enter'}); h.flush();
    assert.equal(h.helpCalls(), 0); h.emit('keyup', {target: h.help, code: 'Enter'}); h.flush();
    assert.equal(h.helpCalls(), 1);
});
