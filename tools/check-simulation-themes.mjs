// Supported theme controls, running/resting restoration and retired preferences.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const artifacts='/tmp/evolution-theme-check';await mkdir(artifacts,{recursive:true});
const colors={
 blue:'rgb(63, 81, 181)', gold:'rgb(165, 139, 84)', teal:'rgb(104, 189, 181)',
 'moon-silver':'rgb(182, 195, 212)', ivory:'rgb(231, 216, 181)', 'dark-gray':'rgb(123, 126, 130)'
};
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
 const ink=()=>page.locator('#btnGravitationalSort svg').first().evaluate(e=>getComputedStyle(e).stroke);
 await boot(false);const fresh=await state();assert.equal(fresh.settings.simulationTheme,'gold');assert.equal(fresh.settings.simulationPlaybackTheme,'gold');await page.evaluate(()=>themeTest.setup());await tech();
 assert.equal(await page.locator('#technicianDialog #simulationThemeSettings,#technicianDialog #simulationPlaybackThemeSettings').count(),0);
 await tap('#btnTechnicianCloseTop');await map();
 assert.equal(await page.locator('#simulationThemeSettings').count(),0);
 assert.equal(await page.locator('#evolutionDrawerDialog .drawer-appearance #simulationPlaybackThemeSettings').count(),1);
 assert.equal(await page.locator('[id=simulationPlaybackThemeSettings]').count(),1);
 const bounds=await page.locator('#evolutionDrawerDialog').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=config.width+1);
 assert.equal(await page.locator('#evolutionDrawerDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 const choices=await page.locator('.drawer-appearance [data-theme]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),p=getComputedStyle(e,'::before');return {width:r.width,height:r.height,sample:parseFloat(p.width),visibility:getComputedStyle(e).opacity};}));
 assert(choices.every(r=>r.width>=43&&r.height>=43&&Math.abs(r.sample-34)<.1&&r.visibility==='1'),'clear swatches retain comfortable targets');
 await page.locator('.drawer-appearance').scrollIntoViewIfNeeded();await page.screenshot({path:artifacts+'/'+config.lang+'-themes-in-map.png'});

 assert.deepEqual(await page.locator('#simulationPlaybackThemeSettings [data-theme]').evaluateAll(es=>es.map(e=>e.dataset.theme)),Object.keys(colors));
 const swatches=page.locator('.drawer-color-options');
 const defaultDrawerColors=['blue','gold','burgundy'];
 const newDrawerColors=['pine-green','ink-violet','warm-charcoal'];
 const drawerTargets=await swatches.getByRole('button').evaluateAll(buttons=>buttons.map(button=>{
  const {width,height}=button.getBoundingClientRect();return {width,height};
 }));
 assert.equal(drawerTargets.length,18);
 assert(drawerTargets.every(({width,height})=>width>=43&&height>=43),'drawer color targets remain touch-sized');
 assert(fresh.patterns);
 assert.equal(await swatches.count(),3);
 for(const [drawer,color] of defaultDrawerColors.entries()){
  assert.deepEqual(await swatches.nth(drawer).locator('button').evaluateAll(es=>es.map(e=>e.dataset.drawerColor)),[...defaultDrawerColors,...newDrawerColors]);
  assert.equal(await swatches.nth(drawer).locator('[aria-pressed=true]').getAttribute('data-drawer-color'),color);
 }
 const chooseColor=async(drawer,color)=>tap('.drawer-pages section:nth-child('+drawer+') [data-drawer-color='+color+']');
 const keepDrawers=page.locator('#keepSimulationDrawersToggle');
 const drawerBackdrop=()=>backdrop.evaluate(e=>getComputedStyle(e).backgroundImage);
 const initialBackdrop=await drawerBackdrop();
 assert.match(initialBackdrop,/rgb\(15, 23, 42\)/);
 assert(await keepDrawers.isChecked());
 await chooseColor(1,'gold');
 const goldBackdrop=await drawerBackdrop();
 await chooseColor(1,'warm-charcoal');
 assert.equal(await swatches.first().locator('[aria-pressed=true]').getAttribute('data-drawer-color'),'warm-charcoal');
 assert.match(await drawerBackdrop(),/rgb\(37, 36, 35\)/);
 assert.notEqual(await drawerBackdrop(),goldBackdrop);
 for (const [drawer,color] of newDrawerColors.entries()) await chooseColor(drawer+1,color);
 assert.match(await drawerBackdrop(),/rgb\(20, 41, 31\)/);
 const editedBackdrop=await drawerBackdrop();
 await tap('#evolutionDrawerDialog [data-close]');
 for(const expected of [/rgb\(41, 27, 56\)/,/rgb\(37, 36, 35\)/,/rgb\(20, 41, 31\)/]){
  await tap('#btnEvolutionDrawerInternal');assert.match(await drawerBackdrop(),expected);
 }
 await tap('#btnPlayPauseLife');await page.waitForTimeout(450);
 assert.equal(await opacity(),'1');assert.equal(await drawerBackdrop(),editedBackdrop);
 await tap('#btnPlayPauseLife');
 await tech();
 if(await page.locator('#btnConfigureDisplay').getAttribute('aria-expanded')==='false')await tap('#btnConfigureDisplay');
 await keepDrawers.uncheck();await tap('#individualDrawerColorsToggle');
 if(await page.locator('#btnConfigureFeatures').getAttribute('aria-expanded')==='false')await tap('#btnConfigureFeatures');
 await tap('#patternsExperimentToggle');
 assert.equal((await state()).patterns,false);
 await tap('#btnTechnicianCloseTop');await map();
 assert.equal(await swatches.count(),2);assert.equal(await swatches.first().isVisible(),false);
 assert.match(await drawerBackdrop(),/rgb\(42, 34, 19\)/);
 await tap('#evolutionDrawerDialog [data-close]');
 await tap('#btnPlayPauseLife');await page.waitForTimeout(450);assert.equal(await opacity(),'0');
 await tap('#btnPlayPauseLife');
 await boot(true);await page.evaluate(()=>themeTest.setup());
 assert((await state()).patterns);assert(await keepDrawers.isChecked());assert(await page.locator('#individualDrawerColorsToggle').isChecked());
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
 for(const playback of Object.keys(colors)){
  const before=await state();await tap('#simulationPlaybackThemeSettings [data-theme='+playback+']');
  const selected=await state();assert.deepEqual(selected.board,before.board);assert.equal(selected.history,before.history);assert.equal(selected.settings.simulationTheme,rest);assert.equal(selected.settings.simulationPlaybackTheme,playback);
  await tap('#evolutionDrawerDialog [data-close]');const frame=await backdrop.boundingBox(),buttonBounds=await page.locator('#btnNudgeBrighter').boundingBox();assert.equal(await opacity(),'1');assert((await backdrop.evaluate(e=>getComputedStyle(e).transitionProperty)).includes('opacity'));await page.screenshot({path:artifacts+'/'+config.lang+'-'+rest+'-paused.png'});await tap('#btnPlayPauseLife');assert((await state()).playing);assert.equal(await page.locator('html').getAttribute('data-simulation-effective-theme'),playback);await page.waitForTimeout(450);
  assert.equal(await ink(),'rgb(118, 103, 65)');assert.equal(await opacity(),'0');assert.deepEqual(await backdrop.boundingBox(),frame);assert.deepEqual(await page.locator('#btnNudgeBrighter').boundingBox(),buttonBounds);await page.screenshot({path:artifacts+'/'+config.lang+'-'+playback+'-running.png'});
  await tap('#btnPlayPauseLife');assert.equal(await page.locator('html').getAttribute('data-simulation-effective-theme'),rest);await page.waitForTimeout(450);
  assert.equal(await ink(),colors.gold);assert.equal(await opacity(),'1');assert.deepEqual(await backdrop.boundingBox(),frame);
  assert.equal(await drawerBackdrop(),initialBackdrop);
  await map();
 }
 // Reduced motion retains the same visibility states without transitions.
 await tap('#evolutionDrawerDialog [data-close]');await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await opacity(),'1');assert.equal(await backdrop.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await tap('#btnPlayPauseLife');assert.equal(await opacity(),'0');await tap('#btnPlayPauseLife');assert.equal(await opacity(),'1');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(350);await boot(true);let current=await state();assert.equal(current.settings.simulationTheme,rest);assert.equal(current.settings.simulationPlaybackTheme,'dark-gray');
 // Saved legacy profiles normalize only the retired appearance fields.
 await page.evaluate(()=>{const key='colorGridProfileDraftsV1',saved=JSON.parse(localStorage.getItem(key));for(const p of saved.profiles)for(const kind of ['saved','draft']){p[kind].settings.simulationTheme='deep-blue';p[kind].settings.simulationPlaybackTheme='deep-blue';p[kind].settings.brush.size=7;p[kind].settings.startup.boardSize=27;p[kind].settings.startup.brushSize=7;}localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('colorGridSimulationTheme','deep-blue');localStorage.setItem('colorGridSimulationPlaybackTheme','deep-blue');});
 await boot(true);current=await state();assert.equal(current.settings.simulationTheme,'blue');assert.equal(current.settings.simulationPlaybackTheme,'gold');assert.equal(current.settings.brush.size,7);assert.equal(current.settings.startup.boardSize,27);
 // Import an actual old settings TXT without losing unrelated settings.
 await page.locator('#projectFileInput').setInputFiles({name:'old-appearance-settings.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{simulationTheme:'pink',simulationPlaybackTheme:'ice',simulationPreferences:{patternsVisible:false},brush:{size:5},startup:{boardSize:35}}}))});
 await page.waitForFunction(()=>themeTest.state().settings.brush.size===5);current=await state();assert(current.patterns);assert.equal(current.settings.startup.boardSize,35);assert.equal(current.settings.simulationTheme,'blue');assert.equal(current.settings.simulationPlaybackTheme,'gold');

 // Verify the shared progress and native hit targets while the controls are in motion.
 await page.evaluate(()=>{
  const backdrop=document.getElementById('keepSimulationDrawersToggle');
  backdrop.checked=false;backdrop.dispatchEvent(new Event('change'));
  const toggle=document.getElementById('goldPlaybackHierarchyToggle');
  toggle.checked=true;toggle.dispatchEvent(new Event('change'));
  themeTest.setup();
 });
 const toolbar=page.locator('#controlsContainer');
 const visual=()=>page.evaluate(()=>{
  const bar=document.getElementById('controlsContainer');
  const read=id=>{const button=document.getElementById(id),style=getComputedStyle(button);return {
   opacity:+style.opacity,color:style.color,visibility:style.visibility,inert:button.inert
  };};
  const save=read('btnSave'),toggle=read('btnToggleSimMode');
  return {progress:+bar.style.getPropertyValue('--gold-playback-progress'),window:read('simModeBackground').opacity,
   halo:+getComputedStyle(document.getElementById('btnNudgeBrighter'),'::before').opacity,
   tools:read('btnResizeUp'),sort:read('btnCycleSort'),save,toggle,moving:bar.hasAttribute('data-gold-playback-moving'),
   frameImage:getComputedStyle(document.getElementById('simModeBackground')).backgroundImage};
 });
 const waitForProgress=(min,max)=>page.waitForFunction(([min,max])=>{
  const bar=document.getElementById('controlsContainer');
  const progress=+bar.style.getPropertyValue('--gold-playback-progress');
  return progress>=min&&progress<=max&&(min!==max||!bar.hasAttribute('data-gold-playback-moving'));
 },[min,max]);
 const paused=await visual();
 assert(await page.locator('#goldExcludeSortToggle').isChecked());
 assert.equal(await page.locator('#goldTransitionDuration').inputValue(),'2');
 await tap('#btnPlayPauseLife');
 await waitForProgress(.14,.28);
 const leaving=await visual();
 assert(leaving.progress>0&&leaving.progress<.5);
 assert(Math.abs(leaving.window+leaving.halo-1)<.015,'frame and halo share their progress');
 assert(Math.abs(leaving.window+leaving.progress-1)<.01);
 assert.equal(leaving.frameImage,initialBackdrop);
 assert.notEqual(leaving.tools.color,paused.tools.color);
 assert.deepEqual(leaving.sort,paused.sort,'Sort is visually exempt by default during the transition');
 for(const name of ['save','toggle']){
  assert(leaving[name].inert&&leaving[name].opacity>0&&leaving[name].opacity<1);
 }
 const oldDrawer=await toolbar.getAttribute('data-evolution-page');
 await tap('#btnEvolutionDrawerInternal');
 assert.notEqual(await toolbar.getAttribute('data-evolution-page'),oldDrawer);
 await tap('#btnEvolutionDrawerInternal');
 await tap('#btnEvolutionDrawerInternal');
 await waitForProgress(.57,.9);
 const reached=await visual();
 assert(reached.save.inert&&reached.save.visibility==='hidden');
 await tap('#btnPlayPauseLife');
 const reversed=await visual();
 assert(reversed.progress>.4&&reversed.progress<1,'Pause reverses an in-flight transition from its current position');
 await waitForProgress(.16,.37);
 const returning=await visual();
 assert(returning.save.opacity>0&&returning.save.opacity<1&&!returning.save.inert);
 assert(Math.abs(returning.window+returning.halo-1)<.015);
 assert.equal(returning.frameImage,initialBackdrop);
 await waitForProgress(0,0);
 assert.deepEqual(await visual(),paused,'Pause settles back to the original visual state');
 await tech();
 const displaySettings=page.locator('#btnConfigureDisplay');
 if(await displaySettings.getAttribute('aria-expanded')==='false')await tap('#btnConfigureDisplay');
 const durationSlider=page.locator('#goldTransitionDuration');
 assert(await durationSlider.isVisible());
 const hierarchyBox=await page.locator('#goldPlaybackHierarchyToggle').boundingBox();
 const durationBox=await durationSlider.boundingBox();
 assert(durationBox.y>=hierarchyBox.y+hierarchyBox.height);
 await durationSlider.press('Home');
 assert.equal(await page.evaluate(()=>localStorage.getItem('colorGridGoldTransitionSeconds')),'0.8');
 await tap('#goldExcludeSortToggle');
 assert(!(await page.locator('#goldExcludeSortToggle').isChecked()));
 await tap('#btnTechnicianCloseTop');
 await tap('#btnPlayPauseLife');
 await waitForProgress(.15,.4);
 const intermediate=await visual();
 assert.notEqual(intermediate.sort.color,paused.sort.color,'Sort joins the tint transition when opted in');
 await waitForProgress(1,1);
 const playing=await visual();
 assert.equal(playing.tools.color,colors.blue);
 assert.equal(playing.sort.color,colors.blue);
 assert.equal(playing.save.visibility,'hidden');
 assert.equal(playing.toggle.opacity,0);
 assert.equal(playing.window,0);
 assert.equal(playing.halo,1);
 await tap('#btnMagnetModes');
 assert.equal((await visual()).progress,1,'live handoff does not restart the transition');
 await tap('#btnPlayPauseLife');
 await waitForProgress(0,0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await tap('#btnPlayPauseLife');
 assert.equal(await toolbar.getAttribute('data-gold-playback-motion'),null);
 assert.equal((await visual()).tools.color,colors.blue);
 assert.equal((await visual()).save.visibility,'hidden');
 await tap('#btnPlayPauseLife');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  const toggle=document.getElementById('goldPlaybackHierarchyToggle');
  toggle.checked=false;toggle.dispatchEvent(new Event('change'));
 });
 await tap('#btnPlayPauseLife');
 assert.equal(await toolbar.getAttribute('data-gold-playback-motion'),null);
 assert.equal((await visual()).tools.color,paused.tools.color);
 assert.equal((await visual()).sort.color,paused.sort.color);
 assert.equal((await visual()).save.visibility,'hidden');
 await tap('#btnPlayPauseLife');
 await boot(true);
 assert.equal(await page.locator('#goldTransitionDuration').inputValue(),'0','transition duration survives reload');
 assert(!(await page.locator('#goldExcludeSortToggle').isChecked()),'Sort choice survives reload');
 assert(await keepDrawers.isChecked(),'drawer visibility resets on reload');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
