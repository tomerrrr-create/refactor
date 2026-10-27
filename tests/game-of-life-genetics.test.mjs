import test from 'node:test';
import assert from 'node:assert/strict';
import {runGameOfLifeGeneration} from '../js/simulations/game_of_life.js';
import {getGeneticColor,findClosestColorIndex,sortColorsArray,SORT_MODES} from '../js/colors.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings,validateWorkspaceSettings} from '../js/workspace-settings.js';

const palette=['#000000','#ff0000','#00ff00','#0000ff','#ff00ff','#ffff00','#00ffff','#777777','#aa3300','#33aa00','#0033aa','#ffffff'];
function fixture(genetics='palette-order',ranks=[2,8,11]){
    const board=Array.from({length:9},()=>({k:0,v:0,isGold:false}));
    ranks.forEach((k,i)=>board[i]={k,v:k,isGold:false});
    return {n:3,currentBoardState:board,currentPalette:palette,gameOfLifeRules:{survival:[0,1,2,3,4,5,6,7,8],birth:[3],...(genetics?{genetics}:{})}};
}
test('palette genetics averages parent positions and only changes newborn colors',()=>{
    const context=fixture();const before=structuredClone(context);const after=runGameOfLifeGeneration(context);
    assert.equal(after[4].k,7);assert.equal(after[4].v,7);
    for(let i=0;i<3;i++)assert.equal(after[i].k,context.currentBoardState[i].k);
    assert.deepEqual(context,before);
});
test('RGB default remains nearest palette color to the rounded RGB average',()=>{
    const context=fixture(null),explicit=fixture('rgb');
    const expected=findClosestColorIndex(getGeneticColor([2,8,11].map(i=>palette[i]),'average'),palette);
    assert.equal(runGameOfLifeGeneration(context)[4].k,expected);
    assert.deepEqual(runGameOfLifeGeneration(context),runGameOfLifeGeneration(explicit));
});
test('palette genetics uses the current sorted positions, with fractional ranks rounded',()=>{
    for(const {method}of SORT_MODES){
        const context=fixture('palette-order',[1,2,8]);context.currentPalette=sortColorsArray(palette,method);
        assert.equal(runGameOfLifeGeneration(context)[4].k,4,method);
    }
});
test('gold, B0, one-color palettes and out-of-range inherited ranks stay safe',()=>{
    const protectedContext=fixture();protectedContext.currentBoardState[0].isGold=true;
    assert.deepEqual(runGameOfLifeGeneration(protectedContext)[0],protectedContext.currentBoardState[0]);
    const noParents=fixture('palette-order',[]);noParents.gameOfLifeRules.birth=[0];
    assert.equal(runGameOfLifeGeneration(noParents)[4].k,1);
    noParents.currentPalette=['#000000'];assert.equal(runGameOfLifeGeneration(noParents)[4].k,0);
    const legacyRanks=fixture('palette-order',[14,20,23]);assert.equal(runGameOfLifeGeneration(legacyRanks)[4].k,7);
});
test('shared genetics setting round-trips without extending any cycle preset',()=>{
    const old=defaultWorkspaceSettings();assert.equal(old.gameOfLifeGenetics,undefined);
    const settings={...old,gameOfLifeGenetics:'palette-order'};
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
    assert.deepEqual(settings.cycles,old.cycles);
    assert.throws(()=>validateWorkspaceSettings({...old,gameOfLifeGenetics:'unknown'}));
});
