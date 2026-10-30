import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {CYMATICS_RESONANCE_MAPS,CYMATICS_PATTERNS,DEFAULT_CYMATICS_RULES,INITIAL_CYMATICS_RULES,validateCymaticsRules} from '../js/cymatics-settings.js';
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
 vm.runInContext(source.slice(source.indexOf('function updateCymaticsButtonUI('),source.indexOf('function getCracksBrush(')),c);
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

test('resonance fields vary with frequency, conserve pigments and replay deterministically',()=>{
 const legacy={pattern:'petals',strength:60};assert.deepEqual(validateCymaticsRules(legacy),legacy);
 for(const frequency of [20,200,440,1200,20000]){
  const rules={...legacy,mode:'resonance',frequency};assert.deepEqual(validateCymaticsRules(rules),rules);
  const ctx={...fixture(),cymaticsRules:rules},before=structuredClone(ctx.currentBoardState),field=getCymaticsField(21,'petals',frequency),score=b=>b.reduce((sum,t,i)=>sum+t.k*field[i],0);
  const first=advance(ctx,createCymaticsState(21),20),saved=JSON.parse(JSON.stringify({ctx:first.ctx,state:first.state}));
  assert(score(first.ctx.currentBoardState)<score(before));assert.deepEqual(histogram(first.ctx.currentBoardState),histogram(before));assert.deepEqual(first.ctx.currentBoardState[220],before[220]);
  assert.deepEqual(advance(first.ctx,first.state,30),advance(saved.ctx,saved.state,30));
  const settings=defaultWorkspaceSettings();settings.rules.cymatics=rules;assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.cymatics,rules);
 }
 assert.notDeepEqual(getCymaticsField(41,'petals',440),getCymaticsField(41,'petals',1200));
 for(const extra of [{mode:'unknown'},{mode:'resonance'},{mode:'resonance',frequency:19},{mode:'resonance',frequency:20001},{mode:'resonance',frequency:440.5},{frequency:440}])assert.throws(()=>validateCymaticsRules({...legacy,...extra}));
});

test('expanded resonance produces axial and grid fields without a forced diagonal, with exact checkpoint replay',()=>{
 const frequencies=[40,80,160,320,680,2000];
 const legacyRules={pattern:'petals',strength:60,mode:'resonance',frequency:440};
 assert.equal(validateCymaticsRules(legacyRules).resonanceVersion,undefined);
 for(const frequency of frequencies){
  const rules={...legacyRules,frequency,resonanceVersion:2},field=getCymaticsField(41,'petals',frequency,2),diagonal=Array.from({length:41},(_,i)=>field[i*42]);
  assert(Math.max(...diagonal)-Math.min(...diagonal)>20000,'diagonal is no longer forced to zero');
  const ctx={...fixture(41),cymaticsRules:rules},before=structuredClone(ctx.currentBoardState),score=b=>b.reduce((sum,t,i)=>sum+t.k*field[i],0);
  const a=advance(ctx,createCymaticsState(41),40),saved=JSON.parse(JSON.stringify(a));assert(score(a.ctx.currentBoardState)<score(before));assert.deepEqual(histogram(a.ctx.currentBoardState),histogram(before));assert.deepEqual(a.ctx.currentBoardState[840],before[840]);
  assert.deepEqual(advance(a.ctx,a.state,30),advance(saved.ctx,saved.state,30));
  const settings=defaultWorkspaceSettings();settings.rules.cymatics=rules;assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.cymatics,rules);
  assert.deepEqual(validateCymaticsSnapshot({cymaticsVersion:1,rules,state:saved.state}).rules,rules);
 }
 assert.notDeepEqual(getCymaticsField(41,'petals',40,2),getCymaticsField(41,'petals',80,2));
 assert.throws(()=>validateCymaticsRules({...legacyRules,resonanceVersion:5}));assert.throws(()=>validateCymaticsRules({pattern:'petals',strength:60,resonanceVersion:2}));
});
test('original resonance recordings retain their exact fields',async()=>{
 const {createHash}=await import('node:crypto');
 const expected={20:'cf92cc686e009e01dcf5f3c590e5e1b7afaa152bff1dfe3fab85afb89a71ce52',440:'84b2134a4b8b069ea5711ee6c558eb4a7026a3523012fa30bba9fa808b21d8e0',1200:'067299a2a17fabbd3502a4071ee08b86af8bc5e25954db51cf18f34151bd247b',20000:'2c1cefd422ea4d45256c041bff00cf58f5c568c8af9b377ee853b84fb093f7d0'};
 for(const [frequency,hash] of Object.entries(expected)){
  getCymaticsField(41,'petals',Number(frequency),2);const legacy=getCymaticsField(41,'petals',Number(frequency));
  assert.equal(createHash('sha256').update(new Uint8Array(legacy.buffer)).digest('hex'),hash);
 }
});

