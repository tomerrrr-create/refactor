// Supported theme controls, running/resting restoration and retired preferences.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const artifacts='/tmp/evolution-theme-check';await mkdir(artifacts,{recursive:true});
const pausedInk='rgb(165, 139, 84)';
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.themeTest={
 setup:()=>{pauseLife();isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();armSimulation('nudgeBrighter');},
 tech:()=>modals.openTechnicianMenu(),map:()=>evolutionDrawer.open(),state:()=>({settings:getWorkspaceSettings(),board:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),history:history.length,playing:isLifePlaying,patterns:experimentalSimulations.visible('patterns')})
 };initializeApp().then(()=>themeTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(f==='js/app.js'?source:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.DRAWER_LANG||c.lang===process.env.DRAWER_LANG)){
 const ctx=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await ctx.addInitScript(lang=>{
  localStorage.setItem('userLanguage',lang);
  localStorage.setItem('colorGridOpeningChoice','false');
  localStorage.setItem('colorGridSimulationPlaybackTheme','teal');
  localStorage.setItem('colorGridGoldPlaybackHierarchy','true');
  localStorage.setItem('colorGridGoldTransitionSeconds','3.2');
  localStorage.setItem('colorGridGoldExcludeSort','false');
  if(localStorage.getItem('colorGridExperimentalSimulationsV1')===null) {
   localStorage.setItem('colorGridExperimentalSimulationsV1','{"patterns":false}');
  }
  localStorage.setItem('colorGridKeepSimulationDrawers','false');
 },config.lang);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const boot=async reload=>{
  if(reload)await page.reload();else await page.goto('http://127.0.0.1:'+server.address().port);
  try { await page.waitForFunction(()=>window.themeTest?.ready); }
  catch(error) { assert.deepEqual(errors,[],'app errors during startup');throw error; }
  await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 };
 const state=()=>page.evaluate(()=>themeTest.state()),tap=selector=>config.width<600?page.locator(selector).tap():page.locator(selector).click();
 const tech=async()=>{await page.evaluate(()=>themeTest.tech());await page.locator('#technicianDialog').waitFor({state:'visible'});};
 const map=async()=>{await page.evaluate(()=>themeTest.map());await page.locator('#evolutionDrawerDialog').waitFor({state:'visible'});};
 const backdrop=page.locator('#simModeBackground');
 const opacity=()=>backdrop.evaluate(e=>getComputedStyle(e).opacity);
 const gridOpacity=()=>backdrop.evaluate(e=>getComputedStyle(e,'::before').opacity);
 const texture=()=>backdrop.evaluate(e=>{
  const style=getComputedStyle(e,'::before');
  return {image:style.backgroundImage,mask:style.maskImage,color:style.backgroundColor};
 });
 const borderColor=()=>backdrop.evaluate(e=>getComputedStyle(e).borderTopColor);
 const finishBorderFade=()=>backdrop.evaluate(e=>Promise.all(e.getAnimations().map(animation=>animation.finished)));
 const transparent='rgba(0, 0, 0, 0)';
 const ink=()=>page.locator('#btnGravitationalSort svg').first().evaluate(e=>getComputedStyle(e).stroke);
 await boot(false);const fresh=await state();assert.equal(fresh.settings.simulationTheme,'gold');assert.equal(fresh.settings.simulationPlaybackTheme,'gold');await page.evaluate(()=>themeTest.setup());await tech();
 assert.equal(await page.locator('#technicianDialog #simulationThemeSettings,#technicianDialog #simulationPlaybackThemeSettings').count(),0);
 await tap('#btnTechnicianCloseTop');await map();
 assert.equal(await page.locator('#simulationThemeSettings').count(),0);
 assert.equal(await page.locator('#simulationPlaybackThemeSettings').count(),0);
 const bounds=await page.locator('#evolutionDrawerDialog').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=config.width+1);
 assert.equal(await page.locator('#evolutionDrawerDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 assert(await page.locator('.drawer-header [data-reset-cycles]').isVisible());
 await page.screenshot({path:artifacts+'/'+config.lang+'-themes-in-map.png'});

 const swatches=page.locator('.drawer-color-options');
 const defaultDrawerColors=['pine-green','blue','burgundy'];
 const availableDrawerColors=['blue','gold','burgundy','pine-green','ink-violet','warm-charcoal'];
 const newDrawerColors=['warm-charcoal','ink-violet','pine-green'];
 const drawerTargets=await swatches.getByRole('button').evaluateAll(buttons=>buttons.map(button=>{
  const {width,height}=button.getBoundingClientRect();return {width,height};
 }));
 assert.equal(drawerTargets.length,18);
 assert(drawerTargets.every(({width,height})=>width>=43&&height>=43),'drawer color targets remain touch-sized');
 assert(fresh.patterns);
 assert.equal(await swatches.count(),3);
 for(const [drawer,color] of defaultDrawerColors.entries()){
  assert.deepEqual(await swatches.nth(drawer).locator('button').evaluateAll(es=>es.map(e=>e.dataset.drawerColor)),availableDrawerColors);
  assert.equal(await swatches.nth(drawer).locator('[aria-pressed=true]').getAttribute('data-drawer-color'),color);
 }
 const chooseColor=async(drawer,color)=>tap('.drawer-pages section:nth-child('+drawer+') [data-drawer-color='+color+']');
 const keepDrawers=page.locator('#keepSimulationDrawersToggle');
 const drawerBackdrop=()=>backdrop.evaluate(e=>getComputedStyle(e).backgroundImage);
 const initialBackdrop=await drawerBackdrop();
 assert.match(initialBackdrop,/rgb\(20, 41, 31\)/);
 assert.equal((await texture()).color,'rgba(166, 198, 163, 0.08)');
 assert.match((await texture()).mask,/drawer-life-contours\.png/);
 assert(await keepDrawers.isChecked());
 await chooseColor(1,'gold');
 const goldBackdrop=await drawerBackdrop();
 await chooseColor(1,'warm-charcoal');
 assert.equal(await swatches.first().locator('[aria-pressed=true]').getAttribute('data-drawer-color'),'warm-charcoal');
 assert.match(await drawerBackdrop(),/rgb\(37, 36, 35\)/);
 assert.notEqual(await drawerBackdrop(),goldBackdrop);
 for (const [drawer,color] of newDrawerColors.entries()) await chooseColor(drawer+1,color);
 assert.match(await drawerBackdrop(),/rgb\(37, 36, 35\)/);
 const editedBackdrop=await drawerBackdrop();
 await tap('#evolutionDrawerDialog [data-close]');
 for(const [expected,mask] of [[/rgb\(41, 27, 56\)/,/drawer-pulse-waves\.png/],[/rgb\(20, 41, 31\)/,/^none$/],[/rgb\(37, 36, 35\)/,/drawer-life-contours\.png/]]){
  await tap('#btnEvolutionDrawerInternal');
  const image=await drawerBackdrop();
  assert.match(image,expected);
  assert.match((await texture()).mask,mask);
 }
 await finishBorderFade();
 const editedBorder=await borderColor();
 await tap('#btnPlayPauseLife');await page.waitForTimeout(450);
 assert.equal(await opacity(),'1');assert.equal(await drawerBackdrop(),editedBackdrop);
 assert.equal(await gridOpacity(),'1');
 assert.equal(await borderColor(),editedBorder);assert.notEqual(editedBorder,transparent);
 await tap('#btnPlayPauseLife');
 await tech();
 if(await page.locator('#btnConfigureDisplay').getAttribute('aria-expanded')==='false')await tap('#btnConfigureDisplay');
 await keepDrawers.uncheck();
 assert(await keepDrawers.isVisible());
 assert.equal(await page.locator('#individualDrawerColorsToggle,#goldPlaybackHierarchyToggle,#goldTransitionDuration,#goldExcludeSortToggle').count(),0);
 if(await page.locator('#btnConfigureFeatures').getAttribute('aria-expanded')==='false')await tap('#btnConfigureFeatures');
 await tap('#patternsExperimentToggle');
 assert.equal((await state()).patterns,false);
 await tap('#btnTechnicianCloseTop');await map();
 assert.equal(await swatches.count(),2);assert(await swatches.first().isVisible());
 assert.equal(await drawerBackdrop(),editedBackdrop);
 await tap('#evolutionDrawerDialog [data-close]');
 await tap('#btnPlayPauseLife');await page.waitForTimeout(450);
 assert.equal(await borderColor(),transparent);assert.equal(await opacity(),'1');
 assert.equal(await gridOpacity(),'0');
 await tap('#btnEvolutionDrawerInternal');
 assert.match(await drawerBackdrop(),/rgb\(41, 27, 56\)/);
 assert.equal(await borderColor(),transparent);
 assert.equal(await gridOpacity(),'0');
 await tap('#btnEvolutionDrawerInternal');
 assert.equal(await drawerBackdrop(),editedBackdrop);
 assert.equal(await borderColor(),transparent);
 assert.equal(await gridOpacity(),'0');
 await tap('#btnPlayPauseLife');
 await boot(true);await page.evaluate(()=>themeTest.setup());
 assert((await state()).patterns);assert(await keepDrawers.isChecked());
 assert.equal(await drawerBackdrop(),editedBackdrop);
 await map();
 for(const [drawer,color] of newDrawerColors.entries()){
  assert.equal(await swatches.nth(drawer).locator('[aria-pressed=true]').getAttribute('data-drawer-color'),color);
 }
 const beforeReset=await state();
 await tap('#evolutionDrawerDialog [data-reset]');
 for(const [drawer,color] of defaultDrawerColors.entries()){
  assert.equal(await swatches.nth(drawer).locator('[aria-pressed=true]').getAttribute('data-drawer-color'),color);
 }
 assert.equal(await drawerBackdrop(),initialBackdrop);
 assert.equal(await page.evaluate(()=>localStorage.getItem('colorGridSimulationDrawerColors')),JSON.stringify(defaultDrawerColors));
 assert.equal((await state()).settings.simulationPlaybackTheme,beforeReset.settings.simulationPlaybackTheme);
 await tap('#evolutionDrawerDialog [data-close]');await tech();
 if(await page.locator('#btnConfigureDisplay').getAttribute('aria-expanded')==='false')await tap('#btnConfigureDisplay');
 await keepDrawers.uncheck();await tap('#btnTechnicianCloseTop');await map();
 assert.equal(await page.locator('#simModeBackground .sim-theme-layer').count(),0);
 const rest=fresh.settings.simulationTheme;
 await tap('#evolutionDrawerDialog [data-close]');
 await finishBorderFade();
 const frame=await backdrop.boundingBox(),buttonBounds=await page.locator('#btnNudgeBrighter').boundingBox();
 const restingBorder=await borderColor();
 const shadow=await backdrop.evaluate(e=>getComputedStyle(e).boxShadow);
 assert.deepEqual(await backdrop.evaluate(e=>{
  const style=getComputedStyle(e);
  const grid=getComputedStyle(e,'::before');
  return [style.transitionProperty,style.transitionDuration,grid.transitionProperty,grid.transitionDuration];
 }),['border-color','0.4s','opacity','0.4s']);
 assert.equal(await gridOpacity(),'1');
 assert.equal(await opacity(),'1');
 await tap('#btnPlayPauseLife');assert((await state()).playing);
 assert.equal(await page.locator('html').getAttribute('data-simulation-effective-theme'),'gold');
 await page.waitForTimeout(450);
 assert.equal(await ink(),'rgb(118, 103, 65)');assert.equal(await opacity(),'1');
 assert.equal(await borderColor(),transparent);assert.equal(await drawerBackdrop(),initialBackdrop);
 assert.equal(await gridOpacity(),'0');
 assert.equal(await backdrop.evaluate(e=>getComputedStyle(e).boxShadow),shadow);
 await page.screenshot({path:artifacts+'/'+config.lang+'-border-faded.png'});
 assert.deepEqual(await backdrop.boundingBox(),frame);
 assert.deepEqual(await page.locator('#btnNudgeBrighter').boundingBox(),buttonBounds);
 await tap('#btnPlayPauseLife');await page.waitForTimeout(450);
 assert.equal(await page.locator('html').getAttribute('data-simulation-effective-theme'),rest);
 assert.equal(await ink(),pausedInk);assert.equal(await opacity(),'1');
 assert.equal(await borderColor(),restingBorder);assert.notEqual(restingBorder,transparent);
 assert.equal(await gridOpacity(),'1');
 assert.equal(await drawerBackdrop(),initialBackdrop);
 // Reduced motion retains the same visibility states without transitions.
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await opacity(),'1');assert.equal(await backdrop.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 assert.equal(await backdrop.evaluate(e=>getComputedStyle(e,'::before').transitionDuration),'0s');
 await tap('#btnPlayPauseLife');assert.equal(await borderColor(),transparent);
 assert.equal(await gridOpacity(),'0');
 assert.equal(await opacity(),'1');assert.equal(await drawerBackdrop(),initialBackdrop);
 await tap('#btnPlayPauseLife');assert.equal(await borderColor(),restingBorder);
 assert.equal(await gridOpacity(),'1');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(350);await boot(true);let current=await state();assert.equal(current.settings.simulationTheme,rest);assert.equal(current.settings.simulationPlaybackTheme,'gold');
 // Saved legacy profiles normalize only the retired appearance fields.
 await page.evaluate(()=>{const key='colorGridProfileDraftsV1',saved=JSON.parse(localStorage.getItem(key));for(const p of saved.profiles)for(const kind of ['saved','draft']){p[kind].settings.simulationTheme='deep-blue';p[kind].settings.simulationPlaybackTheme='blue';p[kind].settings.brush.size=7;p[kind].settings.startup.boardSize=27;p[kind].settings.startup.brushSize=7;}localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('colorGridSimulationTheme','deep-blue');localStorage.setItem('colorGridSimulationPlaybackTheme','deep-blue');});
 await boot(true);current=await state();assert.equal(current.settings.simulationTheme,'blue');assert.equal(current.settings.simulationPlaybackTheme,'gold');assert.equal(current.settings.brush.size,7);assert.equal(current.settings.startup.boardSize,27);
 // Import an actual old settings TXT without losing unrelated settings.
 await page.locator('#projectFileInput').setInputFiles({name:'old-appearance-settings.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{simulationTheme:'pink',simulationPlaybackTheme:'teal',simulationPreferences:{patternsVisible:false},brush:{size:5},startup:{boardSize:35}}}))});
 await page.waitForFunction(()=>themeTest.state().settings.brush.size===5);current=await state();assert(current.patterns);assert.equal(current.settings.startup.boardSize,35);assert.equal(current.settings.simulationTheme,'blue');assert.equal(current.settings.simulationPlaybackTheme,'gold');

 // Old values for the removed experiment must leave the standard playback styling in place.
 await page.evaluate(()=>themeTest.setup());
 const toolColors=()=>page.locator('#btnResizeUp,#btnCycleSort').evaluateAll(buttons=>buttons.map(button=>getComputedStyle(button).color));
 const idleColors=await toolColors();
 await tap('#btnPlayPauseLife');
 assert((await state()).playing);
 assert.equal(await page.locator('html').getAttribute('data-gold-playback-hierarchy'),null);
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#btnNudgeBrighter'),'::before').opacity)>.99);
 assert.deepEqual(await toolColors(),idleColors);
 assert.equal(await opacity(),'1');
 assert(!(await page.locator('#btnSave').isVisible()));
 assert(!(await page.locator('#btnToggleSimMode').isVisible()));
 await tap('#btnPlayPauseLife');
 await page.locator('#btnSave').waitFor({state:'visible'});
 await page.locator('#btnToggleSimMode').waitFor({state:'visible'});
 await boot(true);
 assert(await keepDrawers.isChecked(),'drawer visibility resets on reload');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
