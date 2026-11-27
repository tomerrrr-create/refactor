// Verify Save and the panel switch follow playback without moving controls.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.modeTest={
 setup(sim,creation=false){experimentalSimulations.set('patterns',false);evolutionDrawer.applyLayout();pauseLife();resetArmedState();n=13;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%7;t.isGold=false;});isSimModeActive=!creation;dom.controlsContainer.classList.toggle('sim-mode-active',!creation);dom.btnToggleSimMode.classList.toggle('active',!creation);dom.btnPlayPauseLife.classList.toggle('control-hidden',creation);updateSimulationUtilityControl();armSimulation(sim,{recordIslandsStart:false});artRecipeLog=[];historyRecipeCursor=0;},
 start:togglePlayPauseLife,pause:pauseLife,toggle:toggleSimMode,step:stepForward,
 wind:setWindMode, restingTheme:applySimulationTheme,
 state:()=>({playing:isLifePlaying,armed:armedSimulation,gen:currentGenerationCount,n,mode:isSimModeActive,loaded:isMacroLoaded,log:[...artRecipeLog]}),
 macro(text){if(isLifePlaying)pauseLife();macroQueue=parseMacroText(text);settingsProfiles.beginReplay();isMacroLoaded=true;currentMacroStep=0;playMacro();}
 };initializeApp().then(()=>modeTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(f==='js/app.js'?source:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const cfg of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:375,height:667},{lang:'nl',width:1024,height:768}]){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},isMobile:cfg.width<600,hasTouch:cfg.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);localStorage.setItem('colorGridOpeningChoice','false');},cfg.lang);
 await context.addInitScript(()=>localStorage.setItem('colorGridExperimentalSimulationsV1',JSON.stringify({breathe:true})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.modeTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const button=page.locator('#btnToggleSimMode'),state=()=>page.evaluate(()=>modeTest.state());
 const rects=()=>page.evaluate(()=>['btnToggleSimMode','btnSave','btnInvert','btnRandom','btnCycleSort','btnUndo','btnRedo','btnPlayPauseLife'].map(id=>{const e=document.getElementById(id);return [id,e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight];}));
 const save=page.locator('#btnSave'), saveModal=page.locator('#saveModal'), playbackControls=[button,save];
 const restoredControls=async()=>{for(const control of playbackControls)await control.waitFor({state:'visible'});};
 const hiddenControls=async()=>{
  for(const control of playbackControls){
   assert(!(await control.isVisible()));
   assert(await control.evaluate(element=>{
    const bounds=element.getBoundingClientRect();
    const hit=document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    element.focus();
    return !element.contains(hit)&&document.activeElement!==element;
   }));
  }
 };
 // The playing halo follows the active button, independent of the playback theme.
 const life='#btnGameOfLife', gravity='#btnGravitationalSort', breathe='#btnShowBreatheMenu';
 const drawer=page.locator('#btnEvolutionDrawerInternal');
 const drawerAppearance=()=>drawer.locator('.drawer-internal-symbol').evaluate(track=>{
  const dot=getComputedStyle(track.querySelector('.drawer-page-dot')),lip=getComputedStyle(track,'::before');
  return {color:dot.backgroundColor,position:dot.transform,lipColor:lip.borderBottomColor,
   lipOpacity:Number(lip.opacity),animation:dot.animationName};
 });
 const waitForLip=opacity=>page.waitForFunction(opacity=>
  Number(getComputedStyle(document.querySelector('#btnEvolutionDrawerInternal .drawer-internal-symbol'),'::before').opacity)===opacity,opacity);
 const halo=id=>page.locator(id).evaluate(e=>{
  const style=getComputedStyle(e,'::before');
  return {opacity:Number(style.opacity),name:style.animationName,playState:style.animationPlayState,
   transform:style.transform,pointerEvents:style.pointerEvents};
 });
 const awaitHalo=(id,opacity)=>page.waitForFunction(({id,opacity})=>
  Number(getComputedStyle(document.querySelector(id),'::before').opacity)===opacity,{id,opacity});
 await page.evaluate(()=>{modeTest.setup('gameOfLife');modeTest.restingTheme('gold');modeTest.step();});
 assert.equal((await halo(life)).opacity,0,'arming and single step have no playback halo');
 const pausedDrawer=await drawerAppearance(),drawerBounds=await drawer.boundingBox();
 assert.equal(pausedDrawer.color,'rgb(187, 192, 198)');assert.equal(pausedDrawer.lipOpacity,1);assert.equal(pausedDrawer.animation,'none');
 await page.locator('#btnPlayPauseLife').click();await awaitHalo(life,1);
 await waitForLip(0);
 assert.deepEqual(await drawerAppearance(),{...pausedDrawer,lipOpacity:0});
 assert.deepEqual(await drawer.boundingBox(),drawerBounds);
 const firstPulse=await halo(life);
 assert.equal(firstPulse.name,'simulation-halo-breathe');
 assert.equal(firstPulse.playState,'running');
 assert.equal(firstPulse.pointerEvents,'none');
 assert.equal((await halo(gravity)).opacity,0);
 await page.waitForFunction(({id,transform})=>getComputedStyle(document.querySelector(id),'::before').transform!==transform,
  {id:life,transform:firstPulse.transform});
 await mkdir('/tmp/mode-switch-playback',{recursive:true});
 await page.locator('#controlsContainer').screenshot({path:`/tmp/mode-switch-playback/${cfg.lang}-halo.png`});
 await drawer.click();
 assert.equal(await drawer.getAttribute('data-page'),'1');
 assert.equal(await drawer.getAttribute('data-parked-active'),'true');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#btnEvolutionDrawerInternal .drawer-page-dot')).transform==='matrix(1, 0, 0, 1, 4, 0)');
 const secondDrawer=await drawerAppearance();
 assert.deepEqual(secondDrawer,{...pausedDrawer,position:'matrix(1, 0, 0, 1, 4, 0)',lipOpacity:0});
 assert.equal(await drawer.locator('.drawer-active-mark').evaluate(mark=>getComputedStyle(mark).backgroundColor),'rgb(118, 103, 65)');
 assert((await state()).playing);
 assert.equal((await state()).armed,'gameOfLife');
 await drawer.click();
 assert.equal(await drawer.getAttribute('data-page'),'0');
 await page.locator(gravity).click();assert((await state()).playing);
 await awaitHalo(life,0);await awaitHalo(gravity,1);
 assert.equal((await drawerAppearance()).lipOpacity,0);
 await page.locator('#btnPlayPauseLife').click();
 await page.waitForFunction(id=>{
  const opacity=Number(getComputedStyle(document.querySelector(id),'::before').opacity);
  return opacity>0&&opacity<1;
 },gravity);
 await awaitHalo(gravity,0);
 assert.equal((await halo(gravity)).playState,'paused');
 await waitForLip(1);
 assert.deepEqual(await drawerAppearance(),pausedDrawer);
 await drawer.click();
 await page.locator(breathe).click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#btnPlayPauseLife').click();await awaitHalo(breathe,1);
 assert.equal((await halo(breathe)).name,'none','reduced motion keeps a steady halo for Breathe');
 await page.locator('#btnPlayPauseLife').click();await awaitHalo(breathe,0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await drawer.click();
 for(const sim of ['nudgeBrighter','nudgeDarker','gameOfLife','brightnessEvo','gravitationalSort','erosion','dla','contour','cymatics','islands','turing','magnet','spiral','sandpile','breathe']){
  await page.evaluate(sim=>modeTest.setup(sim),sim);await restoredControls();const before=await rects();await page.evaluate(()=>modeTest.start());await hiddenControls();assert.deepEqual(await rects(),before,'grid geometry remains fixed during '+sim);
  const running=await state();await button.evaluate(e=>{e.click();e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,button:0,bubbles:true,clientX:10,clientY:10}));e.dispatchEvent(new PointerEvent('pointerup',{pointerId:77,button:0,bubbles:true,clientX:10,clientY:50}));});await page.evaluate(()=>modeTest.toggle());
  assert.equal((await state()).playing,true);assert.equal((await state()).mode,running.mode);assert.equal((await state()).n,running.n);assert.equal(await page.locator('#technicianDialog[open]').count(),0);await save.evaluate(e=>e.click());assert(!(await saveModal.isVisible()));await page.evaluate(()=>modeTest.pause());await restoredControls();assert.deepEqual(await rects(),before,'grid geometry remains fixed after '+sim);
 }
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.wind(true);});await restoredControls();await page.evaluate(()=>modeTest.wind(false));
 // A normal single step keeps the control available.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.step();});await restoredControls();assert.equal((await state()).playing,false);
 // Playback beginning during a pending gesture cancels the hold/reset path.
 const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.evaluate(()=>modeTest.start());await page.waitForTimeout(700);await page.mouse.up();assert.equal((await state()).n,13);assert.equal((await state()).playing,true);await hiddenControls();await page.evaluate(()=>modeTest.pause());await restoredControls();
 // A delayed panel transition must not cancel playback that started meanwhile.
 await page.evaluate(()=>{modeTest.toggle();modeTest.start();});await page.waitForTimeout(600);assert.equal((await state()).playing,true);assert.equal((await state()).mode,true);assert.equal(await page.locator('#controlsContainer').evaluate(e=>e.style.opacity),'1');await hiddenControls();await page.evaluate(()=>modeTest.pause());
 // The controls also hide if playback starts on the creation panel.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter',true);modeTest.start();});await hiddenControls();await page.evaluate(()=>modeTest.pause());await restoredControls();
 // The controls hide during a recorded simulation and return after completion.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.macro('[00:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":13,"pal":0,"sort":"luminance","sep":0,"board":"169x1"}\n[00:00:00.100] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}\n[00:00:00.500] [GEN:3] PAUSE -> ---');});
 await page.waitForFunction(()=>modeTest.state().playing);await hiddenControls();await page.waitForFunction(()=>!modeTest.state().loaded);await restoredControls();
 // A capture requested while paused must not reopen Save once Play starts.
 await page.evaluate(()=>{
  modeTest.setup('nudgeBrighter');
  const canvas=document.querySelector('#boardCanvas');
  const original=canvas.toBlob;
  canvas.toBlob=callback=>{window.finishSavePreview=()=>callback(new Blob());};
  document.querySelector('#btnSave').click();
  canvas.toBlob=original;
  modeTest.start();
  window.finishSavePreview();
 });
 await hiddenControls();assert(!(await saveModal.isVisible()));
 await page.evaluate(()=>modeTest.pause());await restoredControls();
 await save.click();await saveModal.waitFor({state:'visible'});
 await page.locator('#btnModalClose').click();await saveModal.waitFor({state:'hidden'});
 // The restored control still opens Technicians by the existing upward swipe.
 const restored=await button.boundingBox();await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2);await page.mouse.down();await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2-40,{steps:5});await page.mouse.up();await page.locator('#technicianDialog').waitFor({state:'visible'});await page.evaluate(()=>document.getElementById('technicianDialog').close());
 await mkdir('/tmp/mode-switch-playback',{recursive:true});await page.screenshot({path:`/tmp/mode-switch-playback/${cfg.lang}-paused.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({...cfg,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
