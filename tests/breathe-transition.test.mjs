import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { validateEvolutionTuning } from '../js/evolution-tuning.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreatheTransition} from '../js/breathe-transition.js';
function harness(t){
 const saved={document:globalThis.document,window:globalThis.window,getComputedStyle:globalThis.getComputedStyle,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 t.after(()=>Object.assign(globalThis,saved));
 const frames=[],children=[],timers=new Map(),events={},draws=[];let reduced=false;
 const source={id:'source',width:3000,height:3000,clientWidth:500},bloom={id:'bloom',hidden:false,width:160,height:160,opacity:'0.2',filter:'blur(6px)'};
 const board={querySelector:id=>id==='#boardCanvas'?source:bloom,appendChild:frame=>children.push(frame)};
 const context=()=>({globalAlpha:1,globalCompositeOperation:'source-over',filter:'none',saved:[],
  save(){this.saved.push([this.globalAlpha,this.globalCompositeOperation,this.filter]);},
  restore(){[this.globalAlpha,this.globalCompositeOperation,this.filter]=this.saved.pop();},
  drawImage(image,...dimensions){draws.push({image,dimensions,alpha:this.globalAlpha,operation:this.globalCompositeOperation,filter:this.filter});}});
 const document={hidden:false,addEventListener:(name,fn)=>{events[name]=fn;},createElement(){
  const ctx=context();let resolve,reject;
  const frame={opacity:'1',setAttribute(){},getContext:()=>ctx,remove(){const index=children.indexOf(frame);if(index>=0)children.splice(index,1);},
   animate(keyframes,options){frame.keyframes=keyframes;frame.options=options;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});return{finished,cancel(){reject(Error('cancelled'));}};},
   finish(){resolve();}};
  frames.push(frame);return frame;
 }};
 Object.assign(globalThis,{document,window:{matchMedia:()=>({matches:reduced}),addEventListener:(name,fn)=>{events[name]=fn;}},
  getComputedStyle:node=>({opacity:node.opacity,filter:node.filter??'none'}),
  setTimeout(fn){const id=timers.size+1;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
 return{transition:createBreatheTransition(board),frames,children,draws,events,timers,source,bloom,reduce(value=true){reduced=value;}};
}
test('state changes immediately under one bounded snapshot including bloom, with cleanup at completion',async t=>{
 const h=harness(t);let state='playing';
 const value=h.transition.run(()=>{assert.equal(h.children.length,1);state='paused';return 42;});
 assert.equal(value,42);assert.equal(state,'paused');assert(h.transition.isActive());
 const frame=h.frames[0];assert.equal(frame.width,1024);assert.equal(frame.height,1024);assert.equal(frame.options.duration,600);
 assert.equal(h.draws[0].image,h.source);assert.equal(h.draws[1].image,h.bloom);
 assert.equal(h.draws[1].operation,'screen');assert.equal(h.draws[1].alpha,.2);assert.equal(h.draws[1].filter,'blur(12.288px)');
 frame.finish();await Promise.resolve();assert.equal(h.children.length,0);assert.equal(h.transition.isActive(),false);assert.equal(h.timers.size,0);assert.equal(frame.width,1);
});
test('rapid retargeting composites the active opacity instead of jumping back to the underlying board',async t=>{
 const h=harness(t);h.transition.run(()=>{});const old=h.frames[0];old.opacity='0.4';
 let calls=0;h.transition.run(()=>{calls++;});
 const composite=h.draws.at(-1);assert.equal(composite.image,old);assert.equal(composite.alpha,.4);
 assert.equal(calls,1);assert.equal(h.children.length,1);assert.notEqual(h.children[0],old);
 await Promise.resolve();assert.equal(h.children.length,1,'old cancellation must not remove the new frame');
 h.transition.clear();await Promise.resolve();assert.equal(h.children.length,0);assert.equal(h.timers.size,0);
});
test('reduced motion and missing source skip visual work; errors cannot leave an overlay blocking later work',async t=>{
 const h=harness(t);h.transition.run(()=>{});h.reduce();let calls=0;h.transition.run(()=>calls++);
 assert.equal(calls,1);assert.equal(h.children.length,0);await Promise.resolve();
 h.reduce(false);h.source.width=0;h.transition.run(()=>calls++);assert.equal(calls,2);assert.equal(h.frames.length,1);
 h.source.width=3000;assert.throws(()=>h.transition.run(()=>{throw Error('action failed');}),/action failed/);
 assert.equal(h.children.length,0);assert.equal(h.transition.isActive(),false);
});
test('resize, background and fallback timeout clear the snapshot without changing app state',async t=>{
 const h=harness(t);let calls=0;
 h.transition.run(()=>calls++);h.events.resize();await Promise.resolve();assert.equal(h.children.length,0);
 h.transition.run(()=>calls++);globalThis.document.hidden=true;h.events.visibilitychange();await Promise.resolve();assert.equal(h.children.length,0);
 globalThis.document.hidden=false;h.transition.run(()=>calls++);for(const fn of [...h.timers.values()])fn();await Promise.resolve();assert.equal(h.children.length,0);assert.equal(calls,3);
});

test('macro import validates live breathing mode and tuning before scheduling playback',()=>{
 const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
 const c=vm.createContext({validateEvolutionTuning});
 vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),c);
 const recipe=value=>'[12:00:00.000] Breathe Mode Changed -> '+JSON.stringify(value);
 assert.equal(c.parseMacroText(recipe({mode:'solo',running:true,tuning:{speed:2.4,depth:2.3}})).length,1);
 for(const value of [{mode:'unknown',running:true},{mode:'solo',running:'yes'},
  {mode:'off',running:true},{mode:'random-cell',running:true,tuning:{depth:4}}])assert.throws(()=>c.parseMacroText(recipe(value)));
});
