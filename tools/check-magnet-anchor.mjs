// Real modal drafts, persistence and recorded replay on desktop and touch.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try {for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844}]) {
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.width<600,isMobile:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.magnetTest={
 setup:()=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Mono');currentSortMethod='reversed';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,'reversed'));n=9;initializeBoardAndCanvas(true);armSimulation('magnet');magnetRules={method:'magnet',anchorColorIndex:-1};boardState.forEach((t,i)=>{t.k=t.v=i%palette().length;t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);Math.random=()=>.25;},
 open:()=>modals.openMagnetSettingsModal(),tech:()=>modals.openTechnicianMenu(),
 state:()=>({rules:{...magnetRules},tiles:boardState.map(t=>[t.k,t.v,!!t.isGold]),loaded:isMacroLoaded,playing:isLifePlaying,gen:currentGenerationCount,logs:[...artRecipeLog]}),
 colors:()=>[...palette()],
 nextPalette:()=>switchToPalette((activePaletteIndex+1)%C.PALETTES.length),
 sort:()=>applySortMethod('luminance'),record:()=>artRecipeLog.join(String.fromCharCode(10)),
 force:()=>{magnetRules.anchorColor='luminance';},
 };initializeApp().then(()=>magnetTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const boot=async(reload=false)=>{if(reload)await page.reload();else await page.goto(base);await page.waitForFunction(()=>window.magnetTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const state=()=>page.evaluate(()=>magnetTest.state());
 const open=async()=>{await page.evaluate(()=>magnetTest.open());await page.waitForTimeout(250);};
 const close=async(save=false)=>{await page.locator(save?'#btnMagnetSettingsSave':'#btnMagnetSettingsCancel').click();await page.waitForTimeout(250);};
 const toggle=page.locator('#btnMagnetAnchorColor');
 const load=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'magnet.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.getElementById('macroOverlay').classList.contains('active'));await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>!magnetTest.state().loaded,{timeout:20000});};
 await boot();await page.evaluate(()=>magnetTest.setup());await open();
 assert.equal(await toggle.getAttribute('aria-checked'),'false');
 await page.locator('#magnetAnchorSwatches button').nth(3).click();await toggle.click();
 assert.equal(await toggle.getAttribute('aria-checked'),'true');
 assert.equal((await state()).rules.anchorColor,undefined,'draft does not mutate engine');
 assert.equal(await page.locator('#magnetAnchorSwatches button:enabled').count(),0);
 assert.equal(await page.locator('#magnetRootWrapper button').isDisabled(),true);
 assert.equal(await page.locator('#magnetRootWrapper div').evaluate(e=>e.style.backgroundColor),'rgb(0, 0, 0)','reversed sort still previews black');
 await toggle.click();assert.equal(await page.locator('#magnetAnchorSwatches button').nth(3).evaluate(e=>e.classList.contains('border-gold-400')),true,'manual selection restored');
 await close();await open();assert.equal(await toggle.getAttribute('aria-checked'),'false');
 await toggle.focus();await page.keyboard.press('Space');await close(true);assert.equal((await state()).rules.anchorColor,'luminance');
 await page.locator('#btnStepForward').click();const stepped=await state();
 await page.locator('#btnUndo').click();await page.locator('#btnRedo').click();assert.deepEqual((await state()).tiles,stepped.tiles);
 const recipe=await page.evaluate(()=>magnetTest.record());assert(recipe.includes('"anchorColor":"luminance"'));await load(recipe);
 assert.equal((await state()).rules.anchorColor,'luminance');assert.deepEqual((await state()).tiles,stepped.tiles,'new recipe reproduces the anchored step');
 const legacy=recipe.replaceAll(',"anchorColor":"luminance"','');await page.evaluate(()=>magnetTest.force());await load(legacy);assert.equal((await state()).rules.anchorColor,undefined,'old macro cannot inherit anchor preference');
 await page.evaluate(()=>magnetTest.setup());await open();await toggle.click();await close(true);
 await page.evaluate(()=>magnetTest.sort());await open();assert.equal(await toggle.getAttribute('aria-checked'),'true');await close();
 await page.evaluate(()=>magnetTest.tech());if(!(await page.locator('#profileActions').isVisible()))await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await boot(true);assert.equal((await state()).rules.anchorColor,'luminance');
 await open();assert.equal(await toggle.getAttribute('aria-checked'),'true');await page.screenshot({path:'/tmp/magnet-anchor-'+config.lang+'.png'});await close();
 await page.evaluate(()=>magnetTest.nextPalette());await open();assert.equal(await toggle.getAttribute('aria-checked'),'true');
 const expected=await page.evaluate(async()=>{const {getLuminance}=await import('/js/colors.js');return magnetTest.colors().reduce((best,color)=>getLuminance(color)<getLuminance(best)?color:best);});
 const matches=await page.locator('#magnetRootWrapper div').evaluate((e,color)=>{const probe=document.createElement('div');probe.style.backgroundColor=color;return probe.style.backgroundColor===e.style.backgroundColor;},expected);assert(matches,'palette change recomputes darkest preview');await close();
 await page.evaluate(()=>magnetTest.setup());await page.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>magnetTest.state().gen>=2);
 await open();await toggle.click();await close(true);assert.equal((await state()).rules.anchorColor,'luminance');assert((await state()).playing);
 await page.locator('#btnPlayPauseLife').click();const live=await state(),liveRecipe=await page.evaluate(()=>magnetTest.record());
 assert(live.logs.some(line=>line.includes('SIMULATION_RULES')&&line.includes('\"anchorColor\":\"luminance\"')),'live change is recorded');
 await load(liveRecipe);assert.deepEqual((await state()).tiles,live.tiles,'live anchor switch replays exactly');
 assert.deepEqual(errors,[]);console.log('PASS',config.lang,'modal, keyboard, sort, profile, Undo/Redo, new and legacy macro');await context.close();
}} finally {await browser.close();server.close();}
