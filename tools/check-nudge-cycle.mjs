// Verify Nudge selection, recording and replay through the browser.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts='/tmp/nudge-cycle-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',f)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.NUDGE_LANG||c.lang===process.env.NUDGE_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.nudgeTest={
 setup:()=>{pauseLife();resetArmedState();n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=5+i%4;t.isGold=i===0;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');evolutionSlots=validateEvolutionSlots(['nudgeDarker',...DEFAULT_EVOLUTION_SLOTS.slice(1)]);evolutionDrawer.applyLayout();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();},
 state:()=>({board:boardState.map(t=>t.k),armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,history:history.length,logs:[...artRecipeLog],loaded:isMacroLoaded,macro:isMacroPlaying}),
 record:()=>artRecipeLog.join(String.fromCharCode(10)),replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},legacy:()=>executeMacroAction({eventName:'NUDGE',details:'Brighter | Sort: luminance'}),pause:pauseLife,
 };initializeApp().then(()=>nudgeTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base);await page.waitForFunction(()=>nudgeTest.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>nudgeTest.setup());
 const state=()=>page.evaluate(()=>nudgeTest.state()),button=page.locator('#btnNudgeBrighter'),step=page.locator('#btnStepForward'),play=page.locator('#btnPlayPauseLife');
 // Repeated hover/cycle transitions must restore the original unarmed pixels.
 await page.mouse.move(0,0);await page.waitForTimeout(500);
 const cleanIcon=await button.screenshot({animations:'disabled'});
 await button.hover();await page.waitForTimeout(500);
 const cleanHoveredIcon=await button.screenshot({animations:'disabled'});
 await page.mouse.move(0,0);await page.waitForTimeout(500);
 const svgHandle=await button.locator('svg').elementHandle();
 for(let cycle=0;cycle<3;cycle++){
  for(let tap=0;tap<3;tap++){await button.click();await page.waitForTimeout(250);}
  await page.waitForTimeout(500);
  assert.deepEqual(await button.screenshot({animations:'disabled'}),cleanHoveredIcon,'no residual pixels while hovering over Off');
  await page.mouse.move(0,0);await page.waitForTimeout(500);
  assert.equal(await button.locator('svg').count(),1,'one SVG survives the cycle');
  assert(await svgHandle.evaluate(svg=>svg===document.querySelector('#btnNudgeBrighter > svg')));
  assert.equal(await button.getAttribute('aria-pressed'),'false');
  assert.deepEqual(await button.screenshot({animations:'disabled'}),cleanIcon,'no residual icon or glow pixels after returning to Off');
 }
 await page.evaluate(()=>nudgeTest.setup());
 // Nudge uses the same overlay theme and armed styling as Gravity.
 const appearance=selector=>page.locator(selector).evaluate(button=>{
  const icon=[...button.querySelectorAll('svg')].find(svg=>getComputedStyle(svg).display!=='none');
  const style=getComputedStyle(icon),rect=button.getBoundingClientRect(),overlay=document.querySelector('#simModeBackground').getBoundingClientRect();
  return {stroke:style.stroke,weight:style.strokeWidth,transform:getComputedStyle(button).transform};
 });
 const gravity=page.locator('#btnGravitationalSort');
 const toolStroke=(await appearance('#btnGravitationalSort')).stroke;
 assert.equal((await appearance('#btnNudgeBrighter')).stroke,toolStroke,'idle Nudge follows overlay ink');
 await page.evaluate(()=>{document.documentElement.dataset.simulationEffectiveTheme='gold';document.documentElement.setAttribute('data-simulation-running','');});
 await page.waitForTimeout(450);
 assert.equal((await appearance('#btnNudgeBrighter')).stroke,(await appearance('#btnGravitationalSort')).stroke,'idle Nudge follows overlay ink during gold playback');
 await page.evaluate(()=>{document.documentElement.removeAttribute('data-simulation-running');document.documentElement.removeAttribute('data-simulation-effective-theme');});
 await gravity.click();await page.waitForTimeout(450);const armedGravity=await appearance('#btnGravitationalSort');
 await button.click();await page.waitForTimeout(450);assert.deepEqual(await appearance('#btnNudgeBrighter'),armedGravity,'Brighter uses Gravity armed styling');
 await button.click();await page.waitForTimeout(450);assert.deepEqual(await appearance('#btnNudgeBrighter'),armedGravity,'Darker uses Gravity armed styling');
 await play.click();await page.waitForTimeout(450);const runningNudge=await appearance('#btnNudgeBrighter');
 await gravity.click();await page.waitForTimeout(450);assert.deepEqual(await appearance('#btnGravitationalSort'),runningNudge,'running Nudge uses Gravity armed styling');
 await button.click();await page.waitForTimeout(450);assert.deepEqual(await appearance('#btnNudgeBrighter'),runningNudge,'live handoff restores Nudge styling');
 await page.evaluate(()=>nudgeTest.setup());await page.waitForTimeout(450);

 const position=await button.evaluate(button=>{
  const b=button.getBoundingClientRect(),o=document.querySelector('#simModeBackground').getBoundingClientRect();
  return {inside:b.left>=o.left&&b.right<=o.right&&b.top>=o.top&&b.bottom<=o.bottom,slot:button.hasAttribute('data-evolution-slot')};
 });
 assert(position.inside&&position.slot,'Nudge participates in the drawer and lives inside its overlay');
 await page.evaluate(()=>document.querySelector('#controlsContainer').classList.remove('sim-mode-active'));assert(!(await button.isVisible()),'Nudge is hidden in creation mode');await page.evaluate(()=>document.querySelector('#controlsContainer').classList.add('sim-mode-active'));
 assert(!(await page.locator('#btnNudgeDarker').isVisible()));const initial=await state();
 await button.click();let current=await state();assert.equal(current.armed,'nudgeBrighter');assert.deepEqual(current.board,initial.board);assert.equal(current.history,0);assert(!(await step.isDisabled()));assert(!(await play.isDisabled()));
 await step.click();const bright=await state();assert.equal(bright.board[0],initial.board[0]);assert.equal(bright.board[1],initial.board[1]+1);
 await page.locator('#btnUndo').click();assert.deepEqual((await state()).board,initial.board);await page.locator('#btnRedo').click();assert.deepEqual((await state()).board,bright.board);
 await button.click();assert.equal((await state()).armed,'nudgeDarker');assert.deepEqual((await state()).board,bright.board);assert.equal(await button.getAttribute('data-nudge-mode'),'darker');
 const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();assert(await page.locator('#nudgeSettingsDialog').isVisible());await page.locator('#btnCloseNudgeSettings').click();
 await step.click();assert.deepEqual((await state()).board,initial.board);await button.click();assert.equal((await state()).armed,null);assert(await step.isDisabled());assert.equal(await button.getAttribute('data-nudge-mode'),'brighter');
 await button.click();await play.click();await page.waitForFunction(()=>nudgeTest.state().gen>=3);const running=await state();await button.click();assert.equal((await state()).armed,'nudgeDarker');assert((await state()).playing);assert((await state()).gen>=running.gen);assert.equal((await state()).history,running.history);await page.waitForTimeout(220);await play.click();
 const result=await state(),recipe=await page.evaluate(()=>nudgeTest.record());assert(recipe.includes('Nudge Mode Changed'));assert(!recipe.includes(' NUDGE ->'));
 await page.evaluate(text=>nudgeTest.replay(text),recipe);await page.waitForFunction(()=>!nudgeTest.state().loaded&&!nudgeTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,result.board,'new direction cycle replays exactly');
 const beforeLegacy=await state();await page.evaluate(()=>nudgeTest.legacy());assert.equal((await state()).board[1],beforeLegacy.board[1]+1,'legacy NUDGE still shifts immediately');
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(artifacts,config.lang+'.png')});console.log('PASS',JSON.stringify(config));await context.close();
}}finally{await browser.close();server.close();}
