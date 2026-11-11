// Browser coverage of the drawer's presentation-only contract and saved profiles.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {DEFAULT_EVOLUTION_SLOTS,DEFAULT_EVOLUTION_LAYOUT,validateEvolutionSlots,moveEvolutionSlot} from '../js/evolution-drawer-settings.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts='/tmp/evolution-drawer-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',f)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:375,height:667},{lang:'nl',width:1024,height:768}].filter(c=>!process.env.DRAWER_LANG||c.lang===process.env.DRAWER_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block',reducedMotion:config.lang==='he'?'reduce':'no-preference'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.drawerTest={
 setup:()=>{pauseLife();resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=5+i%12;t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 state:()=>({slots:[...evolutionSlots],board:boardState.map(t=>t.k),logs:[...artRecipeLog],history:history.length,armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,loaded:isMacroLoaded,macro:isMacroPlaying,settings:getWorkspaceSettings()}),
 theme:applySimulationTheme,open:()=>evolutionDrawer.open(),arm:armSimulation,play:togglePlayPauseLife,pause:pauseLife,tech:()=>modals.openTechnicianMenu(),loadSettings:importWorkspaceSettings,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro
 };initializeApp().then(()=>drawerTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 assert.deepEqual((await page.evaluate(()=>drawerTest.state())).slots,DEFAULT_EVOLUTION_LAYOUT,'first launch uses the requested layout before any test setup');
 if(config.width<600)await page.locator('#btnToggleSimMode').tap();else await page.locator('#btnToggleSimMode').click();
 await page.waitForFunction(()=>document.getElementById('controlsContainer').classList.contains('sim-mode-active'));await page.waitForTimeout(600);
 assert.deepEqual(await page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top||a.getBoundingClientRect().left-b.getBoundingClientRect().left).map(e=>e.dataset.evolutionId)),['cymatics','sandpile','gameOfLife','brightnessEvo','islands','nudgeBrighter','magnet','gravitationalSort','erosion'],'fresh entry uses physical left-to-right order');
 await page.evaluate(()=>drawerTest.setup());

 const state=()=>page.evaluate(()=>drawerTest.state()),tap=target=>config.width<600?target.tap():target.click();
 const trigger=page.locator('#btnEvolutionDrawerInternal'),dialog=page.locator('#evolutionDrawerDialog'),container=page.locator('#controlsContainer');
 const visible=()=>page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.sort((a,b)=>+a.dataset.evolutionSlot-+b.dataset.evolutionSlot).map(e=>e.dataset.evolutionId));
 const unchanged=(a,b)=>{assert.deepEqual(a.board,b.board);assert.deepEqual(a.logs,b.logs);assert.equal(a.history,b.history);assert.equal(a.armed,b.armed);};
 async function open(){
  const r=await trigger.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(config.width<600){const input=await context.newCDPSession(page);await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*7}]});await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await input.detach();}
  else {await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-35,{steps:5});await page.mouse.up();}
  await dialog.waitFor({state:'visible'});await page.waitForTimeout(300);
 }
 const slot=i=>dialog.locator(`[data-drawer-slot="${i}"]`);
 async function move(from,to){await tap(slot(from));await tap(slot(to));}
 async function save(){await tap(dialog.locator('[type=submit]'));}
 async function reload(){await page.waitForTimeout(300);await page.reload();await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());drawerTest.setup();});}
 const initial=await state();assert.deepEqual(initial.slots,DEFAULT_EVOLUTION_LAYOUT);
 const physicalRows=()=>page.locator('#controlsContainer [data-evolution-slot],#btnEvolutionDrawerInternal').evaluateAll(es=>[2,3].map(row=>es.filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).gridRowStart===String(row)).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left).map(e=>e.dataset.evolutionId||'navigation')));
 assert.deepEqual(await physicalRows(),[['cymatics','sandpile','gameOfLife','brightnessEvo','islands'],['nudgeBrighter','magnet','navigation','gravitationalSort','erosion']],'physical left-to-right order on the first drawer');
 assert.equal(await page.locator('.drawer-view-option,[data-drawer-view],.evolution-drawer-trigger,#btnEvolutionDrawerRight,.drawer-recess').count(),0,'removed presentations leave no controls or technician choice');
 assert.deepEqual(await visible(),DEFAULT_EVOLUTION_LAYOUT.slice(0,10).filter(Boolean));
 const layout=await container.evaluate(e=>({rows:getComputedStyle(e).gridTemplateRows.split(' ').length,bottom:['btnSave','btnInvert','btnToggleSimMode','btnRandom','btnCycleSort','btnUndo','btnRedo'].map(id=>getComputedStyle(document.getElementById(id)).gridRowStart)}));
 assert.equal(layout.rows,4);assert(layout.bottom.every(r=>r==='4'));
 const originalZoom=await page.locator('#appContainer').evaluate(e=>({attribute:e.getAttribute('data-ui-zoom'),value:e.style.getPropertyValue('--ui-zoom')}));
 for(const zoom of [.9,1.15]){
  await page.locator('#appContainer').evaluate((e,z)=>{e.setAttribute('data-ui-zoom','');e.style.setProperty('--ui-zoom',z);},zoom);
  assert(await trigger.evaluate(e=>{const r=e.getBoundingClientRect();const island=e.querySelector('.drawer-internal-symbol').getBoundingClientRect();return island.left>=r.left-1&&island.right<=r.right+1&&getComputedStyle(e).gridRowStart==='3'&&getComputedStyle(e).gridColumnStart==='5'&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),'central navigation remains independently clickable at interface zoom');
 }
 await page.locator('#appContainer').evaluate((e,old)=>{if(old.attribute===null)e.removeAttribute('data-ui-zoom');else e.setAttribute('data-ui-zoom',old.attribute);if(old.value)e.style.setProperty('--ui-zoom',old.value);else e.style.removeProperty('--ui-zoom');},originalZoom);
 const island=await trigger.locator('.drawer-internal-symbol').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return {w:s.width,h:s.height,radius:s.borderRadius,background:s.backgroundColor,image:s.backgroundImage,shadow:s.boxShadow,fits:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};});
 assert(Math.abs(parseFloat(island.w)-34)<.1&&Math.abs(parseFloat(island.h)-34)<.1);assert.equal(island.radius,'50%');assert.equal(island.background,'rgb(20, 23, 25)');assert(island.image.includes('gradient')&&island.shadow!=='none'&&island.fits,'neutral island stays inside the original tap target');
 const yinColors=()=>trigger.locator('[data-yin-half]').evaluateAll(es=>es.map(e=>getComputedStyle(e).fill));
 assert.deepEqual(await yinColors(),['rgb(255, 215, 0)','rgb(8, 10, 9)']);
 assert.deepEqual(await trigger.locator('[data-yin-dot]').evaluateAll(es=>es.map(e=>getComputedStyle(e).fill)),['rgb(8, 10, 9)','rgb(255, 215, 0)']);
 assert.equal(await trigger.locator('circle').count(),2);
 assert.notEqual(await trigger.locator('svg').evaluate(e=>getComputedStyle(e).filter),'none');
 if(config.lang==='he')assert.equal(await trigger.locator('[data-yin-half]').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 const position=await trigger.boundingBox(),frame=await page.locator('#simModeBackground').boundingBox();
 await tap(trigger);await page.waitForTimeout(300);assert.deepEqual(await yinColors(),['rgb(8, 10, 9)','rgb(255, 215, 0)']);
 assert.deepEqual(await trigger.locator('[data-yin-dot]').evaluateAll(es=>es.map(e=>getComputedStyle(e).fill)),['rgb(255, 215, 0)','rgb(8, 10, 9)']);
 assert.deepEqual(await physicalRows(),[['turing','spiral','breathe','dla','contour'],['navigation']],'second drawer has five simulations on top and only navigation below');assert.deepEqual(await visible(),DEFAULT_EVOLUTION_LAYOUT.slice(10).filter(Boolean));assert.deepEqual(await trigger.boundingBox(),position);assert.deepEqual(await page.locator('#simModeBackground').boundingBox(),frame);unchanged(initial,await state());
 await tap(trigger);await page.screenshot({path:path.join(artifacts,config.lang+'-permanent-drawer.png'),animations:'disabled'});
 await open();assert.equal(await dialog.locator('[data-drawer-slot]').count(),20);assert.equal(await dialog.locator('.drawer-reserved-slot:disabled').count(),2);
 assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 await move(0,13);await tap(dialog.locator('[data-cancel]'));assert.deepEqual((await state()).slots,initial.slots);assert(await trigger.evaluate(e=>document.activeElement===e));
 await open();await move(0,13);await move(2,19);await page.screenshot({path:path.join(artifacts,config.lang+'-permanent-editor.png'),animations:'disabled'});await save();
 let custom=moveEvolutionSlot(moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,0,13),2,19);
 assert.deepEqual((await state()).slots,custom);unchanged(initial,await state());
 await reload();assert.deepEqual((await state()).slots,custom,'arrangement survives reopening');assert.equal(await container.getAttribute('data-evolution-page'),'0');
 await page.evaluate(()=>drawerTest.tech());assert.equal(await page.locator('[data-drawer-view]').count(),0);
 for(const index of [1,2]){await tap(page.locator('[data-profile-choice="'+index+'"]'));assert.deepEqual((await state()).slots,DEFAULT_EVOLUTION_LAYOUT,'every untouched factory profile starts with the new layout');}
 await tap(page.locator('[data-profile-choice="0"]'));assert.deepEqual((await state()).slots,custom,'each profile retains its own arrangement');
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 await open();await tap(dialog.locator('[data-reset]'));await page.keyboard.press('Escape');assert.deepEqual((await state()).slots,custom);
 await open();await tap(dialog.locator('[data-reset]'));await save();assert.deepEqual((await state()).slots,DEFAULT_EVOLUTION_LAYOUT);
 if(config.lang==='en'){
  await trigger.focus();await page.keyboard.press('Alt+ArrowUp');await dialog.waitFor({state:'visible'});await page.keyboard.press('Escape');
  await trigger.press('Space');assert.equal(await container.getAttribute('data-evolution-page'),'1');await trigger.press('Enter');
  await page.emulateMedia({reducedMotion:'reduce'});await tap(trigger);assert.equal(await trigger.locator('path').evaluateAll(es=>es.flatMap(e=>e.getAnimations()).length),0);await tap(trigger);await page.emulateMedia({reducedMotion:'no-preference'});
 }
 // Genuine old settings files migrate once; every simulation remains represented.
 for(const legacy of [['cymatics',...DEFAULT_EVOLUTION_SLOTS.slice(1)],[...DEFAULT_EVOLUTION_SLOTS,'breathe','turing','cymatics',...Array(7).fill(null)],['dla','contour','gameOfLife','brightnessEvo','islands','magnet','gravitationalSort',null,'sandpile','erosion','spiral','breathe','turing','cymatics',null,null,null,null,'nudgeBrighter',null]]){
  const expected=validateEvolutionSlots(legacy);
  await page.locator('#projectFileInput').setInputFiles({name:'legacy-drawers.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{evolutionSlots:legacy}}))});
  await page.waitForFunction(slots=>JSON.stringify(drawerTest.state().slots)===JSON.stringify(slots),expected);
  await reload();assert.deepEqual((await state()).slots,expected);await reload();assert.deepEqual((await state()).slots,expected,'migration does not repeat');
 }
 await open();await tap(dialog.locator('[data-reset]'));await save();await open();await move(2,19);await save();custom=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,2,19);
 await tap(trigger);await tap(page.locator('#btnGameOfLife'));await tap(page.locator('#btnGameOfLife'));
 const selected=await state();assert.equal(selected.armed,'gameOfLife');const lifeClass=await page.locator('#btnGameOfLife').getAttribute('class');
 await tap(trigger);assert.equal(await trigger.getAttribute('data-parked-active'),'true');unchanged(selected,await state());
 await tap(page.locator('#btnStepForward'));const beforePlay=await state();await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(g=>drawerTest.state().gen>=g+3,beforePlay.gen);
 await tap(trigger);const playing=await state();assert(playing.playing);assert.equal(playing.armed,'gameOfLife');assert.equal(await page.locator('#btnGameOfLife').getAttribute('class'),lifeClass);
 await page.evaluate(()=>drawerTest.open());assert.equal(await dialog.isVisible(),false,'editor remains unavailable during playback');
 await tap(trigger);await page.waitForFunction(g=>drawerTest.state().gen>g,playing.gen);await tap(page.locator('#btnPlayPauseLife'));const result=await state();
 await open();await move(0,13);await save();custom=moveEvolutionSlot(custom,0,13);unchanged(result,await state());assert.equal((await state()).gen,result.gen);
 await tap(page.locator('#btnUndo'));await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,result.board);
 const recipe=await page.evaluate(()=>drawerTest.recipe());assert(!recipe.includes('evolutionSlots'));
 await page.locator('#projectFileInput').setInputFiles({name:'permanent-drawer-journey.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});
 await page.waitForFunction(()=>drawerTest.state().loaded);assert(await trigger.isDisabled());await page.evaluate(()=>drawerTest.macro());await page.waitForFunction(()=>!drawerTest.state().loaded&&!drawerTest.state().macro,null,{timeout:30000});
 assert.deepEqual((await state()).board,result.board,'macro uses engine rules, independent of layout');assert.deepEqual((await state()).slots,custom);
 await page.evaluate(()=>drawerTest.arm('nudgeDarker'));if(await container.getAttribute('data-evolution-page')!==String(Math.floor(custom.indexOf('nudgeBrighter')/10)))await tap(trigger);
 const nudge=page.locator('#btnNudgeBrighter');assert(await nudge.isVisible());assert.equal(await nudge.getAttribute('data-evolution-slot'),String(custom.indexOf('nudgeBrighter')));assert.equal(await nudge.getAttribute('data-nudge-mode'),'darker');
 const nudgeBefore=await state(),nudgeFrom=custom.indexOf('nudgeBrighter');await open();await move(nudgeFrom,15);await save();custom=moveEvolutionSlot(custom,nudgeFrom,15);unchanged(nudgeBefore,await state());assert.equal(await trigger.getAttribute('data-parked-active'),'true');await tap(trigger);assert(await nudge.isVisible());
 await reload();assert.deepEqual((await state()).slots,custom,'moving Nudge persists alongside all other controls');
 await page.evaluate(()=>{drawerTest.arm('breathe');drawerTest.play();});assert(await trigger.isEnabled());await tap(trigger);assert((await state()).playing);await page.evaluate(()=>drawerTest.pause());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
