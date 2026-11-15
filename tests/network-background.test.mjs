import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_NETWORK_PREFERENCES,INITIAL_NETWORK_RULES,validateNetworkRules,createNetworkState,restoreNetworkState,runNetworkGeneration} from '../js/simulations/network.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const palette=['#ffffff','#000000','#777777','#ff9933'];
const make=()=>Array.from({length:81},(_,i)=>({k:i<6?i%2:2,v:i<6?i%2:2,isGold:false}));
const step=(board,state,mode='auto',pal=palette,growth=0)=>runNetworkGeneration({n:9,currentBoardState:board,currentPalette:pal,originalPalette:palette,networkRules:{...INITIAL_NETWORK_RULES,growth,backgroundMode:mode}},state);
test('Network background choices distinguish majority, first rank and darkest luminance',()=>{
 for(const [mode,index] of [['auto',2],['first',0],['luminance',1]]){const board=make(),before=structuredClone(board),state=createNetworkState(9);step(board,state,mode);assert.equal(state.background,index);assert.deepEqual(board,before);assert.doesNotThrow(()=>restoreNetworkState(JSON.parse(JSON.stringify(state))));}
 const board=make();board.forEach((t,i)=>{if(i<70){t.k=1;t.isGold=true;}});const state=createNetworkState(9);step(board,state);assert.equal(state.background,2,'gold does not vote for the computed background');
});
test('forced first follows sorting while luminance and calculated retain their colors',()=>{
 const sorted=[palette[1],palette[2],palette[3],palette[0]];
 for(const mode of ['auto','first','luminance']){const board=make(),state=createNetworkState(9);step(board,state,mode);const oldColor=palette[state.background];board.forEach(t=>{t.k=t.v=sorted.indexOf(palette[t.k]);});step(board,state,mode,sorted);assert.equal(sorted[state.background],mode==='first'?sorted[0]:oldColor);}
});
test('calculated background stays fixed until reselected, then recomputes',()=>{
 const board=make(),state=createNetworkState(9);step(board,state);board.forEach(t=>t.k=t.v=3);step(board,state);assert.equal(state.background,2);step(board,state,'first');assert.equal(state.background,0);step(board,state,'auto');assert.equal(state.background,3);assert(!Object.hasOwn(state,'backgroundMode'));
});
test('background rules preserve legacy defaults and profile/snapshot validation',()=>{
 assert.deepEqual(validateNetworkRules({backgroundMode:'auto'}),INITIAL_NETWORK_RULES);
 for(const mode of ['first','luminance']){const settings=defaultWorkspaceSettings();settings.rules.network={...INITIAL_NETWORK_RULES,backgroundMode:mode};assert.equal((deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.network??DEFAULT_NETWORK_PREFERENCES).backgroundMode,mode);}
 for(const bad of ['darkest',null,3]){assert.throws(()=>validateNetworkRules({backgroundMode:bad}));assert.throws(()=>restoreNetworkState({...createNetworkState(9),backgroundMode:bad}));}
});
test('forced background checkpoints continue exactly through painting and sorting',()=>{
 for(const mode of ['first','luminance']){
  const board=make(),state=createNetworkState(9);for(let f=0;f<20;f++)step(board,state,mode,palette,65);const saved=JSON.parse(JSON.stringify({board,state}));
  const advance=(board,state)=>{let pal=palette;for(let f=0;f<30;f++){if(f===4)board[40].k=board[40].v=3;if(f===10){pal=[...palette].reverse();board.forEach(t=>t.k=t.v=pal.indexOf(palette[t.k]));}step(board,state,mode,pal,65);}return {board,state};};
  assert.deepEqual(advance(board,state),advance(saved.board,restoreNetworkState(saved.state)));
 }
});

test('new Network defaults use Spatial and luminance, while legacy calculated rules remain calculated',()=>{
 assert.equal(DEFAULT_NETWORK_PREFERENCES.backgroundMode,'luminance');assert.equal(DEFAULT_NETWORK_PREFERENCES.mode,'spatial');assert.deepEqual(validateNetworkRules(INITIAL_NETWORK_RULES),INITIAL_NETWORK_RULES);
 const settings=defaultWorkspaceSettings();settings.rules.network={...INITIAL_NETWORK_RULES};const imported=deserializeWorkspaceSettings(serializeWorkspaceSettings(settings));assert.deepEqual(imported.rules.network,INITIAL_NETWORK_RULES);
 assert(!Object.hasOwn(defaultWorkspaceSettings().rules,'network'),'V1 factory baseline is unchanged');
});
