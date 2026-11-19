import test from 'node:test';
import assert from 'node:assert/strict';
import {createLuminanceAnchorPreference,LUMINANCE_ANCHOR_KEY} from '../js/luminance-anchor-preference.js';
const harness=(saved=null,initial={magnet:false,life:false})=>{
 const values=new Map(saved===null?[]:[[LUMINANCE_ANCHOR_KEY,saved]]),flags={...initial},calls=[];
 const input={checked:false,disabled:false,addEventListener(type,fn){this.change=fn;}};
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const pref=createLuminanceAnchorPreference({read:()=>({...flags}),apply:(enabled,options)=>{flags.magnet=flags.life=enabled;calls.push(options);},input,storage});
 return {values,flags,calls,input,pref,storage};
};
test('missing or invalid preferences default off and override restored modal values at startup',()=>{
 for(const value of [null,'false','invalid','1']){const h=harness(value,{magnet:true,life:true});h.pref.restore();assert.deepEqual(h.flags,{magnet:false,life:false});assert(!h.input.checked);assert.deepEqual(h.calls,[{startup:true}]);}
});
test('technician On/Off applies both values and persists the browser choice',()=>{
 const h=harness();h.input.checked=true;h.input.change();assert.deepEqual(h.flags,{magnet:true,life:true});assert.equal(h.values.get(LUMINANCE_ANCHOR_KEY),'true');
 h.input.checked=false;h.input.change();assert.deepEqual(h.flags,{magnet:false,life:false});assert.equal(h.values.get(LUMINANCE_ANCHOR_KEY),'false');
});
test('manual saves sync with AND, preserving independent mixed values for the current visit',()=>{
 const h=harness('true',{magnet:true,life:true});h.flags.magnet=false;h.pref.sync();assert(!h.input.checked);assert.equal(h.flags.life,true);assert.equal(h.values.get(LUMINANCE_ANCHOR_KEY),'false');
 h.flags.magnet=true;h.pref.sync();assert(h.input.checked);assert.equal(h.values.get(LUMINANCE_ANCHOR_KEY),'true');
 h.flags.life=false;h.pref.sync();assert(!h.input.checked);assert.equal(h.flags.magnet,true);
 const next=createLuminanceAnchorPreference({read:()=>h.flags,apply:enabled=>{h.flags.magnet=h.flags.life=enabled;},storage:h.storage});next.restore();assert.deepEqual(h.flags,{magnet:false,life:false});
});
test('a saved On applies on the next visit even if both model values were restored as Off',()=>{
 const h=harness('true');h.pref.restore();assert.deepEqual(h.flags,{magnet:true,life:true});assert(h.input.checked);
});
test('blocked storage retains session behavior and a blocked control cannot change rules',()=>{
 const flags={magnet:false,life:false},input={addEventListener(t,fn){this.change=fn;}};
 const pref=createLuminanceAnchorPreference({read:()=>flags,apply:value=>{flags.magnet=flags.life=value;},input,storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},canChange:()=>false});
 input.checked=true;input.change();assert(!input.checked);assert.deepEqual(flags,{magnet:false,life:false});assert.equal(pref.set(true),false);assert(pref.enabled());
});
