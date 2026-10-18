import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindWave, advanceWindWave, createWindPainter, applyWindCell, WIND_DURATION, WIND_MAX_WAVES } from '../js/wind-paint.js';
import { sortColorsArray } from '../js/colors.js';

function finished(n, size, center, times) {
    const wave = createWindWave(n, center, size, 3, 0), cells = new Map(), visits = new Map();
    for (const time of times) advanceWindWave(wave, time, (i,k) => { cells.set(i,k); visits.set(i,(visits.get(i)||0)+1); });
    return { cells, visits };
}
test('wind fronts visit every tile once, retain palette bounds and are independent of frame rate', () => {
    for (const n of [1,7,249,327]) for (const center of [0, Math.floor(n*n/2), Math.floor(n*n*5/12), n*n-1]) {
        const steps = finished(n,264,center,Array.from({length:69},(_,i)=>i*WIND_DURATION/68));
        const once = finished(n,264,center,[WIND_DURATION]);
        assert.equal(steps.cells.size,n*n);
        assert.deepEqual([...steps.cells].sort((a,b)=>a[0]-b[0]),[...once.cells].sort((a,b)=>a[0]-b[0]));
        for (const [i,k] of steps.cells) { assert(k>=0&&k<264); assert.equal(steps.visits.get(i),1); }
    }
});
test('a ripple expands from contact rather than replacing the board at once',()=>{
    const wave=createWindWave(21,220,64,0,0), touched=[];
    advanceWindWave(wave,0,(i,k)=>touched.push([i,k]));assert.deepEqual(touched,[[220,0]]);
    advanceWindWave(wave,300,(i,k)=>touched.push([i,k]));assert(touched.length>1&&touched.length<441);
});
test('wind ranks follow the selected palette order',()=>{
    const colors=['#ff0000','#00ff00','#0000ff','#ffff00','#ffffff','#000000'];
    const a=sortColorsArray(colors,'luminance'),b=sortColorsArray(colors,'reversed');
    const {cells}=finished(7,colors.length,24,[WIND_DURATION]);
    assert.notDeepEqual([...cells.values()].map(k=>a[k]),[...cells.values()].map(k=>b[k]));

});
function painter(reduced=false){
 let time=0,id=0,frames=new Map(),starts=0,commits=0,painted=0;
 const p=createWindPainter({context:()=>({n:249,paletteLength:264,base:0}),paint:()=>painted++,
  onStart:()=>starts++,onCommit:()=>commits++,onFrame:()=>{},now:()=>time,reducedMotion:()=>reduced,
  requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>frames.delete(key)});
 return {p,setTime:t=>time=t,tick(t){time=t;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));},
  stats:()=>({starts,commits,painted,frames:frames.size})};
}
test('dragging is bounded, ignores other pointers, and commits once after waves settle',()=>{
 const h=painter();assert(h.p.down(1,1000));assert.equal(h.p.down(2,2000),false);
 for(let i=1;i<30;i++){h.setTime(i*120);h.p.move(2,1000+i*50);h.p.move(1,1000+i*249);assert(h.p.activeWaves<=WIND_MAX_WAVES);}
 assert.equal(h.stats().starts,1);h.p.up(2);h.p.up(1);h.tick(7000);
 assert.equal(h.stats().commits,1);assert.equal(h.stats().frames,0);assert(h.stats().painted>0);
 h.p.stop();assert.equal(h.stats().commits,1);
});
test('exit cancels pending frames and commits current artwork, and reduced motion settles immediately',()=>{
 const h=painter();h.p.down(1,300);h.tick(100);h.p.stop();const before=h.stats();
 assert.equal(before.commits,1);assert.equal(before.frames,0);assert.equal(h.p.activeWaves,0);h.tick(5000);assert.deepEqual(h.stats(),before);
 const reduced=painter(true);reduced.p.down(1,300);reduced.p.up(1);reduced.tick(16);assert.equal(reduced.stats().commits,1);assert.equal(reduced.stats().frames,0);
});

test('second touch stops active ripples, does not paint on its drag or release, and the next touch starts again',()=>{
 const h=painter();h.p.down(1,300);h.p.up(1);h.tick(150);const count=h.stats().painted;
 assert(h.p.activeWaves>0);assert(h.p.down(2,900));assert.equal(h.p.activeWaves,0);
 h.p.move(2,7000);h.p.up(2);h.tick(5000);
 assert.equal(h.stats().painted,count);assert.equal(h.stats().commits,1);assert.equal(h.stats().starts,1);assert.equal(h.stats().frames,0);
 h.p.down(3,900);h.p.up(3);assert(h.p.activeWaves>0);assert.equal(h.stats().starts,2);
});

