import { createIslandsSession, restoreIslandsSession } from '../js/simulations/islands.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
function harness(){
 const classes=new Set(), islandClasses=new Set(), icons=new Map();
 for(const id of ['iconBreatheSolo','iconBreatheGroup','iconBreatheRandomCell','iconBreatheRandomColor'])icons.set(id,{style:{}});
 const button = set => ({classList:{remove:(...names)=>names.forEach(n=>set.delete(n)),add:n=>set.add(n),toggle(n,on){if(on)set.add(n);else set.delete(n);}},setAttribute(){}});
 const c=vm.createContext({breatheEvoMode:'off',armedSimulation:null,isLifePlaying:false,islandsSession:null,createIslandsSession,restoreIslandsSession,window:{logArtEvent(){}},isExecutingMacroCommand:false,isMacroLoaded:false,starts:0,logIslandsSessionStart(){c.starts++;},
  dom:{btnShowBreatheMenu:button(classes),btnIslands:button(islandClasses)},
  document:{getElementById:id=>icons.get(id)},getText:key=>key,
  pauseLife(){c.isLifePlaying=false;c.pauses++;},pauses:0,
  armSimulation(sim){c.armedSimulation=sim;if(sim==='islands')c.islandsSession=createIslandsSession(123);c.breatheEvoMode=sim==='breathe'?'solo':'off';}
 });
 vm.runInContext(source.slice(source.indexOf('function nextEvolutionMode('),source.indexOf('function cycleBrightnessEvoMode(')),c);
 vm.runInContext(source.slice(source.indexOf('function updateIslandsButtonUI('),source.indexOf('// --- END: New Breathe Functions ---')),c);
 return {c,classes,islandClasses,icons};
}
test('Breathe cycles through its four modes and off without selecting Islands',()=>{
 const {c,classes,islandClasses,icons}=harness();
 for(const [mode,icon] of [['solo','iconBreatheSolo'],['group','iconBreatheGroup'],['random-cell','iconBreatheRandomCell'],['random-color','iconBreatheRandomColor'],['off','iconBreatheSolo']]){
  c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,mode==='off'?null:'breathe');assert.equal(c.breatheEvoMode,mode);
  assert.deepEqual([...icons].filter(([,node])=>node.style.display==='block').map(([id])=>id),[icon]);
  assert.equal(classes.has('simulation-active'),mode!=='off');assert(!islandClasses.has('simulation-active'));
 }
});
test('Breathe can pause and cycle its own running mode but cannot steal another running simulation',()=>{
 const {c}=harness();c.armedSimulation='islands';c.isLifePlaying=true;
 c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,'islands');assert.equal(c.pauses,0);
 c.isLifePlaying=false;c.cycleBreatheEvoMode();assert.equal(c.breatheEvoMode,'solo');
 for(const expected of ['group','random-cell','random-color','off']){
  c.isLifePlaying=true;c.cycleBreatheEvoMode();assert.equal(c.isLifePlaying,false);assert.equal(c.breatheEvoMode,expected);
 }
 assert.equal(c.pauses,4);
});
test('macro-selected Islands highlights only its independent control and leaves Breathe on its own idle icon',()=>{
 const {c,classes,islandClasses,icons}=harness();c.armedSimulation='islands';c.updateBreatheEvoButtonUI();
 assert.equal(c.breatheEvoMode,'off');assert(islandClasses.has('simulation-active'));assert(!classes.has('simulation-active'));
 assert.equal(c.dom.btnIslands.title,'tooltip_islands');assert.equal(c.dom.btnShowBreatheMenu.title,'tooltip_breathe');
 assert.equal(icons.get('iconBreatheSolo').style.display,'block');
 c.armedSimulation='erosion';c.updateBreatheEvoButtonUI();assert(!islandClasses.has('simulation-active'));
 c.cycleBreatheEvoMode();assert.equal(c.armedSimulation,'breathe');
});

test('Islands cycles active modes without pause or random-cursor reset while running',()=>{
    const {c,islandClasses}=harness();
    c.cycleIslandsMode();assert.equal(c.armedSimulation,'islands');assert.equal(c.islandsSession.islandsVersion,1);
    c.islandsSession.state=345;c.islandsSession.steps=12;
    const seed=c.islandsSession.seed;c.isLifePlaying=true;
    for(const mode of ['proximity','classic','proximity','classic']) {
        c.cycleIslandsMode();assert.equal(c.isLifePlaying,true);assert.equal(c.pauses,0);
        assert.equal(c.islandsSession.mode || 'classic',mode);assert.equal(c.armedSimulation,'islands');
        assert.equal(c.islandsSession.seed,seed);assert.equal(c.islandsSession.state,345);assert.equal(c.islandsSession.steps,12);
        assert.equal(islandClasses.has('mode-proximity'),mode==='proximity');
    }
    c.isLifePlaying=false;c.cycleIslandsMode();assert.equal(c.islandsSession.mode,'proximity');
    c.cycleIslandsMode();assert.equal(c.armedSimulation,null);assert(!islandClasses.has('mode-proximity'));
    c.cycleIslandsMode();assert.equal(c.islandsSession.islandsVersion,1);
    c.armedSimulation='erosion';c.isLifePlaying=true;c.cycleIslandsMode();assert.equal(c.armedSimulation,'erosion');
});
