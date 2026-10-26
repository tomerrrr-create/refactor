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

test('palette group transition and adaptation are independently cancelled and restored', () => {
    const r = recipe();
    r.add('Palette Change', 'Journey | Sort: luminance'); r.commit(1);
    r.add('ADAPT_COLORS', '---'); r.commit(2);
    assert.deepEqual(r.parse().map(e => e.eventName), ['INIT_STATE', 'Palette Change', 'ADAPT_COLORS']);
    r.undo(2, settings());
    assert.deepEqual(r.parse().map(e => e.eventName), ['INIT_STATE', 'Palette Change', 'HISTORY_SETTINGS']);
    r.undo(1, settings());
    assert.deepEqual(r.parse().map(e => e.eventName), ['INIT_STATE', 'HISTORY_SETTINGS']);
    r.redo(1, settings()); r.redo(2, settings());
    assert.deepEqual(r.parse().filter(e => !['INIT_STATE', 'HISTORY_SETTINGS'].includes(e.eventName)).map(e => e.eventName),
        ['Palette Change', 'ADAPT_COLORS']);
});

test('one history action cancels and restores both palette change and adaptation', () => {
    const r = recipe();
    r.add('Palette Change', 'Journey | Sort: luminance');
    r.add('ADAPT_COLORS', '---'); r.commit(1);
    assert.deepEqual(r.parse().map(e => e.eventName), ['INIT_STATE', 'Palette Change', 'ADAPT_COLORS']);
    r.undo(1, settings());
    assert.deepEqual(r.parse().map(e => e.eventName), ['INIT_STATE', 'HISTORY_SETTINGS']);
    r.redo(1, { ...settings(), activePaletteIndex: 1 });
    assert.deepEqual(r.parse().filter(e => !['INIT_STATE', 'HISTORY_SETTINGS'].includes(e.eventName)).map(e => e.eventName),
        ['Palette Change', 'ADAPT_COLORS']);
    r.undo(1, settings());
    r.add('DRAW_STROKE', [{ i: 0, k: 3 }]); r.commit(2);
    assert.equal(r.parse().some(e => ['Palette Change', 'ADAPT_COLORS'].includes(e.eventName)), false);
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
    for (const n of [7, 249, 300, 327]) {
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

test('paused motion preserves long intra-stroke pauses and Redo timing, while gaps between strokes are capped',()=>{
 const lines=[
 '[12:00:00.000] INIT_STATE -> '+JSON.stringify(init),
 '[12:00:10.000] BRUSH_START -> {"version":1}',
 '[12:00:10.000] DRAW_STROKE -> [{"i":0,"k":1}]',
 '[12:00:12.500] DRAW_STROKE -> [{"i":0,"k":2}]',
 '[12:00:12.600] BRUSH_END -> {"version":1}',
 '[12:00:12.600] HISTORY_ACTION -> {"recipeVersion":2,"id":1,"from":1,"to":5}'
 ];
 const original=parse(lines.join('\n'));assert.deepEqual(original.filter(a=>a.eventName==='DRAW_STROKE').map(a=>a.delta),[1000,3500]);
 const undo='[12:00:13.000] UNDO -> '+JSON.stringify({recipeVersion:2,id:1,settings:settings()});
 assert(!parse([...lines,undo].join('\n')).some(a=>a.eventName==='BRUSH_START'));
 const redo='[12:00:14.000] REDO -> '+JSON.stringify({recipeVersion:2,id:1,settings:settings()});
 const restored=parse([...lines,undo,redo].join('\n')).filter(a=>a.eventName==='DRAW_STROKE');
 assert.equal(restored.length,2);assert.equal(restored[1].delta-restored[0].delta,2500);
});
test('invalid nested motion is rejected and an exported partial stroke gets a closing action',()=>{
 const base='[12:00:00.000] INIT_STATE -> '+JSON.stringify(init)+'\n[12:00:00.100] BRUSH_START -> {"version":1}';
 assert.throws(()=>parse(base+'\n[12:00:00.200] BRUSH_START -> {"version":1}'));
 assert.equal(parse(base+'\n[12:00:00.200] DRAW_STROKE -> [{"i":0,"k":1}]').at(-1).eventName,'BRUSH_END');
});

test('undoing a live stroke retains the simulation lead-in and pauses at its exact generation',()=>{
 const r=recipe(),marker={version:1,simulation:'gameOfLife',generation:12,elapsed:0};
 r.add('PLAY','Armed: gameOfLife | Rules: {}');r.add('BRUSH_CHECKPOINT',marker,12);r.commit(1);
 r.add('BRUSH_CONTINUE',marker,12);r.add('DRAW_STROKE',[{i:0,k:2}],12);r.add('PAUSE','---',20);r.commit(2);r.undo(2,settings());
 const queue=r.parse();assert(queue.some(a=>a.eventName==='PLAY'));assert(!queue.some(a=>a.eventName==='DRAW_STROKE'));
 assert.deepEqual(queue.filter(a=>a.eventName==='PAUSE').map(a=>a.targetGen),[12]);
 r.redo(2,settings());const restored=r.parse();
 const resume=restored.find(a=>a.eventName==='BRUSH_CONTINUE');assert(resume);assert.equal(resume.isGenBased,false);
 assert.equal(restored.find(a=>a.eventName==='DRAW_STROKE').targetGen,12);
 assert.deepEqual(restored.filter(a=>a.eventName==='PAUSE').map(a=>a.targetGen),[12,20]);
 r.undo(2,settings());assert(!r.parse().some(a=>a.eventName==='DRAW_STROKE'));
 r.undo(1,settings());assert(!r.parse().some(a=>a.isGenBased),'undoing the lead-in removes its waits too');
});
test('malformed live brush checkpoints are rejected before playback',()=>{
 for(const record of [{version:2},{version:1,simulation:'gameOfLife',generation:-1,elapsed:0},{version:1,simulation:'gameOfLife',generation:1,elapsed:-1}]){
  const r=recipe();r.add('BRUSH_CHECKPOINT',record);assert.throws(()=>r.parse());
 }
});

test('Redo of an intermediate live stroke stops at the next brush boundary without advancing an extra generation',()=>{
 const r=recipe(),marker=g=>({version:1,simulation:'gameOfLife',generation:g,elapsed:0});
 r.add('PLAY','Armed: gameOfLife | Rules: {}');r.add('BRUSH_CHECKPOINT',marker(12),12);r.commit(1);
 r.add('BRUSH_CONTINUE',marker(12),12);r.add('DRAW_STROKE',[{i:0,k:1}],12);
 r.add('BRUSH_CHECKPOINT',marker(20),20);r.commit(2);
 r.add('BRUSH_CONTINUE',marker(20),20);r.add('DRAW_STROKE',[{i:0,k:2}],20);r.add('PAUSE','---',30);r.commit(3);
 r.undo(3,settings());r.undo(2,settings());r.redo(2,settings());
 const queue=r.parse();assert.equal(queue.at(-1).eventName,'HISTORY_SETTINGS');
 assert.equal(queue.at(-1).isGenBased,true);assert.equal(queue.at(-1).targetGen,20);
 assert.deepEqual(queue.filter(a=>a.eventName==='DRAW_STROKE').map(a=>JSON.parse(a.details)[0].k),[1]);
});