test('all three selectable resonance maps preserve settings, pigments, gold and deterministic replay',()=>{
 const fields=[];
 for(const resonanceVersion of [1,2,3]){
  const rules={pattern:'star',strength:100,mode:'resonance',frequency:1055,resonanceVersion};
  assert.deepEqual(validateCymaticsRules(rules),rules);
  const settings=defaultWorkspaceSettings();settings.rules.cymatics=rules;
  assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.cymatics,rules);
  assert.deepEqual(validateProfileSnapshot({settings}).settings.rules.cymatics,rules);
  const ctx={...fixture(41),cymaticsRules:rules},before=structuredClone(ctx.currentBoardState),field=getCymaticsField(41,'star',1055,resonanceVersion);
  fields.push(field);assert(field.some(v=>v>0));
  const energy=b=>b.reduce((sum,t,i)=>sum+t.k*field[i],0),result=advance(ctx,createCymaticsState(41),45),snapshot=JSON.parse(JSON.stringify(result));
  assert(energy(result.ctx.currentBoardState)<energy(before));assert.deepEqual(histogram(result.ctx.currentBoardState),histogram(before));assert.deepEqual(result.ctx.currentBoardState[840],before[840]);
  assert.deepEqual(advance(result.ctx,result.state,50),advance(snapshot.ctx,snapshot.state,50));
 }
 assert.notDeepEqual(fields[0],fields[1]);assert.notDeepEqual(fields[1],fields[2]);
 assert.deepEqual(getCymaticsField(41,'star',1055,1),getCymaticsField(41,'star',1055));
 for(const frequency of [20,20000])for(const n of [1,2,41]){
  const field=getCymaticsField(n,'petals',frequency,3);assert.equal(field.length,n*n);assert([...field].every(v=>Number.isFinite(v)&&v>=0&&v<=65535));
 }
});

test('interference phase motion follows generations, preserves pigments and resumes exactly',()=>{
 const base={pattern:'petals',strength:100,mode:'resonance',frequency:1200,resonanceVersion:4};
 for(const phaseMotion of [false,true]){
  const rules={...base,phaseMotion};assert.deepEqual(validateCymaticsRules(rules),rules);
  const settings=defaultWorkspaceSettings();settings.rules.cymatics=rules;
  assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).rules.cymatics,rules);
  const ctx={...fixture(41),cymaticsRules:rules},before=structuredClone(ctx.currentBoardState),result=advance(ctx,createCymaticsState(41),250),copy=JSON.parse(JSON.stringify(result));
  assert.deepEqual(histogram(result.ctx.currentBoardState),histogram(before));assert.deepEqual(result.ctx.currentBoardState[840],before[840]);
  assert.deepEqual(advance(result.ctx,result.state,180),advance(copy.ctx,copy.state,180));
  const staticContext={...fixture(41),cymaticsRules:rules};staticContext.currentBoardState.forEach(t=>{t.k=t.v=3;});const uniform=structuredClone(staticContext.currentBoardState);advance(staticContext,createCymaticsState(41),30);assert.deepEqual(staticContext.currentBoardState,uniform);
 }
 const zero=getCymaticsField(41,'petals',1200,4,0),shift=getCymaticsField(41,'petals',1200,4,300);
 assert.notDeepEqual(zero,shift);assert.deepEqual(zero,getCymaticsField(41,'petals',1200,4,1200));
 for(const phaseMotion of [null,1,'true'])assert.throws(()=>validateCymaticsRules({...base,phaseMotion}));
 assert.deepEqual(validateCymaticsRules({...base,resonanceVersion:3,phaseMotion:true}),{...base,resonanceVersion:3,phaseMotion:true});
 const moving={...fixture(41),cymaticsRules:{...base,phaseMotion:true}};const first=advance(moving,createCymaticsState(41),900),previous=structuredClone(first.ctx.currentBoardState);advance(first.ctx,first.state,300);assert.notDeepEqual(first.ctx.currentBoardState,previous,'moving field still rearranges pigments late in the run');
 for(const n of [1,2])for(const frequency of [20,20000])assert.equal(getCymaticsField(n,'petals',frequency,4,117).length,n*n);
});

