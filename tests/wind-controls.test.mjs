import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {selectWindMode,nextWindEffect,DEFAULT_WIND_SETTINGS} from '../js/wind-settings.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('Wind toggle preserves a running simulation without disabling panel buttons',()=>{
 const button={pressed:'false',inert:false,disabled:false,setAttribute(name,value){if(name==='aria-pressed')this.pressed=value;}},events=[];
 const c=vm.createContext({windSettings:{...DEFAULT_WIND_SETTINGS,mode:'paint'},selectWindMode,saveWindSettings(){},updateColorPickerButtonUI(){},windMode:false,isLifePlaying:true,isSimModeActive:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
 pointerState:{id:null},windSettingsUI:null,windPointerId:null,windPainter:{stop:()=>events.push('commit')},pauseLife(){throw Error('tool changes must not pause the simulation');},
 document:{body:{classList:{toggle(){}}}},dom:{btnColorPicker:button},flashToolMode:()=>events.push('flash')});
 vm.runInContext(source.slice(source.indexOf('function setWindMode('),source.indexOf('let windPointerId =')),c);
 c.setWindMode(true);assert.equal(c.windMode,true);assert.equal(c.windSettings.mode,'ripple');assert.equal(button.inert,false);assert.equal(button.disabled,false);
 c.setWindMode(false);assert.equal(c.windMode,false);assert.deepEqual(events,['flash','commit','flash']);
 assert.equal(c.isLifePlaying,true);c.isSimModeActive=true;c.setWindMode(true);assert.equal(c.windMode,true);assert.equal(c.isLifePlaying,true);
});
test('Symmetry stays independent of Wind and has no hold trigger',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnSymmetry:{}},windMode:true,isBreathing:false,symmetryMode:'vertical',
 hideLongPressDisplay(){},cycleSymmetryMode:()=>events.push('cycle'),updateSymmetryUI:()=>events.push('symmetry'),
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('        bindPickerGestures(dom.btnSymmetry,');
 vm.runInContext(source.slice(start,source.indexOf('bindPickerGestures(dom.btnCycleSort,',start)),c);
 gestures.onTap();assert.equal(gestures.onHold,undefined);gestures.onOpen();assert.equal(c.symmetryMode,'off');assert(c.windMode);
 assert.deepEqual(events,['cycle','symmetry']);
});
test('shared color control routes tap, swipe, and holds by active tool without changing brush choices in Wind',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnColorPicker:{addEventListener(){}}},windMode:false,isBreathing:false,isLifePlaying:false,armedSimulation:null,
 selectedColorIndex:3,selectedColor:'color3',isRainbowModeActive:false,
 C:{LONG_PRESS_SHOW_MS:600},hideLongPressDisplay(){},palette:()=>['color0'],
 handleColorPickerClick:()=>events.push('color'),cycleWindEffect:()=>events.push('wind-cycle'),
 modals:{openColorPickerModal:()=>events.push('color-settings')},windSettingsUI:{open:()=>events.push('wind-settings')},
 setWindMode:value=>{c.windMode=value;events.push(value);},updateGlowEffect(){},updateColorPickerButtonUI(){},
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('bindPickerGestures(dom.btnColorPicker,');
 vm.runInContext(source.slice(start,source.indexOf("        dom.btnDark.addEventListener",start)),c);
 gestures.onTap();gestures.onOpen();gestures.onSwipeDown();assert(c.windMode);
 gestures.onTap();gestures.onOpen();gestures.onHold();gestures.onExtendedHold();assert.equal(c.selectedColorIndex,3);assert.equal(c.selectedColor,'color3');assert.equal(c.isRainbowModeActive,false);
 gestures.onSwipeDown();assert(!c.windMode);gestures.onHold();assert.equal(c.selectedColorIndex,0);gestures.onExtendedHold();assert(c.isRainbowModeActive);
 assert.deepEqual(events,['color','color-settings',true,'wind-cycle','wind-settings',false]);
 c.isLifePlaying=true;c.armedSimulation='breathe';assert(gestures.canInteract());assert(!gestures.canOpen());gestures.onSwipeDown();assert(c.windMode);assert(gestures.canOpen());
});
test('ordinary panel events commit pending ripples without consuming or blocking the event',()=>{
 const listeners=new Map(),events=[],c=vm.createContext({finishBrushGesture(){},windMode:true,windPainter:{stop:()=>events.push('commit')},dom:{controlsContainer:{addEventListener:(name,handler)=>listeners.set(name,handler)}}});
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
 saveWindSettings:()=>events.push('save'),updateColorPickerButtonUI:()=>events.push('ui'),pauseLife(){throw Error('must keep playing');}});
 vm.runInContext(source.slice(source.indexOf('function cycleWindEffect('),source.indexOf('let windPointerId =')),c);
 c.cycleWindEffect();assert.equal(c.windSettings.mode,'paint');assert.equal(c.windSettings.colorSpan,2.5);
 c.cycleWindEffect();assert.equal(c.windSettings.mode,'displace');assert.equal(c.windSettings.strength,2);
 c.cycleWindEffect();assert.equal(c.windSettings.mode,'ripple');assert.equal(c.windSettings.strength,5);
 assert.equal(c.windMode,true);assert.equal(c.isLifePlaying,true);assert.equal(c.symmetryMode,'horizontal');
 assert.deepEqual(events,['commit','save','ui','commit','save','ui','commit','save','ui']);
});
test('side swipe uses the existing empty-brush reset, preserving size, symmetry, board and running simulation',()=>{
 let gestures,flashes=0;
 const c=vm.createContext({dom:{btnColorPicker:{addEventListener(){},animate(){flashes++;}}},windMode:false,isBreathing:false,isLifePlaying:true,armedSimulation:'islands',
 selectedColorIndex:3,selectedColor:'color3',isRainbowModeActive:false,brushSize:7,symmetryMode:'vertical',boardState:[{k:3}],
 C:{LONG_PRESS_SHOW_MS:600},hideLongPressDisplay(){},updateGlowEffect(){},updateColorPickerButtonUI(){},
 bindPickerGestures:(button,options)=>{gestures=options;}});
 const start=source.indexOf('bindPickerGestures(dom.btnColorPicker,');
 vm.runInContext(source.slice(source.indexOf('      function resetSelectedColor()'),source.indexOf('      function resetToGoldAndDefaultPalette()'))+
 source.slice(start,source.indexOf("        dom.btnDark.addEventListener",start)),c);
 assert(gestures.canSwipeSide());gestures.onSwipeSide();assert.equal(c.selectedColor,null);assert.equal(c.selectedColorIndex,-1);assert(!c.isRainbowModeActive);assert.equal(flashes,1);
 gestures.onSwipeSide();assert.equal(flashes,1);
 c.isRainbowModeActive=true;gestures.onSwipeSide();assert(!c.isRainbowModeActive);assert.equal(flashes,2);
 c.windMode=true;c.selectedColor='color3';c.selectedColorIndex=3;assert(!gestures.canSwipeSide());gestures.onSwipeSide();assert.equal(c.selectedColor,'color3');assert.equal(flashes,2);
 assert.equal(c.brushSize,7);assert.equal(c.symmetryMode,'vertical');assert(c.isLifePlaying);assert.equal(c.boardState[0].k,3);
});
