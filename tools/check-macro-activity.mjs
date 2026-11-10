// Real TXT playback: opt-in desktop fullscreen activity never changes board geometry or replay.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/macro-activity-check';await mkdir(artifacts,{recursive:true});
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.activityTest={stop:stopMacro,tech:()=>modals.openTechnicianMenu(),zoom:value=>{interfaceZoom=value;updateLayout();},label:key=>getText(key).split(String.fromCharCode(10))[0],state:()=>({loaded:isMacroLoaded,playing:isMacroPlaying,fullscreen:isMacroFullscreen,animating:isAnimating,gen:currentGenerationCount,simulation:armedSimulation,board:boardState.map(t=>[t.k,t.v,t.isGold]),logs:artRecipeLog.map(line=>line.slice(line.indexOf(']')+1)),index:currentMacroStep})};initializeApp().then(()=>activityTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const recipe=`[00:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":9,"pal":0,"sort":"luminance","sep":0,"board":"81x0"}
[00:00:00.010] DRAW_STROKE -> [{"i":39,"k":2},{"i":40,"k":3},{"i":41,"k":4}]
[00:00:00.020] Sort by -> reversed
[00:00:00.030] Invert Colors -> Sort: reversed
[00:00:00.040] PLAY -> Armed: gameOfLife | Sort: reversed | Rules: {"survival":[2,3],"birth":[3]}
[00:00:01.040] [GEN:60] Game of Life Mode Changed -> {"survival":[2,3],"birth":[3],"mode":"personal"}
[00:00:06.040] [GEN:360] PAUSE -> ---
[00:00:06.041] BRUSH_START -> {"version":1}
[00:00:06.042] DRAW_STROKE -> [{"i":4,"k":2}]
[00:00:06.043] DRAW_STROKE -> [{"i":5,"k":3}]
[00:00:06.044] BRUSH_END -> {"version":1}
[00:00:06.050] PLAY -> Armed: nudgeBrighter | Sort: reversed | Rules: {"nudgeTimingVersion":1,"intervalMs":0}
[00:00:09.050] [GEN:180] PAUSE -> ---
[00:00:09.060] Invert Colors -> Sort: reversed`;
try{for(const config of [{width:1700,height:1000,lang:'en',desktop:true},{width:1440,height:900,lang:'he',desktop:true},{width:390,height:844,lang:'ru',desktop:false},{width:1180,height:820,lang:'nl',desktop:false,touch:true}]){
 if(process.env.ACTIVITY_LANG&&config.lang!==process.env.ACTIVITY_LANG)continue;
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:!config.desktop,hasTouch:!config.desktop,reducedMotion:config.lang==='he'?'reduce':'no-preference',serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
 const boot=async reload=>{await (reload?page.reload():page.goto(base));await page.waitForFunction(()=>window.activityTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 await boot(false);
 const panel=page.locator('#macroActivity'),toggle=page.locator('#macroActivityToggle');
 assert.equal(await toggle.isChecked(),false);assert.equal(await panel.isVisible(),false);
 const start=async()=>{await page.locator('#projectFileInput').setInputFiles({name:'activity.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>activityTest.state().loaded);await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>activityTest.state().gen>=5&&activityTest.state().index>=5);};
 const finish=async()=>{await page.waitForFunction(()=>!activityTest.state().loaded&&!activityTest.state().animating,{timeout:25000});return page.evaluate(()=>activityTest.state().board);};
 const recipeLog=()=>page.evaluate(()=>{const logs=activityTest.state().logs;const from=logs.findLastIndex(line=>line.includes('INIT_STATE ->')&&line.includes('"n":9'));return logs.slice(from).filter(line=>!line.includes('HISTORY_ACTION ->'));});
 // Baseline replay with the switch off.
 await start();assert.equal(await panel.isVisible(),false);const baseline=await finish(),baselineLog=await recipeLog();
 await page.evaluate(()=>activityTest.tech());await toggle.check();await page.locator('#btnTechnicianCloseTop').click();
 await boot(true);assert.equal(await toggle.isChecked(),true,'device-local preference survives reopening');
 if(config.lang==='he')await page.evaluate(()=>activityTest.zoom(90));
 await start();assert.equal(await panel.isVisible(),false,'normal board mode stays uncluttered');
 await page.locator('#boardCanvas').click();await page.waitForFunction(()=>activityTest.state().fullscreen&&!activityTest.state().animating);
 if(config.desktop){
  await panel.waitFor({state:'visible'});
  const geometry=await page.locator('#board').boundingBox();
  const first=await panel.textContent();assert(first.length>10);assert.equal(await panel.locator('.macro-activity-previous li').count(),1);
  assert.equal(await panel.locator('.macro-activity-upcoming li').count(),2);
  assert.equal(await panel.locator('.macro-activity-heading').count(),0,'no visible Now/Later headings');
  const expected=await page.evaluate(()=>[activityTest.label('macro_activity_draw'),activityTest.label('help_nudge_forward')]);
  assert.deepEqual(await panel.locator('.macro-activity-upcoming .macro-activity-title').allTextContents(),expected,'preview shows one drawing action for the whole next stroke, then Nudge');
  assert(await panel.locator('.macro-activity-current svg').count());
  if(config.lang==='he')assert.equal(await panel.locator('.macro-activity-current .macro-activity-row').evaluate(e=>getComputedStyle(e).animationName),'none','reduced motion disables row transitions');
  const generation=await page.evaluate(()=>activityTest.state().gen);
  await page.waitForFunction(()=>activityTest.state().gen>=100);assert((await page.evaluate(()=>activityTest.state().gen))>generation,'the simulation continues advancing');
  assert.equal(await panel.textContent(),first,'settings events and advancing generations do not replace or rewrite the display');
  assert.equal(await panel.locator('.macro-activity-detail').count(),0,'no generation totals or settings captions in past, current or upcoming rows');
  const side=await panel.boundingBox();assert(side.x+side.width<=geometry.x-70,'panel clears the left gallery frame');assert(side.x>=0);
  await page.evaluate(()=>activityTest.tech());await toggle.uncheck();await page.locator('#btnTechnicianCloseTop').click();await page.waitForTimeout(150);
  assert.equal(await panel.isVisible(),false);assert.deepEqual(await page.locator('#board').boundingBox(),geometry,'off never resizes or moves board');
  if(config.lang==='en')await page.waitForFunction(()=>activityTest.state().simulation==='nudgeBrighter'&&activityTest.state().gen>=5);
  await page.evaluate(()=>activityTest.tech());await toggle.check();await page.locator('#btnTechnicianCloseTop').click();await panel.waitFor({state:'visible'});if(config.lang==='en'){assert((await panel.locator('.macro-activity-current').textContent()).includes('Nudge'),'enabling mid-play shows the latest action');assert(!/Pause|Settings changed|Generation/.test(await panel.textContent()),'Pause and settings are also excluded when rebuilding history');}assert.deepEqual(await page.locator('#board').boundingBox(),geometry,'on never resizes or moves board');
  await page.screenshot({path:path.join(artifacts,config.lang+'-fullscreen.png')});
  await page.setViewportSize({width:1024,height:1000});await page.waitForTimeout(150);assert.equal(await panel.isVisible(),false,'insufficient left space hides it');
  await page.setViewportSize({width:config.width,height:config.height});await panel.waitFor({state:'visible'});
 }else{await page.waitForTimeout(150);assert.equal(await panel.isVisible(),false,'mobile/coarse pointer never shows panel');}
 const replayed=await finish();assert.deepEqual(replayed,baseline,'display does not change replayed artwork');assert.deepEqual(await recipeLog(),baselineLog,'display does not change recorded playback commands');assert.equal(await panel.isVisible(),false,'completion cleans panel');
 // A stopped replacement file also clears presentation immediately.
 await start();await page.locator('#boardCanvas').click();await page.waitForFunction(()=>activityTest.state().fullscreen&&!activityTest.state().animating);
 await page.evaluate(()=>activityTest.stop());assert.equal(await panel.isVisible(),false,'manual Stop clears panel');await page.waitForFunction(()=>!activityTest.state().animating);
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config));await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
