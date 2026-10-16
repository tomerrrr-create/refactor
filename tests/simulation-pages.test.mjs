import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationPages} from '../js/simulation-pages.js';
function element(){return {dataset:{},hidden:false,disabled:false,attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},toggleAttribute(k,on){if(on)this.attrs.set(k,'');else this.attrs.delete(k);},animate(){return {finished:Promise.resolve()};}};}
function harness(reducedMotion=true){
 const nodes=Array.from({length:12},element),arrow=element(),dots=[element(),element()],button=element();
 button.querySelector=()=>arrow;button.querySelectorAll=()=>dots;button.addEventListener=(_,fn)=>button.click=fn;
 let selected=null,running=false;const document={activeElement:null},container={dataset:{},ownerDocument:document};
 button.focus=()=>document.activeElement=button;
 const pager=createSimulationPages({container,button,pages:[nodes.slice(0,6).map((el,i)=>['sim'+i,el]),nodes.slice(6).map((el,i)=>['sim'+(i+6),el])],getSelected:()=>selected,isRunning:()=>running,getText:k=>k,reducedMotion:()=>reducedMotion});
 return {nodes,button,container,pager,run:value=>{running=value;pager.refresh();},select:value=>{selected=value;pager.refresh();}};
}
test('six existing nodes per page, stable slots and untouched simulation/button state',async()=>{
 const h=harness();h.nodes[0].disabled=true;
 assert.equal(h.nodes.filter(n=>!n.hidden).length,6);assert.deepEqual(h.nodes.map(n=>n.dataset.simSlot),['0','1','2','3','4','5','0','1','2','3','4','5']);
 await h.button.click();assert.equal(h.pager.page,1);assert(h.nodes.slice(0,6).every(n=>n.hidden));assert(h.nodes.slice(6).every(n=>!n.hidden));assert.equal(h.nodes[0].disabled,true);
 await h.button.click();assert.equal(h.pager.page,0);assert.equal(h.nodes[0].disabled,true);
});
test('other-page selection indicator follows navigation and refresh without moving selection',async()=>{
 const h=harness();h.select('sim2');assert(!h.button.attrs.has('data-active-elsewhere'));
 await h.button.click();assert(!h.button.attrs.has('data-active-elsewhere'));
 h.run(true);assert(h.button.attrs.has('data-active-elsewhere'));assert(h.button.title.includes('sim_page_active_elsewhere'));
 h.run(false);assert(!h.button.attrs.has('data-active-elsewhere'));assert(!h.button.title.includes('sim_page_active_elsewhere'));
 h.run(true);assert(h.button.attrs.has('data-active-elsewhere'));
 h.select('sim9');assert(!h.button.attrs.has('data-active-elsewhere'));h.select(null);assert(!h.button.attrs.has('data-active-elsewhere'));
 h.pager.reset();assert.equal(h.pager.page,0);
});
test('rapid clicks cannot overlap animations and reduced motion supports keyboard focus recovery',async()=>{
 const h=harness(false);await Promise.all([h.button.click(),h.button.click()]);assert.equal(h.pager.page,1);assert(!h.button.attrs.has('aria-busy'));
 const reduced=harness();reduced.container.ownerDocument.activeElement=reduced.nodes[0];await reduced.button.click();assert.equal(reduced.container.ownerDocument.activeElement,reduced.button);
});

test('reordering moves existing buttons and the running indicator without changing disabled state',async()=>{
 const h=harness();const order=h.pager.getLayout();h.select('sim0');h.run(true);h.nodes[0].disabled=true;
 [order[0],order[11]]=[order[11],order[0]];
 assert(h.pager.setLayout(order));assert.deepEqual(h.pager.getLayout(),order);
 assert.equal(h.nodes[0].dataset.simPage,'1');assert.equal(h.nodes[0].dataset.simSlot,'5');assert.equal(h.nodes[0].disabled,true);
 assert(h.nodes[0].hidden);assert(h.button.attrs.has('data-active-elsewhere'));
 await h.button.click();assert(!h.nodes[0].hidden);assert(!h.button.attrs.has('data-active-elsewhere'));
 const invalid=[...order];invalid[0]=invalid[1];assert.equal(h.pager.setLayout(invalid),false);assert.deepEqual(h.pager.getLayout(),order);
});

test('reordering is rejected during a page transition',async()=>{
 const h=harness(false),order=h.pager.getLayout();const transition=h.button.click();
 assert(h.pager.isChanging);assert.equal(h.pager.setLayout([...order].reverse()),false);
 await transition;assert.deepEqual(h.pager.getLayout(),order);
});
