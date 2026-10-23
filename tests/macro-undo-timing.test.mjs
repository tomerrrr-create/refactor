import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { prepareWindMacro } from '../js/wind-recording.js';
import { normalizeWindSettings } from '../js/wind-settings.js';

const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const context=vm.createContext({prepareWindMacro});
vm.runInContext(source.slice(source.indexOf('function getHistorySettings('),source.indexOf('function toggleMacroFullScreen(')),context);
const settings={n:1,activePaletteIndex:0,separatorPx:0,currentSortMethod:'luminance'};
function recipe(base=12*3600000) {
    const lines=[];let cursor=0;
    function add(ms,name,value,gen=null){
        const stamp=new Date(base+ms).toISOString().slice(11,23);
        lines.push(`[${stamp}]${gen===null?'':` [GEN:${gen}]`} ${name} -> ${typeof value==='string'?value:JSON.stringify(value)}`);
    }
    add(0,'INIT_STATE',{recipeVersion:2,n:1,pal:0,sep:0,sort:'luminance',board:'1x0'});
    return {lines,add,
        stroke(ms,k){add(ms,'DRAW_STROKE',[{i:0,k}]);},
        commit(ms,id){add(ms,'HISTORY_ACTION',{recipeVersion:2,id,from:cursor,to:lines.length});cursor=lines.length;},
        undo(ms,id){add(ms,'UNDO',{recipeVersion:2,id,settings});cursor=lines.length;},
        redo(ms,id){add(ms,'REDO',{recipeVersion:2,id,settings});cursor=lines.length;},
        parse(){return JSON.parse(JSON.stringify(context.parseMacroText(lines.join('\n'))));}};
}
const kinds=actions=>actions.map(a=>[a.eventName,a.delta]);

test('a cancelled twenty-second trial and the Undo checkpoint add no wait',()=>{
 const r=recipe();r.stroke(100,1);r.commit(100,1);
 r.add(200,'BRUSH_START',{version:1});r.stroke(200,2);r.stroke(15000,2);r.add(20000,'BRUSH_END',{version:1});r.commit(20000,2);
 r.undo(21000,2);r.stroke(21200,1);r.commit(21200,3);
 assert.deepEqual(kinds(r.parse()),[['INIT_STATE',0],['DRAW_STROKE',100],['HISTORY_SETTINGS',100],['DRAW_STROKE',300]]);
});

test('repeated nested Undo/Redo does not subtract an interval twice or accumulate checkpoint waits',()=>{
 const r=recipe();for(let id=1;id<=3;id++){r.stroke(id*100,id);r.commit(id*100,id);}
 r.undo(5000,3);r.undo(10000,2);r.redo(20000,2);r.undo(30000,2);r.stroke(30200,2);r.commit(30200,4);
 const actions=r.parse();assert.equal(actions.at(-1).delta,300);
 assert.deepEqual(actions.filter(a=>a.eventName==='DRAW_STROKE').map(a=>JSON.parse(a.details)[0].k),[1,2]);
 assert(actions.filter(a=>a.eventName==='HISTORY_SETTINGS').every(a=>a.delta===100));
});

test('Redo restores the full rhythm of a stroke but not deliberation before Redo',()=>{
 const r=recipe();r.stroke(100,1);r.commit(100,1);
 r.add(1000,'BRUSH_START',{version:1});r.stroke(1000,2);r.stroke(3500,1);r.add(3600,'BRUSH_END',{version:1});r.commit(3600,2);
 r.undo(10000,2);r.redo(30000,2);r.stroke(30200,2);r.commit(30200,3);
 const actions=r.parse(),start=actions.find(a=>a.eventName==='BRUSH_START'),end=actions.find(a=>a.eventName==='BRUSH_END');
 assert.equal(start.delta,100);assert.equal(end.delta-start.delta,2600);assert.equal(actions.at(-1).delta,2900);
 assert.deepEqual(actions.filter(a=>a.eventName==='DRAW_STROKE').map(a=>a.delta),[100,100,2600,2900]);
});

test('cancelled simulation time disappears; retained generations, rule changes and later runs stay exact',()=>{
 const r=recipe();r.add(100,'PLAY','Armed: spiral | Rules: {"method":"b"}');
 r.add(4100,'PAUSE','---',40);r.commit(4100,1);
 r.add(5000,'PLAY','Armed: gravitationalSort | Rules: {}');r.add(25000,'PAUSE','---',250);r.commit(25000,2);r.undo(26000,2);
 r.add(26200,'PLAY','Armed: spiral | Rules: {"method":"left"}');
 r.add(26700,'SIMULATION_RULES','Armed: spiral | Rules: {"method":"b"}',4);r.add(27000,'PAUSE','---',5);r.commit(27000,3);
 const actions=r.parse();assert.deepEqual(actions.filter(a=>a.eventName==='PAUSE').map(a=>[a.delta,a.targetGen]),[[4100,40],[5100,5]]);
 assert.equal(actions.find(a=>a.eventName==='HISTORY_SETTINGS').delta,4100);
 assert.equal(actions.find(a=>a.eventName==='SIMULATION_RULES').targetGen,4);
 assert(!actions.some(a=>a.targetGen===250));
});

