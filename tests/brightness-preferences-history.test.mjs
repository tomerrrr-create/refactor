import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validateEvolutionTuning} from '../js/evolution-tuning.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
function harness(){
 const noop=()=>{},c=vm.createContext({structuredClone,validateEvolutionTuning,evolutionTuning:validateEvolutionTuning(),brightnessEvoMode:'brightness',breatheEvoMode:'group',dlaMode:'genetics',dlaRules:{colorGenetics:true},islandsSession:null,isLifePlaying:false,isBreathing:false,isMacroLoaded:false,isMacroPlaying:false,isExecutingMacroCommand:false,armedSimulation:'brightnessEvo',n:3,activePaletteIndex:0,currentSortMethod:'luminance',C:{PALETTES:[{originalName:'Fixture'}]},boardState:Array.from({length:9},()=>({k:2,v:2,isGold:false})),dom:{board:{}},history:[],future:[],artRecipeLog:[],historyRecipeCursor:0,
  clearPaletteColorTransition:noop,restoreSeparatorWidth:noop,syncSelectedColorWithPalette:noop,updatePaletteHeader:noop,updateSymmetryUI:noop,updateErosionButtonUI:noop,applySeparator:noop,updateBrightnessEvoButtonUI:noop,updateBreatheEvoButtonUI:noop,updateDlaButtonUI:noop,finishBrushGesture:noop,windPainter:null,updateUndoRedoButtons:noop,settingsProfiles:{scheduleCapture:noop},
 });
 c.window={logArtEvent:(name,details)=>c.artRecipeLog.push({name,details:JSON.parse(details)})};
 c.getWorkspaceSettings=()=>({evolutionTuning:plain(c.evolutionTuning)});c.persistWorkspaceSettings=settings=>{c.stored=plain(settings);};
 c.getCurrentState=()=>({n:3,paletteName:'Fixture',activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,evolutionTuning:plain(c.evolutionTuning),brightnessEvoMode:c.brightnessEvoMode,breatheEvoMode:'group',dlaMode:'genetics',tuningSimulation:'brightnessEvo',tiles:plain(c.boardState)});
 c.getHistorySettings=s=>s;c.armSimulation=sim=>{c.armedSimulation=sim;};
 c.performAction=fn=>{const before=c.getCurrentState();fn();c.history.push({id:c.history.length+1,before,after:c.getCurrentState()});};
 vm.runInContext(source.slice(source.indexOf('function restoreEvolutionTuningState('),source.indexOf('function getWorkspaceSettings(')),c);
 vm.runInContext(source.slice(source.indexOf('function applyState('),source.indexOf('function pushHistory(')),c);
 vm.runInContext(source.slice(source.indexOf('function undo()'),source.indexOf('function updateUndoRedoButtons()')),c);
 return c;
}
test('saving paused brightness preferences records the rule without creating drawing history',()=>{
 const c=harness();assert.equal(c.saveEvolutionTuning('brightnessEvo',{smoothing:.1,contrast:.2},'contrast'),true);
 assert.equal(c.history.length,0);assert.equal(c.evolutionTuning.brightnessEvo.smoothing,.1);assert.equal(c.brightnessEvoMode,'contrast');assert.equal(c.artRecipeLog.at(-1).name,'EVOLUTION_TUNING');assert.equal(c.stored.evolutionTuning.brightnessEvo.contrast,.2);
});
test('repeated drawing Undo and Redo retain current brightness values and mode, including storage and recipe checkpoints',()=>{
 const c=harness();for(const k of [3,4,5])c.performAction(()=>{c.boardState[0]={k,v:k,isGold:false};});
 c.saveEvolutionTuning('brightnessEvo',{smoothing:.1,contrast:.3},'contrast');
 for(const k of [6,7])c.performAction(()=>{c.boardState[0]={k,v:k,isGold:false};});
 for(let i=0;i<5;i++){c.undo();assert.equal(c.evolutionTuning.brightnessEvo.smoothing,.1);assert.equal(c.evolutionTuning.brightnessEvo.contrast,.3);assert.equal(c.brightnessEvoMode,'contrast');assert.equal(c.stored.evolutionTuning.brightnessEvo.smoothing,.1);assert.equal(c.artRecipeLog.at(-1).details.settings.evolutionTuning.brightnessEvo.smoothing,.1);}
 assert.equal(c.boardState[0].k,2);
 for(let i=0;i<5;i++){c.redo();assert.equal(c.evolutionTuning.brightnessEvo.smoothing,.1);assert.equal(c.brightnessEvoMode,'contrast');}assert.equal(c.boardState[0].k,7);
});
test('explicit project restore and macro Undo use recorded brightness values, while unrelated tuning still restores normally',()=>{
 const c=harness(),snapshot=c.getCurrentState();c.saveEvolutionTuning('brightnessEvo',{smoothing:.1,contrast:.3},'contrast');c.evolutionTuning.breathe.speed=2;
 c.applyState(snapshot);assert.equal(c.evolutionTuning.brightnessEvo.smoothing,.5);assert.equal(c.brightnessEvoMode,'brightness');assert.equal(c.evolutionTuning.breathe.speed,1);
 c.history=[{id:1,before:snapshot,after:snapshot}];c.evolutionTuning.brightnessEvo.smoothing=.1;c.isExecutingMacroCommand=true;c.undo();assert.equal(c.evolutionTuning.brightnessEvo.smoothing,.5);
});
