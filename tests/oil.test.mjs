import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_OIL_RULES,validateOilRules,createOilState,restoreOilState,validateOilSnapshot,runOilGeneration} from '../js/simulations/oil.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots} from '../js/evolution-drawer-settings.js';
const palette=Array(64).fill('#111111');
const boardFor=n=>Array.from({length:n*n},(_,id)=>({id,k:(id*13+Math.floor(id/n)*7)%64,v:id/3,prevK:id%5,isGold:id%251===0}));
const step=(board,state,rules=INITIAL_OIL_RULES)=>runOilGeneration({n:state.n,currentBoardState:board,currentPalette:palette,oilRules:rules},state);
function boundary(board,n){let e=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=board[y*n+x].k>>4;if(x+1<n)e+=p!==(board[y*n+x+1].k>>4);if(y+1<n)e+=p!==(board[(y+1)*n+x].k>>4);}return e;}
test('Oil validates versioned state and bounded settings',()=>{
 assert.deepEqual(validateOilRules(),INITIAL_OIL_RULES);
 for(const rules of [{tension:101},{drift:-1},{mobility:'20'},{unknown:3}])assert.throws(()=>validateOilRules(rules));
 for(const n of [1,2,61,327])assert.deepEqual(restoreOilState(JSON.parse(JSON.stringify(createOilState(n)))),createOilState(n));
 for(const state of [{oilVersion:2,n:3,frame:0},{oilVersion:1,n:328,frame:0},{oilVersion:1,n:3,frame:NaN}])assert.throws(()=>restoreOilState(state));
 assert.throws(()=>validateOilSnapshot({oilVersion:2}));
});
test('surface tension coarsens the live artwork while preserving pigments, metadata and gold',()=>{
 const n=41,board=boardFor(n),original=[...board],state=createOilState(n),before=boundary(board,n);
 for(let i=0;i<250;i++)step(board,state,{...INITIAL_OIL_RULES,drift:0});
 assert(boundary(board,n)<before*.6,`boundary ${before} -> ${boundary(board,n)}`);
 assert.deepEqual([...board].sort((a,b)=>a.id-b.id),original);
 for(let i=0;i<board.length;i++)if(original[i].isGold)assert.equal(board[i],original[i]);
});
test('cold checkpoints reproduce live drawing, rule and sort changes exactly',()=>{
 const n=31,board=boardFor(n),state=createOilState(n);for(let i=0;i<20;i++)step(board,state);
 const checkpoint=JSON.parse(JSON.stringify({board,state}));
 const advance=(board,state)=>{for(let f=0;f<60;f++){if(f===4)board[101].k=63;if(f===12)board.forEach(t=>t.k=(t.k*17)%64);step(board,state,{tension:75,drift:45,mobility:85});}return {board,state};};
 const a=advance(board,state);step(boardFor(7),createOilState(7));const b=advance(checkpoint.board,restoreOilState(checkpoint.state));assert.deepEqual(a,b);
});
test('sorting changes pigment grouping and motion; zero mobility freezes artwork',()=>{
 const n=31,a=boardFor(n),b=structuredClone(a),sa=createOilState(n),sb=createOilState(n);b.forEach(t=>t.k=(t.k*17)%64);
 for(let f=0;f<45;f++){step(a,sa);step(b,sb);}assert.notDeepEqual(a.map(t=>t.id),b.map(t=>t.id));
 for(const n of [1,2,31]){const board=boardFor(n),before=structuredClone(board),state=createOilState(n);for(let f=0;f<5;f++)step(board,state,{...INITIAL_OIL_RULES,mobility:0});assert.deepEqual(board,before);}
});
test('optional Oil preferences and both generations of old layouts migrate without moving occupants',()=>{
 const settings=defaultWorkspaceSettings();assert(!Object.hasOwn(settings.rules,'oil'));
 settings.rules.oil={tension:90,drift:0,mobility:50};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.oil,settings.rules.oil);
 for(const removeInk of [false,true]){const old=[...DEFAULT_EVOLUTION_LAYOUT];old[19]=null;if(removeInk)old[15]=null;const migrated=validateEvolutionSlots(old);for(let i=0;i<old.length;i++)if(old[i]!==null)assert.equal(migrated[i],old[i]);assert.equal(migrated[19],'oil');}
});
test('optimized neighborhood updates never increase surface energy when buoyancy is zero',()=>{
 const n=11,board=boardFor(n),state=createOilState(n);
 const energy=()=>{let sum=0;for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const i=r*n+c;if(board[i].isGold)continue;const a=board[i].k>>4;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
   const y=r+dy,x=c+dx;if(y<0||y>=n||x<0||x>=n)continue;const j=y*n+x;if(board[j].isGold)continue;
   const b=board[j].k>>4;if(a!==b)sum+=(1+Math.abs(a-b)*.08)*Math.exp(-(dx*dx+dy*dy)/4);
  }
 }return sum/2;};
 let before=energy();const initial=before;
 for(let f=0;f<35;f++){step(board,state,{...INITIAL_OIL_RULES,drift:0});const after=energy();assert(after<=before+1e-7,`${before} -> ${after}`);before=after;}
 assert(before<initial*.7);
});
