import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('Wind locks all panel buttons except palette and sorting, and restores previous inert states',()=>{
 const palette={inert:false},sort={inert:false},undo={inert:false},save={inert:false},old={inert:true};
 const locks=new Map(),c=vm.createContext({windControlLocks:locks,dom:{btnPalette:palette,btnCycleSort:sort,controlsContainer:{querySelectorAll:()=>[palette,sort,undo,save,old]}}});
 vm.runInContext(source.slice(source.indexOf('function updateWindControls('),source.indexOf('function commitWindPainting(')),c);
 c.updateWindControls(true);assert.equal(palette.inert,false);assert.equal(sort.inert,false);assert(undo.inert&&save.inert&&old.inert);
 c.updateWindControls(false);assert.equal(undo.inert,false);assert.equal(save.inert,false);assert.equal(old.inert,true);assert.equal(locks.size,0);
});
test('palette and sort wrappers commit Wind first and preserve ordinary actions and arguments outside Wind',()=>{
 const events=[],c=vm.createContext({windMode:true,windPainter:{stop:()=>events.push('commit')}});
 vm.runInContext(source.slice(source.indexOf('function windControlAction('),source.indexOf('function initializeWindMode(')),c);
 const action=c.windControlAction(value=>(events.push(value),42));assert.equal(action('change'),42);assert.deepEqual(events,['commit','change']);
 c.windMode=false;action('ordinary');assert.deepEqual(events,['commit','change','ordinary']);
});
