import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(){
 const classes=new Set(), icons=new Map();
 for(const id of ['iconBreatheIslands','iconBreatheSolo','iconBreatheGroup','iconBreatheRandomCell','iconBreatheRandomColor'])icons.set(id,{style:{}});
 const c=vm.createContext({breatheEvoMode:'off',armedSimulation:null,isLifePlaying:false,
  dom:{btnShowBreatheMenu:{classList:{remove:(...names)=>names.forEach(n=>classes.delete(n)),add:n=>classes.add(n)},setAttribute(){}}},
  document:{getElementById:id=>icons.get(id)},getText:key=>key,
  pauseLife(){c.isLifePlaying=false;c.pauses++;},pauses:0,
  armSimulation(sim){c.armedSimulation=sim;c.breatheEvoMode=sim==='breathe'?'solo':'off';}
 });
 vm.runInContext(source.slice(source.indexOf('function updateBreatheEvoButtonUI('),source.indexOf('// --- END: New Breathe Functions ---')),c);
 return {c,classes,icons};
}
test('shared button selects standalone Islands then four unchanged breathing modes and off',()=>{
 const {c,classes,icons}=harness();
 for(const [sim,mode,icon] of [['islands','off','iconBreatheIslands'],['breathe','solo','iconBreatheSolo'],['breathe','group','iconBreatheGroup'],['breathe','random-cell','iconBreatheRandomCell'],['breathe','random-color','iconBreatheRandomColor'],[null,'off','iconBreatheIslands']]){
  c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,sim);assert.equal(c.breatheEvoMode,mode);
  assert.deepEqual([...icons].filter(([,node])=>node.style.display==='block').map(([id])=>id),[icon]);
  assert.equal(classes.has('simulation-active'),sim!==null);
 }
});
test('cycling running Islands or breathing pauses before selecting the next engine or mode',()=>{
 const {c}=harness();c.cycleBreatheEvoMode();
 for(const expected of ['solo','group','random-cell','random-color','off']){
  c.isLifePlaying=true;c.cycleBreatheEvoMode();assert.equal(c.isLifePlaying,false);assert.equal(c.breatheEvoMode,expected);
 }
 assert.equal(c.pauses,5);
});
test('macro-selected Islands updates the shared icon without masquerading as a breathing mode',()=>{
 const {c,classes}=harness();c.armedSimulation='islands';c.updateBreatheEvoButtonUI();
 assert.equal(c.breatheEvoMode,'off');assert(classes.has('mode-islands'));assert.equal(c.dom.btnShowBreatheMenu.title,'tooltip_islands');
 c.armedSimulation='gravitationalSort';c.updateBreatheEvoButtonUI();assert(!classes.has('mode-islands'));assert(!classes.has('simulation-active'));
 c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,'islands');
});
