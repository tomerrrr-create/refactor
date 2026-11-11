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
 open:()=>modals.openSpiralSettingsModal(),tech:()=>modals.openTechnicianMenu(),restore:applyState,project:getCurrentState,settings:getWorkspaceSettings,
 state:()=>({armed:armedSimulation,method:spiralRules.method,mode:spiralMode,playing:isLifePlaying,gen:currentGenerationCount,loaded:isMacroLoaded,animating:isAnimating,tiles:boardState.map(t=>[t.k,t.v,t.isGold]),logs:[...artRecipeLog]})};initializeApp().then(()=>spiralTest.ready=true);`);for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');return source;};
const source=await instrument(root),oldSource=baseline?await instrument(baseline):null;
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local'),old=url.pathname.startsWith('/baseline/'),dir=old?baseline:root;const f=url.pathname.slice(old?10:1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');let body=f==='js/app.js'?(old?oldSource:source):await readFile(path.join(dir,f));if(f==='js/simulations/spiral.js')body=String(body).replace('export function runSpiralGeneration({ n, currentBoardState, currentPalette, spiralRules }) {','export function runSpiralGeneration({ n, currentBoardState, currentPalette, spiralRules }) { window.resetSpiralRandom();').replace('cachedRadialN = n;', 'cachedRadialN = n; window.resetSpiralRandom();');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const recipeFor=(method)=>'[00:00:00.000] INIT_STATE -> '+JSON.stringify({recipeVersion:2,n:31,pal:0,sort:'luminance',sep:0,board:Array.from({length:961},(_,i)=>'1x'+((i*7+3)%23)).join(','),gold:[0]})+'\n[00:00:00.010] STEP FORWARD -> Armed: spiral | Sort: luminance | Rules: '+JSON.stringify({method});
const init=lang=>{localStorage.setItem('userLanguage',lang);window.resetSpiralRandom=()=>{let seed=14327;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};Date.now=()=>1700000000000;};
const replay=async(page,text)=>{await page.locator('#projectFileInput').setInputFiles({name:'spiral.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>spiralTest.state().loaded);await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>!spiralTest.state().loaded&&!spiralTest.state().animating,{timeout:20000});return page.evaluate(()=>spiralTest.state().tiles);};
try{
 const oldBoards={};if(baseline){const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await c.addInitScript(init,'en');const p=await c.newPage();await p.goto(base+'/baseline/');await p.waitForFunction(()=>window.spiralTest?.ready);await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));for(const method of ['b','left','radial','down','black_hole','a','vortex','turbine2'])oldBoards[method]=await replay(p,recipeFor(method));await c.close();console.log('Captured old recipe results from',baseline);}
 for(const config of [{width:1440,height:1000,lang:'en'},{width:390,height:844,lang:'he'},{width:360,height:800,lang:'ru'},{width:844,height:390,lang:'nl'}]){
  if(process.env.SPIRAL_LANG&&config.lang!==process.env.SPIRAL_LANG)continue;
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});await context.addInitScript(init,config.lang);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
  const tap=async s=>config.width<600?page.locator(s).tap():page.locator(s).click(),state=()=>page.evaluate(()=>spiralTest.state());
  await page.goto(base);await page.waitForFunction(()=>window.spiralTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  assert.equal((await page.evaluate(()=>spiralTest.settings())).rules.spiral.method,'b');
  await page.evaluate(()=>spiralTest.setup());await tap('#btnEvolutionDrawerInternal');await page.waitForTimeout(300);
  const modes=['b','left','radial','down','a'],icons=['iconSpiralB','iconSpiralLeft','iconSpiralRadial','iconSpiralDown','iconSpiralA'];
  const before=(await state()).tiles;
  for(const [i,mode] of [...modes,'off'].entries()){await tap('#btnSpiral');assert.equal((await state()).mode,mode);assert.deepEqual((await state()).tiles,before);assert.deepEqual(await page.locator('#btnSpiral svg').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id)),[icons[i]||'iconSpiralB']);}
  const open=async()=>{await page.evaluate(()=>spiralTest.open());await page.waitForTimeout(350);};
  const choose=async(method,save=true)=>{await open();await tap('.spiral-method-btn[data-method="'+method+'"]');await tap(save?'#btnSpiralSettingsSave':'#btnSpiralSettingsCancel');await page.waitForTimeout(350);};
  await tap('#btnSpiral');await open();assert.deepEqual(await page.locator('.spiral-method-btn').evaluateAll(ns=>ns.map(n=>n.dataset.method)),modes);assert.equal(await page.locator('.spiral-method-btn[data-method="vortex"]').count(),0);await page.screenshot({path:path.join(artifacts,config.lang+'-settings.png')});await tap('#btnSpiralSettingsCancel');await page.waitForTimeout(350);
  await choose('a',false);assert.equal((await state()).mode,'b');await choose('a');assert.equal((await state()).mode,'a');await tap('#btnSpiral');assert.equal((await state()).mode,'off');
  await page.evaluate(()=>spiralTest.setup());
  for(const method of modes){await tap('#btnSpiral');assert.equal((await state()).mode,method);await tap('#btnStepForward');}
  const after=(await state()).tiles,recipe=(await state()).logs.join('\n');assert.notDeepEqual(after,before);
  for(const method of modes){assert(recipe.includes('Spiral Mode Changed -> '+method));assert(recipe.includes('"method":"'+method+'"'));}
  assert.deepEqual(await replay(page,recipe),after,'new logger-to-player steps retain the five modes');
  const project=await page.evaluate(()=>spiralTest.project());assert.equal(project.spiralMethod,'a');await choose('radial');await page.evaluate(p=>spiralTest.restore(p),project);assert.equal((await state()).mode,'a');
  await choose('radial');const undoBefore=(await state()).tiles;await tap('#btnStepForward');const undoAfter=(await state()).tiles;await tap('#btnUndo');assert.deepEqual((await state()).tiles,undoBefore);await tap('#btnRedo');assert.deepEqual((await state()).tiles,undoAfter);
  if(baseline)for(const method of Object.keys(oldBoards))assert.deepEqual(await replay(page,recipeFor(method)),oldBoards[method],'pre-change recipe still plays '+method);
  await page.evaluate(()=>spiralTest.setup());await tap('#btnSpiral');await tap('#btnPlayPauseLife');await page.waitForFunction(()=>spiralTest.state().gen>=2);
  for(const mode of ['left','radial','down','a','b']){const gen=(await state()).gen;await tap('#btnSpiral');const s=await state();assert.equal(s.mode,mode);assert(s.playing);assert(s.gen>=gen);}
  await choose('a');assert((await state()).playing);await tap('#btnSpiral');assert.equal((await state()).mode,'b');await tap('#btnPlayPauseLife');
  const live=(await state()).logs.join('\n');for(const mode of ['left','radial','down','a','b'])assert(live.split('\n').some(l=>/\[GEN:\d+\]/.test(l)&&l.endsWith('Spiral Mode Changed -> '+mode)));const liveFinal=(await state()).tiles;assert.deepEqual(await replay(page,live),liveFinal,'live cycle log replays under controlled random/time');
  await choose('down');await page.evaluate(()=>spiralTest.tech());if(!(await page.locator('#profileActions').isVisible()))await tap('[data-profile-dot="0"]');await tap('#btnProfileSave');await page.reload();await page.waitForFunction(()=>window.spiralTest?.ready);assert.equal((await page.evaluate(()=>spiralTest.settings())).rules.spiral.method,'down','personal preference retained');
  assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config));await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
