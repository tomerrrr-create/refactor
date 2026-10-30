import test from 'node:test';
import assert from 'node:assert/strict';
import {sortColorsArray,SORT_MODES,getLuminance} from '../js/colors.js';
import {createCracksState,getCracksLineIndex,runCracksGeneration,queueCracksGrowth,prepareCracksResume} from '../js/simulations/cracks.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const originalPalette=['#D8AD78','#F4B8D0','#200D19','#FFFFFF'];
test('original anchor follows luminance index zero across every sort while darkest stays current index zero',()=>{
 const anchor=sortColorsArray(originalPalette,'luminance')[0];
 for(const {method} of SORT_MODES){const currentPalette=sortColorsArray(originalPalette,method);const ctx={originalPalette,currentPalette,contourRules:{lineColor:'original-anchor'}};
  assert.equal(currentPalette[getCracksLineIndex(ctx)],anchor,method);
  assert.equal(getCracksLineIndex({...ctx,contourRules:{lineColor:'darkest'}}),0);
  assert.equal(getCracksLineIndex({...ctx,contourRules:{lineColor:'lightest'}}),currentPalette.length-1);
 }
});
test('equal-luminance colors retain the original stable sort tie-break after reordering',()=>{
 const originalPalette=['#001119','#010c25','#ffffff'];assert.equal(getLuminance(originalPalette[0]),getLuminance(originalPalette[1]));
 const currentPalette=[...originalPalette].reverse();assert.equal(getCracksLineIndex({originalPalette,currentPalette,contourRules:{lineColor:'original-anchor'}}),2);
});
test('growth, collision checks, painted nuclei and exhausted resume use the same anchored color',()=>{
 const n=21,currentPalette=sortColorsArray(originalPalette,'reversed'),line=currentPalette.indexOf('#200D19');assert.notEqual(line,0);
 let ctx={n,originalPalette,currentPalette,contourRules:{lineColor:'original-anchor',material:{enabled:false,strength:40}},currentBoardState:Array.from({length:n*n},()=>({k:1,v:1,isGold:false}))};
 ctx.currentBoardState[0]={k:line,v:line,isGold:false};ctx.currentBoardState[1].isGold=true;
 const state=createCracksState(n),queued=queueCracksGrowth(ctx,state,[{i:0,k:line},{i:1,k:1},{i:220,k:1}]);assert.equal(queued.pendingSeed,220);
 for(let i=0,run=queued;i<20;i++){const r=runCracksGeneration(ctx,run);ctx={...ctx,currentBoardState:r.nextBoardState};run=r.nextCracksState;}
 assert(ctx.currentBoardState.some((t,i)=>i>1&&t.k===line));assert(ctx.currentBoardState.every(t=>t.k===1||t.k===line));assert(ctx.currentBoardState[1].isGold);
 const stopped={...state,steps:500,roots:3};assert.notEqual(prepareCracksResume(ctx,stopped).pendingSeed,null);
 const blocked={...ctx,currentBoardState:Array.from({length:n*n},()=>({k:line,v:line,isGold:false}))};assert.strictEqual(prepareCracksResume(blocked,stopped),stopped);assert.equal(queueCracksGrowth(blocked,state,[{i:220,k:line}]).pendingSeed,null);
});
test('anchor persists in settings files without changing the default line color',()=>{
 const settings=defaultWorkspaceSettings();assert.equal(settings.rules.contour.lineColor,'darkest');settings.rules.contour.lineColor='original-anchor';assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
});
