import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTER_FOUR_STEPS,chapterFourView} from '../js/chapter-four-tour.js';
import {readChapterOneProgress} from '../js/chapter-one-tour.js';
const view=(id,events=[],state={},context={})=>chapterFourView({id,events,state:{simMode:true,playing:false,armedSimulation:'gravitationalSort',playEnabled:true,stepEnabled:true,...state},context,language:'he'});
const action=(id,before={},after={},extra={})=>({type:'evolution-action',id,before:{playing:false,armedSimulation:'gravitationalSort',...before},after:{playing:false,...after},...extra});
test('chapter four progress resumes only known lesson steps',()=>{for(const step of CHAPTER_FOUR_STEPS)assert.equal(readChapterOneProgress({getItem:()=>JSON.stringify({version:1,status:'active',step})}).step,step);});
test('the door needs a complete creation/evolution round trip',()=>{
 const context={};assert(!view('evolution-door',[],{},context).done);
 const one=[action('btnToggleSimMode')];assert(!view('evolution-door',one,{simMode:false},context).done);
 assert(view('evolution-door',[...one,action('btnToggleSimMode')],{},context).done);
});
test('single generations require three valid paused engine actions',()=>{
 const step=()=>action('btnStepForward');assert(!view('evolution-step',[step(),step()]).done);assert(view('evolution-step',[step(),step(),step()]).done);
 assert(!view('evolution-step',[step(),step(),action('btnStepForward',{playing:true})]).done);
 assert(!view('evolution-engine',[],{stepEnabled:false}).done);
});
test('Play requires a real start and advancing generations',()=>{
 assert(!view('evolution-play',[],{playing:true,generation:3}).done);
 assert(!view('evolution-play',[action('btnPlayPauseLife',{}, {playing:true})],{playing:true,generation:0}).done);
 assert(view('evolution-play',[action('btnPlayPauseLife',{}, {playing:true})],{playing:true,generation:3}).done);
});
test('a paused resume cannot count as a learner choosing Pause',()=>{
 assert(!view('evolution-pause').done);
 assert(view('evolution-pause',[action('btnPlayPauseLife',{playing:true},{playing:false})]).done);
});
