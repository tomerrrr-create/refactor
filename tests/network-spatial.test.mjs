import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetworkState,restoreNetworkState,validateNetworkRules,runNetworkGeneration} from '../js/simulations/network.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const palette=Array.from({length:64},(_,i)=>'#'+(i*221991).toString(16).padStart(6,'0'));
const rules={growth:80,branching:60,persistence:75,backgroundMode:'first',mode:'spatial'};
function scene(n){return Array.from({length:n*n},(_,i)=>{const x=i%n,y=Math.floor(i/n);let k=0;for(const [cx,cy,color,radius] of [[.2,.2,3,2],[.75,.25,49,3],[.3,.75,32,2],[.8,.8,60,4]])if((x-cx*n)**2+(y-cy*n)**2<radius**2)k=color;return {k,v:k,isGold:i===0};});}
const step=(board,state,pal=palette,preferences=rules)=>runNetworkGeneration({n:state.n,currentBoardState:board,currentPalette:pal,originalPalette:palette,networkRules:preferences},state);
function normalized(board,state,pal){return {pixels:board.map(t=>pal[t.k]),background:pal[state.background],agents:state.agents.map(a=>({...a,k:pal[a.k]})),sources:state.sources.map(s=>s.map((v,i)=>i===3?pal[v]:v)),trails:state.trails.map(t=>t.map((v,i)=>i===1||i===2?pal[v]:v)),frame:state.frame,nextId:state.nextId};}
test('Spatial growth is invariant to initial palette sorting and mid-run sorting',()=>{
 const n=61,a=scene(n),b=structuredClone(a),sa=createNetworkState(n),sb=createNetworkState(n);
 let pal=[...palette].reverse();b.forEach(t=>{t.k=t.v=63-t.k;});
 for(let f=0;f<180;f++){
  if(f===65){const previous=pal;pal=palette.map((_,i)=>palette[(i*17)%64]);b.forEach(t=>{t.k=t.v=pal.indexOf(previous[t.k]);});}
  step(a,sa);step(b,sb,pal);
  assert.deepEqual(normalized(a,sa,palette),normalized(b,sb,pal),'same visible growth at frame '+f);
 }
 assert(sa.trails.length>80,'the invariant result contains real growth');assert(a[0].isGold);
});
test('Spatial cold continuation and live mode changes preserve bounded state and rules',()=>{
 const n=41,board=scene(n),state=createNetworkState(n);for(let f=0;f<40;f++)step(board,state);
 const saved=JSON.parse(JSON.stringify({board,state}));assert.equal(saved.state.mode,'spatial');
 const advance=(board,state)=>{for(let f=0;f<70;f++){if(f===5)board[20*n+20]={k:63,v:63};step(board,state,palette,f<25?rules:f<45?{...rules,mode:'palette'}:rules);}return normalized(board,state,palette);};
 const expected=advance(board,state);step(scene(7),createNetworkState(7));assert.deepEqual(advance(saved.board,restoreNetworkState(saved.state)),expected);
 assert(state.agents.length<=128&&state.sources.length<=96&&state.trails.length<=12000);
});
test('Spatial preference round-trips; missing mode keeps the original palette engine',()=>{
 const settings=defaultWorkspaceSettings();settings.rules.network=rules;
 assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.network.mode,'spatial');
 assert(!Object.hasOwn(validateNetworkRules({mode:'palette'}),'mode'));
 assert(!Object.hasOwn(validateNetworkRules(),'mode'));
 assert.throws(()=>validateNetworkRules({mode:'other'}));assert.throws(()=>restoreNetworkState({...createNetworkState(9),mode:'other'}));
});
test('duplicate palette colors do not change Spatial patches or connections when sorted',()=>{
 const pal=[...palette];pal[7]=pal[0];pal[8]=pal[3];
 const n=41,a=scene(n),b=structuredClone(a),sa=createNetworkState(n),sb=createNetworkState(n);
 for(let i=0;i<a.length;i++)if(a[i].k===0&&i%2===0)a[i].k=a[i].v=b[i].k=b[i].v=7;
 const reversed=[...pal].reverse();b.forEach(t=>{t.k=t.v=63-t.k;});
 for(let f=0;f<100;f++){step(a,sa,pal);step(b,sb,reversed);assert.deepEqual(normalized(a,sa,pal),normalized(b,sb,reversed));}
});
