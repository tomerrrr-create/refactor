import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DEFAULT_WIND_SETTINGS} from '../js/wind-settings.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('Wind toggle updates its state without making panel buttons inert or disabled',()=>{
 const button={pressed:'false',inert:false,disabled:false,setAttribute(name,value){if(name==='aria-pressed')this.pressed=value;}},events=[];
 const c=vm.createContext({windSettings:{...DEFAULT_WIND_SETTINGS,mode:'paint'},saveWindSettings(){},updateWindButtonUI(){},windMode:false,isSimModeActive:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
 pointerState:{id:null},windSettingsUI:null,windPointerId:null,windPainter:{stop:()=>events.push('commit')},pauseLife:()=>events.push('pause'),
 document:{body:{classList:{toggle(){}}}},dom:{},showWindToast:value=>events.push(value)});
 vm.runInContext(source.slice(source.indexOf('function setWindMode('),source.indexOf('function updateWindButtonUI(')),c);
 c.setWindMode(true);assert.equal(c.windMode,true);assert.equal(c.windSettings.mode,'paint');assert.equal(button.inert,false);assert.equal(button.disabled,false);
 c.setWindMode(false);assert.equal(c.windMode,false);assert.deepEqual(events,['pause',true,'commit',false]);
 c.isSimModeActive=true;c.setWindMode(true);assert.equal(c.windMode,true);
});
test('Symmetry stays independent and has no Wind hold trigger',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnSymmetry:{}},windMode:true,isBreathing:false,symmetryMode:'vertical',
 hideLongPressDisplay(){},cycleSymmetryMode:()=>events.push('cycle'),updateSymmetryUI:()=>events.push('symmetry'),
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('        bindPickerGestures(dom.btnSymmetry,');
 vm.runInContext(source.slice(start,source.indexOf('bindPickerGestures(dom.btnCycleSort,',start)),c);
 gestures.onTap();assert.equal(gestures.onHold,undefined);gestures.onOpen();
 assert.equal(c.symmetryMode,'off');assert.equal(c.windMode,true);assert.deepEqual(events,['cycle','symmetry']);
});
test('dedicated Wind button toggles instead of cycling; settings open while off too',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnWind:{}},windMode:false,isBreathing:false,
 hideLongPressDisplay(){},windSettingsUI:{open:()=>events.push('settings')},setWindMode:value=>{c.windMode=value;events.push(value);},
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('        bindPickerGestures(dom.btnWind,');
 vm.runInContext(source.slice(start,source.indexOf('        bindPickerGestures(dom.btnSymmetry,',start)),c);
 gestures.onOpen();assert.equal(c.windMode,false);gestures.onTap();assert.equal(c.windMode,true);
 gestures.onTap();assert.equal(c.windMode,false);assert.deepEqual(events,['settings',true,false]);
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

test('Wind button reflects the selected mode and leaves the symmetry icon untouched',()=>{
 const attrs={},button={dataset:{},classList:{toggle:(key,value)=>attrs[key]=value},setAttribute:(key,value)=>attrs[key]=value,replaceChildren:icon=>attrs.icon=icon};
 const c=vm.createContext({dom:{btnWind:button},windMode:false,windSettings:{mode:'paint'},getText:key=>key,createWindModeIcon:mode=>mode});
 vm.runInContext(source.slice(source.indexOf('function updateWindButtonUI('),source.indexOf('let windPointerId =')),c);
 c.updateWindButtonUI();assert.equal(attrs.icon,'ripple');assert.equal(attrs['aria-pressed'],'false');
 c.windMode=true;c.updateWindButtonUI();assert.equal(attrs.icon,'paint');assert.equal(attrs['aria-pressed'],'true');assert.equal(attrs['wind-active'],true);
 assert.equal(button.dataset.windMode,'paint');
});
