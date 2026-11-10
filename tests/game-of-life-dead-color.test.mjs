import test from 'node:test';
import assert from 'node:assert/strict';
import {runGameOfLifeGeneration,gameOfLifeDeadIndex} from '../js/simulations/game_of_life.js';
import {sortColorsArray,SORT_MODES,getLuminance,getGeneticColor,findClosestColorIndex} from '../js/colors.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';
import {validateProfileSnapshot} from '../js/profile-state.js';
const original=['#ffffff','#000000','#204080','#d04020','#608040'];
const context=(palette,genetics,deadColor)=>({n:3,currentPalette:palette,originalPalette:original,
 currentBoardState:Array.from({length:9},()=>({k:0,v:0,isGold:false})),
 gameOfLifeRules:{survival:[2,3],birth:[3],genetics,...(deadColor?{deadColor}:{})}});

test('default current-sort option leaves the legacy engine behavior unchanged in both genetics modes',()=>{
 for(const {method} of SORT_MODES)for(const genetics of ['rgb','palette-order']){
  const p=sortColorsArray(original,method),c=context(p,genetics);c.currentBoardState.forEach((t,i)=>{t.k=t.v=i%p.length;t.isGold=i===6;});
  assert.equal(gameOfLifeDeadIndex(p,c.gameOfLifeRules,original),0);
  assert.deepEqual(runGameOfLifeGeneration(c),runGameOfLifeGeneration({...c,gameOfLifeRules:{...c.gameOfLifeRules,deadColor:'current'}}));
 }
});
test('Luminance anchor follows the same color through every active sort, in RGB and palette genetics',()=>{
 for(const {method} of SORT_MODES)for(const genetics of ['rgb','palette-order']){
  const p=sortColorsArray(original,method),c=context(p,genetics,'luminance'),dead=p.indexOf('#000000');
  assert.equal(gameOfLifeDeadIndex(p,c.gameOfLifeRules,original),dead,method);
  c.currentBoardState.forEach(t=>{t.k=t.v=dead;});
  const parent=p.indexOf('#204080');[0,1,2].forEach(i=>{c.currentBoardState[i].k=c.currentBoardState[i].v=parent;});
  const next=runGameOfLifeGeneration(c);assert.equal(next[4].k,parent,method+' newborn');
  c.gameOfLifeRules={...c.gameOfLifeRules,survival:[],birth:[]};
  assert(next.length===9);assert(runGameOfLifeGeneration(c).every(t=>t.k===dead&&t.v===dead),method+' death color');
 }
});
test('rank zero is alive when a different palette entry is the Luminance dead color; gold stays protected',()=>{
 const p=['#ffffff','#204080','#000000'],c=context(p,'palette-order','luminance');
 c.currentBoardState.forEach(t=>{t.k=t.v=2;});[0,1,2].forEach(i=>{c.currentBoardState[i].k=c.currentBoardState[i].v=0;});
 c.currentBoardState[8]={k:2,v:2,isGold:true};const next=runGameOfLifeGeneration(c);
 assert.equal(next[4].k,0);assert.equal(next[4].v,0);assert.deepEqual(next[8],c.currentBoardState[8]);
});
test('palette-order births avoid a dead anchor in the middle or at the last rank, including B0',()=>{
 for(const p of [['#ffffff','#000000','#204080'],['#ffffff','#204080','#000000']]){
  const c=context(p,'palette-order','luminance'),dead=p.indexOf('#000000');c.currentBoardState.forEach(t=>{t.k=t.v=dead;});
  c.gameOfLifeRules.birth=[0];assert.notEqual(runGameOfLifeGeneration(c)[4].k,dead);
 }
 const c=context(['#000000'],'palette-order','luminance');c.gameOfLifeRules.birth=[0];assert.equal(runGameOfLifeGeneration(c)[4].k,0);
});
test('RGB inheritance still uses the same nearest-palette-color calculation',()=>{
 const p=['#ffffff','#000000','#000040','#400000'],c=context(p,'rgb','luminance');c.currentBoardState.forEach(t=>{t.k=t.v=1;});
 [2,2,3].forEach((k,i)=>{c.currentBoardState[i].k=c.currentBoardState[i].v=k;});
 const expected=findClosestColorIndex(getGeneticColor([p[2],p[2],p[3]],'average'),p);
 assert.equal(runGameOfLifeGeneration(c)[4].k,expected);
});
test('equal-luminance ties follow original palette order, and palette changes resolve a new anchor',()=>{
 // Distinct colors with exactly equal weighted luminance squared.
 let pair;
 const seen=new Map();
 outer:for(let r=0;r<24;r++)for(let g=0;g<24;g++)for(let b=0;b<24;b++){
  const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''),score=getLuminance(hex);
  if(seen.has(score)){pair=[seen.get(score),hex];break outer;}seen.set(score,hex);
 }
 assert(pair,'fixture contains an exact equal-luminance pair');
 {const p=[pair[1],pair[0],'#ffffff'];assert.equal(gameOfLifeDeadIndex(p,{deadColor:'luminance'},[pair[0],pair[1],'#ffffff']),1);}
 assert.equal(gameOfLifeDeadIndex(['#999999','#ffffff','#222222'],{deadColor:'luminance'}),2);
});
test('new preference round-trips separately from presets and defaults to current for legacy settings',()=>{
 const old=defaultWorkspaceSettings();assert.equal(old.gameOfLifeDeadColor,undefined);
 for(const mode of ['current','luminance']){
  const settings={...old,gameOfLifeDeadColor:mode};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
  assert.deepEqual(settings.cycles,old.cycles);assert.equal(validateProfileSnapshot({settings}).settings.gameOfLifeDeadColor,mode);
 }
 assert.throws(()=>validateWorkspaceSettings({...old,gameOfLifeDeadColor:'unknown'}));
});
