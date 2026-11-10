import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MACRO_ACTIVITY_STORAGE_KEY,loadMacroActivity,saveMacroActivity,describeMacroActivity,macroActivityPlacement,latestMacroActivity} from '../js/macro-activity.js';

test('display preference is opt-in, device-local and resilient to unavailable storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.equal(loadMacroActivity(storage),false);saveMacroActivity(true,storage);assert.equal(map.get(MACRO_ACTIVITY_STORAGE_KEY),'true');assert.equal(loadMacroActivity(storage),true);
 saveMacroActivity(false,storage);assert.equal(loadMacroActivity(storage),false);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(loadMacroActivity(blocked),false);assert.doesNotThrow(()=>saveMacroActivity(true,blocked));
});
test('activity descriptions cover simulation and artwork actions, while hiding bookkeeping',()=>{
 for(const sim of ['gameOfLife','sandpile','gravitationalSort','brightnessEvo','islands','magnet','spiral','erosion','dla','turing','breathe','contour','cymatics','nudgeBrighter','nudgeDarker']){
  const action={eventName:'PLAY',details:`Armed: ${sim} | Rules: {}`},before=structuredClone(action);
  const item=describeMacroActivity(action);assert(item.label&&item.icon,sim);assert.deepEqual(action,before);
  assert.equal(describeMacroActivity({...action,eventName:'STEP FORWARD'}).label,item.label);
 }
 for(const eventName of ['INIT_STATE','HISTORY_ACTION','HISTORY_SETTINGS','BRUSH_START','BRUSH_END','WIND_END'])assert.equal(describeMacroActivity({eventName,details:'{}'}),null);
 assert.equal(describeMacroActivity({eventName:'DRAW_STROKE',details:'[]'}).label,'macro_activity_draw');
 assert.equal(describeMacroActivity({eventName:'SEPARATOR_CHANGE',details:'0'}).label,'macro_activity_separators');
});
test('Pause and every settings-only event stay out of the display without changing their commands',()=>{
 const events=['PAUSE','SIMULATION_RULES','NUDGE_SPEED','EVOLUTION_TUNING','Nudge Mode Changed',
  'Game of Life Mode Changed','Chi Flow Mode Changed','Gravitational Sort Mode','Brightness Evo Mode Changed',
  'Islands Mode Changed','Magnet Mode Changed','Spiral Mode Changed','Erosion Mode Changed',
  'DLA Mode Changed','Cymatics Mode Changed','Cracks Mode Changed'];
 for(const eventName of events){
  const action={eventName,details:'Armed: gameOfLife | Rules: {}',isGenBased:true,targetGen:42},before=structuredClone(action);
  assert.equal(describeMacroActivity(action,'gameOfLife'),null,eventName);assert.deepEqual(action,before);
 }
});
test('panel uses only free space left of the board and keeps its fullscreen gallery frame clear',()=>{
 const board={left:500,top:100,width:700,height:700},viewport={width:1700,height:1000},before=structuredClone(board);
 const place=macroActivityPlacement(board,viewport,true);assert(place);assert(place.left>=16);assert(place.left+place.width<=board.left-74);assert.equal(place.width,224);assert.deepEqual(board,before);
 assert.equal(macroActivityPlacement({...board,left:200},viewport,true),null);
 assert.equal(macroActivityPlacement(board,{width:900,height:1000}),null);
 assert.equal(macroActivityPlacement(board,{width:1700,height:90}),null);
});
test('all declared labels and icons exist, and playback presentation has no logger or history writer',()=>{
 const source=readFileSync(new URL('../js/macro-activity.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),i18n=readFileSync(new URL('../js/i18n.js',import.meta.url),'utf8');
 for(const [,id] of source.matchAll(/'(btn\w+)'/g))assert(html.includes(`id="${id}"`),id);
 for(const [,key] of source.matchAll(/'((?:help|macro_activity)_\w+)'/g))assert(i18n.includes(key+':'),key);
 assert(!/logArtEvent|pushHistory|executeMacroAction\(/.test(source));
});

test('current action recovery reads only executed commands and skips hidden events',()=>{
 const event=(eventName,details='{}')=>Object.freeze({eventName,details});
 const queue=Object.freeze([event('PLAY','Armed: cymatics | Rules: {}'),event('PAUSE'),event('EVOLUTION_TUNING'),
  event('BRUSH_START'),...Array.from({length:1000},()=>event('DRAW_STROKE','[]')),event('BRUSH_END'),
  event('SIMULATION_RULES'),event('PLAY','Armed: gameOfLife | Rules: {}'),event('PAUSE'),event('Invert Colors')]);
 const before=JSON.stringify(queue);
 assert.equal(latestMacroActivity(queue,0).label,'help_cymatics');
 assert.equal(latestMacroActivity(queue,2).label,'help_cymatics','hidden actions do not replace the current one');
 assert.equal(latestMacroActivity(queue,500).label,'macro_activity_draw');
 assert.equal(latestMacroActivity(queue,queue.length-2).label,'help_gameOfLife');
 assert.equal(latestMacroActivity(queue,queue.length-1).label,'macro_activity_invert');
 assert.equal(latestMacroActivity(queue,-1),null);assert.equal(latestMacroActivity([],0),null);
 assert.equal(JSON.stringify(queue),before);
});
