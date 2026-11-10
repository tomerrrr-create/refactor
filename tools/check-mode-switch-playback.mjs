// Verify the panel switch follows actual playback state without moving controls.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.modeTest={
 setup(sim,creation=false){pauseLife();resetArmedState();n=13;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%7;t.isGold=false;});isSimModeActive=!creation;dom.controlsContainer.classList.toggle('sim-mode-active',!creation);dom.btnPlayPauseLife.classList.toggle('control-hidden',creation);updateSimulationUtilityControl();armSimulation(sim,{recordIslandsStart:false});artRecipeLog=[];historyRecipeCursor=0;},
 start:togglePlayPauseLife,pause:pauseLife,toggle:toggleSimMode,step:stepForward,
 wind:setWindMode, state:()=>({playing:isLifePlaying,armed:armedSimulation,gen:currentGenerationCount,n,mode:isSimModeActive,loaded:isMacroLoaded,log:[...artRecipeLog]}),
 macro(text){if(isLifePlaying)pauseLife();macroQueue=parseMacroText(text);settingsProfiles.beginReplay();isMacroLoaded=true;currentMacroStep=0;playMacro();}
 };initializeApp().then(()=>modeTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(f==='js/app.js'?source:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const cfg of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:375,height:667},{lang:'nl',width:1024,height:768}]){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},isMobile:cfg.width<600,hasTouch:cfg.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),cfg.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.modeTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const button=page.locator('#btnToggleSimMode'),state=()=>page.evaluate(()=>modeTest.state());
 const rects=()=>page.evaluate(()=>['btnToggleSimMode','btnSave','btnInvert','btnRandom','btnCycleSort','btnUndo','btnRedo','btnPlayPauseLife'].map(id=>{const e=document.getElementById(id);return [id,e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight];}));
 const hidden=async()=>{assert(await button.evaluate(e=>getComputedStyle(e).visibility==='hidden'&&getComputedStyle(e).pointerEvents==='none'));assert(await button.evaluate(e=>{e.focus();return document.activeElement!==e;}),'hidden switch cannot receive keyboard focus');};
 for(const sim of ['nudgeBrighter','nudgeDarker','gameOfLife','brightnessEvo','gravitationalSort','erosion','dla','contour','cymatics','islands','turing','magnet','spiral','sandpile','breathe']){
  await page.evaluate(sim=>modeTest.setup(sim),sim);assert(await button.isVisible());const before=await rects();await page.evaluate(()=>modeTest.start());await hidden();assert.deepEqual(await rects(),before,'grid geometry remains fixed during '+sim);
  const running=await state();await button.evaluate(e=>{e.click();e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,button:0,bubbles:true,clientX:10,clientY:10}));e.dispatchEvent(new PointerEvent('pointerup',{pointerId:77,button:0,bubbles:true,clientX:10,clientY:50}));});await page.evaluate(()=>modeTest.toggle());
  assert.equal((await state()).playing,true);assert.equal((await state()).mode,running.mode);assert.equal((await state()).n,running.n);assert.equal(await page.locator('#technicianDialog[open]').count(),0);await page.evaluate(()=>modeTest.pause());assert(await button.isVisible(),JSON.stringify({sim,css:await button.evaluate(e=>({classes:e.className,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,root:document.documentElement.hasAttribute('data-simulation-running')})),state:await state()}));assert.deepEqual(await rects(),before,'grid geometry remains fixed after '+sim);
 }
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.wind(true);});assert(await button.isVisible());await page.evaluate(()=>modeTest.wind(false));
 // A normal single step keeps the control available.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.step();});assert(await button.isVisible());assert.equal((await state()).playing,false);
 // Playback beginning during a pending gesture cancels the hold/reset path.
 const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.evaluate(()=>modeTest.start());await page.waitForTimeout(700);await page.mouse.up();assert.equal((await state()).n,13);assert.equal((await state()).playing,true);await hidden();await page.evaluate(()=>modeTest.pause());assert(await button.isVisible());
 // A delayed panel transition must not cancel playback that started meanwhile.
 await page.evaluate(()=>{modeTest.toggle();modeTest.start();});await page.waitForTimeout(600);assert.equal((await state()).playing,true);assert.equal((await state()).mode,true);assert.equal(await page.locator('#controlsContainer').evaluate(e=>e.style.opacity),'1');await hidden();await page.evaluate(()=>modeTest.pause());
 // The CSS rule also applies if playback starts on the creation panel.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter',true);modeTest.start();});await hidden();await page.evaluate(()=>modeTest.pause());assert(await button.isVisible());
 // Macro completion restores it through the same actual simulation state.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.macro('[00:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":13,"pal":0,"sort":"luminance","sep":0,"board":"169x1"}\n[00:00:00.100] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}\n[00:00:00.500] [GEN:3] PAUSE -> ---');});
 await page.waitForFunction(()=>modeTest.state().playing);await hidden();await page.waitForFunction(()=>!modeTest.state().loaded);assert(await button.isVisible());
 // The restored control still opens Technicians by the existing upward swipe.
 const restored=await button.boundingBox();await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2);await page.mouse.down();await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2-40,{steps:5});await page.mouse.up();await page.locator('#technicianDialog').waitFor({state:'visible'});await page.evaluate(()=>document.getElementById('technicianDialog').close());
 await mkdir('/tmp/mode-switch-playback',{recursive:true});await page.screenshot({path:`/tmp/mode-switch-playback/${cfg.lang}-paused.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({...cfg,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
