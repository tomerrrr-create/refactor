import test from 'node:test';
import assert from 'node:assert/strict';
import {MAGNET_CYCLE,MAGNET_METHODS,isCombinedMagnetMode,magnetEngineMethod} from '../js/magnet-modes.js';
import {runMagnetGeneration,resetMagnetCaches} from '../js/simulations/magnet.js';
import {recordedMagnetAnchorLimit,recordedMagnetCombinedField,magnetRecordingRules} from '../js/magnet-anchor-limit.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
test('four toolbar choices and six settings types preserve the old method IDs',()=>{
 assert.deepEqual(MAGNET_CYCLE,['off','field_magnet','field_cosmic_magnet','magnet','cosmic_magnet']);
 assert.deepEqual(MAGNET_METHODS.slice(4),['time_magnet','expand']);
 for(const method of MAGNET_METHODS){
  const settings=defaultWorkspaceSettings();settings.rules.magnet.method=method;
  assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.magnet.method,method);
 }
 assert.equal(recordedMagnetAnchorLimit({method:'magnet'}),300);
 assert(!recordedMagnetCombinedField({method:'magnet'}));
});
test('new combined identities reproduce the corresponding legacy combined engine exactly',()=>{
 const native=Math.random,palette=Array.from({length:64},(_,k)=>'#'+(k*221991).toString(16).padStart(6,'0'));
 try{for(const method of MAGNET_CYCLE.slice(1,3)){
  const run=legacy=>{
   resetMagnetCaches();Math.random=()=>.25;
   const n=31,board=Array.from({length:n*n},(_,i)=>({k:i%11===0?0:i%64,v:i%64,isGold:i%139===0,id:i}));
   const rules=legacy?{method:magnetEngineMethod(method),anchorColorIndex:0,fieldModel:'combined-v1'}:{method,anchorColorIndex:0};
   for(let f=0;f<8;f++)runMagnetGeneration({n,currentBoardState:board,currentPalette:palette,magnetRules:rules,anchorLimit:legacy?300:2000});
   return board;
  };
  assert.deepEqual(run(false),run(true));assert(isCombinedMagnetMode(method));
  assert(recordedMagnetCombinedField(magnetRecordingRules({method},600,true)));
 }}finally{Math.random=native;resetMagnetCaches();}
});
