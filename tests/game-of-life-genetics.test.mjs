import test from 'node:test';
import assert from 'node:assert/strict';
import { runGameOfLifeGeneration as run } from '../js/simulations/game_of_life.js';
import { SORT_MODES, sortColorsArray } from '../js/colors.js';
import { normalizeEvolutionCycle } from '../js/evolution-cycle-settings.js';
import { defaultWorkspaceSettings, validateWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';

const rules = {survival:[2,3],birth:[3]};
const board = (ranks=[1,1,3]) => Array.from({length:9},(_,i)=>({k:[0,1,2].includes(i)?ranks[i]:0,v:0,isGold:false}));
const palette=['#000000','#ff0000','#ffffff','#0000ff'];
test('RGB remains the default while sorted inheritance averages ranks of living parents',()=>{
 const currentBoardState=board();
 const context={n:3,currentBoardState,currentPalette:palette,gameOfLifeRules:rules};
 assert.equal(run(context)[4].k,1); // RGB mean (170,0,85) is closest to red.
 assert.equal(run({...context,gameOfLifeRules:{...rules,sortGenetics:false}})[4].k,1);
 assert.equal(run({...context,gameOfLifeRules:{...rules,sortGenetics:true}})[4].k,2); // rank 5/3 rounds to 2.
 const other=board([1,3,3]);context.currentBoardState=other;
 assert.equal(run(context)[4].k,3); // nearest RGB blue, unlike rank mean.
 assert.equal(run({...context,gameOfLifeRules:{...rules,sortGenetics:true}})[4].k,2);
 assert.deepEqual(other,board([1,3,3])); // Engine does not mutate input.
});
test('every sort mode uses its actual palette order, preserves survivors and gold, and never averages dead neighbors',()=>{
 for(const {method} of SORT_MODES){
  const currentPalette=sortColorsArray(['#000000','#ffffff','#aa0000','#00aa00','#0000aa','#dddd00'],method);
  const state=board([1,3,5]);state[8].isGold=true;state[8].k=4;
  const next=run({n:3,currentBoardState:state,currentPalette,gameOfLifeRules:{survival:[1,2,3],birth:[3],sortGenetics:true}});
  assert.equal(next[4].k,3,method);assert.equal(next[1].k,3,method);assert.equal(next[8],state[8]);
 }
 const state=board([1,1,1]);assert.equal(run({n:3,currentBoardState:state,currentPalette:palette,gameOfLifeRules:{...rules,sortGenetics:true}})[4].k,1);
});
test('B0 without parents retains the legacy result, including a one-color palette',()=>{
 for(const currentPalette of [palette,['#000000']]) {
 const context={n:1,currentBoardState:[{k:0,v:0}],currentPalette,gameOfLifeRules:{survival:[],birth:[0]}};
 assert.deepEqual(run(context),run({...context,gameOfLifeRules:{...context.gameOfLifeRules,sortGenetics:true}}));
 }
});
test('optional genetics survives settings files and normalization without changing legacy defaults',()=>{
 const settings=defaultWorkspaceSettings(),defaults=settings.cycles.gameOfLife;
 settings.cycles.gameOfLife[1]={...settings.cycles.gameOfLife[1],sortGenetics:true};
 const restored=deserializeWorkspaceSettings(serializeWorkspaceSettings(settings));
 assert.equal(restored.cycles.gameOfLife[1].sortGenetics,true);
 assert.equal(normalizeEvolutionCycle(restored.cycles.gameOfLife,defaults)[1].sortGenetics,true);
 assert.equal(defaultWorkspaceSettings().cycles.gameOfLife[1].sortGenetics,undefined);
 settings.cycles.gameOfLife[1].sortGenetics='true';assert.throws(()=>validateWorkspaceSettings(settings));
});
