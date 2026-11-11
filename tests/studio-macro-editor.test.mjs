import test from 'node:test';import assert from 'node:assert/strict';
import {restoreIslandsBoard} from '../js/simulations/islands.js';
import {freshStartIndices,repairOpeningPalette,randomStartIndices,randomSetupActions,makeCheckpoint,makeBoardCheckpoint,exportRange,actionGroups} from '../studio/macro-edit-model.js';
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

test('only independent full-fill Random commands qualify for immediate starts',()=>{
 const source=[init,play('turing'),a('PAUSE'),a('--','Palette Randomized'),a('Gravitational Sort Mode','up'),play('gravitationalSort'),a('PAUSE')];
 assert.deepEqual(randomStartIndices(source),[3]);
 assert.deepEqual(randomStartIndices([init,play('turing'),a('--','Palette Randomized'),a('PAUSE')]),[]);
 assert.deepEqual(randomStartIndices([init,play('turing'),a('PAUSE'),a('--','Palette Randomized'),play('turing'),a('PAUSE')]),[]);
 assert.deepEqual(randomStartIndices([init,a('SHUFFLE_COLORS','[]'),play('gravitationalSort'),a('PAUSE')]),[]);
});
test('Random setup reconstructs metadata without replaying simulations, drawing or old random fills',()=>{
 const source=[init,play('turing'),a('PAUSE'),a('GRID_RESIZE','7'),a('Sort by','reversed'),a('SEPARATOR_CHANGE','0'),a('DRAW_STROKE','[]'),a('--','Palette Randomized'),play('gravitationalSort'),a('PAUSE')];
 const before=structuredClone(source),setup=randomSetupActions(source,7);
 assert(!setup.some(x=>['PLAY','STEP FORWARD','DRAW_STROKE'].includes(x.eventName)));assert(setup.every(x=>x.delta===0&&!x.isGenBased));assert.equal(setup.filter(x=>x.eventName==='--').length,1);assert(setup.some(x=>x.eventName==='Sort by'&&x.details==='reversed'));assert.deepEqual(source,before);
});
test('Random exports retain re-randomization and contain only a blank starting board',()=>{
 const source=[init,a('--','Palette Randomized'),play('gravitationalSort'),a('PAUSE')];
 const state={n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,tiles:[{k:9,v:9},{k:7,v:7},{k:5,v:5},{k:3,v:3}]};
 const point={index:1,random:true,init:makeCheckpoint(state),boardCheckpoint:makeBoardCheckpoint(state),settings:{n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0}};
 const output=exportRange(source,{start:point});assert(output.includes('"board":"4x0"'));assert(output.includes('"board":[[4,0,0,0]]'));assert(output.includes('-- -> Palette Randomized'));assert(!output.includes('"board":"1x9'));assert(!output.includes('STUDIO_'));
});

test('a paused Random can restart board-only Gravity without retaining its previous run',()=>{
 const source=[init,play('gravitationalSort'),a('PAUSE'),a('--','Palette Randomized'),play('gravitationalSort'),a('PAUSE')];
 assert.deepEqual(randomStartIndices(source),[3]);
});

test('Random bootstrap starts at INIT_STATE even with earlier startup setting records',()=>{
 const source=[a('Sort by','reversed'),init,a('--','Palette Randomized'),play('gravitationalSort'),a('PAUSE')];
 const setup=randomSetupActions(source,2);assert.equal(setup[0].eventName,'INIT_STATE');assert.equal(JSON.parse(setup[0].details).sort,'luminance');
});

test('both export prefixes restore settings before the palette-override-aware board checkpoint',()=>{
 const source=[init,a('--','Palette Randomized'),play('gravitationalSort'),a('PAUSE')];
 const state={n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,tiles:Array.from({length:4},()=>({k:1,v:1,isGold:false}))};
 for(const random of [false,true]){
  const point={index:random?1:2,random,init:makeCheckpoint(state),boardCheckpoint:makeBoardCheckpoint(state),settings:{n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0}};
  const output=exportRange(source,{start:point});assert(output.indexOf('HISTORY_SETTINGS ->')<output.indexOf('ISLANDS_INIT ->'));
 }
});

test('old Studio opening palette repair keeps later palette changes and is idempotent',()=>{
 const source=[init,a('--','Palette Randomized'),play('gravitationalSort'),a('Palette Change','Later palette | Sort: luminance',1000),a('PAUSE','---',1100)];
 const state={n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,tiles:Array.from({length:4},()=>({k:1,v:1}))};
 const point={index:1,random:true,init:makeCheckpoint(state),boardCheckpoint:makeBoardCheckpoint(state),settings:{n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0}};
 const fixed=exportRange(source,{start:point});const lines=fixed.split('\n');const legacy=[lines[0],lines[1],lines[3],lines[4],lines[2],...lines.slice(5)].join('\n');
 const repaired=repairOpeningPalette(legacy);assert(repaired.changed);assert.equal(repaired.text,fixed);assert.equal(repairOpeningPalette(repaired.text).changed,false);assert.equal(repairOpeningPalette(legacy.replaceAll('\n','\r\n')).text,fixed.replaceAll('\n','\r\n'));
 assert.deepEqual(repairOpeningPalette('ordinary macro text'),{changed:false,text:'ordinary macro text'});
});
