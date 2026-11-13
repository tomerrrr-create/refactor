import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_MAGNET_ANCHOR_LIMIT, MAGNET_ANCHOR_LIMITS, validateMagnetAnchorLimit, recordedMagnetAnchorLimit, magnetRecordingRules} from '../js/magnet-anchor-limit.js';
import {runMagnetGeneration,resetMagnetCaches} from '../js/simulations/magnet.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings} from '../js/workspace-settings.js';

test('five supported limits, legacy 300 and explicit validation',()=>{
 assert.equal(DEFAULT_MAGNET_ANCHOR_LIMIT,300);assert.deepEqual(MAGNET_ANCHOR_LIMITS,[300,600,1000,1500,2000]);
 assert.equal(recordedMagnetAnchorLimit({}),300);
 for(const limit of MAGNET_ANCHOR_LIMITS){assert.equal(validateMagnetAnchorLimit(limit),limit);assert.equal(recordedMagnetAnchorLimit({anchorLimit:limit}),limit);}
 for(const value of [null,0,-300,301,Infinity,NaN,'600',[],{},999999])assert.throws(()=>recordedMagnetAnchorLimit({anchorLimit:value}));
});
test('recorded limit is independent of profile preferences; default rules stay unchanged',()=>{
 const settings=defaultWorkspaceSettings(),before=serializeWorkspaceSettings(settings),rules=settings.rules.magnet;
 for(const limit of MAGNET_ANCHOR_LIMITS){const recording=magnetRecordingRules(rules,limit);assert.equal(recordedMagnetAnchorLimit(recording),limit);assert.equal(serializeWorkspaceSettings(settings),before);assert.equal(Object.hasOwn(rules,'anchorLimit'),false);}
 assert.deepEqual(magnetRecordingRules(rules,300),rules);
 assert.deepEqual(magnetRecordingRules({...rules,anchorLimit:2000},300),rules,'stale injected rule is stripped');
});
test('runtime override matches explicit recorded rules in all modes, without mutating profile rules',()=>{
 const native=Math.random;try{for(const method of ['magnet','cosmic_magnet','time_magnet','expand'])for(const limit of MAGNET_ANCHOR_LIMITS){
  const rules={method,anchorColorIndex:0},n=61,palette=Array.from({length:23},(_,i)=>'#'+(i*6511).toString(16).padStart(6,'0'));
  const initial=Array.from({length:n*n},(_,i)=>({k:i%5===0?0:1+i%22,v:i%5===0?0:1+i%22,isGold:i%173===0}));
  const run=recorded=>{resetMagnetCaches();let seed=19;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const board=structuredClone(initial);for(let i=0;i<8;i++)runMagnetGeneration({n,currentBoardState:board,currentPalette:palette,magnetRules:recorded?{...rules,anchorLimit:limit}:rules,...(recorded?{}:{anchorLimit:limit})});return board;};
  assert.deepEqual(run(false),run(true));assert.equal(Object.hasOwn(rules,'anchorLimit'),false);
 }}finally{Math.random=native;}
});
