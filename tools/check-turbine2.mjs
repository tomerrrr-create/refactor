// Public settings, real playback and saved profile/project compatibility for Turbine 2.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/turbine2-check';await mkdir(artifacts,{recursive:true});
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.turbineTest={
 setup:()=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=0;currentSortMethod='luminance';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,'luminance'));n=31;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=(i*7+3)%paletteLen();t.isGold=i===0;});armSimulation('spiral');spiralMode='left';spiralRules.method='left';updateSpiralButtonUI();isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 dark:goDarkAction,other:()=>armSimulation('gravitationalSort'),controls:()=>{armSimulation(null);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');},open:()=>modals.openSpiralSettingsModal(),tech:()=>modals.openTechnicianMenu(),pause:pauseLife,
 project:getCurrentState,restore:state=>applyState(state),settings:()=>serializeWorkspaceSettings(getWorkspaceSettings()),
 state:()=>({armed:armedSimulation,method:spiralRules.method,mode:spiralMode,playing:isLifePlaying,loaded:isMacroLoaded,gen:currentGenerationCount,tiles:boardState.map(t=>[t.k,t.v,t.isGold]),logs:[...artRecipeLog]}),
 recipe:()=>artRecipeLog.join(String.fromCharCode(10))};initializeApp().then(()=>turbineTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1440,height:1000,lang:'en'},{width:390,height:844,lang:'he'},{width:360,height:800,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 if(process.env.TURBINE_LANG&&config.lang!==process.env.TURBINE_LANG)continue;
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);window.resetTurbineRandom=()=>{let seed=14327;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};Date.now=()=>1700000000000;},config.lang);
 const page=await context.newPage(),errors=[];
 // Control only the engine's stochastic input, independently of UI random use.
 await page.route(base+'/js/simulations/spiral-turbine2.js',async route=>{
  const module=await readFile(path.join(root,'js/simulations/spiral-turbine2.js'),'utf8');
  await route.fulfill({contentType:'text/javascript',body:module.replace('export function runTurbine2Generation(n,board) {','export function runTurbine2Generation(n,board) { window.resetTurbineRandom();')});
 });page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
 const boot=async reload=>{await (reload?page.reload():page.goto(base));await page.waitForFunction(()=>window.turbineTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const state=()=>page.evaluate(()=>turbineTest.state());
 const open=async()=>{await page.evaluate(()=>turbineTest.open());await page.locator('#spiralSettingsModal').waitFor({state:'visible'});await page.waitForTimeout(330);};
 const save=async()=>{await page.locator('#btnSpiralSettingsSave').click();await page.waitForTimeout(350);};
 const choose=async method=>{await open();await page.locator('.spiral-method-btn[data-method="'+method+'"]').click();await save();};
 const replay=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'turbine2.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>turbineTest.state().loaded);await page.evaluate(()=>resetTurbineRandom());await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>!turbineTest.state().loaded,{timeout:20000});};
 await boot(false);await page.evaluate(()=>turbineTest.setup());
 // Go Dark must preserve the selected Spiral mode and its actual arming state.
 if(!(await page.locator('#btnSpiral').isVisible()))await page.locator('#btnEvolutionDrawerInternal').click();
 for(const method of ['turbine2','b','left','black_hole']){
  await choose(method);
  await page.evaluate(()=>turbineTest.dark());await page.waitForTimeout(900);
  const dark=await state();assert.equal(dark.armed,'spiral');assert.equal(dark.mode,method);
  assert(await page.locator('#btnSpiral').evaluate(e=>e.classList.contains('simulation-active')));
  assert(!(await page.locator('#btnPlayPauseLife').isDisabled()));
  await page.locator('#btnSpiral').click();
  const next=['turbine2','b','left','black_hole','off'][['turbine2','b','left','black_hole'].indexOf(method)+1];
  assert.equal((await state()).mode,next);assert.equal((await state()).armed,next==='off'?null:'spiral');
  assert.equal(await page.locator('#btnSpiral').evaluate(e=>e.classList.contains('simulation-active')),next!=='off');
 }
 console.log('PASS Go Dark preserves Spiral arming across all cycle modes',config.lang);
 await page.evaluate(()=>turbineTest.setup());
 if(process.env.TURBINE_ICON_ONLY){
  const icons=()=>page.locator('#btnSpiral svg').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id));
  await page.evaluate(()=>turbineTest.controls());
  if(!(await page.locator('#btnSpiral').isVisible()))await page.locator('#btnEvolutionDrawerInternal').click();
  assert.deepEqual(await icons(),['iconSpiralTurbine2'],'unselected control uses the first cycle icon');
  for(const [mode,icon] of [['turbine2','iconSpiralTurbine2'],['b','iconSpiralB'],['left','iconSpiralLeft'],['black_hole','iconSpiralBlackHole'],['off','iconSpiralTurbine2']]){
   await page.locator('#btnSpiral').click();assert.equal((await state()).mode,mode);assert.deepEqual(await icons(),[icon]);
   assert.equal(await page.locator('#btnSpiral').evaluate(e=>e.classList.contains('simulation-active')),mode!=='off');
  }
  await page.locator('#btnSpiral').click();await page.locator('#btnSpiral').click();await page.locator('#btnSpiral').click();assert.deepEqual(await icons(),['iconSpiralLeft']);
  await page.evaluate(()=>turbineTest.other());assert.equal((await state()).mode,'off');assert.deepEqual(await icons(),['iconSpiralTurbine2'],'switching to another evolution restores the default symbol');
  assert.deepEqual(errors,[]);console.log('PASS inactive/active Spiral icons',JSON.stringify(config));await context.close();continue;
 }
 await open();
 const option=page.locator('.spiral-method-btn[data-method="turbine2"]');assert.equal(await option.count(),1);assert((await option.textContent()).includes('2'));
 await option.click();assert.equal((await state()).method,'left','selection stays a modal draft');await page.locator('#btnSpiralSettingsCancel').click();await page.waitForTimeout(350);assert.equal((await state()).method,'left');
 await choose('turbine2');assert.equal((await state()).mode,'turbine2');
 const icon=await page.locator('#btnSpiral svg').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id));assert.deepEqual(icon,['iconSpiralTurbine2']);
 await open();assert(await option.evaluate(e=>e.classList.contains('active')));await page.screenshot({path:path.join(artifacts,config.lang+'-settings.png')});await page.locator('#btnSpiralSettingsCancel').click();await page.waitForTimeout(350);
 const before=(await state()).tiles;await page.evaluate(()=>resetTurbineRandom());await page.locator('#btnStepForward').click();const after=(await state()).tiles;assert.notDeepEqual(after,before);assert.deepEqual(after[0],before[0]);
 await page.locator('#btnUndo').click();assert.deepEqual((await state()).tiles,before);await page.locator('#btnRedo').click();assert.deepEqual((await state()).tiles,after);
 const recipe=await page.evaluate(()=>turbineTest.recipe());assert(recipe.includes('"method":"turbine2"'));await replay(recipe);assert.deepEqual((await state()).tiles,after,'recorded step with Undo/Redo replays exactly under controlled random/time inputs');
 // Artwork restoration and settings export retain the distinct mode ID.
 const project=await page.evaluate(()=>turbineTest.project());assert.equal(project.spiralMethod,'turbine2');await choose('left');await page.evaluate(p=>turbineTest.restore(p),project);assert.equal((await state()).method,'turbine2');
 assert(/"method"\s*:\s*"turbine2"/.test(await page.evaluate(()=>turbineTest.settings())));
 // Running modal Save keeps Play running and records the rules with the new ID.
 await page.evaluate(()=>turbineTest.setup());await page.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>turbineTest.state().gen>=2);await choose('turbine2');assert((await state()).playing);await page.waitForTimeout(80);await page.locator('#btnPlayPauseLife').click();
 const running=await page.evaluate(()=>turbineTest.recipe());assert(running.split('\n').some(line=>line.includes('SIMULATION_RULES')&&line.includes('"method":"turbine2"')));await replay(running);assert.equal((await state()).method,'turbine2');
 // Explicit profile Save is required for reopening, as with the original mode.
 await page.evaluate(()=>turbineTest.tech());if(!(await page.locator('#profileActions').isVisible()))await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await boot(true);assert.equal((await state()).method,'turbine2');
 await open();assert(await option.evaluate(e=>e.classList.contains('active')),'saved experiment is selected after reload');await page.locator('#btnSpiralSettingsCancel').click();await page.waitForTimeout(350);
 // Both initial entry and paused cycling follow the new requested order.
 await page.evaluate(()=>turbineTest.controls());if(!(await page.locator('#btnSpiral').isVisible()))await page.locator('#btnEvolutionDrawerInternal').click();
 for(const expected of ['turbine2','b','left','black_hole','off']){
  await page.locator('#btnSpiral').click();assert.equal((await state()).mode,expected);
  if(expected!=='off')assert.equal((await state()).method,expected);
 }
 // Live cycling wraps to Turbine 2, skips Off and retains the running generation clock.
 await page.evaluate(()=>turbineTest.setup());await page.evaluate(()=>turbineTest.controls());
 if(!(await page.locator('#btnSpiral').isVisible()))await page.locator('#btnEvolutionDrawerInternal').click();
 await page.locator('#btnSpiral').click();assert.equal((await state()).method,'turbine2');
 await page.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>turbineTest.state().gen>=2);
 for(const expected of ['b','left','black_hole','turbine2']){
  const generation=(await state()).gen;await page.locator('#btnSpiral').click();const live=await state();
  assert.equal(live.mode,expected);assert.equal(live.method,expected);assert(live.playing);assert(live.gen>=generation);
 }
 await page.locator('#btnPlayPauseLife').click();const cycleRecipe=await page.evaluate(()=>turbineTest.recipe());
 assert(cycleRecipe.split('\n').some(line=>/\[GEN:\d+\] Spiral Mode Changed -> turbine2/.test(line)));
 await replay(cycleRecipe);assert.equal((await state()).mode,'turbine2');
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config));await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
