import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual app.js parser without initializing its DOM and animation loops.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function getHistorySettings('), source.indexOf('function toggleMacroFullScreen(')), context);
const parse = text => JSON.parse(JSON.stringify(context.parseMacroText(text)));
const settings = () => ({ n: 1, activePaletteIndex: 0, separatorPx: 0,
    currentSortMethod: 'luminance' });
const init = { recipeVersion: 2, n: 1, pal: 0, sep: 0, sort: 'luminance', board: '1x0' };

function recipe() {
    const lines = [];
    let cursor = 0;
    const add = (name, details, gen = null) => {
        lines.push(`[12:00:${String(Math.floor(lines.length / 10)).padStart(2, '0')}.${String((lines.length % 10) * 100).padStart(3, '0')}]${gen === null ? '' : ` [GEN:${gen}]`} ${name} -> ${typeof details === 'string' ? details : JSON.stringify(details)}`);
    };
    add('INIT_STATE', init);
    return {
        add,
        commit(id) { add('HISTORY_ACTION', { recipeVersion: 2, id, from: cursor, to: lines.length }); cursor = lines.length; },
        undo(id, state) { add('UNDO', { recipeVersion: 2, id, settings: state }); cursor = lines.length; },
        redo(id, state) { add('REDO', { recipeVersion: 2, id, settings: state }); cursor = lines.length; },
        parse() { return parse(lines.join('\n')); }
    };
}

test('cancelled drawing and later sort never enter playback; target restores environment', () => {
    const r = recipe();
    r.add('DRAW_STROKE', [{ i: 0, k: 1 }]); r.commit(1);
    r.add('Sort by', 'reversed'); r.undo(1, settings(0));
    r.add('DRAW_STROKE', [{ i: 0, k: 2 }]); r.commit(2);
    const queue = r.parse();
    assert.deepEqual(queue.map(e => e.eventName), ['INIT_STATE', 'HISTORY_SETTINGS', 'DRAW_STROKE']);
    assert.equal(JSON.parse(queue[1].details).currentSortMethod, 'luminance');
    assert.equal(JSON.parse(queue[2].details)[0].k, 2);
});

test('undo of a logless history action does not remove the previous stroke', () => {
    const r = recipe();
    r.add('DRAW_STROKE', [{ i: 0, k: 1 }]); r.commit(1);
    r.commit(2); r.undo(2, settings(1));
    assert.equal(r.parse().filter(e => e.eventName === 'DRAW_STROKE').length, 1);
});

test('multiple undos remove settings checkpoints belonging to cancelled actions', () => {
    const r = recipe();
    r.add('DRAW_STROKE', [{ i: 0, k: 1 }]); r.commit(1);
    r.add('DRAW_STROKE', [{ i: 0, k: 2 }]); r.commit(2);
    r.undo(2, settings(1)); r.undo(1, settings(0));
    const queue = r.parse();
    assert.deepEqual(queue.map(e => e.eventName), ['INIT_STATE', 'HISTORY_SETTINGS']);
    assert.equal(JSON.parse(queue[1].details).currentSortMethod, 'luminance');
});

test('redo restores the identified action; a subsequent undo hides the redo too', () => {
    const r = recipe();
    r.add('GO_DARK', '---'); r.commit(1);
    r.undo(1, settings(2)); r.redo(1, settings(0));
    assert.ok(r.parse().some(e => e.eventName === 'GO_DARK'));
    r.undo(1, settings(2));
    assert.ok(!r.parse().some(e => e.eventName === 'GO_DARK'));
    assert.equal(JSON.parse(r.parse().at(-1).details).currentSortMethod, 'luminance');
});

test('cancelled simulation has no PLAY, PAUSE or stranded generation waits', () => {
    const r = recipe();
    r.add('PLAY', 'Armed: gameOfLife | Rules: {}');
    r.add('PAUSE', '---', 20); r.commit(1); r.undo(1, settings(0));
    assert.deepEqual(r.parse().map(e => e.eventName), ['INIT_STATE', 'HISTORY_SETTINGS']);
    assert.ok(r.parse().every(e => !e.isGenBased));
});

test('history settings never read or serialize tiles, regardless of board size', () => {
    for (const n of [7, 249, 300]) {
        const state = { n, activePaletteIndex: 3, separatorPx: 2, currentSortMethod: 'reversed',
            get tiles() { throw new Error('History logging must not access tiles'); } };
        const settings = context.getHistorySettings(state);
        context.validateHistorySettings(settings);
        assert.deepEqual(JSON.parse(JSON.stringify(settings)), { n, activePaletteIndex: 3, separatorPx: 2, currentSortMethod: 'reversed' });
        assert.ok(JSON.stringify(settings).length < 120);
    }
});

test('corrupt settings and incorrect history ranges fail before playback', () => {
    const r = recipe(); r.commit(1); r.undo(1, { ...settings(0), n: 999 });
    assert.throws(() => r.parse(), /Invalid history settings/);
    assert.throws(() => parse(`[12:00:00.000] INIT_STATE -> ${JSON.stringify(init)}\n[12:00:00.100] HISTORY_ACTION -> {"recipeVersion":2,"id":1,"from":0,"to":99}`), /Invalid history action metadata/);
});

test('old recipes use the unchanged legacy parser', () => {
    const legacy = '[12:00:00.000] INIT_STATE -> {}\n[12:00:00.100] DRAW_STROKE -> []\n[12:00:00.200] UNDO -> ---';
    assert.deepEqual(parse(legacy), JSON.parse(JSON.stringify(context.parseLegacyMacroText(legacy))));
    assert.deepEqual(parse(legacy).map(e => e.eventName), ['INIT_STATE']);
});

test('undo predating a logger reset retains only settings, never fabricates board data', () => {
    const r = recipe(); r.undo(90, settings(3));
    assert.equal(JSON.parse(r.parse().at(-1).details).n, 1);
    assert.ok(!r.parse().some(e => e.eventName === 'DRAW_STROKE'));
});