test('phase motion works for each resonance map, preserves preferences and replays exactly',()=>{
 for(const resonanceVersion of [1,2,3,4]){
  const rules={pattern:'petals',strength:100,mode:'resonance',frequency:1200,resonanceVersion,phaseMotion:true};
  const prefs=defaultWorkspaceSettings();prefs.rules.cymatics=rules;assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(prefs)).rules.cymatics,rules);
  const ctx={...fixture(41),cymaticsRules:rules},before=structuredClone(ctx.currentBoardState),start={...createCymaticsState(41),steps:250};
  const result=advance(ctx,start,120),saved=JSON.parse(JSON.stringify(result));
  assert.deepEqual(histogram(result.ctx.currentBoardState),histogram(before));assert.deepEqual(result.ctx.currentBoardState[840],before[840]);
  assert.deepEqual(advance(result.ctx,result.state,100),advance(saved.ctx,saved.state,100));
  const base=getCymaticsField(41,'petals',1200,resonanceVersion,0);assert.notDeepEqual(base,getCymaticsField(41,'petals',1200,resonanceVersion,300));assert.deepEqual(base,getCymaticsField(41,'petals',1200,resonanceVersion,1200));
  const staticRules={...rules,phaseMotion:false},a=advance({...fixture(),cymaticsRules:staticRules},createCymaticsState(21),50),legacyRules={...staticRules};delete legacyRules.phaseMotion;
  const legacy=advance({...fixture(),cymaticsRules:legacyRules},createCymaticsState(21),50);assert.deepEqual(a.ctx.currentBoardState,legacy.ctx.currentBoardState,'off uses exactly the original calculation');assert.deepEqual(a.state,legacy.state);
  const uniform={...fixture(9),cymaticsRules:rules};uniform.currentBoardState.forEach(t=>{t.k=t.v=3;});const same=structuredClone(uniform.currentBoardState);advance(uniform,createCymaticsState(9),30);assert.deepEqual(uniform.currentBoardState,same);
 }
 const diagonal={pattern:'petals',strength:60,mode:'resonance',frequency:440,phaseMotion:true};assert.deepEqual(validateCymaticsRules(diagonal),diagonal,'legacy omitted map means moving Diagonals');
 assert.throws(()=>validateCymaticsRules({pattern:'petals',strength:60,phaseMotion:true}));
 const ring=(step)=>{const field=getCymaticsField(81,'petals',230,3,step),line=[...field.slice(40*81+41,41*81)];return line.indexOf(Math.min(...line));};assert(ring(600)<ring(0),'circular rings contract even when rotation alone is invisible');
});
test('fixed resonance maps retain their pre-motion byte signatures',async()=>{
 const {createHash}=await import('node:crypto');
 const hashes=['84b2134a4b8b069ea5711ee6c558eb4a7026a3523012fa30bba9fa808b21d8e0','c022d338d493f1396ab3203f9d8305a2e41419f1e9de661766ca61c4a80a86a1','8309599a2494ec268b163aec18de13705431b68fca287187e2c7700541901f74','a4c2367ecd7041c6dfe85bb65265b109c8333e03223923fb0caa40d938e8ffef'];
 for(const [i,hash] of hashes.entries()){
  getCymaticsField(41,'petals',440,i+1,417);const field=getCymaticsField(41,'petals',440,i+1,0);
  assert.equal(createHash('sha256').update(new Uint8Array(field.buffer)).digest('hex'),hash);
 }
});

test('new defaults select moving Interference at exactly 2731 Hz while legacy recipes keep Patterns',()=>{
 assert.deepEqual(INITIAL_CYMATICS_RULES,{pattern:'petals',strength:60,mode:'resonance',frequency:2731,resonanceVersion:4,phaseMotion:true});
 assert.deepEqual(validateCymaticsRules(),DEFAULT_CYMATICS_RULES);assert.deepEqual(DEFAULT_CYMATICS_RULES,{pattern:'petals',strength:60});
 const defaults=defaultWorkspaceSettings();defaults.rules.cymatics={...INITIAL_CYMATICS_RULES};
 assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(defaults)).rules.cymatics,undefined,'omitted preferences inherit new application defaults');
 const old=defaultWorkspaceSettings();old.rules.cymatics={...DEFAULT_CYMATICS_RULES};
 assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(old)).rules.cymatics,DEFAULT_CYMATICS_RULES,'explicit old Patterns preferences remain explicit');
 assert.deepEqual(validateCymaticsSnapshot({cymaticsVersion:1,rules:DEFAULT_CYMATICS_RULES,state:createCymaticsState(41)}).rules,DEFAULT_CYMATICS_RULES);
});

