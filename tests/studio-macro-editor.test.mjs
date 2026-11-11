import test from 'node:test';import assert from 'node:assert/strict';
import {restoreIslandsBoard} from '../js/simulations/islands.js';
import {freshStartIndices,makeCheckpoint,makeBoardCheckpoint,exportRange,actionGroups} from '../studio/macro-edit-model.js';
const a=(eventName,details='',delta=0)=>({eventName,details,delta,isGenBased:false});
const play=sim=>a('PLAY',`Armed: ${sim} | Sort: luminance | Rules: {}`);
const init=a('INIT_STATE',JSON.stringify({n:5,pal:0,sort:'luminance',sep:0,board:'25x1'}));
test('marks new runs, including live handoffs with a recorded pause, but never pause/resume',()=>{
 const actions=[init,play('turing'),a('PAUSE'),play('turing'),a('PAUSE'),a('Gravitational Sort Mode','up'),play('gravitationalSort'),a('PAUSE')];
 const safe=freshStartIndices(actions);assert(safe.includes(1));assert(!safe.includes(3));assert(safe.includes(6));
});
test('stroke/Wind crossings and resumed engine cursors are rejected',()=>{
 for(const [begin,end]of [['BRUSH_START','BRUSH_END'],['WIND_WAVE','WIND_END']]){const actions=[init,a(begin),play('turing'),a(end),a('PAUSE')];assert(!freshStartIndices(actions).includes(2));}
 for(const rules of [{steps:10},{state:{steps:10}},{cracksState:{steps:10}}])assert(!freshStartIndices([init,a('PLAY','Armed: cymatics | Sort: luminance | Rules: '+JSON.stringify(rules)),a('PAUSE')]).includes(1));
});
test('a dark board alone does not make a resumed engine independent',()=>{
 const actions=[init,play('turing'),a('PAUSE'),a('GO_DARK'),play('turing'),a('PAUSE')];assert(!freshStartIndices(actions).includes(3));assert(!freshStartIndices(actions).includes(4));
});
test('exports a copied starting board using only commands supported by the existing app',()=>{
 const actions=[init,a('DRAW_STROKE','[]',100),play('gravitationalSort'),a('PAUSE','---',1000)];
 const state={n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,tiles:[{k:1,v:1},{k:1,v:1,isGold:true},{k:2,v:2},{k:2,v:2}]};
 const before=structuredClone(actions),point={index:2,init:makeCheckpoint(state),boardCheckpoint:makeBoardCheckpoint(state),settings:{n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0}};
 const output=exportRange(actions,{start:point});assert(output.includes('"board":"2x1,2x2"'));assert(output.includes('"gold":[1]'));assert(!output.includes('freshStart'));assert(!output.includes('"values"'));assert(output.includes('ISLANDS_INIT ->'));assert(output.includes('PLAY -> Armed: gravitationalSort'));assert.deepEqual(actions,before);
});
test('stroke actions form one timeline group',()=>{assert.equal(actionGroups([a('BRUSH_START'),a('DRAW_STROKE','[]'),a('BRUSH_END')]).length,1);});

test('the existing checkpoint codec retains exact working values and gold without player changes',()=>{
 const state={n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,tiles:[{k:2,v:.125,isGold:true},{k:3,v:7.25,isGold:false},{k:0,v:-1,isGold:false},{k:1,v:0,isGold:false}]};
 const checkpoint=makeBoardCheckpoint(state);assert.deepEqual(restoreIslandsBoard(2,checkpoint.board),state.tiles);
});
