// Verify smooth picker handoffs, interruption, focus and reduced motion.
// Runtime hooks are injected into responses; production assets have no test hooks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.PICKER_TRANSITION_ARTIFACTS||'/tmp/cracks-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const waitForHandoff = page => page.waitForFunction(
 ()=>!document.querySelector('.picker-handoff-incoming,.picker-handoff-outgoing'),
 null,{timeout:2000});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});



try {for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.cracksTest={
 setup:()=>{pauseLife();resetArmedState();n=81;initializeBoardAndCanvas(true);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');updateSimulationUtilityControl();boardState.forEach((t,i)=>{t.k=t.v=4+Math.floor((i%81)/14)%5;t.isGold=false;});contourRules={sensitivity:75,lineColor:'darkest'};selectedColorIndex=12;selectedColor=palette()[12];brushSize=3;isRainbowModeActive=false;isBrushModeOn=true;isContinuousBrushOn=false;updateColorPickerButtonUI();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 state:()=>({mode:contourMode,armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,board:boardState.map(t=>t.k),snapshot:getCurrentState(),loaded:isMacroLoaded,macro:isMacroPlaying,logs:[...artRecipeLog],undoTarget:history.at(-1)?.before}),
 liveExport:()=>{const file=createArtRecipeFile(),snapshot=getCurrentState();pauseLife();return file.text().then(text=>({text,snapshot}));},play:togglePlayPauseLife,pause:pauseLife,undo,redo,restore:state=>applyState(state),recipe:async()=>await createArtRecipeFile().text(),macro:playMacro,prefs:()=>getWorkspaceSettings(),legacy:()=>applyMacroRules('Armed: contour | Sort: luminance | Rules: {"sensitivity":75,"lineColor":"darkest"}')
 };initializeApp().then(()=>cracksTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.cracksTest?.ready);await page.evaluate(()=>cracksTest.setup());
 const state=()=>page.evaluate(()=>cracksTest.state()),button=page.locator('#btnContour'),before=await state();
 const tap=target=>config.width<600?target.tap():target.click();
 assert(await button.evaluate(e=>e.classList.contains('cracks-active')),'idle icon defaults to Cracks');
 await tap(button);assert.equal((await state()).mode,'cracks');assert.equal((await state()).armed,'contour');await tap(button);assert.equal((await state()).mode,'contours');await tap(button);assert.equal((await state()).armed,null);assert.deepEqual((await state()).board,before.board);
 await tap(button);assert(await button.evaluate(e=>e.classList.contains('cracks-active')));
 // Reuse settings without exposing an ineffective sensitivity control.
 const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();await page.locator('#contourSettingsModal').waitFor({state:'visible'});assert(await page.locator('#contourSensitivitySlider').isDisabled());await page.locator('#btnContourSettingsCancel').click();await page.locator('#contourSettingsModal').waitFor({state:'hidden'});
 await tap(page.locator('#btnStepForward'));await page.waitForFunction(()=>cracksTest.state().snapshot.contourState?.cracksState?.steps>0);assert((await state()).board.some(k=>k===0));const runStart=await state();
 await page.evaluate(()=>cracksTest.play());await page.waitForFunction(()=>cracksTest.state().gen>=20);await tap(button);assert((await state()).playing);assert.equal((await state()).mode,'contours');await tap(button);assert((await state()).playing);assert.equal((await state()).mode,'cracks');
 await tap(page.locator('#boardCanvas'));await page.waitForFunction(()=>cracksTest.state().gen>=45);await page.evaluate(()=>cracksTest.pause());
 const finished=await state();assert(finished.logs.some(line=>line.includes('DRAW_STROKE')));assert(finished.logs.some(line=>line.includes('SIMULATION_RULES')));const recipe=await page.evaluate(()=>cracksTest.recipe());
 await page.screenshot({path:path.join(artifacts,config.lang+'-cracks.png')});
 await page.evaluate(()=>cracksTest.undo());assert.deepEqual((await state()).board,finished.undoTarget.tiles.map(t=>t.k),'Undo restores the existing live-stroke history boundary');await page.evaluate(()=>cracksTest.redo());assert.deepEqual((await state()).board,finished.board);
 // A JSON serialization round trip retains tips and the PRNG cursor.
 const saved=JSON.parse(JSON.stringify(finished.snapshot));await page.evaluate(s=>cracksTest.restore(s),saved);assert.deepEqual((await state()).snapshot.contourState,saved.contourState);
 const prefs=await page.evaluate(()=>cracksTest.prefs());
 await page.locator('#projectFileInput').setInputFiles({name:'cracks.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,finished.board,'recorded live mode changes and brush input replay exactly');assert.deepEqual(await page.evaluate(()=>cracksTest.prefs()),prefs,'replay does not overwrite preferences');
 await page.evaluate(()=>cracksTest.legacy());assert.equal((await state()).mode,'contours','old recipes retain the original engine');assert.deepEqual(errors,[]);
 if(config.lang==='en'){
  await page.evaluate(()=>cracksTest.setup());await tap(button);assert.equal((await state()).mode,'cracks');await page.evaluate(()=>cracksTest.play());await page.waitForFunction(()=>cracksTest.state().gen>=12);
  const live=await page.evaluate(()=>cracksTest.liveExport());assert(/\[GEN:\d+\] PAUSE/.test(live.text));
  await page.locator('#projectFileInput').setInputFiles({name:'live-cracks.txt',mimeType:'text/plain',buffer:Buffer.from(live.text)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,live.snapshot.tiles.map(t=>t.k),'export during growth captures its final generation');
 }
 console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
