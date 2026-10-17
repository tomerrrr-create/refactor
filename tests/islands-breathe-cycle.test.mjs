import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createBreatheDisplay,validateBreatheDisplay} from '../js/breathe-display.js';
import {validateEvolutionTuning,breatheTuningKey} from '../js/evolution-tuning.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(){
 const classes=new Set(), islandClasses=new Set(), icons=new Map(),logs=[];
 for(const id of ['iconBreatheSolo','iconBreatheRandomCell','iconBreatheRandomColor'])icons.set(id,{style:{}});
 const button = set => ({classList:{remove:(...names)=>names.forEach(n=>set.delete(n)),add:n=>set.add(n),toggle(n,on){if(on)set.add(n);else set.delete(n);}},setAttribute(){}});
 const c=vm.createContext({breatheEvoMode:'off',islandsSession:null,breatheTransition:null,armedSimulation:null,isLifePlaying:false,
  isMacroLoaded:false,isExecutingMacroCommand:false,settingsProfiles:null,
  breatheDisplay:createBreatheDisplay(),validateBreatheDisplay,breatheTuningKey,paletteLen:()=>264,evolutionTuning:validateEvolutionTuning(),
  performance:{now:()=>100},renderToScreen(){},startAnimationLoop(){c.frames++;},frames:0,performAction(action){c.actions++;action();},actions:0,
  window:{logArtEvent:(event,details)=>logs.push({event,details:JSON.parse(details)})},getBreatheTuning:()=>({speed:2.4,depth:2.3}),
  dom:{btnShowBreatheMenu:button(classes),btnIslands:button(islandClasses)},
  document:{getElementById:id=>icons.get(id)},getText:key=>key
 });
 vm.runInContext(source.slice(source.indexOf('function updateIslandsButtonUI('),source.indexOf('// --- END: New Breathe Functions ---')),c);
 return {c,classes,islandClasses,icons,logs};
}
test('Breathe starts immediately and cycles three modes plus Off without arming a simulation',()=>{
 const {c,classes,islandClasses,icons}=harness();
 for(const [mode,icon] of [['random-cell','iconBreatheRandomCell'],['solo','iconBreatheSolo'],['random-color','iconBreatheRandomColor'],['off','iconBreatheRandomCell']]){
  c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,null);assert.equal(c.isLifePlaying,false);assert.equal(c.breatheEvoMode,mode);
  assert.equal(c.breatheDisplay.isActive(),mode!=='off');
  assert.deepEqual([...icons].filter(([,node])=>node.style.display==='block').map(([id])=>id),[icon]);
  assert.equal(classes.has('simulation-active'),mode!=='off');assert(!islandClasses.has('simulation-active'));
 }
 assert.equal(c.frames,3);assert.equal(c.actions,4);
});
test('live Breathe changes include Off and leave the running simulation and generation count alone',()=>{
 const {c,classes,islandClasses}=harness();c.armedSimulation='islands';c.isLifePlaying=true;c.currentGenerationCount=42;
 for(const mode of ['random-cell','solo','random-color','off']){
  c.cycleBreatheEvoMode();assert.equal(c.isLifePlaying,true);assert.equal(c.armedSimulation,'islands');
  assert.equal(c.currentGenerationCount,42);assert.equal(c.breatheEvoMode,mode);
  assert(islandClasses.has('simulation-active'));assert.equal(classes.has('simulation-active'),mode!=='off');
 }
 assert.equal(c.actions,0);
});
test('display transitions are synchronous and record display-only events with resolved tuning',()=>{
 const {c,logs}=harness();c.armedSimulation='erosion';c.isLifePlaying=true;
 let fades=0;c.breatheTransition={run(action){fades++;return action();}};
 for(const mode of ['random-cell','solo','random-color','off']){c.cycleBreatheEvoMode();assert.equal(c.breatheEvoMode,mode);}
 assert.equal(fades,4);assert.equal(logs.length,4);
 for(const log of logs){
  assert.equal(log.event,'BREATHE_DISPLAY');assert.equal(log.details.version,1);
  assert.equal('running' in log.details,false);
  if(log.details.mode!=='off')assert.deepEqual(log.details.tuning,{speed:2.4,depth:2.3});
 }
});
test('macro playback locks native Breathe gestures',()=>{
 const {c,logs}=harness();c.isMacroLoaded=true;c.cycleBreatheEvoMode();assert.equal(c.breatheEvoMode,'off');assert.equal(logs.length,0);
});
