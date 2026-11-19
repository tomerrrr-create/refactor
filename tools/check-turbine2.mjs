// Gravity Turbine 2/Circle: real controls, persistence/history, and old Spiral recipes.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/turbine2-check';await mkdir(artifacts,{recursive:true});
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.turbineTest={
 setup:()=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=0;currentSortMethod='luminance';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,'luminance'));n=31;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=(i*7+3)%paletteLen();t.isGold=i===0;});gravitationalSortRules={direction:'up',strength:.6};isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 dark:goDarkAction,open:()=>modals.openGravitationalSortSettingsModal(),tech:()=>modals.openTechnicianMenu(),
 project:getCurrentState,restore:applyState,settings:()=>serializeWorkspaceSettings(getWorkspaceSettings()),
 state:()=>({armed:armedSimulation,gravity:{...getActiveGravityRules()},vortices:activeVorticesMode(),mode:gsMode,spiral:spiralMode,playing:isLifePlaying,loaded:isMacroLoaded,animating:isAnimating,gen:currentGenerationCount,tiles:boardState.map(t=>[t.k,t.v,t.isGold]),logs:[...artRecipeLog]})};initializeApp().then(()=>turbineTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1440,height:1000,lang:'en'},{width:390,height:844,lang:'he'},{width:360,height:800,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 if(process.env.TURBINE_LANG&&config.lang!==process.env.TURBINE_LANG)continue;
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);window.resetTurbineRandom=()=>{let seed=14327;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};Date.now=()=>1700000000000;},config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
 await page.route(base+'/js/simulations/spiral-turbine2.js',async route=>{const module=await readFile(path.join(root,'js/simulations/spiral-turbine2.js'),'utf8');await route.fulfill({contentType:'text/javascript',body:module.replace('export function runTurbine2Generation(n,board,strength = .6) {','export function runTurbine2Generation(n,board,strength = .6) { window.resetTurbineRandom();')});});
 const tap=async selector=>config.width<600?page.locator(selector).tap():page.locator(selector).click();
 const boot=async reload=>{await(reload?page.reload():page.goto(base));await page.waitForFunction(()=>window.turbineTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const state=()=>page.evaluate(()=>turbineTest.state());
 const open=async()=>{await page.evaluate(()=>turbineTest.open());await page.locator('#gravitationalSortSettingsModal').waitFor({state:'visible'});await page.waitForTimeout(330);};
 const choose=async(direction,strength=60,save=true)=>{await open();await tap('.gs-direction-btn[data-direction="'+direction+'"]');if(!(await page.locator('#gsStrength').isDisabled()))await page.locator('#gsStrength').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},strength);await tap(save?'#btnGsSettingsSave':'#btnGsSettingsCancel');await page.waitForTimeout(350);};
 const replay=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'turbine2.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>turbineTest.state().loaded);await tap('#btnMacroPlay');await page.waitForFunction(()=>!turbineTest.state().loaded&&!turbineTest.state().animating,{timeout:20000});};
 const replayCircle=async text=>{await replay(text);return (await state()).tiles;};
 const nav='#btnEvolutionDrawerInternal';
 const first=async()=>{if(!(await page.locator('#btnGravitationalSort').isVisible()))await tap(nav);};
 const selectCircular=async mode=>{
  if(!(await page.locator('#btnInk').isVisible()))await tap(nav);
  for(let i=0;i<9&&(await state()).vortices!==mode;i++)await tap('#btnInk');
  assert.equal((await state()).vortices,mode);
 };
 await boot(false);await page.evaluate(()=>turbineTest.setup());await first();
 await tap('#btnGravitationalSort');await choose('right',27);
 await selectCircular('turbine2');
 assert.deepEqual((await state()).gravity,{direction:'turbine2',strength:.6});
 assert(await page.locator('#btnInk #iconGsTurbine2').isVisible());
 assert.equal(JSON.parse((await page.evaluate(()=>turbineTest.settings())).split('\n').slice(1).join('\n')).settings.rules.gravity.strength,.27);
 const before=(await state()).tiles;await tap('#btnStepForward');const after=(await state()).tiles;
 assert.notDeepEqual(after,before);assert.deepEqual(after[0],before[0]);
 await tap('#btnUndo');assert.deepEqual((await state()).tiles,before);await tap('#btnRedo');assert.deepEqual((await state()).tiles,after);
 const project=await page.evaluate(()=>turbineTest.project());
 assert.deepEqual(project.gravityRules,{direction:'turbine2',strength:.6});
 const recipe=(await state()).logs.join('\n');await replay(recipe);
 assert.deepEqual((await state()).tiles,after,'Turbine 2 history and recipe retain the fixed engine');
 await first();await tap('#btnGravitationalSort');await page.evaluate(p=>turbineTest.restore(p),project);
 assert.deepEqual((await state()).gravity,project.gravityRules);
 const init=recipe.split('\n').find(line=>line.includes(' INIT_STATE ->'));
 assert.deepEqual(await replayCircle(init+'\n[00:00:00.100] STEP FORWARD -> Armed: spiral | Sort: luminance | Rules: {"method":"turbine2"}'),after,'legacy Spiral recipe uses the same engine');
 await page.evaluate(()=>turbineTest.setup());await selectCircular('black_hole');
 assert(await page.locator('#btnInk #iconGsCircle').isVisible());
 const circleBefore=(await state()).tiles;await tap('#btnStepForward');const circleAfter=(await state()).tiles;
 assert.notDeepEqual(circleAfter,circleBefore);
 const circleProject=await page.evaluate(()=>turbineTest.project());
 await tap('#btnUndo');assert.deepEqual((await state()).tiles,circleBefore);await tap('#btnRedo');assert.deepEqual((await state()).tiles,circleAfter);
 const circleRecipe=(await state()).logs.join('\n');assert.deepEqual(await replayCircle(circleRecipe),circleAfter);
 const circleInit=circleRecipe.split('\n').find(line=>line.includes(' INIT_STATE ->'));
 assert.deepEqual(await replayCircle(circleInit+'\n[00:00:00.100] STEP FORWARD -> Armed: spiral | Sort: luminance | Rules: {"method":"black_hole"}'),circleAfter);
 const zeroProject={...circleProject,tiles:circleBefore.map(([k,v,isGold])=>({k,v,isGold})),gravityRules:{direction:'black_hole',strength:0}};
 await page.evaluate(p=>turbineTest.restore(p),zeroProject);await tap('#btnStepForward');
 assert.deepEqual((await state()).tiles,circleAfter,'π does not depend on Strength');
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config));await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
