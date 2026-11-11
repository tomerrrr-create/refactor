import test from 'node:test';
import assert from 'node:assert/strict';
import {runSpiralGeneration} from '../js/simulations/spiral.js';
import {projectTornadoParticle} from '../js/simulations/spiral-tornado.js';
import {runLegacyTornadoGeneration} from '../js/simulations/spiral-tornado-legacy.js';
import {runFlowTornadoGeneration} from '../js/simulations/spiral-tornado-flow.js';
import {defaultWorkspaceSettings,serializeWorkspaceSettings,deserializeWorkspaceSettings} from '../js/workspace-settings.js';
const make=n=>Array.from({length:n*n},(_,id)=>({id,k:id%23,v:id%23,isGold:id%41===0}));
const step=(n,board,rules)=>runSpiralGeneration({n,currentBoardState:board,currentPalette:Array(23),spiralRules:rules});
test('side projection makes a complete orbit, front/back depth and a narrowing vertical tube',()=>{
 const a=projectTornadoParticle(101,.3,0),b=projectTornadoParticle(101,.3,Math.PI),full=projectTornadoParticle(101,.3,Math.PI*2);
 assert(a.x>50&&b.x<50);assert(Math.abs(a.x-full.x)<1e-8);assert(Math.abs(a.y-full.y)<1e-8);
 const front=projectTornadoParticle(101,.3,Math.PI/2),back=projectTornadoParticle(101,.3,Math.PI*1.5);
 assert(front.z>0&&back.z<0);assert(front.y<back.y,'ground-level perspective reveals underside');
 assert(projectTornadoParticle(101,.1,0).radius>projectTornadoParticle(101,.9,0).radius*3);
});
for(const n of [1,2,9,32,100])test(`particle rendering stays in the palette and preserves protected cells: ${n}`,()=>{
 const board=make(n),gold=structuredClone(board.filter(t=>t.isGold)),refs=[...board],rules={method:'tornado',tornadoVersion:3,tornadoFrame:0};
 for(let g=0;g<40;g++){assert.equal(step(n,board,rules),board);assert.equal(rules.tornadoFrame,g+1);for(const tile of board)assert(Number.isInteger(tile.k)&&tile.k>=0&&tile.k<23);}
 for(const tile of gold)assert.deepEqual(board[tile.id],tile);assert(board.every((t,i)=>t===refs[i]));
});
test('explicit frame checkpoints resume exactly across cold geometry, resize and replay',()=>{
 const n=64,a=make(n),rules={method:'tornado',tornadoVersion:3,tornadoFrame:0};for(let i=0;i<20;i++)step(n,a,rules);
 const checkpoint=structuredClone(a),saved=structuredClone(rules);for(let i=0;i<40;i++)step(n,a,rules);
 step(9,make(9),{method:'tornado',tornadoVersion:3});for(let i=0;i<40;i++)step(n,checkpoint,saved);
 assert.deepEqual(a,checkpoint);assert.deepEqual(rules,saved);
});
test('particles continue around the tube rather than settling into a static shape',()=>{
 const n=64,board=make(n),rules={method:'tornado',tornadoVersion:3,tornadoFrame:400};step(n,board,rules);const before=structuredClone(board);for(let i=0;i<30;i++)step(n,board,rules);assert.notDeepEqual(before,board);
});
test('versions 1 and 2 retain their original algorithms',()=>{
 for(const [version,run]of [[1,runLegacyTornadoGeneration],[2,runFlowTornadoGeneration]]){
 const a=make(31),b=structuredClone(a),rules={method:'tornado',tornadoVersion:version};for(let i=0;i<20;i++){step(31,a,rules);run(31,b);}assert.deepEqual(a,b);
 }
});
test('new profiles select particles; all three versions and frame checkpoints round-trip',()=>{
 assert.equal(defaultWorkspaceSettings().rules.spiral.tornadoVersion,3);
 for(const version of [1,2,3]){const s=defaultWorkspaceSettings();s.rules.spiral={method:'tornado',tornadoVersion:version,tornadoFrame:123};assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(s)).rules.spiral,s.rules.spiral);}
});
