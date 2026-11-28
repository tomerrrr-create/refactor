// Drawer integration, settings, deterministic live drawing and complete recipe/project round trips.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createServer} from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),artifacts='/tmp/cymatics-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',f)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.CYMATICS_LANG||c.lang===process.env.CYMATICS_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);localStorage.setItem('colorGridOpeningChoice','false');localStorage.setItem('colorGridExperimentalSimulationsV1',JSON.stringify({spiral:true,breathe:true}));},config.lang);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.cymaticsTest={
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');updatePaletteHeader();n=41;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=(i*17+5)%23;t.isGold=i===840;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();selectedColorIndex=20;selectedColor=palette()[20];isRainbowModeActive=false;isBrushModeOn=true;isContinuousBrushOn=false;brushSize=1;history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 setupCircle:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Blue Hypnosis 264');if(activePaletteIndex<0)activePaletteIndex=0;updatePaletteHeader();n=81;initializeBoardAndCanvas(true);applySortMethod('luminance');let seed=4567;boardState.forEach(t=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;t.k=t.v=(seed>>>0)%palette().length;t.isGold=false;});boardState[0].isGold=true;history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();renderToScreen(null);},
 debug:()=>({step:currentMacroStep,total:macroQueue.length,next:macroQueue[currentMacroStep],generation:currentGenerationCount,playing:isLifePlaying,loaded:isMacroLoaded,macro:isMacroPlaying,armed:armedSimulation}),state:()=>({snapshot:getCurrentState(),board:boardState.map(t=>t.k),rules:{...getCymaticsRules()},frequencies:{...cymaticsFrequencies},strengths:{...cymaticsStrengths},runtime:cymaticsState,settings:getWorkspaceSettings(),history:history.length,armed:armedSimulation,control:activeEvolutionControl(),gen:currentGenerationCount,playing:isLifePlaying,loaded:isMacroLoaded,macro:isMacroPlaying,logs:[...artRecipeLog]}),drawer:()=>evolutionDrawer.open(),tech:()=>modals.openTechnicianMenu(),recipe:async()=>await createArtRecipeFile().text(),live:async()=>{const file=createArtRecipeFile(),snapshot=getCurrentState();pauseLife();return {text:await file.text(),snapshot};},macro:playMacro,sort:applySortMethod
 };initializeApp().then(()=>cymaticsTest.ready=true);`);for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.cymaticsTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>cymaticsTest.setup());
 const state=()=>page.evaluate(()=>cymaticsTest.state()),tap=e=>config.width<600?e.tap():e.click(),trigger=page.locator('#btnEvolutionDrawerInternal'),drawer=page.locator('#evolutionDrawerDialog'),button=page.locator('#btnCymatics'),hub=page.locator('#btnInk'),dialog=page.locator('#cymaticsSettingsDialog'),canvas=page.locator('#boardCanvas');
 const histogram=board=>board.reduce((m,k)=>(m[k]=(m[k]??0)+1,m),{});
 async function assign(id){await page.evaluate(()=>cymaticsTest.drawer());await drawer.waitFor({state:'visible'});await tap(drawer.locator('[data-drawer-slot="0"]'));await tap(drawer.locator('[data-drawer-evolution="'+id+'"]'));await tap(drawer.locator('[type=submit]'));await drawer.waitFor({state:'hidden'});}
 let resonanceDragChecked=false;
 async function reveal(target){for(let i=0;i<3&&!(await target.isVisible());i++)await tap(trigger);await target.waitFor({state:'visible'});}
 async function openSettings(){
 const target=(await state()).control==='ink'?hub:button;
 await reveal(target);
 const r=await target.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();await dialog.waitFor({state:'visible'});
 const layout=await dialog.evaluate(d=>{const maps=d.querySelector('.cymatics-maps').getBoundingClientRect(),phase=d.querySelector('.cymatics-phase').getBoundingClientRect(),save=getComputedStyle(d.querySelector('[type=submit]'));return {focus:document.activeElement.id,below:maps.top>=phase.bottom,overflow:d.scrollWidth>d.clientWidth+1,maps:[...d.querySelectorAll('[data-cymatics-map]:not([hidden])')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {square:Math.abs(r.width-r.height)<1,icon:!!b.querySelector('svg'),label:b.getAttribute('aria-label'),title:b.title,nameAboveIcon:b.querySelector('.resonance-map-name').getBoundingClientRect().bottom<=b.querySelector('svg').getBoundingClientRect().top&&b.querySelector('.resonance-map-name').textContent===b.title,distinct:s.backgroundColor!==save.backgroundColor};})};});
 assert.equal(layout.focus,'cymaticsSettingsTitle');assert(layout.below&&!layout.overflow);assert.equal(layout.maps.length,(await state()).control==='ink'?2:5);assert(layout.maps.every(m=>m.square&&m.icon&&m.label&&m.title&&m.nameAboveIcon&&m.distinct),'map symbols below settings are distinct from save');
 if(!resonanceDragChecked){resonanceDragChecked=true;const input=dialog.locator('#cymaticsFrequency');await input.scrollIntoViewIfNeeded();const r=await input.boundingBox(),value=await input.inputValue(),saved=(await state()).rules,x=r.x+r.width*.85,y=r.y+r.height/2;
  if(config.width<600){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.6,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else {await page.mouse.move(r.x+r.width*.6,y);await page.mouse.down();await page.mouse.move(x,y,{steps:8});await page.mouse.up();}
  assert.notEqual(await input.inputValue(),value,'real dragging updates the frequency draft');assert.deepEqual((await state()).rules,saved);await tap(dialog.locator('[data-cancel]'));return openSettings();
 }
 await page.screenshot({path:path.join(artifacts,config.lang+'-settings-layout.png'),animations:'disabled'});
 }
 async function save(strength,frequency){await openSettings();await dialog.locator('#cymaticsStrength').fill(String(strength));if(frequency)await dialog.locator('#cymaticsFrequency').fill(String(frequency));await tap(dialog.locator('[type=submit]'));}
 async function saveMap(name,motion){
  const radial=['cosmic','circular'].includes(name);
  if(radial&&((await state()).armed!=='cymatics'||(await state()).control!=='ink')){
   await reveal(hub);
   for(let i=0;i<9&&!((await state()).armed==='cymatics'&&(await state()).control==='ink');i++)await tap(hub);
   assert.equal((await state()).control,'ink');
  }else if(!radial&&(await state()).control!=='cymatics'){await reveal(button);await tap(button);}
  await openSettings();await tap(dialog.locator('[data-cymatics-map="'+name+'"]'));if(motion!==undefined)await dialog.locator('#cymaticsPhaseMotion').setChecked(motion);await tap(dialog.locator('[type=submit]'));}
 async function paint(col,row){const r=await canvas.boundingBox(),position={x:(col+.5)*r.width/41,y:(row+.5)*r.height/41};if(config.width<600)await canvas.tap({position});else await canvas.click({position});}
 await reveal(button);await page.evaluate(()=>cymaticsTest.drawer());await drawer.waitFor({state:'visible'});assert.equal(await drawer.locator('[data-drawer-evolution]').count(),await page.evaluate(async()=>{const {EVOLUTION_CATALOG}=await import('/js/evolution-drawer-settings.js');return EVOLUTION_CATALOG.length;}));assert.equal(await drawer.locator('[data-drawer-evolution=spiral]').count(),1);assert.equal(await drawer.locator('[data-drawer-slot="15"][data-drawer-evolution=cymatics]').count(),1);await tap(drawer.locator('[data-cancel]'));await drawer.waitFor({state:'hidden'});
 await assign('cymatics');await reveal(button);
 await page.evaluate(async()=>{
  const theme=await import('/js/simulation-theme.js'),stroke=id=>getComputedStyle(document.querySelector('#'+id+' > svg')).stroke;
  for(const rest of ['blue','gold','teal']){
   theme.applySimulationTheme(rest);if(stroke('btnCymatics')!==stroke('btnSpiral'))throw Error('Cymatics resting theme mismatch: '+rest);
   theme.setSimulationRunning(true);if(stroke('btnCymatics')!==stroke('btnSpiral'))throw Error('Cymatics gold playback ink mismatch');theme.setSimulationRunning(false);
  }
  theme.applySimulationTheme('blue');
 });
 assert.equal(await button.getAttribute('data-cymatics-map'),'interference');
 const hzIcon=button.locator('[data-cymatics-map-icon=interference]');
 assert(await hzIcon.isVisible());
 assert.equal(await hzIcon.locator('path').getAttribute('d'),'M4 6v12M11 6v12M4 12h7M14 10h6l-6 8h6');
 await tap(button);
 assert.equal((await state()).rules.resonanceVersion,4);
 assert.equal(await button.locator('svg:visible').evaluate(e=>getComputedStyle(e).strokeWidth),'2.5px');
 if(process.env.CYMATICS_THEME_ONLY){console.log(JSON.stringify({config,themePassed:true}));await context.close();continue;}
const initial=await state();assert.equal(await button.getAttribute('aria-pressed'),'true');
 if(process.env.CYMATICS_HEART_ONLY){
  await saveMap('heart');
  await page.evaluate(()=>cymaticsTest.setupCircle());
  await reveal(button);await tap(button);
  const start=await state();
  assert.equal(start.rules.heartFieldVersion,3);
  assert.equal(start.runtime.steps,0);
  await tap(page.locator('#btnPlayPauseLife'));
  await page.waitForFunction(()=>cymaticsTest.state().runtime.steps>=50);
  const forming=await state();
  await canvas.screenshot({path:path.join(artifacts,config.lang+'-heart-forming.png')});
  await page.waitForFunction(()=>cymaticsTest.state().runtime.steps>=200);
  const formed=await state();
  assert.notDeepEqual(formed.board,forming.board);
  assert.deepEqual(histogram(formed.board),histogram(start.board));
  await canvas.screenshot({path:path.join(artifacts,config.lang+'-heart-formed.png')});
  for(const map of [2,1,4,7]){
   await tap(button);assert.equal((await state()).rules.resonanceVersion,map);
  }
  const reentered=await state();
  assert(reentered.playing&&reentered.gen>=formed.gen);
  assert(reentered.runtime.heartStartStep>=formed.runtime.steps);
  assert(reentered.runtime.steps-reentered.runtime.heartStartStep<60);
  await page.waitForFunction(()=>{const r=cymaticsTest.state().runtime;return r.steps-r.heartStartStep>=45;});
  await tap(page.locator('#btnPlayPauseLife'));
  const final=await state(),recipe=await page.evaluate(()=>cymaticsTest.recipe());
  assert(recipe.includes('"heartFieldVersion":3')&&recipe.includes('"heartStartStep":'));
  await page.locator('#projectFileInput').setInputFiles({name:'heart.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});
  await page.waitForFunction(()=>cymaticsTest.state().loaded);
  await page.evaluate(()=>cymaticsTest.macro());
  await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});
  assert.deepEqual((await state()).board,final.board);
  assert.deepEqual((await state()).runtime,final.runtime);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({config,centeredHeart:true,replay:true}));await context.close();continue;
 }
 if(process.env.CYMATICS_MEMBERSHIP_ONLY){
  const mark=name=>dialog.locator('[data-resonance-cycle="'+name+'"]');
  const checks=()=>dialog.locator('[data-resonance-cycle]:visible').evaluateAll(nodes=>nodes.filter(n=>n.checked).map(n=>n.dataset.resonanceCycle).sort());
  const apply=async()=>{await tap(dialog.locator('[type=submit]'));await dialog.waitFor({state:'hidden'});};
  await openSettings();
  assert.deepEqual(await checks(),['diagonal','grid','heart','interference']);
  assert(await mark('interference').isDisabled(),'Interference stays in the cycle');
  assert(await dialog.locator('.resonance-cycle-toggle:visible').evaluateAll(labels=>labels.every(label=>{
   const box=label.getBoundingClientRect(),button=label.previousElementSibling.getBoundingClientRect();
   return box.width>=44&&box.height>=44&&box.top>=button.bottom;
  })));
  await mark('clouds').check();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await tap(page.locator('#btnPlayPauseLife'));await openSettings();
  assert(!(await mark('clouds').isChecked()),'Escape discards the membership draft');
  await mark('clouds').check();
  for(const name of ['heart','grid','diagonal'])await mark(name).uncheck();
  assert(await mark('clouds').isEnabled(),'Interference allows all other maps to be unchecked');
  const before=await state();await apply();const after=await state();
  assert(after.playing&&after.gen>=before.gen);
  assert.deepEqual(after.rules,before.rules);assert.deepEqual(after.logs,before.logs);
  await tap(button);assert.equal((await state()).rules.resonanceVersion,5);
  const cloudRun=await state();await tap(button);
  const stillPlaying=await state();assert(stillPlaying.playing&&stillPlaying.gen>=cloudRun.gen);assert.equal(stillPlaying.rules.resonanceVersion,4);
  await tap(page.locator('#btnPlayPauseLife'));
  await saveMap('grid');assert.equal((await state()).rules.resonanceVersion,2,'excluded maps can still be selected directly');
  await page.evaluate(()=>cymaticsTest.setup());await reveal(button);await tap(button);assert.equal((await state()).rules.resonanceVersion,4);await tap(button);assert.equal((await state()).rules.resonanceVersion,5);
  await tap(page.locator('#btnStepForward'));
  const cloudBoard=(await state()).board;
  const recipe=await page.evaluate(()=>cymaticsTest.recipe());
  await openSettings();await mark('diagonal').check();await mark('clouds').uncheck();await apply();
  await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());cymaticsTest.setup();});
  await reveal(button);await tap(button);assert.equal((await state()).rules.resonanceVersion,4);await tap(button);assert.equal((await state()).rules.resonanceVersion,1);
  await openSettings();assert.deepEqual(await checks(),['diagonal','interference']);await tap(dialog.locator('[data-cancel]'));
  await page.locator('#projectFileInput').setInputFiles({name:'clouds-cycle.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});
  await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());
  await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});
  assert.deepEqual((await state()).board,cloudBoard,'Clouds recipes replay even when excluded from the cycle');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({config,membershipPassed:true}));await context.close();continue;
 }
 if(process.env.CYMATICS_LAYOUT_ONLY){
  await openSettings();const selected=dialog.locator('[data-cymatics-map][aria-pressed="true"]');await selected.hover();await page.waitForTimeout(220);assert.equal(await selected.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(255, 215, 0)','selected map retains gold on hover');await tap(dialog.locator('[data-cancel]'));assert.deepEqual((await state()).rules,initial.rules);assert.deepEqual((await state()).board,initial.board);assert.deepEqual(errors,[]);console.log(JSON.stringify({config,layoutPassed:true}));await context.close();continue;
 }
 if(process.env.CYMATICS_STRENGTH_ONLY){
  const strengths={heart:35,diagonal:20,grid:35,circular:35,interference:65,clouds:80,cosmic:35};
  const editable=['heart','diagonal','grid','clouds','interference'];
  async function editStrengths(){await openSettings();for(const [name,value] of editable.map(name=>[name,strengths[name]])){await tap(dialog.locator('[data-cymatics-map='+name+']'));await dialog.locator('#cymaticsStrength').fill(String(value));}for(const [name,value] of editable.map(name=>[name,strengths[name]])){await tap(dialog.locator('[data-cymatics-map='+name+']'));assert.equal(await dialog.locator('#cymaticsStrength').inputValue(),String(value));assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),initial.frequencies[name]+' Hz');}await tap(dialog.locator('[data-cymatics-map=interference]'));}
  assert(Object.values(initial.strengths).every(v=>v===35));
  await editStrengths();assert.deepEqual((await state()).strengths,initial.strengths);await page.keyboard.press('Escape');assert.deepEqual((await state()).strengths,initial.strengths);assert.deepEqual((await state()).rules,initial.rules);
  await editStrengths();await tap(dialog.locator('[type=submit]'));assert.deepEqual((await state()).strengths,strengths);assert.equal((await state()).rules.strength,65);assert.deepEqual((await state()).board,initial.board);assert.equal((await state()).history,initial.history);
  await openSettings();await tap(dialog.locator('[data-reset]'));for(const name of editable){await tap(dialog.locator('[data-cymatics-map='+name+']'));assert.equal(await dialog.locator('#cymaticsStrength').inputValue(),'35');}await tap(dialog.locator('[data-cancel]'));assert.deepEqual((await state()).strengths,strengths);
  for(const [name,active] of [['diagonal',true],['grid',false],['grid',true],['interference',true]]){await tap(button);const current=await state();assert.equal(current.rules.strength,strengths[name]);assert.equal(current.armed==='cymatics',active);assert.deepEqual(current.frequencies,initial.frequencies);}
  await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=8);
  for(const name of ['diagonal','heart','grid','interference']){const before=await state();await tap(button);const current=await state();assert.equal(current.rules.strength,strengths[name]);assert(current.playing);assert(current.gen>=before.gen);assert(current.runtime.steps>=before.runtime.steps);}
  await save(55);strengths.interference=55;assert((await state()).playing);await paint(12,12);await tap(page.locator('#btnPlayPauseLife'));const final=await state();assert.deepEqual(final.strengths,strengths);
  let count=0;for(let i=0;i<3&&(await state()).history>0;i++){await tap(page.locator('#btnUndo'));count++;assert.deepEqual((await state()).strengths,strengths);assert.equal((await state()).rules.strength,55);}for(let i=0;i<count;i++)await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,final.board);assert.deepEqual((await state()).runtime,final.runtime);
  const recipe=await page.evaluate(()=>cymaticsTest.recipe());assert(!recipe.includes('cymaticsStrengths'));await writeFile(path.join(artifacts,config.lang+'-strength-recipe.txt'),recipe);await writeFile(path.join(artifacts,config.lang+'-strength-state.json'),JSON.stringify({board:final.board,runtime:final.runtime}));
  await saveMap('clouds');await save(85);strengths.clouds=85;
  await page.locator('#projectFileInput').setInputFiles({name:'strength.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(final.snapshot))});await page.waitForFunction(()=>cymaticsTest.state().rules.resonanceVersion===4);assert.deepEqual((await state()).strengths,strengths);const preferences=(await state()).settings;
  await page.locator('#projectFileInput').setInputFiles({name:'strength.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,final.board);assert.deepEqual((await state()).runtime,final.runtime);assert.deepEqual((await state()).strengths,strengths);assert.deepEqual((await state()).settings,preferences);
  await openSettings();await page.screenshot({path:path.join(artifacts,config.lang+'-strengths.png'),animations:'disabled'});await tap(dialog.locator('[data-cancel]'));
  await page.evaluate(()=>cymaticsTest.tech());await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);assert.deepEqual((await state()).strengths,strengths);
  await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));if(!(await button.isVisible()))await tap(page.locator('#btnToggleSimMode'));await button.waitFor({state:'visible'});await tap(button);await openSettings();await tap(dialog.locator('[data-reset]'));await tap(dialog.locator('[type=submit]'));assert(Object.values((await state()).strengths).every(v=>v===35));assert.equal((await state()).rules.strength,35);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({config,strengthsPassed:true}));await context.close();continue;
 }
 if(process.env.CYMATICS_CIRCLE_ONLY){
  await page.evaluate(()=>cymaticsTest.setupCircle());await tap(button);await saveMap('cosmic',false);await save(100);const before=await state();assert.equal(before.rules.cosmicFieldVersion,3);
  await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=500,null,{timeout:30000});await tap(page.locator('#btnPlayPauseLife'));const final=await state();
  assert.deepEqual(histogram(final.board),histogram(before.board));assert.equal(final.board[0],before.board[0]);
  let changed=0,count=0;for(let i=1;i<final.board.length;i++){if(Math.hypot((i%81-40)/40.5,(Math.floor(i/81)-40)/40.5)>1.1){count++;if(final.board[i]!==before.board[i])changed++;}}
  assert(changed>count*.5,'outer corners participate in the radial sorting');
  await page.screenshot({path:path.join(artifacts,config.lang+'-full-circle.png')});
  await tap(page.locator('#btnUndo'));await tap(page.locator('#btnRedo'));assert((await state()).board.every((v,i)=>v===final.board[i]),'circle checkpoint board matches');
  const recipe=await page.evaluate(()=>cymaticsTest.recipe());assert(recipe.includes('"cosmicFieldVersion":3'));
  await writeFile(path.join(artifacts,config.lang+'-circle-recipe.txt'),recipe);await writeFile(path.join(artifacts,config.lang+'-circle-final.json'),JSON.stringify(final));
  await tap(page.locator('#btnStepForward'));await page.locator('#projectFileInput').setInputFiles({name:'circle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(final.snapshot))});await page.waitForFunction(steps=>cymaticsTest.state().runtime?.steps===steps,final.runtime.steps);assert((await state()).board.every((v,i)=>v===final.board[i]),'circle checkpoint board matches');
  await page.locator('#projectFileInput').setInputFiles({name:'circle.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});
  const replayed=await state();await writeFile(path.join(artifacts,config.lang+'-circle-replayed.json'),JSON.stringify(replayed));
  assert((await state()).board.every((v,i)=>v===final.board[i]),'circle checkpoint board matches');assert.deepEqual((await state()).runtime,final.runtime);assert.deepEqual(errors,[]);console.log(JSON.stringify({config,circlePassed:true,exteriorChanged:changed,count}));await context.close();continue;
 }
 if(process.env.CYMATICS_ORGANIC_ONLY){
  for(const [name,version] of [['clouds',5],['cosmic',6]]){
   await saveMap(name,true);await save(100);await openSettings();
   assert.equal(await dialog.locator('[data-cymatics-map]:visible').count(),(await state()).control==='ink'?2:5);
   assert.equal(await dialog.locator('[data-cymatics-map='+name+']').getAttribute('aria-pressed'),'true');
   assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await tap(dialog.locator('[data-cancel]'));
   if(name==='cosmic')assert.equal(await hub.getAttribute('data-mode'),name);else assert.equal(await button.locator('[data-cymatics-map-icon]:visible').getAttribute('data-cymatics-map-icon'),name);
   const before=await state();if(name==='cosmic')assert.equal(before.rules.cosmicFieldVersion,3,'Cosmological empathy selects the single radial field');await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=240);
   const generation=(await state()).gen;await openSettings();await dialog.locator('#cymaticsFrequency').fill(name==='clouds'?'700':'800');await tap(dialog.locator('[type=submit]'));
   await page.waitForFunction(g=>cymaticsTest.state().gen>=g+50,generation);await tap(page.locator('#btnPlayPauseLife'));
   const stopped=await state();assert.equal(stopped.rules.resonanceVersion,version);assert.notDeepEqual(stopped.board,before.board);
   assert.deepEqual(histogram(stopped.board),histogram(before.board));assert.equal(stopped.board[840],before.board[840]);
   await tap(page.locator('#btnUndo'));assert.deepEqual((await state()).rules,stopped.rules);await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,stopped.board);assert.deepEqual((await state()).runtime,stopped.runtime);
   await page.screenshot({path:path.join(artifacts,config.lang+'-'+name+'.png')});
  }
  const final=await state(),recipe=await page.evaluate(()=>cymaticsTest.recipe());
  await writeFile(path.join(artifacts,config.lang+'-organic-recipe.txt'),recipe);await writeFile(path.join(artifacts,config.lang+'-organic-state.json'),JSON.stringify({board:final.board,runtime:final.runtime}));
  await tap(page.locator('#btnStepForward'));await page.locator('#projectFileInput').setInputFiles({name:'organic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(final.snapshot))});await page.waitForFunction(steps=>cymaticsTest.state().runtime?.steps===steps,final.runtime.steps);assert.deepEqual((await state()).board,final.board);
  const prefs=(await state()).settings;await page.locator('#projectFileInput').setInputFiles({name:'organic.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});
  assert.deepEqual((await state()).board,final.board);assert.deepEqual((await state()).runtime,final.runtime);assert.deepEqual((await state()).settings,prefs);
  await page.evaluate(()=>cymaticsTest.tech());await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);assert.deepEqual((await state()).settings.rules.cymatics,final.settings.rules.cymatics);assert.deepEqual((await state()).frequencies,final.frequencies);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({config,organicPassed:true}));await context.close();continue;
 }
 if(process.env.CYMATICS_FREQUENCY_ONLY){
  const initialPreferences=(await state()).frequencies;
  await openSettings();await tap(dialog.locator('[data-cymatics-map=grid]'));await dialog.locator('#cymaticsFrequency').fill('800');await page.keyboard.press('Escape');assert.deepEqual((await state()).frequencies,initialPreferences);assert.deepEqual((await state()).rules,initial.rules);
  const ticks={heart:260,interference:600,grid:850,diagonal:950,clouds:650},frequencies={...initialPreferences,...Object.fromEntries(Object.entries(ticks).map(([name,tick])=>[name,Math.round(20*Math.pow(1000,tick/1000))]))};
  await openSettings();await dialog.locator('#cymaticsStrength').fill('75');await dialog.locator('#cymaticsPhaseMotion').uncheck();
  for(const [name,tick] of Object.entries(ticks)){await tap(dialog.locator('[data-cymatics-map="'+name+'"]'));await dialog.locator('#cymaticsFrequency').fill(String(tick));await dialog.locator('#cymaticsStrength').fill('75');}
  for(const [name,value] of Object.keys(ticks).map(name=>[name,frequencies[name]])){await tap(dialog.locator('[data-cymatics-map="'+name+'"]'));assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),value+' Hz');assert.equal(await dialog.locator('#cymaticsStrength').inputValue(),'75');assert(!(await dialog.locator('#cymaticsPhaseMotion').isChecked()));}
  assert.deepEqual((await state()).frequencies,initialPreferences,'draft edits do not leak before Save');
  assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),frequencies.clouds+' Hz');
  await tap(dialog.locator('[data-cymatics-map=interference]'));await tap(dialog.locator('[type=submit]'));assert.deepEqual((await state()).frequencies,frequencies);assert.equal((await state()).history,initial.history);assert.deepEqual((await state()).board,initial.board);
  await openSettings();await tap(dialog.locator('[data-reset]'));assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),'123 Hz');await tap(dialog.locator('[data-cancel]'));assert.deepEqual((await state()).frequencies,frequencies,'cancelled Reset does not erase other maps');
  await saveMap('diagonal');await tap(button);assert.equal((await state()).armed,null);assert.equal((await state()).rules.frequency,frequencies.heart);await tap(button);assert.equal((await state()).rules.frequency,frequencies.heart);
  await saveMap('grid');assert.equal((await state()).rules.frequency,frequencies.grid);await tap(button);assert.equal((await state()).rules.frequency,frequencies.interference);await saveMap('clouds');assert.equal((await state()).rules.frequency,frequencies.clouds);await tap(button);assert.equal((await state()).rules.frequency,frequencies.heart);await saveMap('interference');
  await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=8);
  for(const name of ['diagonal','heart','grid','interference']){const before=await state();await tap(button);const current=await state();assert.equal(current.rules.frequency,frequencies[name]);assert(current.playing);assert(current.runtime.steps>=before.runtime.steps);assert.equal(current.rules.strength,75);assert.equal(current.rules.phaseMotion,false);}
  await openSettings();await dialog.locator('#cymaticsFrequency').fill('800');await tap(dialog.locator('[type=submit]'));frequencies.interference=Math.round(20*Math.pow(1000,.8));assert.deepEqual((await state()).frequencies,frequencies);assert((await state()).playing);await paint(12,12);await tap(page.locator('#btnPlayPauseLife'));const final=await state();
  let undos=0;for(let i=0;i<3&&(await state()).history>0;i++){await tap(page.locator('#btnUndo'));undos++;assert.deepEqual((await state()).frequencies,frequencies);}for(let i=0;i<undos;i++)await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,final.board);assert.deepEqual((await state()).runtime,final.runtime);
  const recipe=await page.evaluate(()=>cymaticsTest.recipe());assert(!recipe.includes('cymaticsFrequencies'));await writeFile(path.join(artifacts,config.lang+'-frequency-recipe.txt'),recipe);await writeFile(path.join(artifacts,config.lang+'-frequency-state.json'),JSON.stringify({board:final.board,runtime:final.runtime}));
  await saveMap('clouds');await openSettings();await dialog.locator('#cymaticsFrequency').fill('900');await tap(dialog.locator('[type=submit]'));frequencies.clouds=Math.round(20*Math.pow(1000,.9));
  await page.locator('#projectFileInput').setInputFiles({name:'active-map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(final.snapshot))});await page.waitForFunction(()=>cymaticsTest.state().rules.resonanceVersion===4);assert.deepEqual((await state()).frequencies,frequencies,'project restores active frequency without deleting other map preferences');const preferences=(await state()).settings;
  await page.locator('#projectFileInput').setInputFiles({name:'frequencies.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,final.board);assert.deepEqual((await state()).runtime,final.runtime);assert.deepEqual((await state()).settings,preferences);assert.deepEqual((await state()).frequencies,frequencies,'macro does not overwrite personal map frequencies');
  await openSettings();await page.screenshot({path:path.join(artifacts,config.lang+'-frequencies.png'),animations:'disabled'});await tap(dialog.locator('[data-cancel]'));
  await page.evaluate(()=>cymaticsTest.tech());await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);assert.deepEqual((await state()).frequencies,frequencies);assert.deepEqual(errors,[]);console.log(JSON.stringify({config,frequenciesPassed:true}));await context.close();continue;
 }
 if(process.env.CYMATICS_CYCLE_ONLY){
  const order=[[7,true],[2,true],[1,true],[4,false],[4,true]],initialBoard=(await state()).board;
  async function checkIcon(){
   const icon=button.locator('svg:visible');
   assert.equal(await icon.count(),1);
   const name=await button.getAttribute('data-cymatics-map');
   assert.equal(await icon.getAttribute('data-cymatics-map-icon'),name);
   const artwork=await icon.innerHTML();
   assert(artwork.includes('<path'));
   assert.equal(artwork,await dialog.locator('[data-cymatics-map="'+name+'"] svg').innerHTML());
   const captured=await button.evaluate(async node=>{
    const {captureMacroActivityIcon}=await import('./js/macro-activity.js');
    return captureMacroActivityIcon(node)?.node?.getAttribute('data-cymatics-map-icon');
   });
   assert.equal(captured,name);
  }
  assert.equal(await button.getAttribute('data-cymatics-map'),'interference');
  await checkIcon();
  for(const name of ['heart','diagonal','grid','clouds','interference']){await saveMap(name);await checkIcon();await page.screenshot({path:path.join(artifacts,config.lang+'-icon-'+name+'.png'),animations:'disabled'});}
  await saveMap('clouds');await tap(button);assert.equal((await state()).rules.resonanceVersion,4,'Clouds exits to Interference when excluded');
  for(const [index,[map,active]] of order.entries()){if(config.lang==='en'&&index<2){await button.focus();await page.keyboard.press(index===0?'Enter':'Space');}else await tap(button);const current=await state();assert.equal(current.rules.resonanceVersion,map);assert.equal(current.armed==='cymatics',active);assert.equal(current.rules.frequency,({1:11831,2:20000,3:20000,4:11000,5:20000,6:800,7:123})[map]);assert.equal(current.rules.phaseMotion,true);assert.deepEqual(current.board,initialBoard);assert.equal(current.history,initial.history);assert.equal(await page.locator('#btnPlayPauseLife').isDisabled(),!active);await checkIcon();}
  await saveMap('diagonal');assert.equal(await button.getAttribute('data-cymatics-map'),'diagonal');await tap(button);assert.equal((await state()).armed,null);assert.equal((await state()).rules.resonanceVersion,4);await tap(button);await saveMap('interference');assert.deepEqual((await state()).board,initialBoard);const beforeRun=await state();await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=8);
  for(const map of [7,2,1,4]){const previous=await state();await tap(button);const current=await state();assert.equal(current.rules.resonanceVersion,map);assert(current.playing);assert.equal(current.armed,'cymatics');assert(current.runtime.steps>=previous.runtime.steps);assert(current.gen>=previous.gen);assert.equal(current.rules.frequency,({1:11831,2:20000,3:20000,4:11000,5:20000,6:800,7:123})[map]);assert.equal(current.rules.strength,beforeRun.rules.strength);assert.equal(current.rules.phaseMotion,beforeRun.rules.phaseMotion);await checkIcon();}
  await tap(page.locator('#btnPlayPauseLife'));const stopped=await state();await tap(page.locator('#btnUndo'));assert.deepEqual((await state()).rules,stopped.rules);assert.deepEqual((await state()).board,beforeRun.board);await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,stopped.board);assert.deepEqual((await state()).runtime,stopped.runtime);
  for(let i=0;i<4;i++)await tap(button);const final=await state();assert.equal(final.armed,null);assert.equal(final.rules.resonanceVersion,4);assert(final.logs.some(line=>line.includes('Cymatics Mode Changed')));
  const recipe=await page.evaluate(()=>cymaticsTest.recipe());await writeFile(path.join(artifacts,config.lang+'-cycle-recipe.txt'),recipe);await writeFile(path.join(artifacts,config.lang+'-cycle-state.json'),JSON.stringify({board:final.board,runtime:final.runtime}));
  await tap(button);await saveMap('diagonal');const preferences=(await state()).settings;
  await page.locator('#projectFileInput').setInputFiles({name:'cycle.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000});
  const replayed=await state();assert.deepEqual(replayed.board,final.board);assert.deepEqual(replayed.runtime,final.runtime);assert.equal(replayed.armed,null);assert.deepEqual(replayed.settings,preferences);assert.equal(await button.getAttribute('data-cymatics-map'),'interference');await checkIcon();
  await page.evaluate(()=>cymaticsTest.tech());await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);assert.equal((await state()).rules.resonanceVersion,1);assert.equal(await button.getAttribute('data-cymatics-map'),'interference');await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));if(!(await button.isVisible()))await tap(page.locator('#btnToggleSimMode'));await button.waitFor({state:'visible'});await tap(button);assert.equal((await state()).rules.resonanceVersion,4);assert.deepEqual(errors,[]);console.log(JSON.stringify({config,cyclePassed:true}));await context.close();continue;
 }

 await openSettings();assert.equal(await dialog.getAttribute('dir'),config.lang==='he'?'rtl':'ltr');assert.equal(await dialog.locator('[data-cymatics-pattern], [data-source], [aria-describedby]').count(),0);assert.equal(await dialog.locator('p').count(),1);assert.equal(await dialog.locator('#cymaticsStrength').inputValue(),'35');assert.equal(await dialog.locator('[data-cymatics-map=interference]').getAttribute('aria-pressed'),'true');assert(await dialog.locator('#cymaticsPhaseMotion').isChecked());assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),'11000 Hz');await dialog.locator('#cymaticsStrength').fill('85');await tap(dialog.locator('[data-reset]'));assert.equal(await dialog.locator('#cymaticsStrength').inputValue(),'35');assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),'11000 Hz');assert.equal(await dialog.locator('[data-cymatics-map=interference]').getAttribute('aria-pressed'),'true');assert(await dialog.locator('#cymaticsPhaseMotion').isChecked());if(process.env.CYMATICS_DEFAULT_ONLY){for(const [name,frequency] of [['heart',123],['grid',20000],['clouds',20000]]){await tap(dialog.locator('[data-cymatics-map='+name+']'));assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),frequency+' Hz');}await tap(dialog.locator('[data-cymatics-map=diagonal]'));assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),'11831 Hz');await tap(dialog.locator('[data-cymatics-map=interference]'));assert.equal(await dialog.locator('output[for=cymaticsFrequency]').textContent(),'11000 Hz');await tap(dialog.locator('[type=submit]'));await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);assert.deepEqual((await state()).rules,initial.rules);assert.deepEqual((await state()).frequencies,{heart:123,diagonal:11831,grid:20000,circular:20000,interference:11000,clouds:20000,cosmic:800});assert.deepEqual(errors,[]);console.log(JSON.stringify({config,defaultsPassed:true}));await context.close();continue;}await page.keyboard.press('Escape');assert.deepEqual((await state()).rules,initial.rules);assert.deepEqual((await state()).board,initial.board);
 await openSettings();await tap(dialog.locator('[data-cymatics-map=interference]'));assert(await dialog.locator('#cymaticsPhaseMotion').isChecked());await dialog.locator('#cymaticsPhaseMotion').uncheck();await dialog.locator('#cymaticsFrequency').fill('800');await page.keyboard.press('Escape');assert.deepEqual((await state()).rules,initial.rules);
 await save(80);assert.deepEqual((await state()).rules,{...initial.rules,strength:80});assert.equal((await state()).history,initial.history);assert.deepEqual((await state()).board,initial.board);
 await openSettings();assert(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}));await page.screenshot({path:path.join(artifacts,config.lang+'-settings.png')});await tap(dialog.locator('[data-cancel]'));
 await paint(8,8);await save(100);await tap(page.locator('#btnUndo'));assert.deepEqual((await state()).rules,{...initial.rules,strength:100});await tap(page.locator('#btnRedo'));
 const beforeStep=await state();await tap(page.locator('#btnStepForward'));const stepped=await state();assert.equal(stepped.runtime.steps,1);assert.deepEqual(histogram(stepped.board),histogram(beforeStep.board));assert.equal(stepped.board[840],beforeStep.board[840]);await tap(page.locator('#btnUndo'));assert.deepEqual((await state()).board,beforeStep.board);await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).runtime,stepped.runtime);
 await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=12);await save(75,600);assert.equal((await state()).rules.mode,'resonance');assert.equal((await state()).rules.resonanceVersion,4);const frequencyBefore=(await state()).frequencies;for(const [name,version] of [['diagonal',1],['grid',2],['clouds',5],['interference',4]]){await saveMap(name,true);assert.equal((await state()).rules.resonanceVersion,version);assert.equal((await state()).rules.phaseMotion,true);assert.equal((await state()).rules.frequency,frequencyBefore[name]);assert((await state()).playing);if(name==='grid'){await saveMap(name,false);assert.equal((await state()).rules.phaseMotion,false);await saveMap(name,true);}}assert((await state()).rules.frequency>=20);assert((await state()).playing);await paint(12,12);await page.waitForFunction(()=>cymaticsTest.state().gen>=45);await tap(page.locator('#btnPlayPauseLife'));const result=await state();assert.equal(result.rules.phaseMotion,true);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.deepEqual((await state()).runtime,result.runtime);assert.deepEqual((await state()).board,result.board);assert.notDeepEqual(result.board,initial.board);assert(result.logs.some(l=>l.includes('SIMULATION_RULES')));assert(result.logs.some(l=>l.includes('DRAW_STROKE')));
 await tap(page.locator('#btnUndo'));assert.deepEqual((await state()).rules,result.rules);await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,result.board);assert.deepEqual((await state()).runtime,result.runtime);
 const recipe=await page.evaluate(()=>cymaticsTest.recipe());await writeFile(path.join(artifacts,config.lang+'-recipe.txt'),recipe);await page.screenshot({path:path.join(artifacts,config.lang+'-board.png')});
 await tap(page.locator('#btnStepForward'));await page.locator('#projectFileInput').setInputFiles({name:'cymatics.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(result.snapshot))});await page.waitForFunction(steps=>cymaticsTest.state().runtime?.steps===steps,result.runtime.steps);assert.deepEqual((await state()).board,result.board);assert.deepEqual((await state()).runtime,result.runtime);
 await save(10);const prefs=(await state()).settings;await page.locator('#projectFileInput').setInputFiles({name:'cymatics.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000}).catch(async error=>{console.error(JSON.stringify({replayTimeout:await page.evaluate(()=>cymaticsTest.debug()),errors}));throw error;});assert.deepEqual((await state()).board,result.board,'macro replays generations, settings changes, drawing and history exactly');assert.deepEqual((await state()).runtime,result.runtime);assert.deepEqual((await state()).settings,prefs,'macro rules do not overwrite saved Cymatics preferences');
 // Live TXT export includes its exact generation without pausing the source until captured.
 await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=8);const live=await page.evaluate(()=>cymaticsTest.live());await writeFile(path.join(artifacts,config.lang+'-live-recipe.txt'),live.text);assert(/\[GEN:\d+\] PAUSE/.test(live.text));await page.locator('#projectFileInput').setInputFiles({name:'live-cymatics.txt',mimeType:'text/plain',buffer:Buffer.from(live.text)});await page.waitForFunction(()=>cymaticsTest.state().loaded);await page.evaluate(()=>cymaticsTest.macro());await page.waitForFunction(()=>!cymaticsTest.state().loaded&&!cymaticsTest.state().macro,null,{timeout:30000}).catch(async error=>{console.error(JSON.stringify({replayTimeout:await page.evaluate(()=>cymaticsTest.debug()),errors}));throw error;});assert.deepEqual((await state()).board,live.snapshot.tiles.map(t=>t.k));
 // A Cymatics on the other page keeps running; navigation and its marker remain available.
 await assign('dla');assert(!(await button.isVisible()));await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cymaticsTest.state().gen>=5);assert.equal(await trigger.getAttribute('data-parked-active'),'true');assert(await trigger.isEnabled());await tap(page.locator('#btnPlayPauseLife'));await assign('cymatics');
 await save(75,750);await saveMap('circular',true);await openSettings();assert.equal(await dialog.locator('[data-cymatics-map]:visible').count(),(await state()).control==='ink'?2:5);assert.equal(await dialog.locator('[data-cymatics-map=circular]').getAttribute('aria-pressed'),'true');assert(await dialog.locator('#cymaticsPhaseMotion').isChecked());assert(await dialog.locator('#cymaticsFrequency').isVisible());assert.equal(await dialog.locator('[data-cymatics-pattern], [data-source]').count(),0);assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(artifacts,config.lang+'-resonance.png'),animations:'disabled'});await tap(dialog.locator('[data-cancel]'));
 // Save the current profile explicitly, then reload the optional rules and layout.
 await page.evaluate(()=>cymaticsTest.tech());await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();const persisted=(await state()).settings;await page.reload();await page.waitForFunction(()=>window.cymaticsTest?.ready);assert.deepEqual((await state()).settings.rules.cymatics,persisted.rules.cymatics);assert.deepEqual((await state()).settings.evolutionSlots,persisted.evolutionSlots);assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
