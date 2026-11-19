// Verify the panel switch follows actual playback state without moving controls.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.modeTest={
 setup(sim,creation=false){pauseLife();resetArmedState();n=13;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%7;t.isGold=false;});isSimModeActive=!creation;dom.controlsContainer.classList.toggle('sim-mode-active',!creation);dom.btnToggleSimMode.classList.toggle('active',!creation);dom.btnPlayPauseLife.classList.toggle('control-hidden',creation);updateSimulationUtilityControl();armSimulation(sim,{recordIslandsStart:false});artRecipeLog=[];historyRecipeCursor=0;},
 start:togglePlayPauseLife,pause:pauseLife,toggle:toggleSimMode,step:stepForward,
 wind:setWindMode, restingTheme:applySimulationTheme, playbackTheme:applySimulationPlaybackTheme,
 state:()=>({playing:isLifePlaying,armed:armedSimulation,gen:currentGenerationCount,n,mode:isSimModeActive,loaded:isMacroLoaded,log:[...artRecipeLog]}),
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
 const creationStroke=await button.locator('svg').evaluate(e=>getComputedStyle(e).stroke);
 const visibleWhite=async()=>{assert(await button.isVisible());assert.deepEqual(await button.evaluate(e=>({visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,stroke:getComputedStyle(e.querySelector('svg')).stroke})),{visibility:'visible',opacity:'1',stroke:creationStroke});};
 // The playing halo follows the active button, independent of the playback theme.
 const life='#btnGameOfLife', gravity='#btnGravitationalSort', breathe='#btnShowBreatheMenu';
 const drawer=page.locator('#btnEvolutionDrawerInternal');
 const readDrawerInk=svg=>({
  fills:[...svg.querySelectorAll('[data-yin-half]')].map(half=>getComputedStyle(half).fill),
  glow:getComputedStyle(svg).filter
 });
 const drawerInk=()=>drawer.locator('svg').evaluate(readDrawerInk);
 const awaitDrawerInk=(fills,glow)=>page.waitForFunction(({fills,glow})=>{
  const svg=document.querySelector('#btnEvolutionDrawerInternal svg');
  return getComputedStyle(svg).filter===glow&&[...svg.querySelectorAll('[data-yin-half]')]
   .every((half,index)=>getComputedStyle(half).fill===fills[index]);
 },{fills,glow});
 const halo=id=>page.locator(id).evaluate(e=>{
  const style=getComputedStyle(e,'::before');
  return {opacity:Number(style.opacity),name:style.animationName,playState:style.animationPlayState,
   transform:style.transform,pointerEvents:style.pointerEvents};
 });
 const awaitHalo=(id,opacity)=>page.waitForFunction(({id,opacity})=>
  Number(getComputedStyle(document.querySelector(id),'::before').opacity)===opacity,{id,opacity});
 await page.evaluate(()=>{modeTest.setup('gameOfLife');modeTest.restingTheme('gold');modeTest.playbackTheme('teal');modeTest.step();});
 assert.equal((await halo(life)).opacity,0,'arming and single step have no playback halo');
 const pausedDrawer=await drawerInk(),drawerBounds=await drawer.boundingBox();
 assert.deepEqual(pausedDrawer,{fills:['rgb(118, 103, 65)','rgb(8, 10, 9)'],glow:'none'});
 await page.locator('#btnPlayPauseLife').click();await awaitHalo(life,1);
 await awaitDrawerInk(['rgb(104, 189, 181)','rgb(8, 10, 9)'],'none');
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
 assert.equal(await drawer.locator('.drawer-active-mark').evaluate(mark=>getComputedStyle(mark).backgroundColor),'rgb(104, 189, 181)');
 assert((await state()).playing);
 assert.equal((await state()).armed,'gameOfLife');
 await drawer.click();
 assert.equal(await drawer.getAttribute('data-page'),'0');
 await page.evaluate(()=>modeTest.playbackTheme('gold'));
 await page.locator(gravity).click();assert((await state()).playing);
 await awaitHalo(life,0);await awaitHalo(gravity,1);
 await awaitDrawerInk(['rgb(118, 103, 65)','rgb(8, 10, 9)'],'none');
 await page.locator('#btnPlayPauseLife').click();
 await page.waitForFunction(id=>{
  const opacity=Number(getComputedStyle(document.querySelector(id),'::before').opacity);
  return opacity>0&&opacity<1;
 },gravity);
 await awaitHalo(gravity,0);
 assert.equal((await halo(gravity)).playState,'paused');
 await awaitDrawerInk(pausedDrawer.fills,pausedDrawer.glow);
 await drawer.click();
 await page.locator(breathe).click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#btnPlayPauseLife').click();await awaitHalo(breathe,1);
 assert.equal((await halo(breathe)).name,'none','reduced motion keeps a steady halo for Breathe');
 await page.locator('#btnPlayPauseLife').click();await awaitHalo(breathe,0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await drawer.click();
 await page.evaluate(()=>modeTest.playbackTheme('gold'));
 for(const sim of ['nudgeBrighter','nudgeDarker','gameOfLife','brightnessEvo','gravitationalSort','erosion','dla','contour','cymatics','islands','turing','magnet','spiral','sandpile','breathe']){
  await page.evaluate(sim=>modeTest.setup(sim),sim);assert(await button.isVisible());const before=await rects();await page.evaluate(()=>modeTest.start());await visibleWhite();assert.deepEqual(await rects(),before,'grid geometry remains fixed during '+sim);
  const running=await state();await button.evaluate(e=>{e.click();e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,button:0,bubbles:true,clientX:10,clientY:10}));e.dispatchEvent(new PointerEvent('pointerup',{pointerId:77,button:0,bubbles:true,clientX:10,clientY:50}));});await page.evaluate(()=>modeTest.toggle());
  assert.equal((await state()).playing,true);assert.equal((await state()).mode,running.mode);assert.equal((await state()).n,running.n);assert.equal(await page.locator('#technicianDialog[open]').count(),0);await page.evaluate(()=>modeTest.pause());assert(await button.isVisible(),JSON.stringify({sim,css:await button.evaluate(e=>({classes:e.className,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,root:document.documentElement.hasAttribute('data-simulation-running')})),state:await state()}));assert.deepEqual(await rects(),before,'grid geometry remains fixed after '+sim);
 }
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.wind(true);});assert(await button.isVisible());await page.evaluate(()=>modeTest.wind(false));
 // A normal single step keeps the control available.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.step();});assert(await button.isVisible());assert.equal((await state()).playing,false);
 // Playback beginning during a pending gesture cancels the hold/reset path.
 const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.evaluate(()=>modeTest.start());await page.waitForTimeout(700);await page.mouse.up();assert.equal((await state()).n,13);assert.equal((await state()).playing,true);await visibleWhite();await page.evaluate(()=>modeTest.pause());assert(await button.isVisible());
 // A delayed panel transition must not cancel playback that started meanwhile.
 await page.evaluate(()=>{modeTest.toggle();modeTest.start();});await page.waitForTimeout(600);assert.equal((await state()).playing,true);assert.equal((await state()).mode,true);assert.equal(await page.locator('#controlsContainer').evaluate(e=>e.style.opacity),'1');await visibleWhite();await page.evaluate(()=>modeTest.pause());
 // The control also remains visible if playback starts on the creation panel.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter',true);modeTest.start();});await visibleWhite();await page.evaluate(()=>modeTest.pause());assert(await button.isVisible());
 // The switch stays visible during macro playback and after completion.
 await page.evaluate(()=>{modeTest.setup('nudgeBrighter');modeTest.macro('[00:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":13,"pal":0,"sort":"luminance","sep":0,"board":"169x1"}\n[00:00:00.100] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}\n[00:00:00.500] [GEN:3] PAUSE -> ---');});
 await page.waitForFunction(()=>modeTest.state().playing);await visibleWhite();await page.waitForFunction(()=>!modeTest.state().loaded);assert(await button.isVisible());
 // Precision Icons repaints the paused vectors while keeping the backdrop in every theme.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>modeTest.setup('gameOfLife'));
 await page.mouse.move(0,0);
 const precision=page.locator('#precisionIconsToggle');
 assert.equal(await precision.isChecked(),false);
 const pausedAppearance=theme=>page.evaluate(theme=>{
  modeTest.restingTheme(theme);
  const life=getComputedStyle(document.querySelector('#btnGameOfLife svg'));
  const dla=getComputedStyle(document.querySelector('#btnDla svg circle'));
  const backdrop=document.getElementById('simModeBackground');
  return {
   width:life.strokeWidth,join:life.strokeLinejoin,
   themeInk:document.documentElement.dataset.simulationEffectiveTheme,lifeInk:life.stroke,dlaInk:dla.fill,
   backdrop:[getComputedStyle(backdrop).borderColor,getComputedStyle(backdrop).opacity,
    ...['::before','::after'].map(pseudo=>getComputedStyle(backdrop,pseudo).backgroundImage)],
  };
 },theme);
 const themes=['blue','gold','teal'];
 const original=[];
 for(const theme of themes)original.push(await pausedAppearance(theme));
 // Open Technicians using the restored control's existing upward swipe.
 const restored=await button.boundingBox();
 await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2);
 await page.mouse.down();
 await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2-40,{steps:5});
 await page.mouse.up();
 await page.locator('#technicianDialog').waitFor({state:'visible'});
 await page.locator('#btnConfigureFeatures').click();
 await precision.check();
 await page.evaluate(()=>document.getElementById('technicianDialog').close());
 await page.mouse.move(0,0);
 for(const [index,theme] of themes.entries()){
  assert.deepEqual(await pausedAppearance(theme),{...original[index],width:'1.55px'});
 }
 const lifeGlyph=page.locator(life+' > svg');
 const dlaGlyph=page.locator('#btnDla > svg');
 const awaitGlyphFilter=(id,expected)=>page.waitForFunction(({id,expected})=>
  getComputedStyle(document.querySelector(id+' > svg')).filter.includes(expected),{id,expected});
 await awaitGlyphFilter(life,'#precisionIconMetal');
 if(cfg.lang==='en')await page.locator('#controlsContainer').screenshot({path:'/tmp/mode-switch-playback/precision-drawer-1.png'});
 await drawer.click();
 await awaitGlyphFilter('#btnDla','#precisionIconMetal');
 assert(await dlaGlyph.isVisible());
 if(cfg.lang==='en')await page.locator('#controlsContainer').screenshot({path:'/tmp/mode-switch-playback/precision-drawer-2.png'});
 await drawer.click();
 await page.locator('#btnPlayPauseLife').click();
 await awaitGlyphFilter(life,'none');
 assert.equal(await lifeGlyph.evaluate(svg=>getComputedStyle(svg).strokeWidth),'2.5px');
 await awaitHalo(life,1);
 await page.locator('#btnPlayPauseLife').click();
 await awaitGlyphFilter(life,'#precisionIconMetal');
 await page.reload();
 await page.waitForFunction(()=>window.modeTest?.ready);
 assert.equal(await precision.isChecked(),true,'enabled choice survives reopening');
 assert(await page.locator('html[data-precision-icons]').count());
 await mkdir('/tmp/mode-switch-playback',{recursive:true});await page.screenshot({path:`/tmp/mode-switch-playback/${cfg.lang}-paused.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({...cfg,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
