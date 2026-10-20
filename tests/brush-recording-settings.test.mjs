import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBrushMotionRecording, persistBrushMotionRecording, BRUSH_MOTION_STORAGE_KEY} from '../js/brush-recording-settings.js';
test('stroke motion defaults on, persists independently, and survives unavailable storage',()=>{
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(loadBrushMotionRecording(storage),true);
 persistBrushMotionRecording(true,storage);assert.equal(values.get(BRUSH_MOTION_STORAGE_KEY),'true');assert.equal(loadBrushMotionRecording(storage),true);
 persistBrushMotionRecording(false,storage);assert.equal(loadBrushMotionRecording(storage),false);
 for(const invalid of ['1','yes','null','{}']){values.set(BRUSH_MOTION_STORAGE_KEY,invalid);assert.equal(loadBrushMotionRecording(storage),true);}
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(loadBrushMotionRecording(blocked),true);assert.equal(persistBrushMotionRecording(true,blocked),false);
 assert.equal(loadBrushMotionRecording(),true);
});
