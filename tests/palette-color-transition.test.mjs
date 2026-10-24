import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../js/palette-color-transition.js', import.meta.url), 'utf8').replaceAll('export function ', 'function ');
function harness() {
    const timers = new Map(); let serial = 0, reduced = false;
    const element = tag => {
        const el = { tag, width: 10, height: 10, style: {}, hidden: false, children: [], listeners: {},
            append(child) { this.children.push(child); child.parent = this; },
            remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); },
            setAttribute(name, value) { this[name] = value; },
            addEventListener(name, fn) { this.listeners[name] = fn; }
        };
        const context = { globalAlpha: 1, draws: [], drawImage(image) { this.draws.push({ image, opacity: this.globalAlpha }); },
            getImageData() { throw Error('animation must not read back board pixels'); } };
        el.getContext = () => context;
        return el;
    };
    const canvas = element('canvas'), bloom = element('canvas'); bloom.style = { opacity: '.144', filter: 'blur(6px)' };
    const board = element('div'); board.querySelector = name => name === '#boardCanvas' ? canvas : bloom;
    const h = vm.createContext({ document: { createElement: element }, WeakMap,
        matchMedia: () => ({ matches: reduced }), getComputedStyle: el => ({ opacity: el.opacity ?? el.style.opacity ?? '1', filter: el.style.filter ?? 'none' }),
        setTimeout(fn, ms) { timers.set(++serial, { fn, ms }); return serial; }, clearTimeout(id) { timers.delete(id); } });
    vm.runInContext(source, h);
    return { h, board, canvas, bloom, timers, reduce() { reduced = true; } };
}
test('crossfade snapshots the visible base and bloom, keeps one layer, and ignores stale cleanup after rapid taps', () => {
    const { h, board, canvas, timers } = harness();
    const first = h.capturePaletteColors(board); h.showPaletteColorTransition(board, first);
    const old = board.children[0], finishOld = old.listeners.animationend;
    assert.equal(old['aria-hidden'], 'true'); assert.equal(old.children.length, 2);
    old.opacity = '.6';
    const second = h.capturePaletteColors(board);
    const draws = second.frame.getContext('2d').draws;
    assert.equal(draws[0].image, canvas); assert.equal(draws[1].image, first.frame); assert.equal(draws[1].opacity, .6);
    h.showPaletteColorTransition(board, second);
    assert.equal(board.children.length, 1); assert.equal(timers.size, 1);
    finishOld({ target: old }); assert.equal(board.children.length, 1);
    const current = board.children[0]; current.listeners.animationend({ target: current });
    assert.equal(board.children.length, 0); assert.equal(timers.size, 0);
});
test('pointer/history cancellation and fallback cleanup release the layer without retaining timers', () => {
    const { h, board, timers } = harness();
    h.showPaletteColorTransition(board, h.capturePaletteColors(board));
    h.clearPaletteColorTransition(board); assert.equal(board.children.length, 0); assert.equal(timers.size, 0);
    h.showPaletteColorTransition(board, h.capturePaletteColors(board));
    [...timers.values()][0].fn(); assert.equal(board.children.length, 0); assert.equal(timers.size, 0);
});
test('reduced motion skips the snapshot and animation, and hidden bloom is not copied', () => {
    const { h, board, bloom, reduce } = harness(); bloom.hidden = true;
    const snapshot = h.capturePaletteColors(board); assert.equal(snapshot.bloom, null);
    reduce(); assert.equal(h.capturePaletteColors(board), null);
    h.showPaletteColorTransition(board, snapshot); assert.equal(board.children.length, 0);
});
