import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {normalizeWindSettings} from '../js/wind-settings.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{try{const rel=new URL(req.url,'http://local').pathname.slice(1);const name=rel.endsWith('/')?rel+'index.html':rel||'index.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'application/octet-stream');res.end(await readFile(path.join(root,'dist',name)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
const initial={recipeVersion:2,n:5,pal:0,sort:'luminance',sep:0,board:'25x1',smoothing:{display:false,bloom:false}};
function fixture(sim,rules={}){return [
 `[00:00:00.000] INIT_STATE -> ${JSON.stringify(initial)}`,
 '[00:00:00.100] DRAW_STROKE -> [{"i":12,"k":8,"isGold":true}]',
 `[00:00:00.300] PLAY -> Armed: ${sim} | Sort: luminance | Rules: ${JSON.stringify(rules)}`,
 '[00:00:02.000] [GEN:12] PAUSE -> ---',
 `[00:00:02.300] PLAY -> Armed: ${sim} | Sort: luminance | Rules: ${JSON.stringify(rules)}`,
 '[00:00:03.000] [GEN:8] PAUSE -> ---'].join('\n');}
try{for(const cfg of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844}]){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('colorGridBrushSize','9');localStorage.setItem('editor-storage-check','keep');});
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 let source=await readFile(path.join(root,'dist/studio/engine/js/app.js'),'utf8');
 source=source.replace('window.macroVideoEngine = {','window.editorTest={board:()=>getCurrentState(),parse:parseMacroText,rules:sim=>{if(isLifePlaying)pauseLife();isExecutingMacroCommand=true;armSimulation(null);armSimulation(sim,{recordIslandsStart:false});const details=getSimulationRecordingDetails();isExecutingMacroCommand=false;return JSON.parse(details.split(" | Rules: ")[1]);}};\nwindow.macroVideoEngine = {');
 await page.route('**/studio/engine/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base+'/studio/?lang='+cfg.lang);await page.waitForTimeout(600);const savedStorage=await page.evaluate(()=>JSON.stringify({...localStorage}));
 assert(!requests.some(u=>/\/(editor|macro-edit-model|macro-editor-engine)\.js$/.test(u)),'editor remains lazy');await page.locator('#editorTab').click();
 const getFrame=()=>page.frames().find(f=>f.url().includes('editor=1'));
 const state=()=>getFrame().evaluate(()=>macroEditorEngine.state()),board=()=>getFrame().evaluate(()=>editorTest.board());
 const phase=p=>page.waitForFunction(p=>document.getElementById('editorPanel').dataset.editorPhase===p,p,{timeout:30000});
 async function open(text,name='original.txt'){await page.locator('#editorFile').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>!document.getElementById('editorPlay').disabled,{timeout:60000});}
 async function save(){const task=page.waitForEvent('download');await page.locator('#editorSave').click();const d=await task;let text='';for await(const chunk of await d.createReadStream())text+=chunk;return text;}
 async function pauseAfter(ms){await page.waitForTimeout(ms);await page.locator('#editorPlay').click();await page.waitForFunction(()=>!document.getElementById('editorEnd').disabled);}
 const handoff=[`[00:00:00.000] INIT_STATE -> ${JSON.stringify(initial)}`,
 '[00:00:00.100] DRAW_STROKE -> [{"i":12,"k":8,"isGold":true}]',
 '[00:00:00.300] PLAY -> Armed: gravitationalSort | Sort: luminance | Rules: {"direction":"up"}',
 '[00:00:01.500] [GEN:80] PAUSE -> ---',
 '[00:00:01.500] Nudge Mode Changed -> nudgeBrighter',
 '[00:00:01.600] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}',
 '[00:00:03.600] [GEN:20] PAUSE -> ---',
 '[00:00:03.700] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}',
 '[00:00:04.500] [GEN:8] PAUSE -> ---'].join('\n');
 await open(handoff);assert.equal(await page.locator('[data-start],[data-hold]').count(),0,'transport works without using action list');
 assert(await page.locator('.editor-action-details').evaluate(e=>!e.open),'action list is optional');
 await page.locator('#editorPlay').click();await pauseAfter(650);assert.equal((await state()).simulation,'gravitationalSort');
 assert.match(await page.locator('#editorStart').textContent(),/next run|מהריצה הבאה/);
 await page.locator('#editorStart').click();await phase('paused');
 assert.equal((await state()).boundary,5,'automatically stopped before first Nudge step');assert.match(await page.locator('#editorRange').textContent(),/Nudge/);
 const fullCopy=await save();assert.doesNotMatch(fullCopy,/"freshStart"|"values"/,'only original logger fields are exported');
 await page.locator('#editorPlay').click();await pauseAfter(260);const paused=await board();assert((await state()).generation>0);
 assert(await page.locator('#editorStart').isDisabled(),'resume of same Nudge run is not a new run');assert.match(await page.locator('#editorPlayerHint').textContent(),/No new run|אין ריצה חדשה/);
 await page.locator('#editorEnd').click();const edited=await save();await page.locator('#editorPreview').click();await phase('complete');
 assert.deepEqual((await board()).tiles.map(t=>[t.k,t.v,t.isGold]),paused.tiles.map(t=>[t.k,t.v,t.isGold]),'handoff crop ending matches original playhead');
 assert.equal(await save(),edited,'saving after preview still uses original marks');
 // Navigate backward and forward from transport, with no list interaction.
 await page.locator('#editorPlay').click();await pauseAfter(650);await page.locator('#editorPreviousRun').click();await phase('paused');assert.equal((await state()).boundary,2);
 await page.locator('#editorNextRun').click();await phase('paused');assert.equal((await state()).boundary,5);
 await page.locator('#editorPreviousRun').click();await phase('paused');await page.locator('#editorPreviousRun').click();await phase('paused');assert.equal((await state()).lastIndex,-1);
 // First-generation starts for each seeded engine and hidden Turing buffers.
 let turingCopy;
 for(const sim of ['contour','cymatics','islands','turing','gameOfLife']){
  const rules=await getFrame().evaluate(sim=>editorTest.rules(sim),sim);await open(fixture(sim,rules).split('\n').slice(0,4).join('\n'),sim+'.txt');
  await page.locator('#editorNextRun').click();await phase('paused');assert.equal((await state()).boundary,2);await page.locator('#editorStart').click();
  const copy=await save();await page.locator('#editorPreview').click();await phase('complete');const selected=await board();
  await page.locator('#editorPlay').click();await phase('complete');const original=await board();
  assert.deepEqual(selected.tiles.map(t=>[t.k,t.v,t.isGold]),original.tiles.map(t=>[t.k,t.v,t.isGold]),sim+' portable checkpoint replay');
  if(sim==='turing')turingCopy={text:copy,tiles:original.tiles.map(t=>[t.k,t.v,t.isGold])};
  console.log(JSON.stringify({lang:cfg.lang,simulation:sim,passed:true}));
 }
 // Cancel while advancing a long preceding run, retaining the original range.
 const long=[`[00:00:00.000] INIT_STATE -> ${JSON.stringify(initial)}`,
 '[00:00:00.100] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}',
 '[00:00:50.000] [GEN:500] PAUSE -> ---','[00:00:50.100] PLAY -> Armed: turing | Sort: luminance | Rules: {}','[00:00:52.000] [GEN:12] PAUSE -> ---'].join('\n');
 await open(long,'long.txt');await page.locator('#editorPlay').click();await pauseAfter(180);const range=await page.locator('#editorRange').textContent();
 await page.locator('#editorStart').click();await page.locator('#editorPreparation').waitFor({state:'visible'});await page.locator('#editorCancel').click();await phase('paused');
 assert.equal(await page.locator('#editorRange').textContent(),range);assert.equal((await state()).lastIndex,-1);
 // No silent value loss at an unsupported floating-value checkpoint.
 const fractional=[`[00:00:00.000] INIT_STATE -> ${JSON.stringify({...initial,board:'12x0,13x10'})}`,
 '[00:00:00.100] PLAY -> Armed: brightnessEvo | Sort: luminance | Rules: {"mode":"brightness","tuning":{"smoothing":0.1,"contrast":0.1}}',
 '[00:00:00.600] [GEN:8] PAUSE -> ---','[00:00:00.700] PLAY -> Armed: turing | Sort: luminance | Rules: {}','[00:00:01.000] [GEN:5] PAUSE -> ---'].join('\n');
 await open(fractional,'fractional.txt');await page.locator('#editorNextRun').click();await phase('paused');await page.locator('#editorNextRun').click();await phase('paused');
 assert.equal((await state()).rejected.reason,'working-values');assert.match(await page.locator('#editorError').textContent(),/internal data|נתונים פנימיים/);
 assert.match(await page.locator('#editorRange').textContent(),/Original beginning|ההתחלה המקורית/);
 // End-only cuts close partial strokes / Wind fronts; Breathe ends at its stop.
 const wind={windVersion:1,batch:'test-wave',elapsed:0,n:5,index:12,base:3,paletteLength:23,settings:normalizeWindSettings({mode:'ripple',speed:1,range:1})};
 for(const type of ['brush','wind','breathe']){
  const events=type==='brush'?['[00:00:00.100] BRUSH_START -> {"version":1}','[00:00:00.100] DRAW_STROKE -> [{"i":0,"k":5}]','[00:00:01.000] DRAW_STROKE -> [{"i":1,"k":6}]','[00:00:01.100] BRUSH_END -> {"version":1}']:
   type==='wind'?['[00:00:00.100] WIND_WAVE -> '+JSON.stringify(wind),'[00:00:01.500] WIND_END -> '+JSON.stringify({windVersion:1,batch:'test-wave',elapsed:1400,reason:'complete'})]:
   ['[00:00:00.100] PLAY -> Armed: breathe | Sort: luminance | Rules: {"mode":"solo","tuning":{"speed":1,"depth":1}}','[00:00:01.200] PAUSE -> ---'];
  await open('[00:00:00.000] INIT_STATE -> '+JSON.stringify(initial)+'\n'+events.join('\n'),type+'.txt');await page.locator('#editorPlay').click();await pauseAfter(350);
  const expected=await board();await page.locator('#editorEnd').click();await page.waitForFunction(()=>['paused','complete'].includes(document.getElementById('editorPanel').dataset.editorPhase));await page.locator('#editorPreview').click();await phase('complete');
  assert.deepEqual((await board()).tiles.map(t=>[t.k,t.v,t.isGold]),expected.tiles.map(t=>[t.k,t.v,t.isGold]),type+' end remains replayable');
 }
 assert(await page.locator('#editorPanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await mkdir('/tmp/macro-editor-v3-check',{recursive:true});await page.screenshot({path:`/tmp/macro-editor-v3-check/${cfg.lang}-editor.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),savedStorage,'Studio leaves app preferences unchanged');
 await page.locator('#editorFile').setInputFiles({name:'old-experiment.txt',mimeType:'text/plain',buffer:Buffer.from('[00:00:00.000] INIT_STATE -> '+JSON.stringify({...initial,values:Array(25).fill(1)}))});
 await page.waitForFunction(()=>document.getElementById('editorError').textContent.length>0);assert(await page.locator('#editorCanvas').isHidden());assert(await page.locator('#editorPlay').isDisabled());
 // Main app and PWA remain byte-for-byte identical to work/main. Exercise
 // downloaded files using that unchanged app, including a tainted Turing run.
 if(cfg.lang==='en'){
  await page.locator('#videoTab').click();await page.locator('#file').setInputFiles({name:'edited.txt',mimeType:'text/plain',buffer:Buffer.from(edited)});await page.waitForFunction(()=>!document.getElementById('start').disabled);await page.locator('#start').click();await page.locator('#download').waitFor({state:'visible',timeout:60000});
  await page.locator('#editorTab').click();
  const app=await context.newPage();app.on('pageerror',e=>errors.push(e.message));let appSource=await readFile(path.join(root,'dist/js/app.js'),'utf8');
  appSource=appSource.replace('      initializeApp();','window.appEditTest={board:()=>getCurrentState(),loaded:()=>isMacroLoaded,dirty:()=>{isExecutingMacroCommand=true;armSimulation(null);armSimulation("turing");isExecutingMacroCommand=false;turingState={isInitialized:true,A:new Float32Array(25).fill(0),B:new Float32Array(25).fill(1),nextA:new Float32Array(25),nextB:new Float32Array(25),lastBoardK:Uint16Array.from({length:25},(_,i)=>i===12?8:1)};}};initializeApp().then(()=>appEditTest.ready=true);');
  for(const ms of [5000,1500,2000])appSource=appSource.replace('await new Promise(r => setTimeout(r, '+ms+'));','');await app.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:appSource}));await app.goto(base);await app.waitForFunction(()=>window.appEditTest?.ready);await app.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  await app.locator('#projectFileInput').setInputFiles({name:'crop.txt',mimeType:'text/plain',buffer:Buffer.from(edited)});await app.locator('#btnMacroPlay').click();await app.waitForFunction(()=>!appEditTest.loaded());
  assert.deepEqual((await app.evaluate(()=>appEditTest.board())).tiles.map(t=>[t.k,t.v,t.isGold]),paused.tiles.map(t=>[t.k,t.v,t.isGold]));
  await app.evaluate(()=>appEditTest.dirty());await app.locator('#projectFileInput').setInputFiles({name:'turing.txt',mimeType:'text/plain',buffer:Buffer.from(turingCopy.text)});await app.locator('#btnMacroPlay').click();await app.waitForFunction(()=>!appEditTest.loaded());
  assert.deepEqual((await app.evaluate(()=>appEditTest.board())).tiles.map(t=>[t.k,t.v,t.isGold]),turingCopy.tiles);await app.close();
 }
 // Preference isolation checked before opening the ordinary app, whose own
 // initialization legitimately updates preferences.
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...cfg,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
