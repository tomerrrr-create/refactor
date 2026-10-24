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

test('chosen dead color replaces rank zero for life, death and birth in both mixing modes',()=>{
 const currentPalette=['#000000','#800080','#ff0000','#0000ff'];
 const state=Array.from({length:9},()=>({k:1,v:1}));state[0].k=2;state[1].k=3;
 for(const sortGenetics of [false,true]){
  const next=run({n:3,currentBoardState:state,currentPalette,gameOfLifeRules:{survival:[],birth:[2],deadColor:'#800080',sortGenetics}});
  assert.equal(next[0].k,1);assert.equal(next[1].k,1); // Both parents die into the chosen color.
  assert.notEqual(next[4].k,1); // A birth never inherits the selected dead color.
 }
 const next=run({n:1,currentBoardState:[{k:0,v:0}],currentPalette,gameOfLifeRules:{survival:[0],birth:[],deadColor:'#800080'}});
 assert.equal(next[0].k,0); // Rank 0 is now a living color.
});

test('custom dead color is fixed across all sort orders and uses nearest color in a different palette',async()=>{
 const {resolveGameOfLifeDeadIndex}=await import('../js/game-of-life-settings.js');
 for(const {method} of SORT_MODES){
  const currentPalette=sortColorsArray(['#000000','#ffffff','#ff0000','#00ff00','#0000ff'],method);
  const index=resolveGameOfLifeDeadIndex({deadColor:'#FF0000'},currentPalette);
  assert.equal(currentPalette[index],'#ff0000');
  const next=run({n:1,currentBoardState:[{k:index,v:index}],currentPalette,gameOfLifeRules:{survival:[0],birth:[],deadColor:'#ff0000'}});
  assert.equal(next[0].k,index);
 }
 assert.equal(resolveGameOfLifeDeadIndex({deadColor:'#ff0000'},['#000000','#ee0000','#ffffff']),1);
 assert.equal(resolveGameOfLifeDeadIndex({},['#ffffff','#000000']),0);
});

test('duplicate dead swatches all count as dead and are excluded from newborn color selection',()=>{
 const currentPalette=['#ff0000','#800080','#800080','#0000ff'];
 const state=Array.from({length:9},()=>({k:1,v:1}));state[0].k=0;state[1].k=3;state[2].k=2;
 for(const sortGenetics of [false,true]){
  const next=run({n:3,currentBoardState:state,currentPalette,gameOfLifeRules:{survival:[],birth:[2],deadColor:'#800080',sortGenetics}});
  assert.equal(currentPalette[next[4].k],'#ff0000'); // Duplicate dead rank must not become a third living parent.
 }
 const only=run({n:1,currentBoardState:[{k:0,v:0}],currentPalette:['#ffffff'],gameOfLifeRules:{survival:[],birth:[0],deadColor:'#ffffff',sortGenetics:true}});
 assert.equal(only[0].k,0);
});

test('dead color settings round trip with independent cycle flags; malformed colors are rejected',()=>{
 const settings=defaultWorkspaceSettings();settings.cycles.gameOfLife[2]={...settings.cycles.gameOfLife[2],deadColor:'#112233',sortGenetics:true};
 const restored=deserializeWorkspaceSettings(serializeWorkspaceSettings(settings));
 assert.equal(restored.cycles.gameOfLife[2].deadColor,'#112233');assert.equal(restored.cycles.gameOfLife[0].deadColor,undefined);
 assert.equal(normalizeEvolutionCycle(restored.cycles.gameOfLife,defaultWorkspaceSettings().cycles.gameOfLife)[2].deadColor,'#112233');
 settings.cycles.gameOfLife[2].deadColor='invalid';assert.throws(()=>validateWorkspaceSettings(settings));
});

test('fixed sort anchors use original palette order across every display sort and palette change',async()=>{
 const {resolveGameOfLifeDeadIndex}=await import('../js/game-of-life-settings.js');
 for(const source of [
  ['#000000','#ffffff','#aa0000','#00aa00','#0000aa','#777777'],
  ['#221133','#eeeedd','#bb1100','#00bb44','#1144cc','#999999']
 ])for(const fixed of SORT_MODES){
  const expected=sortColorsArray(source,fixed.method)[0];
  for(const displayed of SORT_MODES){
   const palette=sortColorsArray(source,displayed.method);
   assert.equal(palette[resolveGameOfLifeDeadIndex({deadSortMethod:fixed.method},palette,source)],expected,fixed.method+' / '+displayed.method);
   assert.equal(resolveGameOfLifeDeadIndex({},palette,source),0);
  }
 }
});
test('fixed sort roots are cached across generations without re-sorting the palette',async()=>{
 const {resolveGameOfLifeDeadIndex}=await import('../js/game-of-life-settings.js');
 let iterations=0;const source=new Proxy(['#ff0000','#000000','#ffffff'],{get(target,key,receiver){if(key===Symbol.iterator)iterations++;return Reflect.get(target,key,receiver);}});
 const palette=['#ffffff','#ff0000','#000000'];
 assert.equal(resolveGameOfLifeDeadIndex({deadSortMethod:'luminance'},palette,source),2);
 const first=iterations;assert(first>0);
 for(let i=0;i<500;i++)assert.equal(resolveGameOfLifeDeadIndex({deadSortMethod:'luminance'},palette,source),2);
 assert.equal(iterations,first);
});
test('fixed sort controls actual death output in both mixing modes without changing the display sort',()=>{
 const source=['#000000','#ffffff','#ff0000','#0000ff'];
 for(const {method} of SORT_MODES)for(const sortGenetics of [false,true]){
  const currentPalette=sortColorsArray(source,method);
  const board=Array.from({length:9},(_,i)=>({k:i%4,v:0}));
  const next=run({n:3,currentBoardState:board,currentPalette,currentPaletteSource:source,gameOfLifeRules:{survival:[],birth:[],sortGenetics,deadSortMethod:'reversed'}});
  assert(next.every(t=>currentPalette[t.k]==='#ffffff'));
  assert.deepEqual(currentPalette,sortColorsArray(source,method));
 }
});
test('sort anchor settings serialize independently of the current palette and reject unknown methods',()=>{
 const settings=defaultWorkspaceSettings();settings.cycles.gameOfLife=settings.cycles.gameOfLife.map(r=>({...r,deadSortMethod:'temperature',sortGenetics:true}));
 const restored=deserializeWorkspaceSettings(serializeWorkspaceSettings(settings));
 assert(restored.cycles.gameOfLife.every(r=>r.deadSortMethod==='temperature'));
 assert(normalizeEvolutionCycle(restored.cycles.gameOfLife,defaultWorkspaceSettings().cycles.gameOfLife).every(r=>r.deadSortMethod==='temperature'));
 settings.cycles.gameOfLife[0].deadSortMethod='unknown';assert.throws(()=>validateWorkspaceSettings(settings));
});
