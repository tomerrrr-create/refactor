import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {freshStartIndices,actionGroups,makeCheckpoint,exportRange,assertPortableSource} from '../studio/macro-edit-model.js';
import {prepareWindMacro} from '../js/wind-recording.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const ctx=vm.createContext({prepareWindMacro});
vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),ctx);
const parse=text=>JSON.parse(JSON.stringify(ctx.parseMacroText(text)));
const init={recipeVersion:2,n:3,pal:0,sep:0,sort:'luminance',board:'9x0'};
const a=(eventName,details,delta=0,gen=null)=>({eventName,details:typeof details==='string'?details:JSON.stringify(details),delta,isGenBased:gen!==null,targetGen:gen});
const begin=a('INIT_STATE',init);
const play=sim=>a('PLAY',`Armed: ${sim} | Sort: luminance | Rules: {}`,100);
const settings={n:3,activePaletteIndex:0,separatorPx:0,currentSortMethod:'luminance'};
const checkpoint={index:2,init:{...init,board:'9x3',gold:[4]},settings};

test('only genuinely fresh starts qualify; pause/play and single steps are not fresh',()=>{
 const actions=[begin,play('gameOfLife'),a('PAUSE','---',500,5),play('gameOfLife'),
 a('PAUSE','---'),play('turing'),a('PAUSE','---'),a('STEP FORWARD','Armed: magnet | Rules: {}'),play('magnet')];
 assert.deepEqual(freshStartIndices(actions),[1,5]);
 const live={...play('gameOfLife'),resume:{generation:20}};
 assert.deepEqual(freshStartIndices([begin,live,a('PAUSE','---'),play('gameOfLife')]),[]);
 assert.deepEqual(freshStartIndices([begin,play('gameOfLife'),a('PAUSE','---'),a('Game of Life Mode Changed',{mode:'off'}),a('Game of Life Mode Changed',{mode:'personal'}),play('gameOfLife')]),[1,5]);
});
test('retained seeded sessions, active strokes and Wind never offer a false start',()=>{
 assert.deepEqual(freshStartIndices([begin,a('PLAY','Armed: contour | Rules: {"cracksState":{"steps":15}}')]),[]);
 assert.deepEqual(freshStartIndices([begin,a('BRUSH_START',{version:1}),play('gameOfLife')]),[]);
 assert.deepEqual(freshStartIndices([begin,a('WIND_WAVE','{}'),play('gameOfLife')]),[]);
});
test('one complete brush gesture is one readable row while all samples remain available',()=>{
 const actions=[begin,a('BRUSH_START',{version:1}),a('DRAW_STROKE',[]),a('DRAW_STROKE',[]),a('BRUSH_END',{version:1}),play('gameOfLife')];
 const groups=actionGroups(actions);assert.equal(groups.length,3);assert.equal(groups[1].actions.length,4);assert.equal(groups[1].eventName,'DRAW_STROKE');assert.equal(groups[2].from,5);
});
test('portable checkpoint retains colors and gold using only existing recipe commands',()=>{
 const state={...settings,tiles:Array.from({length:9},(_,i)=>({k:i<5?2:3,v:i<5?2:3,isGold:i===2}))};
 const snapshot=makeCheckpoint(state);assert.equal('freshStart' in snapshot,false);assert.equal(snapshot.board,'5x2,4x3');assert.deepEqual(snapshot.gold,[2]);assert.equal('values' in snapshot,false);assert.throws(()=>makeCheckpoint({...state,tiles:[{k:2,v:2.3}]}),/UNSUPPORTED_WORKING_VALUES/);
 const actions=[begin,a('DRAW_STROKE',[{i:0,k:3}],50),play('gameOfLife'),a('PAUSE','---',900,8)];
 const original=JSON.stringify(actions),text=exportRange(actions,{start:checkpoint});
 const replay=parse(text);assert.deepEqual(replay.map(e=>e.eventName),['INIT_STATE','Nudge Mode Changed','Nudge Mode Changed','HISTORY_SETTINGS','PLAY','PAUSE']);
 assert.equal('values' in JSON.parse(replay[0].details),false);assert.equal(replay[4].delta,0);assert.equal(replay[5].targetGen,8);
 assert.equal(JSON.stringify(actions),original);
});
test('end inside an open brush gesture closes it before terminating; generation target is retained',()=>{
 const actions=[begin,play('gameOfLife'),a('BRUSH_START',{version:1},200),a('DRAW_STROKE',[{i:0,k:2}],300),a('BRUSH_END',{version:1},400),a('PAUSE','---',900,10)];
 // Paused brush and live simulation packets are separate formats; use a
 // standalone paused gesture for validation of a cut between its packets.
 const paused=[begin,...actions.slice(2,5),a('DRAW_STROKE',[{i:1,k:1}],800)];
 const replay=parse(exportRange(paused,{end:{index:2,delta:350,simulation:null,generation:0}}));
 assert.deepEqual(replay.map(e=>e.eventName),['INIT_STATE','BRUSH_START','DRAW_STROKE','BRUSH_END','PAUSE']);
 const running=parse(exportRange([begin,play('gameOfLife'),a('PAUSE','---',900,10)],{end:{index:1,delta:500,simulation:'gameOfLife',generation:4}}));
 assert.equal(running.at(-1).targetGen,4);
});
test('flattened Undo/Redo never re-applies old history offsets on export',()=>{
 const raw=`[12:00:00.000] INIT_STATE -> ${JSON.stringify(init)}\n[12:00:00.100] DRAW_STROKE -> [{"i":0,"k":2}]\n[12:00:00.100] HISTORY_ACTION -> {"recipeVersion":2,"id":1,"from":0,"to":2}\n[12:00:00.200] UNDO -> ${JSON.stringify({recipeVersion:2,id:1,settings})}\n[12:00:00.300] REDO -> ${JSON.stringify({recipeVersion:2,id:1,settings})}`;
 const actions=parse(raw),replay=parse(exportRange(actions));
 assert.deepEqual(replay.map(e=>[e.eventName,e.details,e.delta]),actions.map(e=>[e.eventName,e.details,e.delta]));
});
test('invalid ranges are rejected without requiring changes to the app parser',()=>{
 assert.throws(()=>exportRange([begin,play('gameOfLife')],{end:{index:-1}}));
 assert.throws(()=>exportRange([begin,play('gameOfLife')],{start:{...checkpoint,index:0}}),/fresh/);
 assert.equal(parse(`[00:00:00.000] INIT_STATE -> ${JSON.stringify(init)}`).length,1);
});
test('normal app does not import editor code; Studio loads it only through the Edit Macro tab',()=>{
 assert.equal(source.includes('macro-edit-model'),false);assert.equal(source.includes('macro-editor-engine'),false);
 const exporter=readFileSync(new URL('../studio/exporter.js',import.meta.url),'utf8');assert.match(exporter,/if\(edit&&!macroEditor\).*import\('\.\/editor.js'\)/s);
});

test('prototype-only INIT fields are rejected by the editor before silently losing state',()=>{
 assert.throws(()=>assertPortableSource([a('INIT_STATE',{...init,values:Array(9).fill(1)})]),/UNSUPPORTED_PROTOTYPE_INIT/);
 assert.doesNotThrow(()=>assertPortableSource([begin]));
});
