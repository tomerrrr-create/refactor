import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DEFAULT_WIND_SETTINGS,selectWindMode,WIND_MODE_SEQUENCE} from '../js/wind-settings.js';
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
test('dedicated Wind button delegates taps to the mode cycle; settings open while off too',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnWind:{}},windMode:false,isBreathing:false,
 hideLongPressDisplay(){},windSettingsUI:{open:()=>events.push('settings')},cycleWindMode:()=>events.push('cycle'),setWindMode:value=>{c.windMode=value;events.push(value);},
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('        bindPickerGestures(dom.btnWind,');
 vm.runInContext(source.slice(start,source.indexOf('        bindPickerGestures(dom.btnSymmetry,',start)),c);
 gestures.onOpen();assert.equal(c.windMode,false);gestures.onTap();gestures.onTap();assert.deepEqual(events,['settings','cycle','cycle']);
 for(const mode of WIND_MODE_SEQUENCE){c.windMode=true;gestures.onHold();assert.equal(c.windMode,false);}
 gestures.onHold();assert.equal(c.windMode,false);
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

test('Wind shows the wave when Off and the selected icon while active',()=>{
 const attrs={},button={dataset:{},classList:{toggle:(key,value)=>attrs[key]=value},setAttribute:(key,value)=>attrs[key]=value};
 const c=vm.createContext({dom:{btnWind:button},windMode:false,windSettings:{mode:'paint'},getText:key=>key,
  updateWindButtonIcon:(node,mode)=>{assert.equal(node,button);attrs.icon=mode;}});
 vm.runInContext(source.slice(source.indexOf('function updateWindButtonUI('),source.indexOf('let windPointerId =')),c);
 for(let i=0;i<3;i++)for(const mode of ['ripple','paint','displace','off']){
  c.windMode=mode!=='off';if(c.windMode)c.windSettings.mode=mode;c.updateWindButtonUI();
  assert.equal(attrs.icon,mode==='off'?'ripple':mode);
  assert.equal(attrs['aria-pressed'],String(c.windMode));assert.equal(attrs['wind-active'],c.windMode);
 }
});

test('Wind cycles Off → ripple → paint → displace → Off, preserving per-mode preferences',()=>{
 const events=[],saved=[];
 const prefs=selectWindMode(DEFAULT_WIND_SETTINGS,'paint');prefs.strength=2;prefs.modes.paint.speed=2;
 const c=vm.createContext({WIND_MODE_SEQUENCE,selectWindMode,windSettings:prefs,windMode:false,
  isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,pointerState:{id:null},windPointerId:null,windSettingsUI:null,
  pauseLife:()=>events.push('pause'),windPainter:{stop:()=>events.push('stop')},saveWindSettings:settings=>saved.push(settings.mode),
  updateWindButtonUI:()=>events.push(c.windMode?'gold':'off'),showWindToast:()=>{},document:{body:{classList:{toggle(){}}}}});
 vm.runInContext(source.slice(source.indexOf('function setWindMode('),source.indexOf('function updateWindButtonUI(')),c);
 const modes=[];for(let i=0;i<4;i++){c.cycleWindMode();modes.push(c.windMode?c.windSettings.mode:'off');}
 assert.deepEqual(modes,['ripple','paint','displace','off']);assert.equal(events.filter(e=>e==='pause').length,1);
 assert.deepEqual(saved,['ripple','paint','displace']);assert.equal(c.windSettings.modes.paint.speed,2);assert.equal(events.at(-1),'off');
 c.cycleWindMode();assert.equal(c.windSettings.mode,'ripple');assert(c.windMode);
 c.setWindMode(false);c.isMacroLoaded=true;c.cycleWindMode();assert(!c.windMode);
});
