import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTER_FIVE_STEPS,CHAPTER_FIVE_ENGINES,chapterFiveView} from '../js/chapter-five-tour.js';
import {readChapterOneProgress} from '../js/chapter-one-tour.js';
const view=(id,events=[],state={},context={})=>chapterFiveView({id,events,state:{simMode:true,playing:true,armedSimulation:'gravitationalSort',selectedColorIndex:3,rainbow:false,...state},context,b:{visible:()=>null},language:'he'});
const action=(id,before={},after={})=>({type:'evolution-action',id,before:{playing:true,...before},after:{playing:true,...after}});
test('chapter five saves its steps and excludes phase-two engines from exploration',()=>{
 for(const step of CHAPTER_FIVE_STEPS)assert.equal(readChapterOneProgress({getItem:()=>JSON.stringify({version:1,status:'active',step})}).step,step);
 for(const id of ['breathe','dla','spiral','turing','cymatics','ink','oil'])assert(!CHAPTER_FIVE_ENGINES.includes(id));
});
test('sorting requires a real change while the engine keeps playing',()=>{
 assert(!view('live-sort-one',[action('btnCycleSort',{sortMethod:'luminance'},{sortMethod:'luminance'})]).done);
 assert(view('live-sort-one',[action('btnCycleSort',{sortMethod:'luminance'},{sortMethod:'reversed'})]).done);
 assert(!view('live-sort-one',[action('btnCycleSort',{sortMethod:'luminance'},{playing:false,sortMethod:'reversed'})]).done);
});
test('an evolving board alone cannot count as a brush stroke',()=>{
 const stroke={type:'stroke',playing:true,selectedColorIndex:3,windMode:false};
 assert(!view('live-draw',[stroke]).done);
 assert(view('live-draw',[stroke,{type:'brush-applied',playing:true,selectedColorIndex:3,windMode:false}]).done);
});
test('switching engines is distinct from choosing a variation of the current engine',()=>{
 const switched=action('btnGravitationalSort',{armedSimulation:'islands',gravityMode:'off'},{armedSimulation:'gravitationalSort',gravityMode:'up'});
 assert(view('live-gravity',[switched]).done);assert(!view('live-variation',[switched]).done);
 assert(view('live-variation',[action('btnGravitationalSort',{armedSimulation:'gravitationalSort',gravityMode:'up'},{armedSimulation:'gravitationalSort',gravityMode:'right'})]).done);
});
test('waves require a real wave event and return uses the native downward gesture',()=>{
 const state={windMode:true,windEffect:'ripple'};
 assert(!view('live-wave',[],state).done);assert(view('live-wave',[{type:'wave-created',playing:true,windEffect:'ripple'}],state).done);
 assert(view('live-brush-return',[{type:'control-gesture',id:'btnWind',direction:'down',state:{playing:true}}],{windMode:false}).done);
});
test('pause cannot complete merely because a resumed lesson is paused',()=>{
 assert(!view('live-pause',[],{playing:false}).done);
 assert(view('live-pause',[action('btnPlayPauseLife',{playing:true},{playing:false})],{playing:false}).done);
});
