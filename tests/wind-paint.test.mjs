import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindWave, advanceWindWave, createWindPainter, WIND_DURATION, WIND_MAX_WAVES } from '../js/wind-paint.js';
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
