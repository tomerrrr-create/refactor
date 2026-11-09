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
 const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 let source=await readFile(path.join(root,'dist/studio/engine/js/app.js'),'utf8');
 source=source.replace('window.macroVideoEngine = {','window.editorTest={board:()=>getCurrentState(),parse:parseMacroText,rules:sim=>{if(isLifePlaying)pauseLife();isExecutingMacroCommand=true;armSimulation(null);armSimulation(sim,{recordIslandsStart:false});const details=getSimulationRecordingDetails();isExecutingMacroCommand=false;return JSON.parse(details.split(" | Rules: ")[1]);}};\nwindow.macroVideoEngine = {');
 await page.route('**/studio/engine/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base+'/studio/?lang='+cfg.lang);await page.waitForTimeout(600);
 const savedStorage=await page.evaluate(()=>JSON.stringify({...localStorage}));
 assert(!requests.some(u=>/\/(editor|macro-edit-model|macro-editor-engine)\.js$/.test(u)),'editor code must not load on video tab');
 await page.locator('#editorTab').click();
 const originalText=fixture('nudgeBrighter',{nudgeTimingVersion:1,intervalMs:100});
 const getFrame=()=>page.frames().find(f=>f.url().includes('editor=1'));
 const state=()=>getFrame().evaluate(()=>macroEditorEngine.state());
 const board=()=>getFrame().evaluate(()=>editorTest.board());
 async function open(text,name='original.txt'){
  await page.locator('#editorFile').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});
  await page.waitForFunction(()=>!document.getElementById('editorPlay').disabled,{timeout:60000});
 }
 async function completed(){await page.waitForFunction(()=>document.getElementById('editorPanel').dataset.editorPhase==='complete',{timeout:30000});}
 async function save(){const task=page.waitForEvent('download');await page.locator('#editorSave').click();const download=await task;let body='';for await(const chunk of await download.createReadStream())body+=chunk;assert.match(download.suggestedFilename(),/_edited\.txt$/);return body;}
 await open(originalText);
 assert.equal(await page.locator('#editorStart,[data-hold]').count(),0,'no disabled global Start here or preparatory pause controls');
 const choice=page.locator('[data-start="2"]');assert(await choice.isEnabled(),'Start here must be available immediately on load');
 assert.equal(await page.locator('[data-start]').count(),2,'original beginning and one fresh start; resumed PLAY is not a fresh start');
 await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'true');assert.equal((await state()).lastIndex,-1,'selection does not require playback');
 assert.match(await page.locator('#editorRange').textContent(),/Nudge/);
 const fullCopy=await save();assert.match(fullCopy,/"freshStart":true/);assert.match(fullCopy,/"values":/);
 assert.equal((await getFrame().evaluate(text=>editorTest.parse(text),fullCopy))[0].eventName,'INIT_STATE');
 await page.locator('#editorPreview').click();await completed();
 assert(await choice.isEnabled(),'choice stays usable after preview or passing the point');
 await page.locator('#editorPlay').click();await page.waitForTimeout(700);await page.locator('#editorPlay').click();
 await page.waitForFunction(()=>!document.getElementById('editorEnd').disabled);
 const paused=await board(),pauseState=await state();assert(pauseState.generation>0);
 await page.waitForTimeout(100);assert.deepEqual(await board(),paused,'paused preview freezes the entire engine');
 await page.locator('#editorEnd').click();const edited=await save();
 await page.locator('#editorPreview').click();await completed();
 assert.deepEqual((await board()).tiles.map(t=>[t.k,t.v,t.isGold]),paused.tiles.map(t=>[t.k,t.v,t.isGold]),'selected beginning/end replay equals source at the chosen end');
 assert.equal(await save(),edited,'saving after preview must still use the original source and marks');
 await page.locator('#editorActions summary').first().click();await page.locator('#editorActions pre').first().waitFor();
 assert(await page.locator('#editorPanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'layout fits desktop and mobile');
 await mkdir('/tmp/macro-editor-v2-check',{recursive:true});await page.screenshot({path:`/tmp/macro-editor-v2-check/${cfg.lang}-editor.png`,fullPage:true});
 // Existing video tab can render the downloaded edited file independently.
 if(cfg.lang==='en'){
  await page.locator('#videoTab').click();await page.locator('#file').setInputFiles({name:'edited.txt',mimeType:'text/plain',buffer:Buffer.from(edited)});
  await page.waitForFunction(()=>!document.getElementById('start').disabled);await page.locator('#start').click();
  await page.locator('#download').waitFor({state:'visible',timeout:60000});assert.equal(await page.locator('#progress').getAttribute('value'),'100');
  await page.locator('#editorTab').click();
 }
 let turingCopy;
 for(const sim of ['contour','cymatics','islands','turing','gameOfLife']){
  const rules=await getFrame().evaluate(sim=>editorTest.rules(sim),sim);
  const contents=fixture(sim,rules).split('\n').slice(0,4).join('\n');await open(contents,sim+'.txt');
  const start=page.locator('[data-start="2"]');assert(await start.isEnabled());await start.click();
  await page.locator('#editorPreview').click();await completed();const selected=await board();
  const copy=await save();await page.locator('#editorPlay').click();await completed();const original=await board();
  assert.deepEqual(selected.tiles.map(t=>[t.k,t.v,t.isGold]),original.tiles.map(t=>[t.k,t.v,t.isGold]),sim+' automatic start preparation reproduces the source continuation');
  assert(await start.isEnabled(),'starts remain selectable after their playback position');
  if(sim==='turing')turingCopy={text:copy,tiles:original.tiles.map(t=>[t.k,t.v,t.isGold])};
  console.log(JSON.stringify({lang:cfg.lang,simulation:sim,passed:true}));
 }
 // Cancel a genuinely unfinished preparation. No waiting for the long run.
 const long=[`[00:00:00.000] INIT_STATE -> ${JSON.stringify(initial)}`,
 '[00:00:00.100] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}',
 '[00:00:50.000] [GEN:500] PAUSE -> ---',
 '[00:00:50.100] PLAY -> Armed: turing | Sort: luminance | Rules: {}',
 '[00:00:52.000] [GEN:12] PAUSE -> ---'].join('\n');
 await open(long,'long.txt');await page.locator('[data-start="3"]').click();await page.locator('#editorPreview').click();
 await page.locator('#editorPreparation').waitFor({state:'visible'});await page.locator('#editorCancel').click();
 await page.waitForFunction(()=>document.getElementById('editorPanel').dataset.editorPhase==='paused');
 assert.equal(await page.locator('[data-start="3"]').getAttribute('aria-pressed'),'true','cancel retains selected boundary');
 assert(await page.locator('#editorPreparation').isHidden());assert.equal((await state()).lastIndex,-1);
 // End-only editing inside an unfinished stroke or Wind batch.
 const wind={windVersion:1,batch:'test-wave',elapsed:0,n:5,index:12,base:3,paletteLength:23,settings:normalizeWindSettings({mode:'ripple',speed:1,range:1})};
 for(const type of ['brush','wind']){
  const events=type==='brush'?[
   '[00:00:00.100] BRUSH_START -> {"version":1}',
   '[00:00:00.100] DRAW_STROKE -> [{"i":0,"k":5}]',
   '[00:00:01.000] DRAW_STROKE -> [{"i":1,"k":6}]',
   '[00:00:01.100] BRUSH_END -> {"version":1}']:[
   '[00:00:00.100] WIND_WAVE -> '+JSON.stringify(wind),
   '[00:00:01.500] WIND_END -> '+JSON.stringify({windVersion:1,batch:'test-wave',elapsed:1400,reason:'complete'})];
  await open('[00:00:00.000] INIT_STATE -> '+JSON.stringify(initial)+'\n'+events.join('\n'),type+'.txt');
  await page.locator('#editorPlay').click();await page.waitForTimeout(400);await page.locator('#editorPlay').click();
  await page.waitForFunction(()=>!document.getElementById('editorEnd').disabled);const expected=await board();
  await page.locator('#editorEnd').click();await page.locator('#editorPreview').click();await completed();
  assert.deepEqual((await board()).tiles.map(t=>[t.k,t.v,t.isGold]),expected.tiles.map(t=>[t.k,t.v,t.isGold]),type+' partial gesture cut retains the paused result');
 }
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),savedStorage,'editing and video export preserve shared user preferences');
 if(cfg.lang==='en'){
  const appPage=await context.newPage();appPage.on('pageerror',e=>errors.push(e.message));
  let appSource=await readFile(path.join(root,'dist/js/app.js'),'utf8');
  appSource=appSource.replace('      initializeApp();','window.appEditTest={board:()=>getCurrentState(),loaded:()=>isMacroLoaded,dirtyTuring:()=>{isExecutingMacroCommand=true;armSimulation(null);armSimulation("turing");isExecutingMacroCommand=false;turingState={isInitialized:true,A:new Float32Array(25).fill(0),B:new Float32Array(25).fill(1),nextA:new Float32Array(25),nextB:new Float32Array(25),lastBoardK:Uint16Array.from({length:25},(_,i)=>i===12?8:1)};}};initializeApp().then(()=>appEditTest.ready=true);');
  for(const delay of [5000,1500,2000])appSource=appSource.replace('await new Promise(r => setTimeout(r, '+delay+'));','');
  await appPage.route(base+'/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:appSource}));
  await appPage.goto(base);await appPage.waitForFunction(()=>window.appEditTest?.ready);await appPage.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  await appPage.locator('#projectFileInput').setInputFiles({name:'cropped.txt',mimeType:'text/plain',buffer:Buffer.from(edited)});
  await appPage.locator('#btnMacroPlay').click();await appPage.waitForFunction(()=>!appEditTest.loaded(),{timeout:15000});
  assert.deepEqual((await appPage.evaluate(()=>appEditTest.board())).tiles.map(t=>[t.k,t.v,t.isGold]),paused.tiles.map(t=>[t.k,t.v,t.isGold]));
  await appPage.evaluate(()=>appEditTest.dirtyTuring());await appPage.locator('#projectFileInput').setInputFiles({name:'fresh-turing.txt',mimeType:'text/plain',buffer:Buffer.from(turingCopy.text)});
  await appPage.locator('#btnMacroPlay').click();await appPage.waitForFunction(()=>!appEditTest.loaded(),{timeout:15000});
  assert.deepEqual((await appPage.evaluate(()=>appEditTest.board())).tiles.map(t=>[t.k,t.v,t.isGold]),turingCopy.tiles,'fresh start discards retained Turing buffers');await appPage.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...cfg,passed:true}));await context.close();
}
 const deep=await browser.newContext({serviceWorkers:'block'}),entry=await deep.newPage();await entry.goto(base+'/studio/?lang=he&tab=edit');
 await entry.locator('#editorFile').waitFor({state:'visible'});assert.equal(await entry.locator('#editorTab').getAttribute('aria-selected'),'true');
 assert.equal(entry.frames().filter(f=>f.url().includes('editor=1')).length,0,'deep link does not create replay engine until a file is loaded');await deep.close();
}finally{await browser.close();server.close();}