test('toolbar cycles four maps without resetting the run and only includes Off while paused',()=>{
 const events=[],classes=new Set(),button={dataset:{},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},setAttribute(name,value){this[name]=value;}};
 const c=vm.createContext({CYMATICS_RESONANCE_MAPS,INITIAL_CYMATICS_RULES,cymaticsRules:{...INITIAL_CYMATICS_RULES},replayCymaticsRules:null,cymaticsState:null,n:21,
  armedSimulation:null,isLifePlaying:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,isBreathing:false,dom:{btnCymatics:button},getText:key=>key,
  createCymaticsState,restoreCymaticsState,validateCymaticsRules,validateCymaticsSnapshot,
  window:{logArtEvent:(name,details)=>events.push({name,details})},persistWorkspaceSettings(){},getWorkspaceSettings:()=>({}),settingsProfiles:{scheduleCapture(){}}});
 c.armSimulation=sim=>{c.armedSimulation=sim;if(sim==='cymatics')c.cymaticsState=createCymaticsState(21);};
 c.getSimulationRecordingDetails=()=>JSON.stringify(c.getCymaticsSnapshot());
 c.recordLiveSimulationRules=()=>{if(c.isLifePlaying)events.push({name:'SIMULATION_RULES',details:c.getSimulationRecordingDetails()});};
 vm.runInContext(source.slice(source.indexOf('function updateCymaticsButtonUI('),source.indexOf('function getCracksBrush(')),c);
 vm.runInContext(source.slice(source.indexOf('function nextEvolutionMode('),source.indexOf('function cycleBrightnessEvoMode(')),c);
 c.cycleCymaticsMode();assert.equal(c.armedSimulation,'cymatics');assert.equal(c.getCymaticsRules().resonanceVersion,4);
 for(const [map,active] of [[1,true],[2,true],[3,true],[4,false],[4,true]]){
  c.cycleCymaticsMode();assert.equal(c.getCymaticsRules().resonanceVersion,map);assert.equal(c.armedSimulation==='cymatics',active);assert.equal(c.getCymaticsRules().frequency,2731);assert.equal(c.getCymaticsRules().phaseMotion,true);
 }
 assert(events.some(e=>e.name==='Cymatics Mode Changed'&&JSON.parse(e.details).mode==='off'));
 c.isLifePlaying=true;c.cymaticsState={...createCymaticsState(21),steps:250,random:123456};const state=c.cymaticsState;
 for(const map of [1,2,3,4,1]){c.cycleCymaticsMode();assert.equal(c.getCymaticsRules().resonanceVersion,map);assert.equal(c.armedSimulation,'cymatics');assert.equal(c.cymaticsState,state);assert.equal(c.isLifePlaying,true);assert.equal(button.dataset.cymaticsMap,Object.keys(CYMATICS_RESONANCE_MAPS).find(name=>CYMATICS_RESONANCE_MAPS[name]===map));}
 assert.equal(button['aria-pressed'],'true');assert(classes.has('simulation-active'));
 c.isLifePlaying=false;c.saveCymaticsSettings({pattern:'bloom',strength:75});assert.equal(button.dataset.cymaticsMap,'patterns');c.cycleCymaticsMode();assert.equal(c.getCymaticsRules().resonanceVersion,4);assert.equal(c.getCymaticsRules().strength,75);assert.equal(c.cymaticsState,state);
 c.cymaticsRules={pattern:'petals',strength:30,mode:'resonance',frequency:440};c.cycleCymaticsMode();assert.equal(c.getCymaticsRules().resonanceVersion,2);assert.equal(c.getCymaticsRules().phaseMotion,false,'missing legacy phase remains off');assert.equal(c.getCymaticsRules().frequency,440);
 const validation=vm.createContext({validateCymaticsSnapshot});vm.runInContext(source.slice(source.indexOf('function validateCymaticsMacroAction('),source.indexOf('function parseMacroText(')),validation);
 const off=events.find(e=>e.name==='Cymatics Mode Changed');assert.doesNotThrow(()=>validation.validateCymaticsMacroAction({eventName:off.name,details:off.details}));assert.throws(()=>validation.validateCymaticsMacroAction({eventName:off.name,details:off.details.replace('"mode":"off"','"mode":"bad"')}));
});
