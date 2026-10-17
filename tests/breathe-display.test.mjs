import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreatheDisplay,validateBreatheDisplay} from '../js/breathe-display.js';
import {createRandomBreatheSession} from '../js/simulations/breathe.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {validateProfileSnapshot} from '../js/profile-state.js';
const palette=['#ff0000','#00ff00','#0000ff'];
const tiles=()=>[0,1,0,2].map(k=>({k,v:k,isGold:false}));
test('visual controller leaves frozen simulation tiles unchanged in every mode, including replacements',()=>{
 for(const mode of ['random-cell','solo','random-color']){
  const effect=createBreatheDisplay(), initial=tiles().map(Object.freeze), next=tiles().map(t=>Object.freeze({...t,k:2,v:2}));
  Object.freeze(initial);Object.freeze(next);
  effect.setMode(mode,{now:0,rules:{speed:2.4,depth:2.3}});
  for(let now=0;now<15000;now+=50){
   effect.prepare(now<5000?initial:next,palette,now,{speed:2.4,depth:2.3});
   for(let i=0;i<4;i++)assert(Number.isFinite(effect.factor(i)) && effect.factor(i)>=0);
  }
  effect.setMode('off');assert.equal(effect.isActive(),false);assert.equal(effect.factor(0),1);
 }
});
test('random color rhythms follow current simulation tiles and color identity across sorting',()=>{
 const initial=tiles();let cursor=0;const random=()=>((cursor++%9)+1)/10;
 const session=createRandomBreatheSession(initial,'random-color',random,{},palette);
 session.update(1800);
 const red=session.factor(0),green=session.factor(1);assert.notEqual(red,green);assert.equal(session.factor(2),red);
 const replacement=tiles();replacement[1]={k:0};replacement[0]={k:2,isGold:true};
 session.update(1800,replacement,palette);assert.equal(session.factor(0),1);assert.equal(session.factor(1),red);
 const sorted=[palette[1],palette[2],palette[0]];
 const remapped=replacement.map(t=>({...t,k:sorted.indexOf(palette[t.k])}));
 session.update(1800,remapped,sorted);assert.equal(session.factor(1),red);assert.equal(session.factor(2),red);
 // A new palette/color joins safely; an old board reference must never be read.
 session.update(2000,[{k:0}],['#ffffff']);assert.equal(session.factor(0),1);assert.equal(session.factor(3),1);
 assert(Number.isFinite(green));
});
test('random cell rhythms survive cloned tiles; resizing and new gold are handled',()=>{
 const session=createRandomBreatheSession(tiles(),'random-cell',()=>0);
 session.update(1800);const factor=session.factor(0);assert.notEqual(factor,1);
 session.update(1800,[{k:2},{k:1,isGold:true}]);assert.equal(session.factor(0),factor);assert.equal(session.factor(1),1);
 session.update(1900,[...tiles(),{k:0}]);assert.equal(session.factor(4),1);
});
test('display mode persists independently through preferences and profiles; old defaults stay Off',()=>{
 assert.equal(defaultWorkspaceSettings().breatheDisplayMode,undefined);
 for(const mode of ['random-cell','solo','random-color']){
  const settings={...defaultWorkspaceSettings(),breatheDisplayMode:mode};
  assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)).breatheDisplayMode,mode);
  assert.equal(validateProfileSnapshot({settings}).settings.breatheDisplayMode,mode);
 }
 assert.throws(()=>serializeWorkspaceSettings({...defaultWorkspaceSettings(),breatheDisplayMode:'invalid'}));
 for(const bad of [{version:2,mode:'solo'},{version:1,mode:'unknown'},{version:1,mode:'solo',tuning:{speed:4}},{version:1,mode:'solo',extra:true}])assert.throws(()=>validateBreatheDisplay(bad));
 assert.deepEqual(validateBreatheDisplay({version:1,mode:'group'}),{version:1,mode:'group',tuning:{speed:1,depth:1}});
});

test('new display events and settings preserve active wait time; old Breathe tuning does not start playback',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
 const {validateEvolutionTuning}=await import('../js/evolution-tuning.js');
 const changes=[];const c=vm.createContext({validateBreatheDisplay,validateEvolutionTuning,
  islandsSession:null,legacyBreathePlayback:false,legacyBreatheMode:'off',isExecutingMacroCommand:false,armedSimulation:'islands',
  window:{logArtEvent(){}},restoreEvolutionTuningState(){},setBreatheDisplayMode(mode){changes.push(mode);},
  restoreBreatheDisplay(value){changes.push(value.mode);}});
 vm.runInContext(source.slice(source.indexOf('function parseHistoryMacro('),source.indexOf('function toggleMacroFullScreen(')),c);
 vm.runInContext(source.slice(source.indexOf('function executeMacroAction('),source.indexOf('async function initializeApp(')),c);
 const old={simulation:'breathe',breatheEvoMode:'solo'};
 c.executeMacroAction({eventName:'EVOLUTION_TUNING',details:JSON.stringify(old)});assert.equal(c.legacyBreatheMode,'solo');assert.deepEqual(changes,[]);
 const display={version:1,mode:'random-color',tuning:{speed:2.4,depth:2.3}};
 const next={...old,breatheDisplay:display};c.executeMacroAction({eventName:'EVOLUTION_TUNING',details:JSON.stringify(next)});assert.deepEqual(changes,['random-color']);assert.equal(c.armedSimulation,'islands');
 const init={recipeVersion:2,n:1,pal:0,sort:'luminance',sep:0,board:'1x0'};
 for(const [name,details] of [['BREATHE_DISPLAY',display],['EVOLUTION_TUNING',next],['INIT_STATE',{...init,breatheDisplay:display}]]){
  const lines=[`[12:00:00.000] INIT_STATE -> ${JSON.stringify(init)}`,`[12:00:00.010] ${name} -> ${JSON.stringify(details)}`,'[12:00:04.010] BREATHE_DISPLAY -> {"version":1,"mode":"off"}'];
  for(const parse of [text=>c.parseMacroText(text),()=>c.parseLegacyMacroText(lines.join('\n'))]){
   const queue=parse(lines.join('\n'));assert.equal(queue.at(-1).delta-queue.at(-2).delta,4000,name);
  }
 }
 assert.throws(()=>c.parseMacroText('[12:00:00.000] BREATHE_DISPLAY -> {"version":4,"mode":"solo"}'));
});
