// Real Spiral controls and logger-to-player round trips, plus pre-change recipe fixtures.
// Isolate seeded swap input from Experiment A geometry construction: cold and warm
// geometry caches consume different random counts in production. No engine edits.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),baseline=process.env.SPIRAL_BASELINE;
const artifacts='/tmp/spiral-cycle-check';await mkdir(artifacts,{recursive:true});
const instrument=async dir=>{let source=await readFile(path.join(dir,'js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.spiralTest={
 setup:()=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=0;currentSortMethod='luminance';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,'luminance'));n=31;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=(i*7+3)%paletteLen();t.isGold=i===0;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 memory:value=>cycleMemory.setEnabled(value),reset:()=>resetEvolutionCycle('spiral'),open:()=>modals.openSpiralSettingsModal(),tech:()=>modals.openTechnicianMenu(),restore:applyState,project:getCurrentState,settings:getWorkspaceSettings,
 state:()=>({armed:armedSimulation,method:spiralRules.method,mode:spiralMode,playing:isLifePlaying,gen:currentGenerationCount,loaded:isMacroLoaded,animating:isAnimating,tiles:boardState.map(t=>[t.k,t.v,t.isGold]),logs:[...artRecipeLog]})};initializeApp().then(()=>spiralTest.ready=true);`);for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');return source;};
const source=await instrument(root),oldSource=baseline?await instrument(baseline):null;
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local'),old=url.pathname.startsWith('/baseline/'),dir=old?baseline:root;const f=url.pathname.slice(old?10:1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');let body=f==='js/app.js'?(old?oldSource:source):await readFile(path.join(dir,f));if(f==='js/simulations/spiral.js')body=String(body).replace('export function runSpiralGeneration({ n, currentBoardState, currentPalette, spiralRules }) {','export function runSpiralGeneration({ n, currentBoardState, currentPalette, spiralRules }) { window.resetSpiralRandom();').replace('cachedRadialN = n;', 'cachedRadialN = n; window.resetSpiralRandom();');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const recipeFor=(method)=>'[00:00:00.000] INIT_STATE -> '+JSON.stringify({recipeVersion:2,n:31,pal:0,sort:'luminance',sep:0,board:Array.from({length:961},(_,i)=>'1x'+((i*7+3)%23)).join(','),gold:[0]})+'\n[00:00:00.010] STEP FORWARD -> Armed: spiral | Sort: luminance | Rules: '+JSON.stringify(method==='tornado2'?{method:'tornado',tornadoVersion:2}:{method});
const init=lang=>{localStorage.setItem('userLanguage',lang);window.resetSpiralRandom=()=>{let seed=14327;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};Date.now=()=>1700000000000;};
const replay=async(page,text)=>{await page.locator('#projectFileInput').setInputFiles({name:'spiral.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>spiralTest.state().loaded);await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>!spiralTest.state().loaded&&!spiralTest.state().animating,{timeout:20000});return page.evaluate(()=>spiralTest.state().tiles);};
try{
 const oldBoards={};if(baseline){const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await c.addInitScript(init,'en');const p=await c.newPage();await p.goto(base+'/baseline/');await p.waitForFunction(()=>window.spiralTest?.ready);await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));for(const method of ['b','left','radial','down','black_hole','a','vortex','turbine2','tornado','tornado2','triangle','square','triangle_weave','triangle_orbit','square_orbit'])oldBoards[method]=await replay(p,recipeFor(method));await c.close();console.log('Captured old recipe results from',baseline);}
 for(const config of [{width:1440,height:1000,lang:'en'},{width:390,height:844,lang:'he'},{width:360,height:800,lang:'ru'},{width:844,height:390,lang:'nl'}]){
  if(process.env.SPIRAL_LANG&&config.lang!==process.env.SPIRAL_LANG)continue;
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('colorGridExperimentalSimulationsV1',JSON.stringify({spiral:true})));
  await context.addInitScript(init,config.lang);
  await context.addInitScript(()=>localStorage.setItem('colorGridVorticesCycleV1',JSON.stringify(['turbine2','flow','left','cosmic','circular','a','black_hole','tornado'])));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
  const state=()=>page.evaluate(()=>spiralTest.state());
  const press=selector=>config.width<600?page.locator(selector).tap():page.locator(selector).click();
  const tap=async selector=>{
   if(await page.locator(selector).getAttribute('data-evolution-page-hidden')!==null)await press('#btnEvolutionDrawerInternal');
   await press(selector);
  };
  await page.goto(base);await page.waitForFunction(()=>window.spiralTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  assert.equal((await page.evaluate(()=>spiralTest.settings())).rules.spiral.method,'b');
  await page.evaluate(()=>spiralTest.setup());await tap('#btnEvolutionDrawerInternal');await page.waitForTimeout(300);
  const modes=['radial','down','triangle_flow','square_flow','triangle_weave'];
  const icons=['iconSpiralRadial','iconSpiralDown','iconSpiralTriangle','iconSpiralSquare','iconSpiralTriangleWeave'];
  const before=(await state()).tiles;
  for(const [i,mode] of [...modes,'off'].entries()){await tap('#btnSpiral');assert.equal((await state()).mode,mode);assert.deepEqual((await state()).tiles,before);assert.deepEqual(await page.locator('#btnSpiral svg').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id)),[icons[i]||'iconSpiralRadial']);}
  const tornado=async()=>{for(let i=0;i<9&&(await state()).mode!=='tornado';i++)await tap('#btnInk');assert.equal((await state()).mode,'tornado');assert.equal(await page.locator('#btnInk').getAttribute('data-mode'),'tornado');assert(await page.locator('#btnInk .vortices-tornado-badge').isVisible());};
  const open=async()=>{await page.evaluate(()=>spiralTest.open());await page.waitForTimeout(350);};
  const choose=async(method,save=true)=>{await open();await tap('.spiral-method-btn[data-method="'+method+'"]');await tap(save?'#btnSpiralSettingsSave':'#btnSpiralSettingsCancel');await page.waitForTimeout(350);};
  await tap('#btnSpiral');await open();assert.deepEqual(await page.locator('.spiral-method-btn').evaluateAll(ns=>ns.map(n=>n.dataset.method)),modes);assert.equal(await page.locator('.spiral-method-btn[data-method="vortex"]').count(),0);await page.screenshot({path:path.join(artifacts,config.lang+'-settings.png')});await tap('#btnSpiralSettingsCancel');await page.waitForTimeout(350);
  await choose('triangle_flow',false);assert.equal((await state()).mode,'radial');
  for(const mode of modes.slice(2)){
   await choose(mode);assert.equal((await state()).mode,mode);
   const project=await page.evaluate(()=>spiralTest.project());
   await choose('radial');
   await page.evaluate(project=>spiralTest.restore(project),project);
   assert.equal((await state()).mode,mode,'artwork restores the selected shape');
  }
  await tap('#btnSpiral');assert.equal((await state()).mode,'off');
  await page.evaluate(()=>spiralTest.setup());
  for(const method of modes){await tap('#btnSpiral');assert.equal((await state()).mode,method);await tap('#btnStepForward');}
  const after=(await state()).tiles,recipe=(await state()).logs.join('\n');assert.notDeepEqual(after,before);
  for(const method of modes){assert(recipe.includes('Spiral Mode Changed -> '+method));assert(recipe.includes('"method":"'+method+'"'));}
  assert.deepEqual(await replay(page,recipe),after,'new logger-to-player steps retain all Geometric Flow modes');
  for(const method of modes.slice(2,4)){
   await page.evaluate(()=>spiralTest.setup());await tap('#btnSpiral');await choose(method);
   await tap('#btnStepForward');await tap('#btnStepForward');
   const checkpoint=await page.evaluate(()=>spiralTest.project());
   assert.equal(checkpoint.polygonFlowPhase,2);
   assert.equal((await page.evaluate(()=>spiralTest.settings())).rules.spiral.polygonFlowPhase,undefined);
   await tap('#btnStepForward');const continued=(await state()).tiles;
   await tap('#btnUndo');assert.equal((await page.evaluate(()=>spiralTest.project())).polygonFlowPhase,2);
   await tap('#btnRedo');assert.equal((await page.evaluate(()=>spiralTest.project())).polygonFlowPhase,3);
   assert.deepEqual(await replay(page,(await state()).logs.join('\n')),continued,'undo/redo logs restore circulation');
   await page.evaluate(project=>spiralTest.restore(project),checkpoint);
   await tap('#btnStepForward');
   assert.deepEqual((await state()).tiles,continued,'artwork restores the next phase of circulation');
  }
  await tornado();const project=await page.evaluate(()=>spiralTest.project());assert.equal(project.spiralMethod,'tornado');await choose('radial');await page.evaluate(p=>spiralTest.restore(p),project);assert.equal((await state()).mode,'tornado');
  await tornado();const undoBefore=(await state()).tiles;await tap('#btnStepForward');const undoAfter=(await state()).tiles;await tap('#btnUndo');assert.deepEqual((await state()).tiles,undoBefore);await tap('#btnRedo');assert.deepEqual((await state()).tiles,undoAfter);assert.deepEqual(await replay(page,(await state()).logs.join('\n')),undoAfter,'Tornado Undo/Redo checkpoints replay exactly');
  if(baseline)for(const method of Object.keys(oldBoards))assert.deepEqual(await replay(page,recipeFor(method)),oldBoards[method],'pre-change recipe still plays '+method);
  await page.evaluate(()=>spiralTest.setup());await tap('#btnSpiral');await tap('#btnPlayPauseLife');await page.waitForFunction(()=>spiralTest.state().gen>=2);
  const liveModes=[...modes.slice(1),modes[0]];
  for(const mode of liveModes){const gen=(await state()).gen;await tap('#btnSpiral');const s=await state();assert.equal(s.mode,mode);assert(s.playing);assert(s.gen>=gen);}
  await tornado();assert((await state()).playing);await tap('#btnSpiral');assert.equal((await state()).mode,'radial');await tap('#btnPlayPauseLife');
  const live=(await state()).logs.join('\n');for(const mode of liveModes)assert(live.split('\n').some(l=>/\[GEN:\d+\]/.test(l)&&l.endsWith('Spiral Mode Changed -> '+mode)));const liveFinal=(await state()).tiles;assert.deepEqual(await replay(page,live),liveFinal,'live cycle log replays under controlled random/time');
  // Current sort remaps remain recordable and replayable in Tornado.
  await page.evaluate(()=>spiralTest.setup());await tap('#btnSpiral');await tornado();await tap('#btnStepForward');await tap('#btnCycleSort');await tap('#btnStepForward');
  const sorted=(await state()).tiles;assert.deepEqual(await replay(page,(await state()).logs.join('\n')),sorted,'Tornado follows recorded sorting changes');
  // The remembered state belongs to the Vortices button and never enters Spiral preferences.
  await page.evaluate(()=>spiralTest.setup());await page.evaluate(()=>spiralTest.memory(true));
  await tornado();await tap('#btnSpiral');assert.equal((await state()).mode,'radial');
  assert.equal(await page.locator('#btnInk').getAttribute('data-mode'),'tornado');
  await tap('#btnInk');assert.equal((await state()).mode,'tornado');
  assert(!(await page.locator('#btnSpiral').evaluate(e=>e.classList.contains('simulation-active'))));
  await tap('#btnInk');assert.equal((await state()).armed,null);
  await tap('#btnInk');assert.equal(await page.locator('#btnInk').getAttribute('data-mode'),'turbine2');
  assert.equal((await page.evaluate(()=>spiralTest.settings())).rules.spiral.method,'radial');
  // Cycle membership affects only manual cycling, including the inactive preview.
  await page.evaluate(()=>{spiralTest.memory(false);spiralTest.setup();});
  await tap('#btnSpiral');await choose('triangle_flow');
  const enabled=page.locator('#geometricFlowCycleOptions input');
  const checked=()=>enabled.evaluateAll(nodes=>nodes.filter(node=>node.checked).map(node=>node.value));
  const onlySquare=async()=>{
   for(const mode of modes.filter(mode=>mode!=='square_flow')){
    await page.locator('#geometricFlowCycleOptions input[value="'+mode+'"]').uncheck();
   }
   assert.deepEqual(await checked(),['square_flow']);
   assert(await page.locator('#geometricFlowCycleOptions input[value="square_flow"]').isDisabled());
  };
  await open();assert.deepEqual(await checked(),modes);
  assert.equal(await page.locator('#geometricFlowCycleOptions').getAttribute('dir'),config.lang==='he'?'rtl':'ltr');
  await onlySquare();
  await page.keyboard.press('Escape');await open();assert.deepEqual(await checked(),modes,'a cancelled draft is discarded');
  await onlySquare();
  const beforeSave=await state();
  await tap('#btnSpiralSettingsSave');await page.locator('#spiralSettingsModal').waitFor({state:'hidden'});
  const afterSave=await state();
  assert.equal(afterSave.mode,'triangle_flow');assert.deepEqual(afterSave.logs,beforeSave.logs);
  assert.deepEqual(afterSave.tiles,beforeSave.tiles);
  await tap('#btnSpiral');assert.equal((await state()).mode,'square_flow');
  await tap('#btnPlayPauseLife');
  const playing=await state();
  await tap('#btnSpiral');
  const stillPlaying=await state();
  assert(stillPlaying.playing&&stillPlaying.gen>=playing.gen);
  assert.deepEqual(stillPlaying.logs,playing.logs,'the sole mode is not restarted during playback');
  await tap('#btnPlayPauseLife');
  await choose('triangle_flow');assert.equal((await state()).mode,'triangle_flow','manually choosing an excluded shape still works');
  await page.evaluate(()=>spiralTest.memory(true));
  await tap('#btnNetwork');await tap('#btnSpiral');
  assert.equal((await state()).mode,'square_flow','a remembered shape excluded from the cycle is skipped');
  await choose('triangle_flow');
  await page.evaluate(()=>spiralTest.reset());assert.equal((await state()).mode,'square_flow');
  await tap('#btnSpiral');assert.equal((await state()).mode,'off');
  assert(await page.locator('#iconSpiralSquare').isVisible(),'Off previews the first enabled shape');
  await page.reload();await page.waitForFunction(()=>window.spiralTest?.ready);
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());spiralTest.setup();});
  await tap('#btnSpiral');assert.equal((await state()).mode,'square_flow');
  await open();assert.deepEqual(await checked(),['square_flow'],'membership survives reload');
  await tap('#btnSpiralSettingsCancel');await page.locator('#spiralSettingsModal').waitFor({state:'hidden'});
  assert.deepEqual(await replay(page,recipe),after,'an existing recipe still plays excluded modes');

  assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config));await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
