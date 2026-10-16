import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(){
 const classes=new Set(), icons=new Map();
 for(const id of ['iconBreatheSolo','iconBreatheGroup','iconBreatheRandomCell','iconBreatheRandomColor'])icons.set(id,{style:{}});
 const c=vm.createContext({breatheEvoMode:'off',armedSimulation:null,isLifePlaying:false,
  dom:{btnShowBreatheMenu:{classList:{remove:(...names)=>names.forEach(n=>classes.delete(n)),add:n=>classes.add(n)},setAttribute(){}}},
  document:{getElementById:id=>icons.get(id)},getText:key=>key,
  pauseLife(){c.isLifePlaying=false;c.pauses++;},pauses:0,
  armSimulation(sim){c.armedSimulation=sim;c.breatheEvoMode=sim==='breathe'?'solo':'off';}
 });
 vm.runInContext(source.slice(source.indexOf('function updateBreatheEvoButtonUI('),source.indexOf('// --- END: New Breathe Functions ---')),c);
 return {c,classes,icons};
}
test('breathing keeps its original four modes and off, separately from standalone Islands',()=>{
 const {c,classes,icons}=harness();
 for(const [sim,mode,icon] of [['breathe','solo','iconBreatheSolo'],['breathe','group','iconBreatheGroup'],['breathe','random-cell','iconBreatheRandomCell'],['breathe','random-color','iconBreatheRandomColor'],[null,'off','iconBreatheSolo']]){
  c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,sim);assert.equal(c.breatheEvoMode,mode);
  assert.deepEqual([...icons].filter(([,node])=>node.style.display==='block').map(([id])=>id),[icon]);
  assert.equal(classes.has('simulation-active'),sim!==null);
 }
});
test('cycling a running breathing mode still pauses and advances, with step disabled by its own engine',()=>{
 const {c}=harness();c.cycleBreatheEvoMode();
 for(const expected of ['group','random-cell','random-color','off']){
  c.isLifePlaying=true;c.cycleBreatheEvoMode();assert.equal(c.isLifePlaying,false);assert.equal(c.breatheEvoMode,expected);
 }
 assert.equal(c.pauses,4);
});
test('macro-selected Islands cannot light the breathing button or change its mode',()=>{
 const {c,classes}=harness();c.armedSimulation='islands';c.updateBreatheEvoButtonUI();
 assert.equal(c.breatheEvoMode,'off');assert(!classes.has('simulation-active'));assert.equal(c.dom.btnShowBreatheMenu.title,'tooltip_breathe');
 c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,'breathe');assert.equal(c.breatheEvoMode,'solo');
});
