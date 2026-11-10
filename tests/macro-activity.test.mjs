import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MACRO_ACTIVITY_STORAGE_KEY,loadMacroActivity,saveMacroActivity,describeMacroActivity,macroGenerationTarget,macroActivityPlacement} from '../js/macro-activity.js';

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
  assert.equal(describeMacroActivity({...action,eventName:'STEP FORWARD'}).kind,'macro_activity_step');
 }
 for(const eventName of ['INIT_STATE','HISTORY_ACTION','HISTORY_SETTINGS','BRUSH_START','BRUSH_END','WIND_END'])assert.equal(describeMacroActivity({eventName,details:'{}'}),null);
 assert.equal(describeMacroActivity({eventName:'DRAW_STROKE',details:'[]'}).label,'macro_activity_draw');
 assert.equal(describeMacroActivity({eventName:'Nudge Mode Changed',details:'nudgeDarker'}).label,'help_nudge_backward');
 assert.equal(describeMacroActivity({eventName:'Game of Life Mode Changed',details:'{}'}).kind,'macro_activity_settings');
});
test('generation total is the next real stop in this run, never an unrelated later run',()=>{
 const stop={eventName:'PAUSE',isGenBased:true,targetGen:120};
 assert.equal(macroGenerationTarget([{eventName:'DRAW_STROKE'},stop],0,42),120);
 assert.equal(macroGenerationTarget([stop],0,121),null);
 assert.equal(macroGenerationTarget([{eventName:'PLAY'},stop],0,42),null);
 assert.equal(macroGenerationTarget([{...stop,isGenBased:false}],0,42),null);
 assert.equal(macroGenerationTarget([],0,42),null);
});
test('panel uses only free space left of the board and keeps its fullscreen gallery frame clear',()=>{
 const board={left:500,top:100,width:700,height:700},viewport={width:1700,height:1000},before=structuredClone(board);
 const place=macroActivityPlacement(board,viewport,true);assert(place);assert(place.left>=16);assert(place.left+place.width<=board.left-74);assert.equal(place.width,224);assert.deepEqual(board,before);
 assert.equal(macroActivityPlacement({...board,left:200},viewport,true),null);
 assert.equal(macroActivityPlacement(board,{width:900,height:1000}),null);
 assert.equal(macroActivityPlacement(board,{width:1700,height:240}),null);
});
test('all declared labels and icons exist, and playback presentation has no logger or history writer',()=>{
 const source=readFileSync(new URL('../js/macro-activity.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),i18n=readFileSync(new URL('../js/i18n.js',import.meta.url),'utf8');
 for(const [,id] of source.matchAll(/'(btn\w+)'/g))assert(html.includes(`id="${id}"`),id);
 for(const [,key] of source.matchAll(/'((?:help|macro_activity)_\w+)'/g))assert(i18n.includes(key+':'),key);
 assert(!/logArtEvent|pushHistory|executeMacroAction\(/.test(source));
});
