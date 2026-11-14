import test from 'node:test';import assert from 'node:assert/strict';
import {INITIAL_INK_RULES,validateInkRules,createInkState,restoreInkState,validateInkSnapshot,runInkGeneration} from '../js/simulations/ink.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots} from '../js/evolution-drawer-settings.js';
const palette=Array.from({length:64},(_,i)=>'#'+(i*221991).toString(16).padStart(6,'0'));
const boardFor=n=>Array.from({length:n*n},(_,id)=>({id,k:((id%n-n*.4)**2+(Math.floor(id/n)-n*.5)**2<n*n*.055)?40+(id%24):0,v:id/7,prevK:id%9,isGold:id%211===0}));
function step(board,state,rules=INITIAL_INK_RULES){return runInkGeneration({n:state.n,currentBoardState:board,currentPalette:palette,inkRules:rules},state);}
test('ink validates bounded versioned checkpoint state and rules',()=>{
 assert.deepEqual(validateInkRules(),INITIAL_INK_RULES);
 for(const value of [{flow:101},{flow:NaN},{swirl:'40'},{unknown:5}])assert.throws(()=>validateInkRules(value));
 for(const n of [1,2,31,327]){const state=createInkState(n);assert.deepEqual(restoreInkState(JSON.parse(JSON.stringify(state))),state);assert.doesNotThrow(()=>validateInkSnapshot({inkVersion:1,rules:INITIAL_INK_RULES,state}));}
 const state=createInkState(9);for(const bad of [{...state,inkVersion:2},{...state,n:328},{...state,frame:-1},{...state,vx:[NaN]},{...state,density:Array(81).fill(2)}])assert.throws(()=>restoreInkState(bad));
});
test('ink moves the input pigments, retains all metadata and gold, and never invents colors',()=>{
 const n=61,board=boardFor(n),original=[...board],state=createInkState(n);
 for(let frame=0;frame<120;frame++)assert.equal(step(board,state).nextBoardState,board);
 assert.notDeepEqual(board.map(t=>t.id),original.map(t=>t.id));assert.deepEqual([...board].sort((a,b)=>a.id-b.id),original);
 for(let i=0;i<board.length;i++)if(original[i].isGold)assert.equal(board[i],original[i]);
 assert.equal(state.frame,120);assert(state.vx.some(v=>v!==0));
});
test('cold checkpoint restoration, live painting and palette remaps reproduce exactly',()=>{
 const n=31,board=boardFor(n),state=createInkState(n);for(let i=0;i<45;i++)step(board,state);
 const checkpoint=JSON.parse(JSON.stringify({board,state}));
 const advance=(board,state)=>{for(let f=0;f<60;f++){if(f===5)board[47].k=63;if(f===15)board.forEach(t=>t.k=63-t.k);step(board,state);}return {board,state};};
 const a=advance(board,state);step(boardFor(7),createInkState(7));const b=advance(checkpoint.board,restoreInkState(checkpoint.state));assert.deepEqual(a,b);
});
test('sort ordering changes motion, rather than merely changing the displayed color labels',()=>{
 const n=41,normal=boardFor(n),reversed=structuredClone(normal);reversed.forEach(t=>t.k=63-t.k);
 const a=createInkState(n),b=createInkState(n);for(let f=0;f<100;f++){step(normal,a);step(reversed,b);}
 assert.notDeepEqual(normal.map(t=>t.id),reversed.map(t=>t.id));
});
test('zero Flow, uniform boards, tiny boards and fully protected artwork remain safe',()=>{
 for(const n of [1,2,9]){const board=boardFor(n),before=structuredClone(board),state=createInkState(n);for(let f=0;f<30;f++)step(board,state,{...INITIAL_INK_RULES,flow:0});assert.deepEqual(board,before);}
 const board=boardFor(31);board.forEach(t=>t.isGold=true);const before=structuredClone(board);const state=createInkState(31);for(let f=0;f<40;f++)step(board,state);assert.deepEqual(board,before);
});
test('optional Ink preferences preserve the old V1 baseline and old drawer positions',()=>{
 const settings=defaultWorkspaceSettings();assert(!Object.hasOwn(settings.rules,'ink'));const text=serializeWorkspaceSettings(settings);assert.deepEqual(deserializeWorkspaceSettings(text),settings);
 settings.rules.ink={flow:80,swirl:20,viscosity:70};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.ink,settings.rules.ink);
 const old=[...DEFAULT_EVOLUTION_LAYOUT];old[15]=null;const migrated=validateEvolutionSlots(old);for(let i=0;i<old.length;i++)if(old[i]!==null)assert.equal(migrated[i],old[i]);assert.equal(migrated[15],'ink');assert.equal(old[15],null);
});
