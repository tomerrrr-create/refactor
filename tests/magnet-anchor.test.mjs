import test from 'node:test';
import assert from 'node:assert/strict';
import { magnetAnchorIndex } from '../js/magnet-anchor.js';
import { runMagnetGeneration } from '../js/simulations/magnet.js';
import { defaultWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings } from '../js/workspace-settings.js';

test('Root and manual anchors retain their legacy defaults; darkest follows palette across sorts', () => {
 const original=['#ffffff','#000000','#ff0000'];
 for(const palette of [original,[...original].reverse(),['#ff0000','#ffffff','#000000']]) {
  assert.equal(magnetAnchorIndex(palette,{anchorColorIndex:-1}),-1);
  assert.equal(magnetAnchorIndex(palette,{anchorColorIndex:1}),1);
  assert.equal(palette[magnetAnchorIndex(palette,{anchorColor:'luminance',anchorColorIndex:1},original)],'#000000');
 }
 assert.equal(magnetAnchorIndex(['#ffffff','#333333'],{anchorColor:'luminance'}),1);
 assert.equal(magnetAnchorIndex(['#000000','#000000'],{anchorColor:'luminance'}),0);
});

test('all four engines match an explicitly selected darkest anchor with identical randomness', () => {
 const palette=['#ffffff','#ff0000','#000000'];
 const board=Array.from({length:81},(_,i)=>({k:i%3,v:i%3,isGold:i===40}));
 const random=Math.random;
 try {for(const method of ['magnet','cosmic_magnet','time_magnet','expand']) {
  const run=rules=>{let cursor=0;Math.random=()=>((++cursor*97)%997)/997;let state=structuredClone(board);for(let i=0;i<4;i++)state=runMagnetGeneration({n:9,currentPalette:palette,currentBoardState:state,magnetRules:{method,...rules}});return state;};
  assert.deepEqual(run({anchorColorIndex:0,anchorColor:'luminance'}),run({anchorColorIndex:2}),method);
 }} finally {Math.random=random;}
});

test('settings preserve optional anchor choice and reject unsupported values', () => {
 const settings=defaultWorkspaceSettings();
 assert(!Object.hasOwn(settings.rules.magnet,'anchorColor'));
 settings.rules.magnet.anchorColor='luminance';settings.rules.magnet.anchorColorIndex=3;
 assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
 settings.rules.magnet.anchorColor='unknown';assert.throws(()=>serializeWorkspaceSettings(settings));
});
