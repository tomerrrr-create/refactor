import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {SIZES} from '../js/constants.js';
import {getEvolutionExplanation} from '../js/evolution-explanation.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('one size button binds tap/up/down/hold without changing the size dialog',()=>{
 let options;const actions=[];const button={};
 const c=vm.createContext({dom:{btnResizeUp:button},C:{LONG_PRESS_SHOW_MS:600},isBreathing:false,hideLongPressDisplay(){},
  resizeGrid:increase=>actions.push(increase?'increase':'decrease'),modals:{openResizeModal:()=>actions.push('dialog')},
  evolutionExplanation:{show:(b,id)=>{assert.equal(b,button);assert.equal(id,'gridSize');actions.push('help');}},bindPickerGestures:(b,o)=>options=o});
 const start=source.indexOf('        bindPickerGestures(dom.btnResizeUp,');
 vm.runInContext(source.slice(start,source.indexOf("        dom.btnSave.addEventListener('click'",start)),c);
 options.onTap();options.onSwipeDown();options.onOpen();options.onHold();
 assert.deepEqual(actions,['increase','decrease','dialog','help']);assert(options.canInteract());c.isBreathing=true;assert(!options.canInteract());
});
test('increase and decrease keep the original size sequence and endpoint limits',()=>{
 const events=[];const c=vm.createContext({C:{SIZES},n:249,animateBoardTransition:fn=>fn(),performAction:fn=>fn(),
  window:{logArtEvent:(name,size)=>events.push([name,size])},_performResize:size=>c.n=size});
 const start=source.indexOf('      function resizeGrid(');
 vm.runInContext(source.slice(start,source.indexOf('function syncDlaCrystalState(',start)),c);
 c.resizeGrid(true);assert.equal(c.n,299);c.resizeGrid(true);assert.equal(c.n,327);c.resizeGrid(false);assert.equal(c.n,299);c.resizeGrid(false);assert.equal(c.n,249);
 for(const size of SIZES.slice(3)){c.resizeGrid(false);assert.equal(c.n,size);}
 c.resizeGrid(false);assert.equal(c.n,3);
 for(const size of [...SIZES].reverse().slice(1)){c.resizeGrid(true);assert.equal(c.n,size);}
 c.resizeGrid(true);assert.equal(c.n,327);
 assert(events.every(([name])=>name==='GRID_RESIZE'));
});
test('grid-size hold explains all three gestures in each supported language',()=>{
 for(const lang of ['en','he','ru','nl']){const [title,copy]=getEvolutionExplanation('gridSize',lang);assert(title.length>0);assert(copy.length>30&&copy.length<180);}
});
