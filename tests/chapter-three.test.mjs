import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTER_THREE_STEPS,chapterThreeView} from '../js/chapter-three-tour.js';
import {readChapterOneProgress} from '../js/chapter-one-tour.js';
const view=(id,events=[],state={},context={},visible=()=>null)=>chapterThreeView({id,events,state:{selectedColorIndex:-1,rainbow:false,brushMode:'continuous',...state},context,b:{visible},language:'he'});
test('chapter three resumes known steps and presents one instruction per action',()=>{
 assert.equal(new Set(CHAPTER_THREE_STEPS).size,CHAPTER_THREE_STEPS.length);
 for(const id of CHAPTER_THREE_STEPS){assert(view(id).title&&view(id).body);assert.equal(readChapterOneProgress({getItem:()=>JSON.stringify({version:1,status:'active',step:id})}).step,id);}
});
test('source drawing requires a real changed stroke with an empty brush',()=>{
 assert(!view('source-drag',[{type:'tile',changed:true}]).done);
 assert(!view('source-drag',[{type:'stroke',changed:false,brushMode:'continuous',selectedColorIndex:-1}]).done);
 assert(view('source-drag',[{type:'stroke',changed:true,brushMode:'continuous',selectedColorIndex:-1,rainbow:false}]).done);
});
test('copy must preserve the source and reproduce its color at the destination',()=>{
 const stroke={type:'stroke',changed:true,brushMode:'copy',color:2,sourceColor:2,sourceAfter:2};
 assert(view('copy-color',[stroke]).done);assert(!view('copy-color',[{...stroke,sourceAfter:3}]).done);
});
test('size and hold lessons require drawing after the appropriate gesture',()=>{
 const action={type:'control-gesture',id:'btnColorPicker',direction:'right',sequence:2};
 const stroke={type:'stroke',changed:true,sequence:3};
 assert(!view('brush-right',[action]).done);assert(!view('brush-left',[action,stroke]).done);assert(view('brush-right',[action,stroke]).done);
 const hold={...action,direction:'hold',state:{selectedColorIndex:0,rainbow:false}};
 assert(view('brush-first',[hold,stroke]).done);assert(!view('brush-rainbow',[hold,stroke]).done);
 assert(view('brush-rainbow',[{...hold,state:{rainbow:true}},stroke]).done);
});
test('symmetry lessons require a stroke in the specified mode',()=>{
 const stroke={type:'stroke',changed:true,brushMode:'continuous',symmetryMode:'vertical'};
 assert(view('sym-vertical',[stroke]).done);assert(!view('sym-horizontal',[stroke]).done);
});
test('large-board setup cannot complete from an unrelated hold or a small board',()=>{
 const hold={type:'control-gesture',id:'btnToggleSimMode',direction:'hold'};
 const state={n:249,simMode:true,playing:false,separatorPx:0};
 assert(!view('prepare-large',[],state).done);assert(!view('prepare-large',[hold],{...state,n:27}).done);assert(view('prepare-large',[hold],state).done);
});

test('skipping preparation leads to a native setup instruction instead of a blocked drawing task',()=>{
 const pending=view('free-draw',[],{n:27,simMode:false});
 assert.equal(pending.target,'#btnToggleSimMode');assert(!pending.done);
});

test('holding too long can be retried without leaving the lesson stuck',()=>{
 const hold=(sequence,rainbow)=>({type:'control-gesture',id:'btnColorPicker',direction:'hold',sequence,state:{selectedColorIndex:rainbow?-1:0,rainbow}});
 const stroke={type:'stroke',changed:true,sequence:4};
 assert(view('brush-first',[hold(1,true),hold(3,false),stroke]).done);
});