const histogram=board=>[...board.reduce((map,tile)=>map.set(tile.k,(map.get(tile.k)||0)+1),new Map())].sort((a,b)=>a[0]-b[0]);
function ripple(board,n,options){
 const wave=createWindWave(n,Math.floor(n*n/2),264,0,0,options);
 for(let time=0;time<=WIND_DURATION;time+=40)advanceWindWave(wave,time,(i,k)=>applyWindCell(board,i,k,wave,time));
}
test('displacement moves the existing artwork without generating colors or changing protected gold cells',()=>{
 for(const n of [7,51,249,327]){
  const board=Array.from({length:n*n},(_,i)=>({k:i%23,v:i%23,isGold:i%97===0}));
  const before=structuredClone(board),counts=histogram(board);ripple(board,n,{mode:'displace'});
  assert.deepEqual(histogram(board),counts);assert(board.some((tile,i)=>tile.k!==before[i].k));
  for(let i=0;i<board.length;i++)if(before[i].isGold)assert.deepEqual(board[i],before[i]);
 }
});
test('displacement leaves a uniform board unchanged, while paint mode retains its original ring drawing',()=>{
 const blank=()=>Array.from({length:21*21},()=>({k:2,v:2,isGold:false}));
 const board=blank();ripple(board,21,{mode:'displace'});assert.deepEqual(board,blank());
 const painted=blank();ripple(painted,21,{mode:'paint'});assert(painted.some(tile=>tile.k!==2));
});
test('displacement strength changes the deformation while preserving the same color inventory',()=>{
 const make=()=>Array.from({length:51*51},(_,i)=>({k:i%264,v:i%264,isGold:false}));
 const gentle=make(),strong=make();ripple(gentle,51,{mode:'displace',strength:.25});ripple(strong,51,{mode:'displace',strength:3});
 assert.notDeepEqual(gentle.map(t=>t.k),strong.map(t=>t.k));assert.deepEqual(histogram(gentle),histogram(strong));
});

test('initial recipe gold metadata round-trips through the actual logger and macro handler; legacy stays unchanged',()=>{
 const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8'),events=[];
 const c=vm.createContext({n:2,activePaletteIndex:0,currentSortMethod:'luminance',separatorPx:0,pendingMacroPalette:null,
  boardState:[{k:1,isGold:true},{k:2,isGold:false},{k:3,isGold:true},{k:4,isGold:false}],
  compressBoardState:()=> '1x1,1x2,1x3,1x4',window:{logArtEvent:(name,details)=>events.push({eventName:name,details})},
  restoreSeparatorWidth(){},syncSelectedColorWithPalette(){},updatePaletteHeader(){},applySeparator(){},updateSortButtonUI(){},renderToScreen(){},artRecipeLog:[],console});
 c.initializeBoardAndCanvas=()=>{c.boardState=Array.from({length:c.n*c.n},()=>({k:0,v:0,isGold:false}));};
 vm.runInContext(source.slice(source.indexOf('      function logCurrentStateAsInit('),source.indexOf('      function areStatesEqual(')),c);
 vm.runInContext(source.slice(source.indexOf('function validateIslandsMacroAction('),source.indexOf('function parseMacroText(')),c);
 vm.runInContext(source.slice(source.indexOf('function executeMacroAction('),source.indexOf('async function initializeApp(')),c);
 c.logCurrentStateAsInit();const action=events[0];assert.deepEqual(JSON.parse(action.details).gold,[0,2]);
 c.executeMacroAction(action);assert.deepEqual(Array.from(c.boardState,t=>t.isGold),[true,false,true,false]);
 const legacy=JSON.parse(action.details);delete legacy.gold;c.executeMacroAction({eventName:'INIT_STATE',details:JSON.stringify(legacy)});
 assert.deepEqual(Array.from(c.boardState,t=>t.isGold),[false,false,false,false]);
 assert.throws(()=>c.validateIslandsMacroAction({eventName:'INIT_STATE',details:JSON.stringify({...legacy,gold:[4]})}),/Invalid initial gold/);
});
