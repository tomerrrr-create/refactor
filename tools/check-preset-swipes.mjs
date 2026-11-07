// Compare horizontal selection with real modal preset+Save, then replay its journey.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/preset-swipes-check';await mkdir(artifacts,{recursive:true});
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.presetTest={
 setup:(sim,index=0)=>{pauseLife();resetArmedState();evolutionSlots=[...DEFAULT_EVOLUTION_LAYOUT];evolutionDrawer.applyLayout();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');updatePaletteHeader();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=1+(i*7)%19;t.isGold=i===0});selectedColorIndex=20;selectedColor=palette()[20];isRainbowModeActive=false;isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();armSimulation(sim);gameOfLifeRules.genetics='palette-order';setGameOfLifeCycle([C.GAME_OF_LIFE_PRESETS.btnGolPresetPaint,C.GAME_OF_LIFE_PRESETS.btnGolPresetShuffle,C.GAME_OF_LIFE_PRESETS.btnGolPresetCoral],sim==='gameOfLife'?index:0,['btnGolPresetPaint','btnGolPresetShuffle','btnGolPresetCoral'],{survival:[2],birth:[3]});setChiFlowCycle([C.CHI_FLOW_PRESETS.Harmony,C.CHI_FLOW_PRESETS.Nova,C.CHI_FLOW_PRESETS.Alexis],sim==='sandpile'?index:0,['Harmony','Nova','Alexis'],{awakening:[1],flow:[2],reach:0});history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({settings:getWorkspaceSettings(),gol:{slots:gameOfLifeCycle.map(cloneGameOfLifeRules),sources:[...gameOfLifeSources],yoursRules:cloneGameOfLifeRules(personalGameOfLifeRules),index:['personal','shuffle','coral'].indexOf(gameOfLifeMode)},chi:{slots:chiFlowCycle.map(cloneChiFlowRules),sources:[...chiFlowSources],yoursRules:cloneChiFlowRules(personalChiFlowRules),index:['personal','ripples','nova'].indexOf(chiFlowMode)},genetics:gameOfLifeRules.genetics||'rgb',board:boardState.map(t=>t.k),logs:[...artRecipeLog],history:history.length,future:future.length,gen:currentGenerationCount,playing:isLifePlaying,armed:armedSimulation,loaded:isMacroLoaded,macro:isMacroPlaying}),
 tech:()=>modals.openTechnicianMenu(),macro:playMacro,recipe:async()=>await createArtRecipeFile().text(),browse:(s,d)=>modals.browseEvolutionPreset(s,d),moveToSecond:sim=>{const id=sim==='gameOfLife'?'gameOfLife':'sandpile';evolutionSlots=validateEvolutionSlots(evolutionSlots);const at=evolutionSlots.indexOf(id);[evolutionSlots[at],evolutionSlots[19]]=[evolutionSlots[19],evolutionSlots[at]];evolutionDrawer.applyLayout();},pause:pauseLife
 };initializeApp().then(()=>presetTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?source:await readFile(path.join(root,f)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.PRESET_LANG||c.lang===process.env.PRESET_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.width<600,isMobile:config.width<600,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.presetTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>presetTest.state()),tap=b=>config.width<600?b.tap():b.click();
 async function swipe(button,dx,dy=0){
  const r=await button.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(config.width<600){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up();}
  await page.waitForTimeout(350);
 }
 const effective=s=>({settings:s.settings,gol:s.gol,chi:s.chi,genetics:s.genetics,armed:s.armed});
 const sameBoard=(a,b)=>{assert.deepEqual(a.board,b.board);assert.equal(a.history,b.history);assert.equal(a.playing,b.playing);assert.equal(a.gen,b.gen)};
 for(const [sim,key,id,modalId,saveId,cancelId,prefix] of [['gameOfLife','gol','btnGameOfLife','gameOfLifeSettingsModal','btnGolSettingsSave','btnGolSettingsCancel','btnGolPreset'],['sandpile','chi','btnSandpile','chiFlowSettingsModal','btnChiSettingsSave','btnChiSettingsCancel','btnChiPreset']]){
  const button=page.locator('#'+id),modal=page.locator('#'+modalId);
  const order=await modal.locator('button[id^="'+prefix+'"]').evaluateAll(es=>es.map(e=>e.id));
  async function open(){await swipe(button,0,-35);await modal.waitFor({state:'visible'});}
  async function close(id){await tap(page.locator('#'+id));await modal.waitFor({state:'hidden'});}
  const keyFor=id=>sim==='gameOfLife'?id:id.replace('btnChiPreset','');
  async function setup(index=0){await page.evaluate(({sim,index})=>presetTest.setup(sim,index),{sim,index});if(await page.locator('#controlsContainer').getAttribute('data-evolution-page')==='1')await tap(page.locator('#btnEvolutionDrawer'));}
  for(const index of [0,1,2])for(const direction of [1,-1]){
   await setup(index);const before=await state(),current=before[key].sources[index],at=order.findIndex(id=>keyFor(id)===current),target=order[(at+direction+order.length)%order.length];
   await swipe(button,direction*35);const swiped=await state();sameBoard(before,swiped);assert.equal(swiped[key].index,index);assert.equal(swiped[key].sources[index],keyFor(target));assert.deepEqual(swiped[key].yoursRules,before[key].yoursRules);
   assert.equal(swiped.genetics,'palette-order');for(const other of [0,1,2].filter(i=>i!==index))assert.deepEqual(swiped[key].slots[other],before[key].slots[other]);
   assert.equal(await page.locator('.preset-swipe-feedback').textContent(),await page.locator('#'+target).textContent());
   const feedback = await page.evaluate(id=>{
    const button=document.getElementById(id),label=document.querySelector('.preset-swipe-feedback'),b=button.getBoundingClientRect(),r=label.getBoundingClientRect();
    return {desktop:matchMedia('(hover: hover) and (pointer: fine)').matches,centered:label.classList.contains('preset-swipe-feedback-desktop'),center:r.x+r.width/2,target:Math.max(12+r.width/2,Math.min(b.x+b.width/2,innerWidth-r.width/2-12)),bottom:r.bottom,top:b.top,title:button.hasAttribute('title'),accessible:button.getAttribute('aria-label')};
   },id);
   assert.equal(feedback.centered,feedback.desktop);
   assert(feedback.accessible);
   if(feedback.desktop){assert(Math.abs(feedback.center-feedback.target)<1,'desktop feedback stays centered');assert(Math.abs(feedback.bottom-(feedback.top-7))<1,'desktop feedback stays above the button');assert.equal(feedback.title,false);}
   else assert.equal(feedback.title,true,'touch tooltip behavior unchanged');
   if(index===0&&direction===1&&feedback.desktop){
    await button.hover();await page.waitForTimeout(1250);
    assert.equal(await button.getAttribute('title'),null,'native tooltip stays suppressed under resting pointer');
    await page.mouse.move(0,0);
    assert.equal(await button.getAttribute('title'),await button.getAttribute('aria-label'),'latest accessible label restores on pointer leave');
    await swipe(button,-35);await swipe(button,35);
   }
   if(index===0&&direction===1)await page.screenshot({path:path.join(artifacts,config.lang+'-'+sim+'-feedback.png'),animations:'disabled'});
   const swipeLog=swiped.logs.at(-1).split(' -> ')[1];
   await open();assert.equal(await modal.locator('[data-cycle-slot="'+index+'"]').getAttribute('aria-pressed'),'true');assert((await page.locator('#'+target).getAttribute('class')).includes('active'));
   await close(saveId);assert.deepEqual(effective(await state()),effective(swiped),'Save without edits preserves swipe');
   await open();await tap(page.locator('#'+order[(order.indexOf(target)+1)%order.length]));await close(cancelId);assert.deepEqual(effective(await state()),effective(swiped),'Cancel preserves committed swipe');
   // Compare with the actual settings path from exactly the same baseline.
   await setup(index);await open();await tap(page.locator('#'+target));await close(saveId);const saved=await state();
   assert.deepEqual(effective(saved),effective(swiped),'swipe equals preset+Save');assert.equal(saved.logs.at(-1).split(' -> ')[1],swipeLog,'same recording payload');
   for(let i=0;i<4;i++)await tap(button);assert.equal((await state())[key].index,index);assert.deepEqual((await state())[key].slots,swiped[key].slots,'tap cycle retains replacement');
   await tap(page.locator('#btnGravitationalSort'));await tap(button);assert.equal((await state())[key].index,0);assert.deepEqual((await state())[key].slots,swiped[key].slots,'handoff retains all assigned presets');
  }
  // Wrap around and use a reversed DOM order as the single list for both paths.
  await setup();await open();await tap(page.locator('#'+order.at(-1)));await close(saveId);await swipe(button,35);assert.equal((await state())[key].sources[0],keyFor(order[0]));
  await swipe(button,-35);assert.equal((await state())[key].sources[0],keyFor(order.at(-1)));
  await page.evaluate(({modalId,prefix})=>{const buttons=[...document.querySelectorAll('#'+modalId+' button[id^="'+prefix+'"]')];buttons.reverse().forEach(b=>b.parentElement.append(b));},{modalId,prefix});
  await swipe(button,35);assert.equal((await state())[key].sources[0],keyFor(order.at(-2)),'reordering UI changes swipe order');
  await page.evaluate(({modalId,prefix,order})=>{const parent=document.querySelector('#'+modalId+' button[id^="'+prefix+'"]').parentElement;order.forEach(id=>parent.append(document.getElementById(id)));},{modalId,prefix,order});
  // Not selected: no arming, no rule/board/log changes.
  await setup();await tap(page.locator('#btnGravitationalSort'));const inactive=await state();await swipe(button,35);assert.deepEqual(await state(),inactive);
  // Live changes on either drawer continue the same generation cursor and replay.
  await setup(1);await page.evaluate(s=>presetTest.moveToSecond(s),sim);await tap(page.locator('#btnEvolutionDrawer'));await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>presetTest.state().gen>=4);
  const running=await state();await swipe(button,35);assert((await state()).playing);assert((await state()).gen>=running.gen);assert.equal((await state())[key].index,1);
  const liveChoice=await state();await open();await close(saveId);assert.deepEqual(effective(await state()),effective(liveChoice),'live Save without edits retains choice');assert((await state()).gen>=liveChoice.gen);
  await open();await tap(page.locator('#'+order[2]));await close(saveId);assert((await state()).playing);assert.equal((await state())[key].index,1);
  await swipe(button,-35);await tap(page.locator('#btnPlayPauseLife'));const stopped=await state();const recipe=await page.evaluate(()=>presetTest.recipe());assert(recipe.includes('[GEN:'));assert(!recipe.includes('presetBrowse'));
  await tap(page.locator('#btnUndo'));await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).board,stopped.board);
  await page.locator('#projectFileInput').setInputFiles({name:'preset-swipes.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>presetTest.state().loaded);
  const loaded=await state();assert.equal(await page.evaluate(s=>presetTest.browse(s,1),sim),false);assert.deepEqual(await state(),loaded,'loaded macro blocks preset edits');
  await page.evaluate(()=>presetTest.macro());await page.waitForFunction(()=>!presetTest.state().loaded&&!presetTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,stopped.board,'live preset journey replays exactly');
  // Session-only versus explicit profile Save; layout-independent preference storage.
  await setup(2);await swipe(button,35);const preference=(await state())[key];
  await page.reload();await page.waitForFunction(()=>window.presetTest?.ready);assert.notDeepEqual((await state())[key].slots,preference.slots,'unsaved simulation edits do not replace the profile baseline');
  await setup(2);await swipe(button,35);const retained=(await state())[key];await page.evaluate(()=>presetTest.tech());await tap(page.locator('[data-profile-dot="0"]'));await tap(page.locator('#btnProfileSave'));
  await page.reload();await page.waitForFunction(()=>window.presetTest?.ready);assert.deepEqual((await state())[key].slots,retained.slots,'Save to profile persists assignment');assert.deepEqual((await state())[key].sources,retained.sources);
  await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  await page.screenshot({path:path.join(artifacts,config.lang+'-'+sim+'.png'),animations:'disabled'});
  console.log(JSON.stringify({config,sim,passed:true}));
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
