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
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block',reducedMotion:config.lang==='he'?'reduce':'no-preference'});await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);localStorage.setItem('colorGridOpeningChoice','false');},config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.drawerTest={
 setup:()=>{pauseLife();resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=5+i%12;t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 state:()=>({slots:[...evolutionSlots],board:boardState.map(t=>t.k),logs:[...artRecipeLog],history:history.length,armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,loaded:isMacroLoaded,macro:isMacroPlaying,settings:getWorkspaceSettings()}),
 hidePatterns:()=>{experimentalSimulations.set('patterns',false);evolutionDrawer.applyLayout();},
 hideOptional:()=>{for(const name of ['spiral','breathe','fibonacci'])experimentalSimulations.set(name,false);evolutionDrawer.applyLayout();},
 palette:group=>switchToPalette(C.PALETTE_GROUPS.find(item=>item.id===group).indexes[0],{adapt:true}),
 front:()=>fibonacciState?.map?.front??fibonacciState?.crystalFront??0,
 theme:applySimulationTheme,open:()=>evolutionDrawer.open(),arm:armSimulation,play:togglePlayPauseLife,pause:pauseLife,tech:()=>modals.openTechnicianMenu(),loadSettings:importWorkspaceSettings,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro
 };initializeApp().then(()=>drawerTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 assert.deepEqual((await page.evaluate(()=>drawerTest.state())).slots,DEFAULT_EVOLUTION_LAYOUT,'first launch uses the requested layout before any test setup');
 if(config.width<600)await page.locator('#btnToggleSimMode').tap();else await page.locator('#btnToggleSimMode').click();
 await page.waitForFunction(()=>document.getElementById('controlsContainer').classList.contains('sim-mode-active'));await page.waitForTimeout(600);
 assert.deepEqual(await page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top||a.getBoundingClientRect().left-b.getBoundingClientRect().left).map(e=>e.dataset.evolutionId)),['sandpile','magnet','gameOfLife','brightnessEvo','islands','nudgeBrighter','gravitationalSort','ink','erosion'],'fresh entry uses physical left-to-right order');
 const freshSwitch=page.locator('#btnEvolutionDrawerInternal');
 for(const start of [10,20]){
  if(config.width<600)await freshSwitch.tap();else await freshSwitch.click();
  const shown=await page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(buttons=>buttons.sort((a,b)=>a.dataset.evolutionSlot-b.dataset.evolutionSlot).map(e=>[Number(e.dataset.evolutionSlot),e.dataset.evolutionId]));
  assert.deepEqual(shown,DEFAULT_EVOLUTION_LAYOUT.slice(start,start+10).flatMap((id,index)=>id?[[start+index,id]]:[]));
 }
 if(config.width<600)await freshSwitch.tap();else await freshSwitch.click();
 await page.evaluate(()=>{drawerTest.setup();drawerTest.hidePatterns();drawerTest.hideOptional();});

 const state=()=>page.evaluate(()=>drawerTest.state()),tap=target=>config.width<600?target.tap():target.click();
 const trigger=page.locator('#btnEvolutionDrawerInternal'),dialog=page.locator('#evolutionDrawerDialog'),container=page.locator('#controlsContainer');
 const visible=()=>page.locator('#controlsContainer [data-evolution-slot]:visible').evaluateAll(es=>es.sort((a,b)=>+a.dataset.evolutionSlot-+b.dataset.evolutionSlot).map(e=>e.dataset.evolutionId));
 const unchanged=(a,b)=>{assert.deepEqual(a.board,b.board);assert.deepEqual(a.logs,b.logs);assert.equal(a.history,b.history);assert.equal(a.armed,b.armed);};
 async function drag(x,y,dx,dy){
  if(config.width<600){const input=await context.newCDPSession(page);await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5}]});await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await input.detach();}
  else {await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up();}
 }
 async function swipe(target,dx,dy){
  const r=await target.boundingBox();
  await drag(r.x+r.width/2,r.y+r.height/2,dx,dy);
 }
 async function open(){
  await swipe(trigger,0,-35);
  await dialog.waitFor({state:'visible'});await page.waitForTimeout(300);
 }
 const slot=i=>dialog.locator(`[data-drawer-slot="${i}"]`);
 async function move(from,to){await tap(slot(from));await tap(slot(to));}
 async function save(){
  await dialog.evaluate(element=>{
   element.dataset.testClosed='false';
   element.addEventListener('close',()=>{element.dataset.testClosed='true';},{once:true});
  });
  await tap(dialog.locator('[type=submit]'));
  await page.waitForFunction(()=>document.getElementById('evolutionDrawerDialog').dataset.testClosed==='true');
 }
 async function reload(){await page.waitForTimeout(300);await page.reload();await page.waitForFunction(()=>window.drawerTest?.ready);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());drawerTest.setup();drawerTest.hidePatterns();});}
 let initial=await state();assert.deepEqual(initial.slots,DEFAULT_EVOLUTION_LAYOUT);
 const physicalRows=()=>page.locator('#controlsContainer [data-evolution-slot],#btnEvolutionDrawerInternal').evaluateAll(es=>[2,3].map(row=>es.filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).gridRowStart===String(row)).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left).map(e=>e.dataset.evolutionId||'navigation')));
 assert.deepEqual(await physicalRows(),[['sandpile','magnet','gameOfLife','brightnessEvo','islands'],['nudgeBrighter','gravitationalSort','navigation','ink','erosion']],'physical left-to-right order on the first drawer');
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
 const island=await trigger.locator('.drawer-internal-symbol').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return {w:s.width,h:s.height,radius:s.borderRadius,shadow:s.boxShadow,fits:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};});
 assert(Math.abs(parseFloat(island.w)-22)<.1&&Math.abs(parseFloat(island.h)-11)<.1);assert.equal(island.radius,'3px');assert(island.shadow.includes('inset')&&island.fits,'the recessed switch stays inside the original tap target');
 const dot=trigger.locator('.drawer-page-dot');
 assert.equal(await dot.count(),1);
 const dotColor=()=>dot.evaluate(e=>getComputedStyle(e).backgroundColor);
 const backdrop=page.locator('#simModeBackground');
 const backgroundImage=()=>backdrop.evaluate(element=>getComputedStyle(element).backgroundImage);
 const drawerColors=[/rgb\(20, 41, 31\)/,/rgb\(15, 23, 42\)/,/rgb\(44, 20, 29\)/];
 async function checkBackdrop(index){
  const image=await backgroundImage();
  assert.match(image,drawerColors[index]);
  const texture=await backdrop.evaluate(element=>{
   const style=getComputedStyle(element,'::before');
   return {image:style.backgroundImage,mask:style.maskImage,color:style.backgroundColor};
  });
  if(index===2){
   assert.equal(texture.mask,'none');
   assert.equal((texture.image.match(/repeating-linear-gradient/g)??[]).length,2);
   assert.match(texture.image,/45deg.*28px.*29px/);
  }else{
   const [filename,color]=index===0
    ? ['drawer-life-contours.png','rgba(166, 198, 163, 0.05)']
    : ['drawer-pulse-waves.png','rgba(154, 175, 215, 0.05)'];
   assert(texture.mask.includes(filename));
   assert.equal(texture.color,color);
  }
 }
 const lip=()=>trigger.locator('.drawer-internal-symbol').evaluate(e=>getComputedStyle(e,'::before').borderBottomColor);
 const firstLip=await lip();
 for(const theme of ['blue','teal','gold']){
  await page.evaluate(theme=>drawerTest.theme(theme),theme);
  assert.equal(await dotColor(),'rgb(187, 192, 198)');
  assert.equal(await lip(),firstLip);
  await checkBackdrop(0);
  assert.equal(await page.locator('#btnMagnetModes > svg:visible').first().evaluate(e=>getComputedStyle(e).stroke),'rgb(165, 139, 84)');
 }
 assert.equal(await dot.evaluate(e=>getComputedStyle(e).transitionDuration),config.lang==='he'?'0s':'0.18s');
 const position=await trigger.boundingBox(),frame=await page.locator('#simModeBackground').boundingBox();
 const firstDot=await dot.boundingBox();
 await tap(trigger);await page.waitForTimeout(300);
 assert((await dot.boundingBox()).x>firstDot.x,'the same dot moves to the other page');
 assert.equal(await dotColor(),'rgb(187, 192, 198)');
 await checkBackdrop(1);assert.notEqual(await lip(),firstLip);
 assert.deepEqual(await physicalRows(),[['contour','dla','network','turing'],['cymatics','navigation']],'physical left-to-right order on the second drawer');assert.deepEqual(await visible(),DEFAULT_EVOLUTION_LAYOUT.slice(10,20).filter(id=>id&&!['spiral','breathe','fibonacci'].includes(id)));assert.deepEqual(await trigger.boundingBox(),position);assert.deepEqual(await page.locator('#simModeBackground').boundingBox(),frame);unchanged(initial,await state());
 await page.evaluate(()=>drawerTest.tech());
 await tap(page.locator('#btnConfigureFeatures'));
 await page.locator('#spiralExperimentToggle').check();
 await page.locator('#breatheExperimentToggle').check();
 await page.locator('#fibonacciExperimentToggle').check();
 await tap(page.locator('#btnTechnicianCloseTop'));
 assert.deepEqual(await physicalRows(),[['contour','dla','breathe','network','turing'],['cymatics','fibonacci','navigation','spiral']]);
 await page.evaluate(()=>drawerTest.tech());
 await tap(page.locator('#btnConfigureFeatures'));
 await page.locator('#breatheExperimentToggle').uncheck();
 await page.locator('#fibonacciExperimentToggle').uncheck();
 await tap(page.locator('#btnTechnicianCloseTop'));
 await tap(trigger);await page.screenshot({path:path.join(artifacts,config.lang+'-permanent-drawer.png'),animations:'disabled'});
 const pageIndex=()=>container.getAttribute('data-evolution-page');
 await swipe(page.locator('#btnMagnetModes'),0,36);assert.equal(await pageIndex(),'0','downward swipe stays put');
 await swipe(page.locator('#btnMagnetModes'),36,0);assert.equal(await pageIndex(),'1','horizontal drag from an inactive simulation');
 await drag(frame.x+10,frame.y+10,0,-36);assert.equal(await pageIndex(),'0','upward drag from an empty slot');
 await swipe(page.locator('#btnMagnetModes'),0,-36);assert.equal(await pageIndex(),'1','upward drag without available settings');
 await swipe(trigger,-36,0);assert.equal(await pageIndex(),'0');
 unchanged(initial,await state());
 const life=page.locator('#btnGameOfLife'),lifeSettings=page.locator('#gameOfLifeSettingsModal');
 await tap(life);const presetBefore=(await state()).logs;
 await swipe(life,36,0);assert.equal(await pageIndex(),'0','active preset swipe has priority');
 assert((await state()).logs.length>presetBefore.length);
 await swipe(life,0,-36);await lifeSettings.waitFor({state:'visible'});
 assert.equal(await pageIndex(),'0','active settings swipe has priority');
 await drag(frame.x+10,frame.y+10,36,0);assert.equal(await pageIndex(),'0','open settings block navigation');
 await tap(page.locator('#btnGolSettingsCancel'));await lifeSettings.waitFor({state:'hidden'});await page.evaluate(()=>drawerTest.setup());initial=await state();
 await open();assert.equal(await dialog.locator('[data-drawer-slot]').count(),20);assert.equal(await dialog.locator('.drawer-reserved-slot:disabled .drawer-internal-symbol').count(),2);
 assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 await move(0,13);await tap(dialog.locator('[data-cancel]'));assert.deepEqual((await state()).slots,initial.slots);await page.waitForFunction(()=>document.activeElement===document.getElementById('btnEvolutionDrawerInternal'));
 await open();await move(0,13);await move(2,18);await page.screenshot({path:path.join(artifacts,config.lang+'-permanent-editor.png'),animations:'disabled'});await save();
 let custom=moveEvolutionSlot(moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,0,13),2,18);
 assert.deepEqual((await state()).slots,custom);unchanged(initial,await state());
 await reload();assert.deepEqual((await state()).slots,custom,'arrangement survives reopening');assert.equal(await container.getAttribute('data-evolution-page'),'0');
 await page.evaluate(()=>drawerTest.tech());assert.equal(await page.locator('[data-drawer-view]').count(),0);
 for(const index of [1,2]){await tap(page.locator('[data-profile-choice="'+index+'"]'));assert.deepEqual((await state()).slots,DEFAULT_EVOLUTION_LAYOUT,'every untouched factory profile starts with the new layout');}
 await tap(page.locator('[data-profile-choice="0"]'));assert.deepEqual((await state()).slots,custom,'each profile retains its own arrangement');
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 await open();
 const beforeCycleReset=await state();
 const cycleReset=dialog.locator('.drawer-header [data-reset-cycles]');
 assert((await cycleReset.textContent()).trim());
 await tap(cycleReset);
 assert((await dialog.locator('[data-reset-cycles-status]').textContent()).trim());
 assert.deepEqual((await state()).slots,beforeCycleReset.slots);
 assert.deepEqual((await state()).board,beforeCycleReset.board);
 await tap(dialog.locator('[data-reset]'));await page.keyboard.press('Escape');assert.deepEqual((await state()).slots,custom);
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
 await open();await tap(dialog.locator('[data-reset]'));await save();await open();await move(2,18);await save();custom=moveEvolutionSlot(DEFAULT_EVOLUTION_LAYOUT,2,18);
 await tap(trigger);await tap(page.locator('#btnGameOfLife'));await tap(page.locator('#btnGameOfLife'));
 const selected=await state();assert.equal(selected.armed,'gameOfLife');const lifeClass=await page.locator('#btnGameOfLife').getAttribute('class');
 await tap(trigger);assert.equal(await trigger.getAttribute('data-parked-active'),'true');unchanged(selected,await state());
 await tap(page.locator('#btnStepForward'));const beforePlay=await state();await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(g=>drawerTest.state().gen>=g+3,beforePlay.gen);
 await swipe(trigger,36,0);assert.equal(await pageIndex(),'1');const playing=await state();assert(playing.playing);assert.equal(playing.armed,'gameOfLife');assert.equal(await page.locator('#btnGameOfLife').getAttribute('class'),lifeClass);
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
 const nudgeBefore=await state(),nudgeFrom=custom.indexOf('nudgeBrighter'),nudgeTo=nudgeFrom<10?16:1;await open();await move(nudgeFrom,nudgeTo);await save();custom=moveEvolutionSlot(custom,nudgeFrom,nudgeTo);unchanged(nudgeBefore,await state());assert.equal(await trigger.getAttribute('data-parked-active'),'true');await tap(trigger);assert(await nudge.isVisible());
 await reload();assert.deepEqual((await state()).slots,custom,'moving Nudge persists alongside all other controls');
 await page.evaluate(()=>{drawerTest.arm('breathe');drawerTest.play();});assert(await trigger.isEnabled());await tap(trigger);assert((await state()).playing);await page.evaluate(()=>drawerTest.pause());
 await page.evaluate(()=>drawerTest.tech());await tap(page.locator('#btnConfigureFeatures'));
 await page.locator('#patternsExperimentToggle').check();await page.locator('#fibonacciExperimentToggle').check();await tap(page.locator('#btnTechnicianCloseTop'));
 for(let i=0;i<3&&await pageIndex()!=='2';i++)await tap(trigger);
 assert.equal(await pageIndex(),'2');
 await checkBackdrop(2);
 for(const theme of ['blue','gold','teal']){
  await page.evaluate(theme=>drawerTest.theme(theme),theme);
  await checkBackdrop(2);
 }
 await page.screenshot({path:path.join(artifacts,config.lang+'-patterns-burgundy.png'),animations:'disabled'});
 const name=trigger.locator('.drawer-page-name');
 assert.equal(await name.innerText(),'Geometry');
 if(config.width<600){
  await page.setViewportSize({width:320,height:config.height});
  assert.equal(await name.innerText(),'Geo');
  assert.match(await trigger.getAttribute('aria-label'),/Geometry/);
  assert(await name.evaluate(e=>e.offsetWidth<=e.parentElement.clientWidth));
  await page.setViewportSize({width:config.width,height:config.height});
  assert.equal(await name.innerText(),'Geometry');
 }
 const labelStyle=()=>trigger.locator('.drawer-internal-symbol').evaluate(e=>{
  const style=getComputedStyle(e),glyph=getComputedStyle(e.querySelector('.drawer-page-name'));
  return {border:style.borderTopWidth,background:style.backgroundColor,lip:getComputedStyle(e,'::before').display,ink:glyph.color,font:glyph.fontFamily};
 });
 const labelAtRest=await labelStyle();
 assert.equal(labelAtRest.border,'0px');
 assert.equal(labelAtRest.background,'rgba(0, 0, 0, 0)');
 assert.equal(labelAtRest.lip,'none');
 assert.equal(labelAtRest.ink,'rgb(187, 192, 198)');
 assert.match(labelAtRest.font,/Georgia/);

 assert.deepEqual(await visible(),DEFAULT_EVOLUTION_LAYOUT.slice(20).filter(Boolean));
 for(const drawer of ['2','0','1']){
  assert.equal(await pageIndex(),drawer);
  const label=['Life','Pulse','Geometry'][Number(drawer)];
  assert.equal(await name.innerText(),label);
  assert(await trigger.locator('.drawer-page-name').evaluate(e=>e.offsetWidth<e.parentElement.clientWidth));
  assert.deepEqual(await trigger.boundingBox(),position);
  await swipe(trigger,3,-18);await dialog.waitFor({state:'visible'});
  assert.equal(await pageIndex(),drawer,'short upward swipe opens the map without navigating');
  assert.equal(await dialog.locator('.drawer-slots').count(),3);
  assert.deepEqual(await dialog.locator('.drawer-reserved-slot .drawer-page-full-name').allTextContents(),['Life','Pulse','Geometry']);
  assert.deepEqual(await dialog.locator('.drawer-pages h3').allTextContents(),['Life','Pulse','Geometry']);
  await tap(dialog.locator('[data-cancel]'));await tap(trigger);
  await checkBackdrop((Number(drawer)+1)%3);
 }
 assert.equal(await pageIndex(),'2');
 await tap(page.locator('#btnPenroseCrystal'));await tap(page.locator('#btnPlayPauseLife'));
 const playback=await state();assert(playback.playing);
 assert.deepEqual(await labelStyle(),labelAtRest,'the unframed silver label stays stable during playback');
 assert.equal(await backdrop.evaluate(e=>getComputedStyle(e).opacity),'1');
 await checkBackdrop(2);
 await swipe(trigger,3,-18);await dialog.waitFor({state:'visible'});
 assert.equal(await pageIndex(),'2');assert(await dialog.locator('[data-drawer-slot="20"]').isDisabled());
 assert(!(await dialog.locator('[type=submit]').isVisible()));
 await page.waitForFunction(gen=>drawerTest.state().gen>gen,playback.gen);
 await tap(dialog.locator('[data-close]'));await tap(page.locator('#btnPlayPauseLife'));
 await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('simModeBackground')).opacity)>.99);
 await checkBackdrop(2);
 await swipe(trigger,3,-18);await dialog.waitFor({state:'visible'});assert(await dialog.locator('[data-drawer-slot="20"]').isEnabled());
 await tap(dialog.locator('[data-cancel]'));
 await page.evaluate(()=>{drawerTest.setup();drawerTest.palette('classic');});
 const growthDialog=page.locator('#fibonacciTuningDialog');
 const auto=growthDialog.locator('[data-growth-auto]');
 const speed=growthDialog.locator('#fibonacciTuning_growthSpeed');
 const output=growthDialog.locator('output[for="fibonacciTuning_growthSpeed"]');
 const tangent=page.locator('#btnTangentCircles');
 const openGrowth=async button=>{
  await swipe(button,0,-35);
  await growthDialog.waitFor({state:'visible'});
 };
 const finishGrowth=async selector=>{
  await growthDialog.locator(selector).click();
  await growthDialog.waitFor({state:'hidden'});
 };
 for (const id of ['btnPenroseCrystal','btnPinwheelTiles','btnOctagonalCrystal','btnVoronoiCells','btnTangentCircles']) {
  const button=page.locator('#'+id);
  await tap(button);await openGrowth(button);
  assert(await auto.isChecked());assert(await speed.isDisabled());assert.equal(await output.textContent(),'10%');
  await finishGrowth('[data-cancel]');
 }
 await openGrowth(tangent);
 await auto.uncheck();assert(await speed.isEnabled());assert.equal(await speed.inputValue(),'50');
 await speed.fill('75');
 await auto.check();assert.equal(await output.textContent(),'10%');
 await finishGrowth('[type=submit]');
 await openGrowth(tangent);
 await auto.uncheck();assert.equal(await speed.inputValue(),'75');
 await finishGrowth('[data-cancel]');
 const front=()=>page.evaluate(()=>drawerTest.front());
 let distance=await front();
 for (const [group,increment] of [['classic',10],['extended',25],['continuous',100]]) {
  await page.evaluate(group=>drawerTest.palette(group),group);
  await tap(page.locator('#btnStepForward'));
  distance+=increment;assert.equal(await front(),distance);
 }
 const recordedPattern=await state();
 const growthRecipe=await page.evaluate(()=>drawerTest.recipe());
 assert(growthRecipe.includes('"growthSpeedAuto":true'));
 await page.locator('#projectFileInput').setInputFiles({name:'pattern-growth.txt',mimeType:'text/plain',buffer:Buffer.from(growthRecipe)});
 await page.waitForFunction(()=>drawerTest.state().loaded);
 await page.evaluate(()=>drawerTest.macro());
 await page.waitForFunction(()=>!drawerTest.state().loaded&&!drawerTest.state().macro,null,{timeout:30000});
 assert.deepEqual((await state()).board,recordedPattern.board,'the macro replays every recorded palette and Auto generation');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
