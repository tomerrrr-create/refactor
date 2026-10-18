import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_WIND_SETTINGS,normalizeWindSettings,loadWindSettings,saveWindSettings,WIND_SETTINGS_KEY} from '../js/wind-settings.js';
import {createWindWave,advanceWindWave,createWindPainter,WIND_DURATION} from '../js/wind-paint.js';
test('wind preferences validate independently and round-trip without failing on unavailable storage',()=>{
 let text;const storage={getItem:()=>text,setItem:(key,value)=>{assert.equal(key,WIND_SETTINGS_KEY);text=value;}};
 const config={...DEFAULT_WIND_SETTINGS,mode:'paint',strength:2,speed:2,range:.3,colorSpan:2.5,trail:false};assert(saveWindSettings(config,storage));assert.deepEqual(loadWindSettings(storage),config);
 text='{invalid';assert.deepEqual(loadWindSettings(storage),DEFAULT_WIND_SETTINGS);
 assert.deepEqual(normalizeWindSettings({speed:Infinity,range:-1,colorSpan:100,trail:'false'}),DEFAULT_WIND_SETTINGS);
 assert.equal(saveWindSettings(config,{setItem(){throw Error('unavailable');}}),false);
 assert.deepEqual(loadWindSettings({getItem(){throw Error('unavailable');}}),DEFAULT_WIND_SETTINGS);
});
test('speed changes time to the same front, range limits touched cells, and color density changes palette ranks',()=>{
 const result=(settings,time)=>{const wave=createWindWave(51,1300,264,0,0,settings),cells=new Map();advanceWindWave(wave,time,(i,k)=>cells.set(i,k));return cells;};
 assert.deepEqual(result({speed:2},550),result({speed:1},1100));
 const full=result({},WIND_DURATION),limited=result({range:.3},WIND_DURATION);
 assert.equal(full.size,51*51);assert(limited.size<full.size/2);
 assert.notDeepEqual([...result({colorSpan:.25},WIND_DURATION).values()],[...result({colorSpan:3},WIND_DURATION).values()]);
});
test('disabling trails paints the initial ripple without emitting more while dragging',()=>{
 let time=0,fn;const p=createWindPainter({context:()=>({n:21,paletteLength:64,base:0}),settings:()=>({...DEFAULT_WIND_SETTINGS,trail:false}),
  now:()=>time,requestFrame:f=>(fn=f,1),cancelFrame:()=>{},reducedMotion:()=>false,paint:()=>{},onStart:()=>{},onCommit:()=>{},onFrame:()=>{}});
 p.down(1,100);time=200;p.move(1,300);assert.equal(p.activeWaves,1);p.up(1);fn(3000);assert.equal(p.activeWaves,0);
});

test('new and legacy wind settings default to displacement while an explicit paint choice survives reopening',()=>{
 assert.equal(normalizeWindSettings().mode,'displace');
 assert.equal(normalizeWindSettings({speed:2,trail:false}).mode,'displace');
 assert.equal(normalizeWindSettings({mode:'paint'}).mode,'paint');
 assert.equal(normalizeWindSettings({mode:'invalid',strength:Infinity}).mode,'displace');
 assert.equal(normalizeWindSettings({strength:3}).strength,3);
});

test('local ripple preference round-trips without changing old modes or defaults',()=>{
 let text;const storage={getItem:()=>text,setItem:(_,value)=>{text=value;}};
 assert(saveWindSettings({...DEFAULT_WIND_SETTINGS,mode:'ripple',strength:2},storage));
 assert.equal(loadWindSettings(storage).mode,'ripple');assert.equal(loadWindSettings(storage).strength,2);
 for(const mode of ['displace','paint'])assert.equal(normalizeWindSettings({mode}).mode,mode);
 assert.equal(normalizeWindSettings().mode,'displace');
});

test('each Wind mode retains independent settings, with legacy settings preserved for the original two',async()=>{
 const {selectWindMode}=await import('../js/wind-settings.js');
 let draft=selectWindMode({mode:'paint',speed:2,strength:2,range:.3,trail:false});
 assert.equal(draft.speed,2);
 draft.speed=3;draft.modes.paint.speed=3;
 draft=selectWindMode(draft,'displace');assert.equal(draft.speed,2);assert.equal(draft.range,.3);
 draft.strength=.25;draft.modes.displace.strength=.25;
 draft=selectWindMode(draft,'ripple');assert.equal(draft.speed,1);assert.equal(draft.trail,true);
 draft.speed=.5;draft.modes.ripple.speed=.5;
 draft=selectWindMode(draft,'paint');assert.equal(draft.speed,3);
 const text=JSON.stringify(draft),restored=normalizeWindSettings(JSON.parse(text));
 assert.equal(selectWindMode(restored,'ripple').speed,.5);assert.equal(selectWindMode(restored,'displace').strength,.25);
 assert.equal(selectWindMode(restored,'paint').speed,3);
 const wave=createWindWave(21,220,264,0,0,selectWindMode(restored,'ripple'));
 assert.equal(wave.duration,WIND_DURATION/.5);assert.equal(wave.mode,'ripple');
});


test('only Local ripple accepts 1000% strength and defaults to 300%, preserving explicit saved values',async()=>{
 const {selectWindMode}=await import('../js/wind-settings.js');
 assert.equal(normalizeWindSettings({mode:'ripple'}).strength,3);
 assert.equal(selectWindMode(undefined,'ripple').strength,3);
 assert.equal(normalizeWindSettings({mode:'ripple',strength:10}).strength,10);
 assert.equal(normalizeWindSettings({mode:'ripple',strength:10.25}).strength,3);
 assert.equal(normalizeWindSettings({mode:'ripple',strength:1}).strength,1);
 for(const mode of ['displace','paint']){
  assert.equal(normalizeWindSettings({mode}).strength,1);
  assert.equal(normalizeWindSettings({mode,strength:10}).strength,1);
 }
 const settings=selectWindMode(undefined,'ripple');settings.strength=10;settings.modes.ripple.strength=10;
 let text;const storage={getItem:()=>text,setItem:(_,value)=>{text=value;}};
 assert(saveWindSettings(settings,storage));const restored=loadWindSettings(storage);
 assert.equal(restored.strength,10);assert.equal(selectWindMode(restored,'displace').strength,1);
 assert.equal(selectWindMode(restored,'ripple').strength,10);
});
