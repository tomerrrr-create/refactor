// Independent opt-ins, device persistence, reserved layouts and replay compatibility.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),touch?'he':'en');
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.flagsTest={
 panel:()=>{isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');},
 tech:()=>modals.openTechnicianMenu(),map:()=>evolutionDrawer.open(),
 state:()=>({armed:armedSimulation,playing:isLifePlaying,slots:[...evolutionSlots],pixels:boardState.map(t=>t.k),settings:getWorkspaceSettings(),logs:[...artRecipeLog]}),
 recipe:()=>{history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();armSimulation('network');stepForward();return artRecipeLog.join('\\n');},
 replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},
 done:()=>!isMacroPlaying&&!isLifePlaying&&!isMacroLoaded,
 start:()=>{armSimulation('spiral');togglePlayPauseLife();},
 startBreathe:()=>togglePlayPauseLife(),
 loaded:value=>{isMacroLoaded=value;}
 };initializeApp().then(()=>flagsTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const boot=async reload=>{await(reload?page.reload():page.goto(base));await page.waitForFunction(()=>window.flagsTest?.ready);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());flagsTest.panel();});};
 const state=()=>page.evaluate(()=>flagsTest.state());
 const close=()=>page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const tech=async()=>{
  await page.evaluate(()=>flagsTest.tech());
  const features=page.locator('#btnConfigureFeatures');
  assert.equal(await features.getAttribute('aria-expanded'),'false');
  await features.click();
 };
 const toggle=async(id,value)=>{await page.locator('#'+id+'ExperimentToggle').setChecked(value);};
 const geometric=page.locator('#btnSpiral'),network=page.locator('#btnNetwork'),breathe=page.locator('#btnShowBreatheMenu');
 await boot(false);
 await page.locator('#btnEvolutionDrawerInternal').click();await page.waitForTimeout(300);
 const original=(await state()).slots;
 assert(!(await geometric.isVisible()),'Geometric Flow defaults hidden');
 assert(!(await breathe.isVisible()),'Breathe defaults hidden');
 assert.equal(await breathe.getAttribute('data-evolution-slot'),'12');
 assert(await network.isVisible(),'Living Network is always available');
 await page.evaluate(()=>flagsTest.map());
 assert.equal(await page.locator('[data-drawer-evolution="spiral"]').count(),0);
 assert.equal(await page.locator('[data-drawer-evolution="network"]').count(),1);
 assert.equal(await page.locator('.drawer-feature-hidden').count(),2);
 assert.equal(await page.locator('[data-drawer-evolution="ink"]').count(),1);await close();
 assert.equal(await page.locator('#btnInk').getAttribute('data-evolution-feature-hidden'),null);
 await tech();assert.equal(await page.locator('#inkExperimentToggle, #oilExperimentToggle, #networkExperimentToggle, #btnOil').count(),0);
 assert(await page.locator('#featureSettings #brushMotionRecordingNote').isVisible());
 assert(await page.locator('#featureSettings #spiralExperimentToggle').isVisible());
 await page.locator('#btnConfigureMacro').click();
 assert(!(await page.locator('#featureSettings').isVisible()));
 assert(await page.locator('#macroSettings #macroActivityToggle').isVisible());
 await page.locator('#btnConfigureDisplay').click();
 assert(!(await page.locator('#macroSettings').isVisible()));
 assert(await page.locator('#displaySettings #interfaceZoom').isVisible());
 await page.locator('#btnConfigureFeatures').click();
 assert(!(await page.locator('#spiralExperimentToggle').isChecked()));
 assert(!(await page.locator('#breatheExperimentToggle').isChecked()));
 await toggle('breathe',true);await close();
 assert(await breathe.isVisible());
 assert(!(await geometric.isVisible()));
 const breatheBox=await breathe.boundingBox(), switchBox=await page.locator('#btnEvolutionDrawerInternal').boundingBox();
 assert(Math.abs(breatheBox.x+breatheBox.width/2-switchBox.x-switchBox.width/2)<1);
 assert(breatheBox.y<switchBox.y);
 await breathe.click();
 assert.equal((await state()).armed,'breathe');
 await page.evaluate(()=>flagsTest.startBreathe());
 assert((await state()).playing);
 await tech();await toggle('breathe',false);await close();
 assert(!(await breathe.isVisible()));
 assert.equal((await state()).playing,false);
 assert.equal((await state()).armed,null);
 await tech();
 // A different profile keeps its own Geometric Flow visibility.
 await toggle('spiral',true);
 await page.locator('[data-profile-choice="1"]').click();assert(!(await page.locator('#spiralExperimentToggle').isChecked()));
 await page.locator('[data-profile-choice="0"]').click();assert(await page.locator('#spiralExperimentToggle').isChecked());
 await close();
 assert(await geometric.isVisible());
 assert.equal(await page.locator('#btnNetwork').getAttribute('data-evolution-slot'),'10');
 assert.equal(await geometric.getAttribute('data-evolution-slot'),'14');
 assert.equal(await geometric.getAttribute('aria-label'),touch?'זרימה גאומטרית':'Geometric Flow');
 for(const icon of ['Diagonal','DiagonalMirror','Horizontal','Vertical']){
  await geometric.click();assert.equal((await state()).armed,'spiral');assert(await page.locator('#iconSpiral'+icon).isVisible());
 }
 await geometric.click();assert.equal((await state()).armed,null);
 await page.evaluate(()=>flagsTest.start());await tech();await toggle('spiral',false);
 assert.equal((await state()).playing,false);assert.equal((await state()).armed,null);await close();
 const recipe=await page.evaluate(()=>flagsTest.recipe()),recorded=(await state()).pixels;
 assert.deepEqual((await state()).slots,original);
 await page.evaluate(text=>flagsTest.replay(text),recipe);await page.waitForFunction(()=>flagsTest.done(),null,{timeout:20000});assert.deepEqual((await state()).pixels,recorded);
 assert(!(await geometric.isVisible()));
 assert(await network.isVisible());
 // Loaded recipes cannot change the device flags underneath replay.
 await page.evaluate(()=>flagsTest.loaded(true));await tech();assert(await page.locator('#spiralExperimentToggle').isDisabled());await close();await page.evaluate(()=>flagsTest.loaded(false));
 await tech();await toggle('spiral',true);await toggle('breathe',true);await close();await boot(true);await tech();
 assert(await page.locator('#spiralExperimentToggle').isChecked());
 assert(await page.locator('#breatheExperimentToggle').isChecked());
 assert.equal(await page.locator('#networkExperimentToggle').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS experimental visibility',JSON.stringify({touch,persistence:true,profiles:true,layout:true,replay:true}));await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
