import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONTOUR_ACTION_RULES,validateContourActionRules} from '../js/contour-action-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {runContourGeneration} from '../js/simulations/contour.js';

test('Contours settings remain an optional independent extension of legacy profiles',()=>{
    const legacy=defaultWorkspaceSettings(),before=structuredClone(legacy.rules.contour);
    assert.equal(legacy.contourAction,undefined);
    const saved=deserializeWorkspaceSettings(serializeWorkspaceSettings({...legacy,contourAction:{sensitivity:90,lineColor:'lightest'}}));
    assert.deepEqual(saved.rules.contour,before);
    assert.deepEqual(saved.contourAction,{sensitivity:90,lineColor:'lightest'});
    saved.contourAction.lineColor='luminance';
    assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(saved)).contourAction,saved.contourAction);
    assert.deepEqual(validateContourActionRules(),DEFAULT_CONTOUR_ACTION_RULES);
    assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(legacy)).contourAction,undefined);
});

test('Contours can use the first Luminance color independently of the active sort',()=>{
    const originalPalette=['#000000','#333333','#ffffff','#888888'];
    const currentPalette=['#ffffff','#333333','#000000','#888888'];
    const currentBoardState=[0,3,3,0].map(k=>({k,v:k,isGold:false}));
    for(const [lineColor,index] of [['darkest',0],['lightest',3],['luminance',2]]){
        const board=runContourGeneration({n:2,currentBoardState,currentPalette,originalPalette,contourRules:{sensitivity:75,lineColor}});
        assert.deepEqual(board.map(tile=>tile.k),[index,index,index,index]);
    }
    assert.deepEqual(currentBoardState.map(tile=>tile.k),[0,3,3,0]);
});

test('invalid standalone rules are rejected before settings imports can alter a profile',()=>{
    for(const value of [null,[],{sensitivity:-1,lineColor:'darkest'},{sensitivity:101,lineColor:'darkest'},
        {sensitivity:75,lineColor:'brush'},{sensitivity:75,lineColor:'original-anchor'},
        {sensitivity:75,lineColor:'darkest',mode:'cracks'}]){
        assert.throws(()=>validateContourActionRules(value));
        assert.throws(()=>serializeWorkspaceSettings({...defaultWorkspaceSettings(),contourAction:value}));
    }
});
