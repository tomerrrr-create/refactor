import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONTOUR_ACTION_RULES,validateContourActionRules} from '../js/contour-action-settings.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';

test('Contours settings remain an optional independent extension of legacy profiles',()=>{
    const legacy=defaultWorkspaceSettings(),before=structuredClone(legacy.rules.contour);
    assert.equal(legacy.contourAction,undefined);
    const saved=deserializeWorkspaceSettings(serializeWorkspaceSettings({...legacy,contourAction:{sensitivity:90,lineColor:'lightest'}}));
    assert.deepEqual(saved.rules.contour,before);
    assert.deepEqual(saved.contourAction,{sensitivity:90,lineColor:'lightest'});
    assert.deepEqual(validateContourActionRules(),DEFAULT_CONTOUR_ACTION_RULES);
    assert.equal(deserializeWorkspaceSettings(serializeWorkspaceSettings(legacy)).contourAction,undefined);
});

test('invalid standalone rules are rejected before settings imports can alter a profile',()=>{
    for(const value of [null,[],{sensitivity:-1,lineColor:'darkest'},{sensitivity:101,lineColor:'darkest'},
        {sensitivity:75,lineColor:'brush'},{sensitivity:75,lineColor:'original-anchor'},
        {sensitivity:75,lineColor:'darkest',mode:'cracks'}]){
        assert.throws(()=>validateContourActionRules(value));
        assert.throws(()=>serializeWorkspaceSettings({...defaultWorkspaceSettings(),contourAction:value}));
    }
});
