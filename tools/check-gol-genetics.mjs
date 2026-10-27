// Exercise the genetics draft, cycle sharing, profile persistence and real macro playback.
// Runtime hooks are injected into responses; production assets have no test hooks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.GENETICS_ARTIFACTS||'/tmp/gol-genetics-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});

const results=[];
try{for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.geneticsTest={
  setup:()=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Mono');currentSortMethod='luminance';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,'luminance'));n=9;initializeBoardAndCanvas(true);armSimulation('gameOfLife');delete gameOfLifeRules.genetics;setPersonalGameOfLifeRules({survival:[2,3],birth:[3]});boardState.forEach(t=>{t.k=t.v=0;t.isGold=false;});[2,8,11].forEach((k,i)=>boardState[39+i].k=boardState[39+i].v=k);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
  open:()=>modals.openGolSettingsModal(),tech:()=>modals.openTechnicianMenu(),reset:()=>settingsProfiles.resetToDefaults(),
  mode:()=>gameOfLifeRules.genetics||'rgb',snapshot:captureProfileSettings,
  state:()=>({mode:gameOfLifeRules.genetics||'rgb',playing:isLifePlaying,gen:currentGenerationCount,macro:isMacroPlaying,loaded:isMacroLoaded,tiles:boardState.map(t=>[t.k,t.v,t.isGold]),logs:[...artRecipeLog],rules:getGameOfLifeRecordingRules()}),
  record:()=>artRecipeLog.join(String.fromCharCode(10)),forcePaletteMode:()=>{gameOfLifeRules.genetics='palette-order';},
  mono:()=>C.PALETTES.findIndex(p=>p.originalName==='Mono')
 };initializeApp().then(()=>geneticsTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const boot=async reload=>{if(reload)await page.reload();else await page.goto(base);await page.waitForFunction(()=>window.geneticsTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const mode=()=>page.evaluate(()=>geneticsTest.mode()),state=()=>page.evaluate(()=>geneticsTest.state());
 const open=async()=>{await page.evaluate(()=>geneticsTest.open());await page.locator('#btnGolGenetics').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('gameOfLifeSettingsModal').classList.contains('modal-visible'));};
 const dot=page.locator('#btnGolGenetics');
 const close=async()=>{await page.locator('#btnGolSettingsCancel').click();await page.waitForTimeout(350);};
 const save=async()=>{await page.locator('#btnGolSettingsSave').click();await page.waitForTimeout(350);};
 const load=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'genetics.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.getElementById('macroOverlay').classList.contains('active'));await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>!geneticsTest.state().loaded,{timeout:20000});};
 await boot(false);await page.evaluate(()=>geneticsTest.setup());await open();
 assert.equal(await dot.getAttribute('aria-checked'),'false');assert((await dot.getAttribute('aria-label')).length>0);
 const geometry=await page.locator('#golCycleToolbar').evaluate(t=>{
  const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,center:r.left+r.width/2,y:r.top};};
  const d=t.querySelector('#btnGolGenetics'),reset=t.querySelector('.cycle-reset-dot'),slots=[...t.querySelectorAll('.cycle-slot-button')].map(box),r=box(reset),p=box(d);
  return {point:p,reset:r,slots,dot:getComputedStyle(d,'::before').width,resetDot:getComputedStyle(reset,'::before').width,overflow:t.scrollWidth>t.clientWidth};
 });
 assert.equal(geometry.slots.length,3);assert(!geometry.overflow);assert(geometry.point.right<geometry.slots[0].left);assert(geometry.reset.left>geometry.slots[2].right);
 assert(Math.abs((geometry.slots[0].center-geometry.point.center)-(geometry.reset.center-geometry.slots[2].center))<.2,'the two dots are symmetric');assert.equal(geometry.dot,'12px');assert.equal(geometry.resetDot,'6px');
 const before=await state();await dot.click();assert.equal(await dot.getAttribute('aria-checked'),'true');assert.equal(await mode(),'rgb');assert.deepEqual(await state(),before,'draft toggle does not touch engine or logger');
 for(const slot of [1,2,0]){await page.locator('#golCycleToolbar [data-cycle-slot="'+slot+'"]').click();assert.equal(await dot.getAttribute('aria-checked'),'true');}
 await close();await open();assert.equal(await dot.getAttribute('aria-checked'),'false');
 await dot.focus();await page.keyboard.press('Space');assert.equal(await dot.getAttribute('aria-checked'),'true');await save();assert.equal(await mode(),'palette-order');
 await page.locator('#btnStepForward').click();const stepped=await state();assert.equal(stepped.tiles[31][0],7,'newborn uses the mean parent rank');
 await page.locator('#btnUndo').click();assert.equal(await mode(),'palette-order');await page.locator('#btnRedo').click();assert.deepEqual((await state()).tiles,stepped.tiles);
 await load(await page.evaluate(()=>geneticsTest.record()));assert.deepEqual((await state()).tiles,stepped.tiles,'step with Undo/Redo and palette genetics replays exactly');
 for(let i=0;i<4;i++){await page.locator('#btnGameOfLife').click();assert.equal(await mode(),'palette-order','shared mode survives all three cycle positions and Off');}
 await open();assert.equal(await dot.getAttribute('aria-checked'),'true');await page.waitForTimeout(350);await page.screenshot({path:path.join(artifacts,config.lang+'-gold.png')});await close();
 // A dialog Save updates the session, not the next app opening, until Save Profile.
 await page.waitForTimeout(350);await boot(true);assert.equal(await mode(),'rgb');
 await page.evaluate(()=>geneticsTest.setup());await open();await dot.click();await save();await page.evaluate(()=>geneticsTest.tech());
 if(!(await page.locator('#profileActions').isVisible()))await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await boot(true);assert.equal(await mode(),'palette-order','explicit profile save persists the shared mode');
 await open();await page.locator('#btnGolSettingsReset').click();assert.equal(await dot.getAttribute('aria-checked'),'false');assert.equal(await mode(),'palette-order');await close();
 await open();assert.equal(await dot.getAttribute('aria-checked'),'true');await page.locator('#btnGolSettingsReset').click();await save();assert.equal(await mode(),'rgb','Reset to Default applies RGB only on Save');
 await page.evaluate(()=>geneticsTest.reset());assert.equal(await mode(),'rgb');
 // Save during Play is generation-stamped; Cancel and cycle browsing stay drafts.
 await page.evaluate(()=>geneticsTest.setup());await page.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>geneticsTest.state().gen>=2);await open();
 const generation=(await state()).gen;await dot.click();assert.equal(await mode(),'rgb');await save();assert.equal(await mode(),'palette-order');assert((await state()).playing);assert((await state()).gen>=generation);
 await page.locator('#btnCycleSort').click();await page.waitForTimeout(80);
 await open();await dot.click();assert.equal(await mode(),'palette-order');await close();assert.equal(await mode(),'palette-order');
 await open();await dot.click();await save();assert.equal(await mode(),'rgb');assert((await state()).playing);
 await page.locator('#btnPlayPauseLife').click();const final=await state(),recording=await page.evaluate(()=>geneticsTest.record());
 assert(final.logs.some(line=>/\[GEN:\d+\] Game of Life Mode Changed/.test(line)&&line.includes('"genetics":"palette-order"')));
 await load(recording);assert.deepEqual((await state()).tiles,final.tiles,'recording with both modes and sort changes replays exactly');
 // An old recipe cannot inherit a palette-order preference from the viewer.
 const pal=await page.evaluate(()=>geneticsTest.mono());
 const old=`[12:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":3,"pal":${pal},"sort":"luminance","sep":0,"board":"1x2,1x8,1x11,6x0"}\n[12:00:00.010] PLAY -> Armed: gameOfLife | Sort: luminance | Rules: {"survival":[2,3],"birth":[3]}\n[12:00:00.020] [GEN:3] PAUSE -> ---`;
 await page.evaluate(()=>geneticsTest.forcePaletteMode());await load(old);assert.equal(await mode(),'rgb');assert.equal((await state()).gen,3);
 assert.deepEqual(errors,[]);results.push({...config,passed:true});console.log('PASS',JSON.stringify(config));await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
