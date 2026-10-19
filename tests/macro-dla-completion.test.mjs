import { validateEvolutionTuning } from '../js/evolution-tuning.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {defaultWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');

test('DLA recorded mode stays separate from persisted boolean rules',()=>{
 const c=vm.createContext({ evolutionTuning: validateEvolutionTuning(), validateEvolutionTuning,armedSimulation:'dla',currentSortMethod:'dark-rainbow',dlaMode:'off',
  dlaRules:{colorGenetics:true,injectFromEdges:false,fastMode:false},console});
 vm.runInContext(source.slice(source.indexOf('function applyMacroRules('),source.indexOf('function executeMacroAction(')),c);
 for(const [mode,colorGenetics] of [['genetics',true],['no-genetics',false]]){
  c.applyMacroRules(`Armed: dla | Sort: dark-rainbow | Rules: ${JSON.stringify({mode,colorGenetics,injectFromEdges:true,fastMode:false})}`);
  assert.equal(c.dlaMode,mode);
  const rules=JSON.parse(JSON.stringify(c.dlaRules));
  assert.deepEqual(rules,{colorGenetics,injectFromEdges:true,fastMode:false});
  const settings=defaultWorkspaceSettings();settings.rules.dla=rules;assert.doesNotThrow(()=>validateWorkspaceSettings(settings));
 }
 // Old recordings without a mode still restore their flags and retain the selected UI mode.
 c.applyMacroRules('Armed: dla | Rules: {"fastMode":true}');assert.equal(c.dlaRules.fastMode,true);assert.equal(c.dlaMode,'no-genetics');
});

for(const fullscreen of [false,true])test(`macro cleanup releases overlay despite profile capture failure (fullscreen=${fullscreen})`,()=>{
 const errors=[],removed=[];let full=fullscreen;
 const c=vm.createContext({ evolutionTuning: validateEvolutionTuning(), validateEvolutionTuning,clearTimeout(){},windReplay:null,finishWindReplay(){},replayWindClocks:new Map(),macroTimerId:1,macroQueue:[{}],isMacroLoaded:true,isMacroPlaying:true,
  settingsProfiles:{endReplay(){throw Error('profile capture failed');}},
  replayNudgeTiming:{},currentMacroStep:12,pendingMacroPalette:3,isSelectingMacroPalette:true,isMacroFullscreen:fullscreen,
  animateBoardTransition:fn=>fn(),toggleMacroFullScreen(){full=false;},console:{error:(...args)=>errors.push(args)},
  dom:{macroOverlay:{classList:{remove:(...names)=>removed.push(...names)}},boardOverlay:{style:{opacity:'1'}}}});
 vm.runInContext(source.slice(source.indexOf('function stopMacro('),source.indexOf('function playMacro(')),c);
 assert.doesNotThrow(()=>c.stopMacro());assert.equal(c.isMacroLoaded,false);assert.equal(c.isMacroPlaying,false);
 assert.equal(c.currentMacroStep,0);assert.equal(c.pendingMacroPalette,null);assert.equal(c.replayNudgeTiming,null);
 assert.deepEqual(removed,['active','running']);assert.equal(full,false);assert.equal(errors.length,1);
});
