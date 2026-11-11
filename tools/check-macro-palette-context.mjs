// Observe the actual player without rewriting actions or mocking palette decisions.
// PALETTE_RECIPE optionally supplies the original reported 21-checkpoint fixture.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {PALETTES} from '../js/data/palettes.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const A=PALETTES.findIndex(p=>p.originalName==='Jade Tides 264'),O=PALETTES.findIndex(p=>p.originalName==='Autumn into Winter 264'),B=PALETTES.findIndex(p=>p.originalName==='Glacier Pulse 264'),C=PALETTES.findIndex(p=>p.originalName==='Northern Lights HD');
assert([A,O,B,C].every(i=>i>=0));
let source=await readFile(root+'studio/engine/js/app.js','utf8');
source=source.replace('window.macroVideoEngine = {',`
window.ruleState={trace:[],all:0};
const originalExecute=executeMacroAction;
executeMacroAction=action=>{
 const before=activePaletteIndex;
 originalExecute(action);ruleState.all++;
 if(['INIT_STATE','ISLANDS_INIT','HISTORY_SETTINGS','Palette Change'].includes(action.eventName))ruleState.trace.push({event:action.eventName,before,after:activePaletteIndex});
};
window.paletteRuleTest={
 begin(text,pending){macroVideoEngine.start(text,520);pauseMacro();pendingMacroPalette=pending;currentMacroStep=0;ruleState={trace:[],all:0};playMacro();},
 status(){return {playing:isMacroPlaying,index:currentMacroStep,all:ruleState.all,palette:activePaletteIndex,trace:ruleState.trace,error:window.macroVideoError};},
 result(){return {...this.status(),board:boardState.map(t=>[t.k,t.v,t.isGold]),sort:currentSortMethod,n};},
 pause(){pauseMacro();},resume(){playMacro();},stop(){stopMacro();},
 async tick(ms){await exportClock.tickAsync(ms);return this.status();},
 resolved(text){return parseMacroText(text).map(a=>'['+new Date(a.delta).toISOString().slice(11,23)+']'+(a.isGenBased?' [GEN:'+a.targetGen+']':'')+' '+a.eventName+' -> '+a.details).join('\\n');}
};
window.macroVideoEngine = {`);
const server=createServer(async(req,res)=>{try{let f=new URL(req.url,'http://local').pathname.slice(1);if(f.endsWith('/'))f+='index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='studio/engine/js/app.js'?source:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const names=['noUndo','strokeUndo','strokeUndoRedo','paletteUndo','paletteUndoRedo','afterPaletteStrokeUndo','legacyUndo','sameExplicit','sameExplicitUndoDraw','differentSnapshot','differentSnapshotRepeat','multiUndo','multiRedo','secondInit','legacyBoard'];
function fixture(kind){const lines=[];let cursor=0;const add=(e,d)=>lines.push(`[00:00:${String(Math.floor(lines.length*80/1000)).padStart(2,'0')}.${String(lines.length*80%1000).padStart(3,'0')}] ${e} -> ${typeof d==='string'?d:JSON.stringify(d)}`);const settings=pal=>({n:5,activePaletteIndex:pal,separatorPx:0,currentSortMethod:'luminance'});const init=pal=>({...(kind==='legacyUndo'?{}:{recipeVersion:2}),n:5,pal,sort:'luminance',sep:0,board:'25x5'});const commit=id=>{add('HISTORY_ACTION',{recipeVersion:2,id,from:cursor,to:lines.length});cursor=lines.length;};const undo=(id,pal)=>{add('UNDO',{recipeVersion:2,id,settings:settings(pal)});cursor=lines.length;};const redo=(id,pal)=>{add('REDO',{recipeVersion:2,id,settings:settings(pal)});cursor=lines.length;};const change=pal=>add('Palette Change',PALETTES[pal].originalName+' | Sort: luminance');const draw=()=>add('DRAW_STROKE','[{"i":4,"k":3}]');
 add('INIT_STATE',init(A));
 switch(kind){
 case 'noUndo':draw();commit(1);break;
 case 'strokeUndo':draw();commit(1);undo(1,A);break;
 case 'strokeUndoRedo':draw();commit(1);undo(1,A);redo(1,A);break;
 case 'paletteUndo':change(B);commit(1);undo(1,A);break;
 case 'paletteUndoRedo':change(B);commit(1);undo(1,A);redo(1,B);break;
 case 'afterPaletteStrokeUndo':change(B);commit(1);draw();commit(2);undo(2,B);break;
 case 'legacyUndo':draw();add('UNDO','---');break;
 case 'sameExplicit':change(A);break;
 case 'sameExplicitUndoDraw':change(A);commit(1);draw();commit(2);undo(2,A);break;
 case 'differentSnapshot':add('HISTORY_SETTINGS',settings(B));break;
 case 'differentSnapshotRepeat':add('HISTORY_SETTINGS',settings(B));draw();add('HISTORY_SETTINGS',settings(B));break;
 case 'multiUndo':change(B);commit(1);change(C);commit(2);undo(2,B);undo(1,A);break;
 case 'multiRedo':change(B);commit(1);change(C);commit(2);undo(2,B);undo(1,A);redo(1,B);redo(2,C);break;
 case 'secondInit':change(B);add('INIT_STATE',init(B));add('HISTORY_SETTINGS',settings(B));break;
 case 'legacyBoard':add('ISLANDS_INIT',{islandsVersion:1,seed:1,state:1,steps:0,...settings(B),board:[[25,5,5,0]]});add('HISTORY_SETTINGS',settings(B));break;
 }
 add('DRAW_STROKE','[{"i":5,"k":2}]');return lines.join('\n');}
const expected=(kind,override)=>['paletteUndoRedo','afterPaletteStrokeUndo','differentSnapshot','differentSnapshotRepeat'].includes(kind)?B:kind==='multiRedo'?C:['sameExplicit','sameExplicitUndoDraw'].includes(kind)?A:['secondInit','legacyBoard'].includes(kind)?override??B:override??A;
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/studio/engine/index.html?computed=1');for(let i=0;i<100;i++){if(await page.evaluate(()=>window.macroVideoEngine?.ready))break;await page.evaluate(async()=>{if(window.exportClock)await exportClock.tickAsync(100);});await page.waitForTimeout(20);}
const run=async(text,override)=>{await page.evaluate(args=>paletteRuleTest.begin(...args),[text,override]);for(let i=0;i<250;i++){const s=await page.evaluate(()=>paletteRuleTest.tick(40));assert(!s.error,s.error);if(!s.playing)return page.evaluate(()=>paletteRuleTest.result());}throw Error('Fixture stalled');};
let runs=0;
for(const kind of names){const raw=fixture(kind);for(const form of ['raw','resolved']){const text=form==='raw'?raw:await page.evaluate(text=>paletteRuleTest.resolved(text),raw);for(const override of [null,O,A]){const result=await run(text,override);runs++;assert.equal(result.palette,expected(kind,override),kind+' '+form+' '+override);if(kind==='paletteUndoRedo'&&override===O){assert.equal(result.trace.find(e=>e.event==='HISTORY_SETTINGS').after,O,'Undo returns to selected opening palette');}}}}
// Pause/resume retains provenance; restart/file replacement must not inherit it.
await page.evaluate(args=>paletteRuleTest.begin(...args),[fixture('strokeUndoRedo'),O]);
await page.evaluate(()=>paletteRuleTest.tick(40));await page.evaluate(()=>paletteRuleTest.pause());
const paused=await page.evaluate(()=>paletteRuleTest.result());await page.evaluate(()=>paletteRuleTest.tick(500));
assert.deepEqual(await page.evaluate(()=>paletteRuleTest.result()),paused,'pause freezes state');
await page.evaluate(()=>paletteRuleTest.resume());for(let i=0;i<100;i++){if(!(await page.evaluate(()=>paletteRuleTest.tick(40))).playing)break;}
assert.equal((await page.evaluate(()=>paletteRuleTest.result())).palette,O,'resume retains override');
await page.evaluate(()=>paletteRuleTest.stop());assert.equal((await run(fixture('noUndo'),null)).palette,A,'replacement clears previous opening choice');
assert.equal((await run(fixture('strokeUndo'),O)).palette,O,'fresh restart restores context');
console.log(JSON.stringify({matrixRuns:runs,scenarios:names.length,sourceForms:2,openingChoices:3,lifecyclePassed:true}));
if(process.env.PALETTE_RECIPE){
const attached=await readFile(process.env.PALETTE_RECIPE,'utf8');
await page.evaluate(args=>paletteRuleTest.begin(...args),[attached,O]);
let complete=false;
for(let batch=0;batch<160;batch++){
 const status=await page.evaluate(async()=>{for(let i=0;i<100;i++){const s=await paletteRuleTest.tick(40);if(!s.playing||s.error)return s;}return paletteRuleTest.status();});
 assert(!status.error,status.error);if(batch%20===0)console.log(JSON.stringify({fullFileBatch:batch,actions:status.all,palette:status.palette,history:status.trace.filter(a=>a.event==='HISTORY_SETTINGS').length}));
 if(!status.playing){complete=true;const histories=status.trace.filter(a=>a.event==='HISTORY_SETTINGS');const changes=status.trace.filter(a=>a.event==='Palette Change');assert.equal(histories.length,21);assert.equal(changes.length,16);const beforeChanges=status.trace.slice(0,status.trace.findIndex(a=>a.event==='Palette Change'));assert(beforeChanges.filter(a=>a.event==='HISTORY_SETTINGS').every(a=>a.after===O),'chosen palette survives all initial technical restores');assert.equal(status.palette,A,'intentional final Jade switch is retained');console.log(JSON.stringify({fullFileComplete:true,actions:status.all,historyChecks:histories.length,explicitPaletteChanges:changes.length,finalPalette:status.palette,openingOverridePreserved:true}));break;}
}
assert(complete,'Full file did not finish within controlled clock limit');
}
}finally{await browser.close();server.close();}
