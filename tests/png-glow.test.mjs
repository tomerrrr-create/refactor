import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');

test('every opening resets PNG Glow to the display preference without changing it',()=>{
 const h=vm.createContext({isSoftBloom:true,isSmoothRendering:false,n:249,separatorPx:0,
  isSmoothDisplayAvailable:()=>true,canvas:{toBlob:cb=>cb({})},URL:{createObjectURL:()=> 'blob:preview'},
  C:{PALETTES:[{name:'Palette'}]},activePaletteIndex:0,getText:()=>'',
  dom:{btnSave:{},imagePreview:{},fileNameInput:{},saveSmoothImage:{},saveGlowImage:{checked:false},saveModal:{classList:{add(){}}}},
  document:{getElementById:()=>({open:true})},modals:{clearSaveStatus(){}}});
 vm.runInContext(source.slice(source.indexOf('      function openSaveModalWithPreview()'),source.indexOf('      function getSanitizedFileName(')),h);
 h.openSaveModalWithPreview();assert.equal(h.dom.saveGlowImage.checked,true);
 h.dom.saveGlowImage.checked=false;h.openSaveModalWithPreview();assert.equal(h.dom.saveGlowImage.checked,true);
 h.isSoftBloom=false;h.dom.saveGlowImage.checked=true;h.openSaveModalWithPreview();
 assert.equal(h.dom.saveGlowImage.checked,false);assert.equal(h.isSoftBloom,false);
});

for(const display of [false,true])for(const save of [false,true])test(`PNG Glow override ${save} is independent of display ${display}`,async()=>{
 const calls=[],exports=[];
 const offscreen={getContext:()=>({fillRect(){},save(){},translate(){},restore(){}}),toBlob:cb=>cb({})};
 const h=vm.createContext({isSoftBloom:display,softBloomIntensity:73,canvas:{clientWidth:720},
  dom:{saveSmoothImage:{checked:false},saveGlowImage:{checked:save},btnSaveImage:{innerHTML:'icon'}},
  document:{createElement:()=>offscreen},setTimeout:fn=>fn(),getRenderedSeparatorWidth:()=>0,
  renderBoard(){},compositeSoftBloom:(ctx,image,options)=>{calls.push({image,options});},
  navigator:{},File:class{},getSanitizedFileName:()=> 'test.png',triggerDownload:file=>exports.push(file),modals:{closeModal(){}}});
 const start=source.indexOf('async function shareOrDownloadImage()');
 vm.runInContext(source.slice(start,source.indexOf('async function handleSaveProject()',start)),h);
 await h.shareOrDownloadImage();
 assert.equal(offscreen.width,4096);assert.equal(offscreen.height,4096);assert.equal(exports.length,1);
 assert.equal(calls.length,save?1:0);
 if(save){assert.equal(calls[0].image,offscreen);assert.equal(calls[0].options.intensity,73);
  assert.equal(calls[0].options.sourceX,41);assert.equal(calls[0].options.sourceY,41);
  assert.equal(calls[0].options.width,4014);assert.equal(calls[0].options.height,4014);}
 assert.equal(h.isSoftBloom,display);assert.equal(h.softBloomIntensity,73);
});