test('Redo preserves time-based simulation changes within its run',()=>{
 const r=recipe();r.add(1000,'PLAY','Armed: breathe | Rules: {}');r.add(3000,'EVOLUTION_TUNING',{simulation:'breathe'});
 r.add(5000,'PAUSE','---');r.commit(5000,1);r.undo(10000,1);r.redo(20000,1);
 assert.deepEqual(kinds(r.parse()).filter(([name])=>['PLAY','EVOLUTION_TUNING','PAUSE'].includes(name)),[['PLAY',0],['EVOLUTION_TUNING',2000],['PAUSE',4000]]);
});

test('Wind drag intervals, batch clock and a following edit survive Undo/Redo',()=>{
 const r=recipe();const batch='test-wave';const config=normalizeWindSettings({mode:'ripple'});
 const wave=elapsed=>({windVersion:1,batch,elapsed,n:1,index:0,base:1,paletteLength:3,settings:config});
 r.add(1000,'WIND_WAVE',wave(0));r.add(1200,'WIND_WAVE',wave(200));
 r.add(3200,'WIND_END',{windVersion:1,batch,elapsed:2200,reason:'stop'});r.commit(3200,1);
 r.undo(10000,1);r.redo(20000,1);r.stroke(20300,2);r.commit(20300,2);
 const actions=r.parse(),wind=actions.filter(a=>a.eventName.startsWith('WIND_'));
 assert.deepEqual(wind.map(a=>[a.delta,a.windElapsed]),[[0,0],[200,200],[2200,2200]]);
 assert.equal(actions.at(-1).delta,2500);assert.equal(wind[1].isGenBased,false);
});

test('midnight crossing and a prior-log Undo do not create a day-long delay',()=>{
 const r=recipe(86399000);r.stroke(100,1);r.commit(100,1);r.stroke(1500,2);r.commit(1500,2);
 r.undo(5000,2);r.stroke(5200,1);r.commit(5200,3);assert.equal(r.parse().at(-1).delta,300);
 const missing=recipe();missing.stroke(100,1);missing.commit(100,1);missing.undo(10000,99);missing.stroke(10200,2);missing.commit(10200,2);
 assert.equal(missing.parse().at(-1).delta,300);
});

test('without Undo/Redo existing idle caps and meaningful durations remain unchanged',()=>{
 const r=recipe();r.add(10000,'BRUSH_START',{version:1});r.stroke(10000,1);r.stroke(13000,2);r.add(13100,'BRUSH_END',{version:1});r.commit(13100,1);
 r.add(20000,'PLAY','Armed: spiral | Rules: {}');r.add(25000,'PAUSE','---',30);r.commit(25000,2);
 assert.deepEqual(kinds(r.parse()),[['INIT_STATE',0],['BRUSH_START',1000],['DRAW_STROKE',1000],['DRAW_STROKE',4000],['BRUSH_END',4100],['PLAY',5100],['PAUSE',10100]]);
 const midnight=recipe(86399000);midnight.add(500,'PLAY','Armed: breathe | Rules: {}');midnight.add(2500,'PAUSE','---');midnight.commit(2500,1);
 assert.equal(midnight.parse().at(-1).delta,2500);
});

test('many interleaved edits keep final actions in order and playback time monotonic',()=>{
 let seed=327;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let session=0;session<80;session++){
  const r=recipe(session%2 ? 86399000:12*3600000),kept=[],redo=[];
  let time=0,nextId=1;
  for(let i=0;i<100;i++){
   time+=1+random(5000);
   const choice=random(3);
   if(choice===0&&kept.length){const id=kept.pop();redo.push(id);r.undo(time,id);}
   else if(choice===1&&redo.length){const id=redo.pop();kept.push(id);r.redo(time,id);}
   else {const id=nextId++;r.stroke(time,id);r.commit(time,id);kept.push(id);redo.length=0;}
  }
  const actions=r.parse();
  assert.deepEqual(actions.filter(a=>a.eventName==='DRAW_STROKE').map(a=>JSON.parse(a.details)[0].k),kept);
  for(let i=1;i<actions.length;i++){
   assert(actions[i].delta>=actions[i-1].delta);
   if(actions[i].eventName==='HISTORY_SETTINGS')assert.equal(actions[i].delta,actions[i-1].delta);
  }
 }
});
