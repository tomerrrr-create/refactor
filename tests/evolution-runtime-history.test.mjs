import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {createCracksState,runCracksGeneration} from '../js/simulations/cracks.js';
import {createCymaticsState,runCymaticsGeneration} from '../js/simulations/cymatics.js';
import {INITIAL_CYMATICS_RULES} from '../js/cymatics-settings.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8'),context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('      function areStatesEqual('),source.indexOf('      function applyState(')),context);
const board=()=>Array.from({length:25},()=>({k:1,v:1,isGold:false}));
const snapshot=(tiles,extra)=>({n:5,activePaletteIndex:0,separatorPx:0,tiles,...extra});
test('blocked Cracks steps still own history because tips, generation and PRNG are part of the artwork runtime',()=>{
 const tiles=board(),state=createCracksState(5,12345),r=runCracksGeneration({n:5,currentBoardState:tiles,currentPalette:['#000000','#ffffff'],cracksBrush:{color:'#ffffff',rainbow:false},contourRules:{}},state);
 assert.deepEqual(r.nextBoardState,tiles);assert.notDeepEqual(r.nextCracksState,state);
 assert.equal(context.areStatesEqual(snapshot(tiles,{contourState:{rules:{lineColor:'brush'},cracksState:state}}),snapshot(r.nextBoardState,{contourState:{rules:{lineColor:'brush'},cracksState:r.nextCracksState}})),false,'a no-pixel Cracks generation must not disappear from Undo');
});
test('stable Resonance steps likewise retain their deterministic runtime in history',()=>{
 const tiles=board(),state=createCymaticsState(5),r=runCymaticsGeneration({n:5,currentBoardState:tiles,currentPalette:['#000000','#ffffff'],cymaticsRules:INITIAL_CYMATICS_RULES},state);
 assert.deepEqual(r.nextBoardState,tiles);assert.equal(context.areStatesEqual(snapshot(tiles,{cymaticsState:{rules:INITIAL_CYMATICS_RULES,state}}),snapshot(r.nextBoardState,{cymaticsState:{rules:INITIAL_CYMATICS_RULES,state:r.nextCymaticsState}})),false);
});
