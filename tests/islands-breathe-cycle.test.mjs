import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(){
 const classes=new Set(), islandClasses=new Set(), icons=new Map(),logs=[];
 for(const id of ['iconBreatheSolo','iconBreatheRandomCell','iconBreatheRandomColor'])icons.set(id,{style:{}});
 const button = set => ({classList:{remove:(...names)=>names.forEach(n=>set.delete(n)),add:n=>set.add(n),toggle(n,on){if(on)set.add(n);else set.delete(n);}},setAttribute(){}});
 const c=vm.createContext({breatheEvoMode:'off',islandsSession:null,breatheTransition:null,armedSimulation:null,isLifePlaying:false,
  window:{logArtEvent:(event,details)=>logs.push({event,details:JSON.parse(details)})},getBreatheTuning:()=>({speed:2.4,depth:2.3}),
  dom:{btnShowBreatheMenu:button(classes),btnIslands:button(islandClasses)},
  document:{getElementById:id=>icons.get(id)},getText:key=>key,
  pauseLife(){c.isLifePlaying=false;c.pauses++;},pauses:0,
  armSimulation(sim){c.armedSimulation=sim;c.breatheEvoMode=sim==='breathe'?'random-cell':'off';}
 });
 vm.runInContext(source.slice(source.indexOf('function nextEvolutionMode('),source.indexOf('function cycleBrightnessEvoMode(')),c);
 vm.runInContext(source.slice(source.indexOf('function updateIslandsButtonUI('),source.indexOf('// --- END: New Breathe Functions ---')),c);
 c.startBreatheSession=()=>{c.isLifePlaying=true;c.starts=(c.starts||0)+1;};
 return {c,classes,islandClasses,icons,logs};
}
test('Breathe cycles through its three modes and off without selecting Islands',()=>{
 const {c,classes,islandClasses,icons}=harness();
 for(const [mode,icon] of [['random-cell','iconBreatheRandomCell'],['solo','iconBreatheSolo'],['random-color','iconBreatheRandomColor'],['off','iconBreatheRandomCell']]){
  c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,mode==='off'?null:'breathe');assert.equal(c.breatheEvoMode,mode);
  assert.deepEqual([...icons].filter(([,node])=>node.style.display==='block').map(([id])=>id),[icon]);
  assert.equal(classes.has('simulation-active'),mode!=='off');assert(!islandClasses.has('simulation-active'));
 }
});
test('Breathe cycles its running modes without pausing or selecting Off, and cannot steal another running simulation',()=>{
 const {c}=harness();c.armedSimulation='islands';c.isLifePlaying=true;
 c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,'islands');assert.equal(c.pauses,0);
 c.isLifePlaying=false;c.cycleBreatheEvoMode();assert.equal(c.breatheEvoMode,'random-cell');
 for(const expected of ['solo','random-color','random-cell']){
  c.isLifePlaying=true;c.cycleBreatheEvoMode();assert.equal(c.isLifePlaying,true);assert.equal(c.breatheEvoMode,expected);
 }
 assert.equal(c.pauses,0);assert.equal(c.starts,3);
});
test('macro-selected Islands highlights only its independent control and leaves Breathe on its own idle icon',()=>{
 const {c,classes,islandClasses,icons}=harness();c.armedSimulation='islands';c.updateBreatheEvoButtonUI();
 assert.equal(c.breatheEvoMode,'off');assert(islandClasses.has('simulation-active'));assert(!classes.has('simulation-active'));
 assert.equal(c.dom.btnIslands.title,'tooltip_islands');assert.equal(c.dom.btnShowBreatheMenu.title,'tooltip_breathe');
 assert.equal(icons.get('iconBreatheRandomCell').style.display,'block');
 c.armedSimulation='erosion';c.updateBreatheEvoButtonUI();assert(!islandClasses.has('simulation-active'));
 c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,'breathe');
});

test('live mode changes use one synchronous visual transition and record the resolved rhythm',()=>{
 const {c,logs}=harness();c.cycleBreatheEvoMode();c.isLifePlaying=true;
 let fades=0;c.breatheTransition={isActive:()=>false,run(action){assert.equal(c.isLifePlaying,true);fades++;return action();}};
 for(const mode of ['solo','random-color','random-cell']){
  c.cycleBreatheEvoMode();assert.equal(c.breatheEvoMode,mode);assert.equal(c.isLifePlaying,true);
 }
 assert.equal(fades,3);assert.equal(c.pauses,0);assert.equal(logs.length,4);
 for(const log of logs.slice(1)){
  assert.equal(log.event,'Breathe Mode Changed');assert.equal(log.details.running,true);
  assert.deepEqual(log.details.tuning,{speed:2.4,depth:2.3});
 }
});
