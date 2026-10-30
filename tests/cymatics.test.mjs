import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {CYMATICS_PATTERNS,DEFAULT_CYMATICS_RULES,validateCymaticsRules} from '../js/cymatics-settings.js';
import {getCymaticsField,createCymaticsState,restoreCymaticsState,validateCymaticsSnapshot,runCymaticsGeneration} from '../js/simulations/cymatics.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {validateProfileSnapshot} from '../js/profile-state.js';
const fixture=(n=21)=>({n,currentPalette:Array(23).fill('#ffffff'),currentBoardState:Array.from({length:n*n},(_,i)=>({k:(i*17+3)%23,v:(i*17+3)%23,isGold:i===Math.floor(n*n/2)}))});
const histogram=board=>board.reduce((m,t)=>(m[t.k]=(m[t.k]??0)+1,m),{});
function advance(ctx,state,count){for(let i=0;i<count;i++){const r=runCymaticsGeneration(ctx,state);ctx.currentBoardState=r.nextBoardState;state=r.nextCymaticsState;}return {ctx,state};}
test('all four standing-wave fields arrange pigments without creating colors or moving gold',()=>{
 for(const pattern of Object.keys(CYMATICS_PATTERNS)){
  const ctx={...fixture(),cymaticsRules:{pattern,strength:100}},before=structuredClone(ctx.currentBoardState),field=getCymaticsField(ctx.n,pattern),energy=b=>b.reduce((sum,t,i)=>sum+t.k*field[i],0);
  const result=advance(ctx,createCymaticsState(ctx.n),100);assert(energy(result.ctx.currentBoardState)<energy(before));assert.deepEqual(histogram(result.ctx.currentBoardState),histogram(before));assert.deepEqual(result.ctx.currentBoardState[220],before[220]);assert.notDeepEqual(result.ctx.currentBoardState,before);assert.equal(result.state.steps,100);
 }
});
test('runtime is immutable, deterministic and resumes exactly from a JSON project/checkpoint',()=>{
 const ctx={...fixture(),cymaticsRules:{pattern:'bloom',strength:75}},initial=createCymaticsState(21),saved=structuredClone(initial),first=advance(ctx,initial,35);assert.deepEqual(initial,saved);
 const copy=structuredClone(first),uninterrupted=advance(first.ctx,first.state,70),resumed=advance(copy.ctx,restoreCymaticsState(JSON.parse(JSON.stringify(copy.state))),70);assert.deepEqual(resumed,uninterrupted);
});
test('strength controls work, tiny/uniform/gold boards are safe and resized boards get a fresh runtime',()=>{
 const a={...fixture(),cymaticsRules:{pattern:'star',strength:10}},b={...fixture(),cymaticsRules:{pattern:'star',strength:100}};assert.notDeepEqual(advance(a,createCymaticsState(21),1),advance(b,createCymaticsState(21),1));
 for(const n of [1,2,9]){const ctx={...fixture(n),cymaticsRules:DEFAULT_CYMATICS_RULES};ctx.currentBoardState.forEach(t=>{t.k=t.v=3;});const before=structuredClone(ctx.currentBoardState);assert.deepEqual(advance(ctx,createCymaticsState(n),20).ctx.currentBoardState,before);}
 const ctx={...fixture(),cymaticsRules:DEFAULT_CYMATICS_RULES};ctx.currentBoardState.forEach(t=>t.isGold=true);const before=structuredClone(ctx.currentBoardState);assert.deepEqual(advance(ctx,createCymaticsState(21),10).ctx.currentBoardState,before);
 assert.equal(runCymaticsGeneration({...fixture(9),cymaticsRules:DEFAULT_CYMATICS_RULES},createCymaticsState(21)).nextCymaticsState.n,9);
});
test('settings are optional and old V1 baselines remain byte-for-byte unchanged',()=>{
 const legacy=defaultWorkspaceSettings(),text=serializeWorkspaceSettings(legacy);assert(!text.includes('cymatics'));
 const settings=structuredClone(legacy);settings.rules.cymatics={pattern:'lattice',strength:85};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);assert.deepEqual(validateProfileSnapshot({settings}).settings.rules.cymatics,settings.rules.cymatics);assert.deepEqual(deserializeWorkspaceSettings(text),legacy);
 for(const rules of [null,{},[],{pattern:'unknown',strength:60},{pattern:'petals',strength:9},{pattern:'bloom',strength:101},{pattern:'star',strength:NaN},{pattern:'star',strength:20,extra:true}])assert.throws(()=>validateCymaticsRules(rules));
 for(const state of [{...createCymaticsState(21),version:2},{...createCymaticsState(21),random:0},{...createCymaticsState(21),steps:-1},{...createCymaticsState(21),n:0}])assert.throws(()=>restoreCymaticsState(state));
 assert.throws(()=>getCymaticsField(0,'petals'));assert.throws(()=>validateCymaticsSnapshot({cymaticsVersion:2}));
});
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
test('saved Cymatics preferences survive drawing history while project and macro overrides retain their recorded values',()=>{
 const c=vm.createContext({n:21,cymaticsState:createCymaticsState(21),cymaticsRules:{pattern:'star',strength:30},replayCymaticsRules:null,isMacroPlaying:false,isExecutingMacroCommand:false,armedSimulation:'cymatics',createCymaticsState,restoreCymaticsState,validateCymaticsSnapshot,validateCymaticsRules,runCymaticsGeneration});c.armSimulation=sim=>c.armedSimulation=sim;
 vm.runInContext(source.slice(source.indexOf('function getCymaticsRules('),source.indexOf('function getCracksBrush(')),c);
 const snapshot={cymaticsVersion:1,rules:{pattern:'bloom',strength:95},state:createCymaticsState(21)};
 c.restoreCymaticsSnapshot(snapshot,{preservePreferences:true});assert.equal(c.getCymaticsRules().pattern,'star');
 c.restoreCymaticsSnapshot(snapshot);assert.equal(c.getCymaticsRules().pattern,'bloom');c.cymaticsRules={pattern:'star',strength:30};c.isMacroPlaying=true;c.restoreCymaticsSnapshot(snapshot);assert.equal(c.getCymaticsRules().strength,95);assert.equal(c.cymaticsRules.strength,30);c.replayCymaticsRules=null;assert.equal(c.getCymaticsRules().strength,30);
});

