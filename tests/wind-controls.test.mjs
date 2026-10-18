import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('Wind toggle updates its state without making panel buttons inert or disabled',()=>{
 const button={pressed:'false',inert:false,disabled:false,setAttribute(name,value){if(name==='aria-pressed')this.pressed=value;}},events=[];
 const c=vm.createContext({windMode:false,isSimModeActive:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,
 pointerState:{id:null},windSettingsUI:null,windPointerId:null,windPainter:{stop:()=>events.push('commit')},pauseLife:()=>events.push('pause'),
 document:{body:{classList:{toggle(){}}}},dom:{btnWind:button},showWindToast:value=>events.push(value)});
 vm.runInContext(source.slice(source.indexOf('function setWindMode('),source.indexOf('let windPointerId =')),c);
 c.setWindMode(true);assert.equal(c.windMode,true);assert.equal(button.pressed,'true');assert.equal(button.inert,false);assert.equal(button.disabled,false);
 c.setWindMode(false);assert.equal(c.windMode,false);assert.equal(button.pressed,'false');assert.deepEqual(events,['pause',true,'commit',false]);
 c.isSimModeActive=true;c.setWindMode(true);assert.equal(c.windMode,false);
});
test('new Wind button taps toggle and swipes open settings without changing mode',()=>{
 let gestures;const events=[],c=vm.createContext({dom:{btnWind:{}},windMode:false,isSimModeActive:false,hideLongPressDisplay(){},windSettingsUI:{open:()=>events.push('settings')},setWindMode:value=>{c.windMode=value;events.push(value);},bindPickerGestures:(button,options)=>{gestures=options;}});
 vm.runInContext(source.slice(source.indexOf('        bindPickerGestures(dom.btnWind,'),source.indexOf('        bindPickerGestures(dom.btnSymmetry,')),c);
 gestures.onOpen();assert.equal(c.windMode,false);gestures.onTap();assert(c.windMode);gestures.onTap();assert.equal(c.windMode,false);assert.deepEqual(events,['settings',true,false]);assert(gestures.canInteract());c.isSimModeActive=true;assert.equal(gestures.canInteract(),false);
});
test('ordinary panel events commit pending ripples without consuming or blocking the event',()=>{
 const listeners=new Map(),events=[],c=vm.createContext({windMode:true,windPainter:{stop:()=>events.push('commit')},dom:{controlsContainer:{addEventListener:(name,handler)=>listeners.set(name,handler)}}});
 const start=source.indexOf('    const finishPainting = () =>');
 vm.runInContext(source.slice(start,source.indexOf("    document.addEventListener('keydown', event => {",start)),c);
 const event={key:'Enter',preventDefault(){throw Error('must not block');},stopPropagation(){throw Error('must not consume');}};
 listeners.get('pointerdown')(event);listeners.get('click')(event);listeners.get('keydown')(event);assert.equal(events.length,3);
 c.windMode=false;listeners.get('click')(event);assert.equal(events.length,3);
});
