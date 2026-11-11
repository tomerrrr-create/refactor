// Gravity Turbine 2: real controls, persistence/history, and old Spiral recipes.
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
 state:()=>({armed:armedSimulation,gravity:{...gravitationalSortRules},mode:gsMode,spiral:spiralMode,playing:isLifePlaying,loaded:isMacroLoaded,animating:isAnimating,gen:currentGenerationCount,tiles:boardState.map(t=>[t.k,t.v,t.isGold]),logs:[...artRecipeLog]})};initializeApp().then(()=>turbineTest.ready=true);`);
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
 const choose=async(direction,strength=60,save=true)=>{await open();await tap('.gs-direction-btn[data-direction="'+direction+'"]');await page.locator('#gsStrength').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},strength);await tap(save?'#btnGsSettingsSave':'#btnGsSettingsCancel');await page.waitForTimeout(350);};
 const replay=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'turbine2.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>turbineTest.state().loaded);await tap('#btnMacroPlay');await page.waitForFunction(()=>!turbineTest.state().loaded&&!turbineTest.state().animating,{timeout:20000});};
 const icon=()=>page.locator('#btnGravitationalSort svg').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id));
 await boot(false);await page.evaluate(()=>turbineTest.setup());
 assert.equal(await page.locator('.spiral-method-btn[data-method="turbine2"]').count(),0);
 assert.deepEqual(await page.locator('#gravitationalSortSettingsModal .gs-direction-btn[data-direction]').evaluateAll(ns=>ns.map(n=>n.dataset.direction)),['up','right','center_x','turbine2']);
 for(const [mode,id] of [['up','iconGsUp'],['right','iconGsRight'],['center_x','iconGsCenterX'],['turbine2','iconGsTurbine2'],['off','iconGsUp']]){
  await tap('#btnGravitationalSort');assert.equal((await state()).mode,mode);assert.deepEqual(await icon(),[id]);
 }
 await tap('#btnEvolutionDrawerInternal');await page.waitForTimeout(300);
 for(const mode of ['b','left','black_hole','off']){await tap('#btnSpiral');assert.equal((await state()).spiral,mode);}
 await tap('#btnEvolutionDrawerInternal');await page.waitForTimeout(300);
 await tap('#btnGravitationalSort');await choose('turbine2',27,false);assert.deepEqual((await state()).gravity,{direction:'up',strength:.6});
 await choose('turbine2',60);assert.equal((await state()).mode,'turbine2');assert.deepEqual(await icon(),['iconGsTurbine2']);
 await open();assert.equal(await page.locator('#gsStrength').inputValue(),'60');await page.screenshot({path:path.join(artifacts,config.lang+'-gravity-settings.png')});await tap('#btnGsSettingsCancel');await page.waitForTimeout(350);
 const before=(await state()).tiles;await tap('#btnStepForward');const after=(await state()).tiles;assert.notDeepEqual(after,before);assert.deepEqual(after[0],before[0]);
 await tap('#btnUndo');assert.deepEqual((await state()).tiles,before);assert.deepEqual((await state()).gravity,{direction:'turbine2',strength:.6});await tap('#btnRedo');assert.deepEqual((await state()).tiles,after);
 const project=await page.evaluate(()=>turbineTest.project());assert.deepEqual(project.gravityRules,{direction:'turbine2',strength:.6});
 const recipe=(await state()).logs.join('\n');assert(recipe.includes('"direction":"turbine2"'));await replay(recipe);assert.deepEqual((await state()).tiles,after,'Gravity history recipe reproduces the step under controlled random/time');
 await choose('right',27);await page.evaluate(p=>turbineTest.restore(p),project);assert.deepEqual((await state()).gravity,project.gravityRules);assert.equal((await state()).armed,'gravitationalSort');
 const init=(await state()).logs.find(line=>line.includes(' INIT_STATE ->'));
 await replay(init+'\n[00:00:00.100] STEP FORWARD -> Armed: spiral | Sort: luminance | Rules: {"method":"turbine2"}');assert.deepEqual((await state()).tiles,after,'legacy Spiral recipe retains its fixed 60% behavior');assert.equal((await state()).spiral,'turbine2');
 const legacy=await page.evaluate(()=>turbineTest.project());await page.evaluate(()=>turbineTest.setup());await page.evaluate(p=>turbineTest.restore(p),legacy);assert.equal((await state()).spiral,'turbine2','old JSON remains readable');
 await page.evaluate(()=>turbineTest.setup());await tap('#btnGravitationalSort');await choose('turbine2',27);
 assert.equal(JSON.parse((await page.evaluate(()=>turbineTest.settings())).split('\n').slice(1).join('\n')).settings.rules.gravity.strength,.27);
 await page.evaluate(()=>turbineTest.tech());if(!(await page.locator('#profileActions').isVisible()))await tap('[data-profile-dot="0"]');await tap('#btnProfileSave');await boot(true);assert.deepEqual((await state()).gravity,{direction:'turbine2',strength:.27});
 await page.evaluate(()=>turbineTest.setup());await tap('#btnGravitationalSort');await tap('#btnPlayPauseLife');await page.waitForFunction(()=>turbineTest.state().gen>=2);
 for(const mode of ['right','center_x','turbine2','up']){const gen=(await state()).gen;await tap('#btnGravitationalSort');const s=await state();assert.equal(s.mode,mode);assert(s.playing);assert(s.gen>=gen);}
 await choose('turbine2',31);assert((await state()).playing);assert.equal((await state()).gravity.strength,.31);await tap('#btnPlayPauseLife');
 const liveRecipe=(await state()).logs.join('\n');assert(liveRecipe.split('\n').some(l=>l.includes('SIMULATION_RULES')&&l.includes('"strength":0.31')));await replay(liveRecipe);assert.deepEqual((await state()).gravity,{direction:'turbine2',strength:.31});
 await page.evaluate(()=>turbineTest.dark());await page.waitForTimeout(900);assert.equal((await state()).mode,'turbine2');
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config));await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