test('sparse pigment on a dark board approaches nodal lines and malformed recipes fail preflight',()=>{
 const ctx={...fixture(41),cymaticsRules:{pattern:'petals',strength:100}};ctx.currentBoardState.forEach((t,i)=>{t.k=t.v=i%11===0?20:0;t.isGold=false;});const field=getCymaticsField(41,'petals'),energy=b=>b.reduce((sum,t,i)=>sum+t.k*field[i],0),before=energy(ctx.currentBoardState),counts=histogram(ctx.currentBoardState);advance(ctx,createCymaticsState(41),400);assert(energy(ctx.currentBoardState)<before*.35);assert.deepEqual(histogram(ctx.currentBoardState),counts);
 const c=vm.createContext({validateCymaticsSnapshot});vm.runInContext(source.slice(source.indexOf('function validateCymaticsMacroAction('),source.indexOf('function parseMacroText(')),c);
 const snapshot={cymaticsVersion:1,rules:DEFAULT_CYMATICS_RULES,state:createCymaticsState(41)};
 for(const eventName of ['PLAY','STEP FORWARD','SIMULATION_RULES']){const action={eventName,details:'Armed: cymatics | Sort: luminance | Rules: '+JSON.stringify(snapshot)};assert.doesNotThrow(()=>c.validateCymaticsMacroAction(action));assert.throws(()=>c.validateCymaticsMacroAction({...action,details:action.details.replace('"cymaticsVersion":1','"cymaticsVersion":2')}));}
});
