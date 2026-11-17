import test from 'node:test';
import assert from 'node:assert/strict';
import {GALLERY_DEMOS,GALLERY_STEPS,createGalleryRanks,galleryView} from '../js/evolution-gallery.js';
import {readChapterOneProgress} from '../js/chapter-one-tour.js';
test('only the ten specified engines have guided examples and valid saved progress',()=>{
 assert.equal(GALLERY_DEMOS.length,10);assert.equal(new Set(GALLERY_STEPS).size,GALLERY_STEPS.length);
 for(const id of ['breathe','dla','turing','spiral','cymatics','ink','oil'])assert(!GALLERY_DEMOS.some(d=>d.engine===id));
 for(const step of GALLERY_STEPS)assert.equal(readChapterOneProgress({getItem:()=>JSON.stringify({version:1,status:'active',step})}).step,step);
});
test('every example uses valid palette ranks at the specified board size',()=>{
 for(const demo of GALLERY_DEMOS){const ranks=createGalleryRanks(demo.id);assert.equal(ranks.length,249*249);assert(ranks.every(k=>k>=0&&k<264));assert(new Set(ranks).size>1);}
});
test('Life, Cracks and Network have room for growth; the magnet has a distinct anchor',()=>{
 for(const id of ['life','cracks','network']){const ranks=createGalleryRanks(id),colored=ranks.filter(k=>k>0).length;assert(colored>0&&colored<ranks.length*.1);}
 const magnet=createGalleryRanks('magnet');assert(magnet.includes(0));assert(magnet.filter(k=>k===0).length<magnet.length*.05);
});
test('introductions are explicit acknowledgements and cannot run an engine',()=>{
 const result=galleryView({id:'gallery-life-intro',state:{playing:false},events:[],language:'he'});assert(result.done);assert.equal(result.target,'#boardCanvas');
});
test('drawing cannot be completed by evolution alone',()=>{
 const state={armedSimulation:'magnet',playing:true,galleryAnchor:0,selectedColorIndex:0},stroke={type:'stroke',playing:true,windMode:false};
 const view=events=>galleryView({id:'gallery-magnet-anchor',state,events,language:'en'});
 assert(!view([stroke]).done);assert(view([stroke,{type:'brush-applied',playing:true,selectedColorIndex:0}]).done);assert(!view([stroke,{type:'brush-applied',playing:true,selectedColorIndex:3}]).done);
});

test('a real painted stamp is a valid way to add a small Life group',()=>{
 const state={armedSimulation:'gameOfLife',playing:true};
 const events=[{type:'tile',playing:true,windMode:false},{type:'brush-applied',playing:true,selectedColorIndex:230}];
 assert(galleryView({id:'gallery-life-draw',state,events,language:'he'}).done);
 assert(!galleryView({id:'gallery-magnet-anchor',state:{armedSimulation:'magnet',playing:true,galleryAnchor:0,selectedColorIndex:0},events:[{type:'tile',playing:true},{type:'brush-applied',playing:true,selectedColorIndex:0}],language:'he'}).done);
});
