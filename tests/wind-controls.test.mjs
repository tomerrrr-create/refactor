import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {selectWindMode,nextWindEffect,DEFAULT_WIND_SETTINGS} from '../js/wind-settings.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('Wind toggle updates its state without making panel buttons inert or disabled',()=>{
 const button={pressed:'false',inert:false,disabled:false,setAttribute(name,value){if(name==='aria-pressed')this.pressed=value;}},events=[];
 const c=vm.createContext({windSettings:{...DEFAULT_WIND_SETTINGS,mode:'paint'},selectWindMode,saveWindSettings(){},updateSymmetryUI(){},windMode:false,isSimModeActive:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
 pointerState:{id:null},windSettingsUI:null,windPointerId:null,windPainter:{stop:()=>events.push('commit')},pauseLife:()=>events.push('pause'),
 document:{body:{classList:{toggle(){}}}},dom:{},showWindToast:value=>events.push(value)});
 vm.runInContext(source.slice(source.indexOf('function setWindMode('),source.indexOf('let windPointerId =')),c);
 c.setWindMode(true);assert.equal(c.windMode,true);assert.equal(c.windSettings.mode,'ripple');assert.equal(button.inert,false);assert.equal(button.disabled,false);
 c.setWindMode(false);assert.equal(c.windMode,false);assert.deepEqual(events,['pause',true,'commit',false]);
 c.isSimModeActive=true;c.setWindMode(true);assert.equal(c.windMode,true);
});
test('Symmetry hold toggles Wind and swipe opens settings only while active',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnSymmetry:{}},windMode:false,isBreathing:false,symmetryMode:'vertical',
 hideLongPressDisplay(){},C:{LONG_PRESS_SHOW_MS:600},windSettingsUI:{open:()=>events.push('settings')},
 cycleSymmetryMode:()=>events.push('cycle'),cycleWindEffect:()=>events.push('wind-cycle'),updateSymmetryUI:()=>events.push('symmetry'),setWindMode:value=>{c.windMode=value;events.push(value);},
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('        bindPickerGestures(dom.btnSymmetry,');
 vm.runInContext(source.slice(start,source.indexOf('bindPickerGestures(dom.btnCycleSort,',start)),c);
 gestures.onTap();gestures.onHold();assert.equal(c.windMode,true);gestures.onTap();gestures.onOpen();assert.equal(c.symmetryMode,'vertical');
 gestures.onHold();assert.equal(c.windMode,false);gestures.onOpen();assert.equal(c.symmetryMode,'off');
 assert.deepEqual(events,['cycle',true,'wind-cycle','settings',false,'symmetry']);
});
test('ordinary panel events commit pending ripples without consuming or blocking the event',()=>{
 const listeners=new Map(),events=[],c=vm.createContext({windMode:true,windPainter:{stop:()=>events.push('commit')},dom:{controlsContainer:{addEventListener:(name,handler)=>listeners.set(name,handler)}}});
 const start=source.indexOf('    const finishPainting = () =>');
 vm.runInContext(source.slice(start,source.indexOf("    document.addEventListener('keydown', event => {",start)),c);
 const event={key:'Enter',preventDefault(){throw Error('must not block');},stopPropagation(){throw Error('must not consume');}};
 listeners.get('pointerdown')(event);listeners.get('click')(event);listeners.get('keydown')(event);assert.equal(events.length,3);
 c.windMode=false;listeners.get('click')(event);assert.equal(events.length,3);
});

test('switching interfaces preserves active Wind in both directions',()=>{
 const control=()=>({style:{},classList:{toggle(){}}});
 const dom=Object.fromEntries(['controlsContainer','btnBrushMode','btnGap','btnResetBoard','btnTutorial','btnSpecialReset','btnPlayPauseLife','btnToggleSimMode'].map(key=>[key,control()]));
 let pauses=0,resets=0;
 const c=vm.createContext({dom,windMode:true,isSimModeActive:false,setTimeout:callback=>callback(),
  setWindMode(){throw Error('interface changes must not toggle Wind');},pauseLife(){pauses++;},resetArmedState(){resets++;}});
 vm.runInContext(source.slice(source.indexOf('      function toggleSimMode()'),source.indexOf('      function resetArmedState()')),c);
 c.toggleSimMode();assert.equal(c.isSimModeActive,true);assert.equal(c.windMode,true);assert.equal(dom.controlsContainer.style.opacity,'1');
 c.toggleSimMode();assert.equal(c.isSimModeActive,false);assert.equal(c.windMode,true);assert.equal(pauses,2);assert.equal(resets,2);
});

test('Wind cycles through three active effects with separate preferences, without pausing a concurrent simulation or changing symmetry',()=>{
 const events=[];
 let settings=selectWindMode(undefined,'ripple');settings.modes.ripple.strength=5;settings.strength=5;
 settings.modes.paint.colorSpan=2.5;settings.modes.displace.strength=2;
 const c=vm.createContext({windMode:true,windSettings:settings,symmetryMode:'horizontal',isLifePlaying:true,
 windPainter:{stop:()=>events.push('commit')},selectWindMode,nextWindEffect,
 saveWindSettings:()=>events.push('save'),updateSymmetryUI:()=>events.push('ui'),pauseLife(){throw Error('must keep playing');}});
 vm.runInContext(source.slice(source.indexOf('function cycleWindEffect('),source.indexOf('let windPointerId =')),c);
 c.cycleWindEffect();assert.equal(c.windSettings.mode,'paint');assert.equal(c.windSettings.colorSpan,2.5);
 c.cycleWindEffect();assert.equal(c.windSettings.mode,'displace');assert.equal(c.windSettings.strength,2);
 c.cycleWindEffect();assert.equal(c.windSettings.mode,'ripple');assert.equal(c.windSettings.strength,5);
 assert.equal(c.windMode,true);assert.equal(c.isLifePlaying,true);assert.equal(c.symmetryMode,'horizontal');
 assert.deepEqual(events,['commit','save','ui','commit','save','ui','commit','save','ui']);
});
