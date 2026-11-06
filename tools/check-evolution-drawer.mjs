// Browser coverage of the drawer's presentation-only contract and saved profiles.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {DEFAULT_EVOLUTION_SLOTS,DEFAULT_EVOLUTION_LAYOUT,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts='/tmp/evolution-drawer-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',f)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.DRAWER_LANG||c.lang===process.env.DRAWER_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.drawerTest={
 setup:()=>{pauseLife();resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=5+i%12;t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 state:()=>({slots:[...evolutionSlots],board:boardState.map(t=>t.k),logs:[...artRecipeLog],history:history.length,armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,loaded:isMacroLoaded,macro:isMacroPlaying,settings:getWorkspaceSettings()}),
 theme:applySimulationTheme,open:()=>evolutionDrawer.open(),arm:armSimulation,play:togglePlayPauseLife,pause:pauseLife,tech:()=>modals.openTechnicianMenu(),loadSettings:importWorkspaceSettings,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro
 };initializeApp().then(()=>drawerTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>drawerTest.setup());
 const state=()=>page.evaluate(()=>drawerTest.state()),tap=target=>config.width<600?target.tap():target.click();const trigger=page.locator('#btnEvolutionDrawer'),dialog=page.locator('#evolutionDrawerDialog');
 async function open(){
  const r=await trigger.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(config.width<600){
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*7}]});await page.waitForTimeout(25);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-35,{steps:5});await page.mouse.up();}
  await dialog.waitFor({state:'visible'});await page.waitForTimeout(350);
 }
 const slot=i=>dialog.locator(`[data-drawer-slot="${i}"]`);
 async function move(from,to){await tap(slot(from));await tap(slot(to));}
 const visibleSlots=()=>page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.sort((a,b)=>+a.dataset.evolutionSlot-+b.dataset.evolutionSlot).map(e=>e.dataset.evolutionId));
 const unchanged=(a,b)=>{assert.deepEqual(a.board,b.board);assert.deepEqual(a.logs,b.logs);assert.equal(a.history,b.history);assert.equal(a.armed,b.armed);};
 const initial=await state();assert.deepEqual(initial.slots,DEFAULT_EVOLUTION_LAYOUT);
 assert.deepEqual(await visibleSlots(),DEFAULT_EVOLUTION_SLOTS);
 assert.equal(await trigger.locator('[data-drawer-page-dot]').count(),2);
 assert.equal(await trigger.locator('[data-drawer-page-dot][data-active=true]').getAttribute('data-drawer-page-dot'),'0');
 assert.equal(await trigger.evaluate(e=>getComputedStyle(e).color),'rgb(156, 163, 175)');
 const dotSize=await trigger.locator('.drawer-page-dots').evaluate(e=>({width:parseFloat(getComputedStyle(e).width),height:parseFloat(getComputedStyle(e).height)}));
 assert(Math.abs(dotSize.width-20)<.1&&Math.abs(dotSize.height-10)<.1);
 const frame=await page.locator('#simModeBackground').boundingBox();
 await page.evaluate(()=>window.realLifeButton=document.getElementById('btnGameOfLife'));
 await tap(trigger);assert.deepEqual(await visibleSlots(),['breathe','turing','cymatics','nudgeBrighter']);assert.deepEqual(await page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.map(e=>Number(e.dataset.evolutionSlot)).sort((a,b)=>a-b)),[11,12,13,17]);
 assert.equal(await trigger.locator('[data-drawer-page-dot][data-active=true]').getAttribute('data-drawer-page-dot'),'1');
 assert.deepEqual(await page.locator('#simModeBackground').boundingBox(),frame);unchanged(initial,await state());
 await tap(trigger);assert.deepEqual(await visibleSlots(),DEFAULT_EVOLUTION_SLOTS);
 if(config.lang==='en'){
  await trigger.focus();await page.keyboard.press('Alt+ArrowUp');await dialog.waitFor({state:'visible'});await page.keyboard.press('Escape');
  await trigger.press('Space');assert.deepEqual(await visibleSlots(),['breathe','turing','cymatics','nudgeBrighter']);await trigger.press('Enter');unchanged(initial,await state());
  await page.emulateMedia({reducedMotion:'reduce'});await tap(trigger);
  assert.equal(await page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.flatMap(e=>e.getAnimations()).length),0);
  await tap(trigger);await page.emulateMedia({reducedMotion:'no-preference'});
 }
 await open();assert.equal(await dialog.locator('[data-drawer-slot]').count(),20);assert.equal(await dialog.locator('.drawer-empty').count(),6);
 assert.equal(await dialog.evaluate(d=>d.scrollWidth>d.clientWidth+1),false);
 const tiles=await dialog.locator('[data-drawer-slot]').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,label:e.getAttribute('aria-label')})));
 assert(tiles.every(t=>t.w>=43&&t.h>=43&&Math.abs(t.w-t.h)<1&&t.label));
 await move(0,12);await tap(dialog.locator('[data-cancel]'));assert.deepEqual((await state()).slots,initial.slots);
 await open();await move(0,12);await move(2,19);
 let custom=moveEvolutionSlot(moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,0,12),2,19);
 await page.screenshot({path:path.join(artifacts,config.lang+'-two-drawers-editor.png'),animations:'disabled'});
 await tap(dialog.locator('[type=submit]'));assert.deepEqual((await state()).slots,custom);unchanged(initial,await state());
 assert(await page.evaluate(()=>document.getElementById('btnGameOfLife')===window.realLifeButton));
 await tap(trigger);assert(await page.locator('#btnGameOfLife').isVisible());
 await page.screenshot({path:path.join(artifacts,config.lang+'-second-drawer.png'),animations:'disabled'});
 await page.reload();await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());drawerTest.setup();});
 assert.deepEqual((await state()).slots,custom);assert.equal(await trigger.locator('[data-drawer-page-dot][data-active=true]').getAttribute('data-drawer-page-dot'),'0');
 // Layouts autosave per profile independently from simulation-rule Save to profile.
 await page.evaluate(()=>drawerTest.tech());await tap(page.locator('[data-profile-choice="1"]'));assert.deepEqual((await state()).slots,DEFAULT_EVOLUTION_LAYOUT);
 await tap(page.locator('[data-profile-choice="0"]'));assert.deepEqual((await state()).slots,custom);
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 await open();await tap(dialog.locator('[data-reset]'));await page.keyboard.press('Escape');assert.deepEqual((await state()).slots,custom);
 await open();await tap(dialog.locator('[data-reset]'));await tap(dialog.locator('[type=submit]'));assert.deepEqual((await state()).slots,DEFAULT_EVOLUTION_LAYOUT);
 // A genuine old ten-slot TXT preserves its first page, with no lost controls.
 const legacy=['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)];
 await page.locator('#projectFileInput').setInputFiles({name:'legacy-layout.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{evolutionSlots:legacy}}))});
 await page.waitForFunction(()=>drawerTest.state().slots[0]==='cymatics');
 assert.deepEqual((await state()).slots.slice(0,10),legacy);assert.deepEqual((await state()).slots.slice(10,13),['dla','breathe','turing']);
 // Existing two-drawer files retain even the former left-aligned factory layout.
 const previous=[...DEFAULT_EVOLUTION_SLOTS,'breathe','turing','cymatics',...Array(7).fill(null)];
 await page.locator('#projectFileInput').setInputFiles({name:'saved-two-drawers.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{evolutionSlots:previous}}))});
 await page.waitForFunction(()=>drawerTest.state().slots[10]==='breathe');const migratedPrevious=[...previous];migratedPrevious[17]='nudgeBrighter';assert.deepEqual((await state()).slots,migratedPrevious);
 const occupied=[...previous];[occupied[0],occupied[17]]=[occupied[17],occupied[0]];
 await page.locator('#projectFileInput').setInputFiles({name:'occupied-nudge-destination.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{evolutionSlots:occupied}}))});
 await page.waitForFunction(()=>drawerTest.state().slots[0]==='nudgeBrighter');assert.equal((await state()).slots[17],'dla');
 for(let i=0;i<20;i++)if(occupied[i]!==null)assert.equal((await state()).slots[i],occupied[i]);


 await open();await tap(dialog.locator('[data-reset]'));await tap(dialog.locator('[type=submit]'));
 // Move Life to page two. Its selected mode and run survive navigation away.
 await open();await move(2,19);await tap(dialog.locator('[type=submit]'));custom=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,2,19);
 await tap(trigger);await tap(page.locator('#btnGameOfLife'));await tap(page.locator('#btnGameOfLife'));
 const selected=await state();assert.equal(selected.armed,'gameOfLife');
 const lifeClass=await page.locator('#btnGameOfLife').getAttribute('class');
 await tap(trigger);assert.equal(await trigger.getAttribute('data-parked-active'),'true');unchanged(selected,await state());
 await tap(page.locator('#btnStepForward'));assert.equal((await state()).armed,'gameOfLife');
 await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>drawerTest.state().gen>=4);
 assert(await trigger.isEnabled());await tap(trigger);const running=await state();assert(running.playing);assert.equal(running.armed,'gameOfLife');
 assert.equal(await page.locator('#btnGameOfLife').getAttribute('class'),lifeClass);
 await page.evaluate(()=>drawerTest.open());assert.equal(await dialog.isVisible(),false,'editing stays locked during playback');
 await tap(trigger);await page.waitForFunction(g=>drawerTest.state().gen>g,running.gen);
 await tap(page.locator('#btnPlayPauseLife'));const result=await state();assert.equal(result.playing,false);
 await open();await move(0,13);await tap(dialog.locator('[type=submit]'));custom=moveEvolutionSlot(custom,0,13);unchanged(result,await state());assert.equal((await state()).gen,result.gen,'editing preserves paused generation');
 await tap(page.locator('#btnUndo'));await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,result.board);
 const recipe=await page.evaluate(()=>drawerTest.recipe());assert(!recipe.includes('evolutionSlots'),'layout never enters artwork recipes');
 await page.locator('#projectFileInput').setInputFiles({name:'two-drawers-journey.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});
 await page.waitForFunction(()=>drawerTest.state().loaded);assert(await trigger.isDisabled());
 await page.evaluate(()=>drawerTest.macro());await page.waitForFunction(()=>!drawerTest.state().loaded&&!drawerTest.state().macro,null,{timeout:30000});
 assert.deepEqual((await state()).board,result.board,'macro replays identically with Life on the other page');assert.deepEqual((await state()).slots,custom);
 await page.evaluate(()=>{drawerTest.arm('breathe');drawerTest.play();});assert(await trigger.isEnabled());
 await tap(trigger);assert((await state()).playing,'navigation also works during Breathe');await page.evaluate(()=>drawerTest.pause());

 // Both engine directions belong to the same movable drawer control and marker.
 await page.evaluate(()=>drawerTest.arm('nudgeDarker'));
 if(await page.locator('#controlsContainer').getAttribute('data-evolution-page')!=='0')await tap(trigger);
 assert.equal(await trigger.getAttribute('data-parked-active'),'true');await tap(trigger);
 const nudge=page.locator('#btnNudgeBrighter');assert(await nudge.isVisible());assert.equal(await nudge.getAttribute('data-evolution-slot'),'17');
 assert.deepEqual(await nudge.evaluate(e=>[getComputedStyle(e).gridRowStart,getComputedStyle(e).gridColumnStart]),['3','5']);
 assert.equal(await nudge.getAttribute('data-nudge-mode'),'darker');
 const nudgeBefore=await state();await open();await move(17,0);await tap(dialog.locator('[type=submit]'));
 const movedNudge=moveEvolutionSlot(custom,17,0);assert.deepEqual((await state()).slots,movedNudge);unchanged(nudgeBefore,await state());
 assert.equal(await trigger.getAttribute('data-parked-active'),'true');await tap(trigger);assert(await nudge.isVisible());assert.equal(await nudge.getAttribute('data-evolution-slot'),'0');
 await page.reload();await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());drawerTest.setup();});assert.deepEqual((await state()).slots,movedNudge);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
