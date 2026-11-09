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
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},serviceWorkers:'block'}),page=await context.newPage();
 await context.addInitScript(()=>{localStorage.setItem('colorGridBrushSize','9');localStorage.setItem('colorGridNudgeInterval','150');localStorage.setItem('editor-storage-check','keep');});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 let source=await readFile(path.join(root,'dist/studio/engine/js/app.js'),'utf8');
 source=source.replace('window.macroVideoEngine = {','window.editorTest={board:()=>getCurrentState(),parse:parseMacroText,rules:sim=>{if(isLifePlaying)pauseLife();isExecutingMacroCommand=true;armSimulation(null);armSimulation(sim,{recordIslandsStart:false});const details=getSimulationRecordingDetails();isExecutingMacroCommand=false;return JSON.parse(details.split(" | Rules: ")[1]);}};\nwindow.macroVideoEngine = {');
 await page.route('**/studio/engine/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base+'/studio/?lang='+cfg.lang);await page.waitForTimeout(800);
 const savedStorage=await page.evaluate(()=>JSON.stringify({...localStorage}));
 assert(!requests.some(u=>u.endsWith('/editor.js')||u.endsWith('/macro-edit-model.js')||u.endsWith('/macro-editor-engine.js')),'editor must not load on video tab');
 await page.locator('#editorTab').click();
 await page.locator('#editorFile').setInputFiles({name:'original.txt',mimeType:'text/plain',buffer:Buffer.from(fixture('nudgeBrighter',{nudgeTimingVersion:1,intervalMs:100}))});
 await page.waitForFunction(()=>!document.getElementById('editorPlay').disabled,{timeout:60000});
 let turingCopy=null;
 const getFrame=()=>page.frames().find(f=>f.url().includes('editor=1'));
 const state=()=>getFrame().evaluate(()=>macroEditorEngine.state());
 const board=()=>getFrame().evaluate(()=>editorTest.board());
 assert.equal(await page.locator('[data-hold]').count(),1,'resume PLAY has no fresh start');
 await page.locator('[data-hold]').click();await page.locator('#editorPlay').click();
 await page.waitForFunction(()=>!document.getElementById('editorStart').disabled,{timeout:15000});
 let s=await state();assert.equal(s.boundary,2);assert.equal(s.running,false);
 const atStart=await board();assert.equal(atStart.tiles[12].k,8);assert.equal(atStart.tiles[12].isGold,true);
 await page.locator('#editorStart').click();
 await page.locator('#editorPlay').click();
 await page.waitForTimeout(400);await page.locator('#editorPlay').click();
 s=await state();assert.equal(s.running,false);assert(s.generation>0,'simulation made progress');
 const paused=await board();await page.waitForTimeout(180);assert.deepEqual(await board(),paused,'pause freezes simulation, not only preview');
 await page.locator('#editorEnd').click();
 const originalEnd=s.generation;
 const downloadPromise=page.waitForEvent('download');await page.locator('#editorSave').click();const download=await downloadPromise;
 const stream=await download.createReadStream();let edited='';for await(const chunk of stream)edited+=chunk;
 assert.match(download.suggestedFilename(),/_edited\.txt$/);assert.match(edited,/"values":/);assert.match(edited,new RegExp(`\\[GEN:${originalEnd}\\] PAUSE`));
 assert.equal(fixture('nudgeBrighter',{nudgeTimingVersion:1,intervalMs:100}).includes('values'),false);
 const commands=await getFrame().evaluate(text=>editorTest.parse(text),edited);assert.equal(commands[0].eventName,'INIT_STATE');
 await page.locator('#editorPreview').click();await page.waitForFunction(()=>document.getElementById('editorPanel').dataset.editorPhase==='complete',{timeout:15000});
 const replayed=await board();assert.deepEqual(replayed.tiles.map(t=>[t.k,t.v,t.isGold]),paused.tiles.map(t=>[t.k,t.v,t.isGold]),'cropped replay restores checkpoint and exact selected generation');
 // Saving after preview must still export from the original source and marks.
 const secondPromise=page.waitForEvent('download');await page.locator('#editorSave').click();const second=await secondPromise;let again='';for await(const chunk of await second.createReadStream())again+=chunk;assert.equal(again,edited);
 await page.locator('#editorActions details').first().locator('summary').click();await page.locator('#editorActions pre').first().waitFor();
 assert(await page.locator('#editorPanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'editor fits mobile');
 await mkdir('/tmp/macro-editor-check',{recursive:true});await page.screenshot({path:`/tmp/macro-editor-check/${cfg.lang}-editor.png`,fullPage:true});
 await page.locator('#editorVideo').click();await page.locator('#videoPanel').waitFor({state:'visible'});assert.match(await page.locator('#importedRecipe').textContent(),/_edited/);
 if(cfg.lang==='en'){
  await page.locator('#start').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('start').disabled);
  await page.locator('#start').click();await page.locator('#download').waitFor({state:'visible',timeout:60000});
  assert.equal(await page.locator('#progress').getAttribute('value'),'100');
 }

 await page.locator('#editorTab').click();await page.locator('#editorRestart').click();
 await page.locator('#editorReset').click();assert.match(await page.locator('#editorRange').textContent(),/Original beginning|ההתחלה המקורית/);
 // First-run checkpoints for seeded engines retain exact continuation.
 for(const sim of ['contour','cymatics','islands','turing','gameOfLife']){
  const rules=await getFrame().evaluate(sim=>editorTest.rules(sim),sim);
  const contents=fixture(sim,rules).split('\n').slice(0,4).join('\n');
  await page.locator('#editorFile').setInputFiles({name:sim+'.txt',mimeType:'text/plain',buffer:Buffer.from(contents)});
  await page.waitForFunction(()=>!document.getElementById('editorPlay').disabled);
  await page.locator('[data-hold]').click();await page.locator('#editorPlay').click();
  await page.waitForFunction(()=>!document.getElementById('editorStart').disabled,{timeout:15000});await page.locator('#editorStart').click();
  await page.locator('#editorPlay').click();await page.waitForFunction(()=>document.getElementById('editorPanel').dataset.editorPhase==='complete',{timeout:20000});
  const original=await board();await page.locator('#editorPreview').click();
  await page.waitForFunction(()=>document.getElementById('editorPanel').dataset.editorPhase==='complete',{timeout:20000});const replay=await board();
  assert.deepEqual(replay.tiles.map(t=>[t.k,t.v,t.isGold]),original.tiles.map(t=>[t.k,t.v,t.isGold]),sim+' fresh start reproduces the selected continuation');
  if(sim==='turing'&&cfg.lang==='en'){
   const task=page.waitForEvent('download');await page.locator('#editorSave').click();const copy=await task;let body='';for await(const chunk of await copy.createReadStream())body+=chunk;
   turingCopy={text:body,tiles:original.tiles.map(t=>[t.k,t.v,t.isGold])};
  }
  console.log(JSON.stringify({lang:cfg.lang,simulation:sim,passed:true}));
 }
 // Cut a paused brush packet sequence and an active Wind front. Open groups
 // must close validly, and neither may keep moving behind a paused preview.
 const wind={windVersion:1,batch:'test-wave',elapsed:0,n:5,index:12,base:3,paletteLength:23,settings:normalizeWindSettings({mode:'local',speed:100,range:100})};
 for(const type of ['brush','wind']){
  const events=type==='brush'?[
   '[00:00:00.100] BRUSH_START -> {"version":1}',
   '[00:00:00.100] DRAW_STROKE -> [{"i":0,"k":5}]',
   '[00:00:01.000] DRAW_STROKE -> [{"i":1,"k":6}]',
   '[00:00:01.100] BRUSH_END -> {"version":1}']:[
   '[00:00:00.100] WIND_WAVE -> '+JSON.stringify(wind),
   '[00:00:01.500] WIND_END -> '+JSON.stringify({windVersion:1,batch:'test-wave',elapsed:1400,reason:'complete'})];
  const contents='[00:00:00.000] INIT_STATE -> '+JSON.stringify(initial)+'\n'+events.join('\n');
  await page.locator('#editorFile').setInputFiles({name:type+'.txt',mimeType:'text/plain',buffer:Buffer.from(contents)});
  await page.waitForFunction(()=>!document.getElementById('editorPlay').disabled);await page.locator('#editorPlay').click();
  await page.waitForTimeout(400);await page.locator('#editorPlay').click();await page.waitForFunction(()=>!document.getElementById('editorEnd').disabled);
  const expected=await board();await page.waitForTimeout(100);assert.deepEqual(await board(),expected);
  await page.locator('#editorEnd').click();await page.locator('#editorPreview').click();
  await page.waitForFunction(()=>document.getElementById('editorPanel').dataset.editorPhase==='complete',{timeout:20000});
  assert.deepEqual((await board()).tiles.map(t=>[t.k,t.v,t.isGold]),expected.tiles.map(t=>[t.k,t.v,t.isGold]),type+' cut closes the gesture without changing the retained result');
  console.log(JSON.stringify({lang:cfg.lang,cut:type,passed:true}));
 }
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),savedStorage,'editor and video replay do not write shared preferences');
 if(cfg.lang==='en'){
  const appPage=await context.newPage();appPage.on('pageerror',e=>errors.push(e.message));
  let appSource=await readFile(path.join(root,'dist/js/app.js'),'utf8');
  appSource=appSource.replace('      initializeApp();','window.appEditTest={board:()=>getCurrentState(),loaded:()=>isMacroLoaded,dirtyTuring:()=>{isExecutingMacroCommand=true;armSimulation(null);armSimulation("turing");isExecutingMacroCommand=false;turingState={isInitialized:true,A:new Float32Array(25).fill(0),B:new Float32Array(25).fill(1),nextA:new Float32Array(25),nextB:new Float32Array(25),lastBoardK:Uint16Array.from({length:25},(_,i)=>i===12?8:1)};}};initializeApp().then(()=>appEditTest.ready=true);');
  for(const delay of [5000,1500,2000])appSource=appSource.replace('await new Promise(r => setTimeout(r, '+delay+'));','');
  await appPage.route(base+'/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:appSource}));
  await appPage.goto(base);await appPage.waitForFunction(()=>window.appEditTest?.ready);await appPage.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  await appPage.locator('#projectFileInput').setInputFiles({name:'cropped.txt',mimeType:'text/plain',buffer:Buffer.from(edited)});
  await appPage.locator('#btnMacroPlay').click();await appPage.waitForFunction(()=>!appEditTest.loaded(),{timeout:15000});
  assert.deepEqual((await appPage.evaluate(()=>appEditTest.board())).tiles.map(t=>[t.k,t.v,t.isGold]),paused.tiles.map(t=>[t.k,t.v,t.isGold]),'edited TXT replays in the normal application');
  await appPage.evaluate(()=>appEditTest.dirtyTuring());
  await appPage.locator('#projectFileInput').setInputFiles({name:'fresh-turing.txt',mimeType:'text/plain',buffer:Buffer.from(turingCopy.text)});
  await appPage.locator('#btnMacroPlay').click();await appPage.waitForFunction(()=>!appEditTest.loaded(),{timeout:15000});
  assert.deepEqual((await appPage.evaluate(()=>appEditTest.board())).tiles.map(t=>[t.k,t.v,t.isGold]),turingCopy.tiles,'fresh start must discard a prior Turing chemical buffer');
  console.log(JSON.stringify({appReplay:true,priorTuringReset:true,passed:true}));await appPage.close();
 }

 assert.deepEqual(errors,[]);console.log(JSON.stringify({...cfg,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
