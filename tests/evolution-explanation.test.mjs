import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { evolutionExplanations, getEvolutionExplanation } from '../js/evolution-explanation.js';

const source = readFileSync(new URL('../js/evolution-explanation.js', import.meta.url), 'utf8');
test('every evolution has concise display copy in all four languages', () => {
    assert.equal(Object.keys(evolutionExplanations).length, 13);
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
    const icon = {replaceChildren() {}}, title = {}, text = {}, panel = {...element(), firstElementChild: icon, querySelector: s => s === 'h2' ? title : text};
    const document = {createElement: () => panel, addEventListener(type, fn) {listeners.set(type, fn);}};
    const context = vm.createContext({document, window: {addEventListener() {}, matchMedia: () => ({matches: false})},
        getCurrentLang: () => 'en', onLanguageChange() {}, requestAnimationFrame: fn => fn(),
        setTimeout(fn) {const id = ++timerId; timers.set(id, fn); return id;}, clearTimeout: id => timers.delete(id)});
    vm.runInContext(source.replace(/^import .*;\n/, '').replaceAll('export ', '') + '\nglobalThis.guide = createEvolutionExplanation({append() {}});', context);
    const emit = (type, data = {}) => {
        const event = {pointerId: 1, detail: 1, code: 'Space', preventDefault() {this.consumed = true;}, stopImmediatePropagation() {}, ...data};
        listeners.get(type)?.(event); return event;
    };
    return {panel, guide: context.guide, emit, show() {context.guide.show({querySelectorAll: () => [], focus() {}}, 'erosion');},
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
