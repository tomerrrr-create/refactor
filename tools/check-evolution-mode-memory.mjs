// Real toolbar selections: memory, inactive symbols, Off, live handoffs and TXT replay.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.memoryTest={
 setup(){pauseLife();setWindMode(false);resetArmedState();cycleMemory.clear();cycleMemoryAfterReplay=false;n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%Math.min(8,paletteLen());t.isGold=i===40;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();refreshCycleIcons();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 state:()=>({armed:armedSimulation,mode:currentCycleMode(armedSimulation),playing:isLifePlaying,generation:currentGenerationCount,board:boardState.map(t=>[t.k,t.v,t.isGold]),runtime:cymaticsState,loaded:isMacroLoaded}),
 legacy:()=>({cymaticsVersion:1,rules:{pattern:'petals',strength:60,mode:'resonance',frequency:440},state:createCymaticsState(9)}),remembered:sim=>cycleMemory.recall(sim),tech:()=>modals.openTechnicianMenu(),recipe:async()=>await createArtRecipeFile().text(),reset:()=>settingsProfiles.resetToDefaults(),wind:()=>({active:windMode,mode:windSettings.mode}),pause:pauseLife
 };initializeApp().then(()=>memoryTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?source:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
const cases=[
 ['gravitationalSort','btnGravitationalSort','up','right','.mode-right'],
 ['spiral','btnSpiral','b','left','.mode-left'],['magnet','btnMagnetModes','magnet','cosmic_magnet','.mode-cosmic_magnet'],
 ['brightnessEvo','btnBrightnessEvo','brightness','contrast','.mode-contrast'],['dla','btnDla','genetics','no-genetics','.mode-no-genetics'],
 ['breathe','btnShowBreatheMenu','solo','group','.mode-group'],['erosion','btnErosion','channels','channels-solid','svg#iconErosionSolid'],
 ['islands','btnIslands','classic','proximity','.mode-proximity'],['contour','btnContour','all','dead','[data-cracks-area="dead"]'],
 ['cymatics','btnCymatics',3,4,'[data-cymatics-map="interference"]'],['nudgeBrighter','btnNudgeBrighter','nudgeBrighter','nudgeDarker','[data-nudge-mode="darker"]'],
 ['gameOfLife','btnGameOfLife','personal','shuffle','stars'],['sandpile','btnSandpile','personal','ripples','stars']
];
await mkdir('/tmp/evolution-mode-memory',{recursive:true});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:375,height:667},{lang:'nl',width:1024,height:768}].filter(c=>!process.env.MEMORY_LANG||process.env.MEMORY_LANG===c.lang)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.memoryTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>memoryTest.state()),setup=()=>page.evaluate(()=>memoryTest.setup());
 // Hidden-page controls use their real click handlers; the map's current page is not altered.
 const tap=id=>page.locator('#'+id).evaluate(e=>e.click());
 async function toggle(enabled){await page.evaluate(()=>memoryTest.tech());await page.locator('#rememberEvolutionModesToggle').setChecked(enabled);await page.locator('#btnTechnicianCloseTop').click();}
 assert.equal(await page.locator('#rememberEvolutionModesToggle').isChecked(),false);
 for(const [sim,id,first] of cases){await setup();await tap(id);await tap(id);await tap('btnTuring');await tap(id);const result=await state();assert.equal(result.mode??(sim==='contour'?'all':sim==='islands'?'classic':undefined),first,'off retains default for '+sim);}
 await toggle(true);
 for(const [sim,id,first,second,selector] of cases){
  await setup();await tap(id);await tap(id);assert.equal((await state()).mode,second,sim+' second mode');
  await tap('btnTuring');assert.equal((await state()).armed,'turing');assert(!(await page.locator('#'+id).evaluate(e=>e.classList.contains('simulation-active'))),sim+' is not armed');
  if(selector==='stars')assert.equal(await page.locator('#'+id+' [data-'+(sim==='gameOfLife'?'gol':'chi')+'-star]').evaluateAll(es=>es.filter(e=>getComputedStyle(e).display!=='none').length),1);
  else if(selector.startsWith('svg'))assert.equal(await page.locator('#'+id+' '+selector).evaluate(e=>getComputedStyle(e).display),'block');
  else assert(await page.locator('#'+id).evaluate((e,selector)=>e.matches(selector),selector),'remembered symbol '+sim);
  await tap(id);assert.equal((await state()).mode,second,'recall does not advance '+sim);assert(!(await state()).playing);
  await tap(id);assert.notEqual((await state()).mode,second,'next click advances '+sim);
  let count=0;while((await state()).armed&&count++<12)await tap(id);
  assert.equal((await state()).armed,null,'Off exists '+sim);
  const remembered=await page.evaluate(sim=>memoryTest.remembered(sim),sim);assert.notEqual(remembered,undefined);
  await tap(id);assert.equal((await state()).mode,first,'Off restarts at the first mode '+sim);assert(!(await state()).playing);await tap(id);assert.equal((await state()).mode,second,'cycle continues after restarting '+sim);
 }
 if(process.env.MEMORY_CYCLE_ONLY){await setup();for(let i=0;i<4;i++)await tap('btnWind');assert(!(await page.evaluate(()=>memoryTest.wind())).active);await tap('btnWind');assert.equal((await page.evaluate(()=>memoryTest.wind())).mode,'ripple');await tap('btnWind');assert.equal((await page.evaluate(()=>memoryTest.wind())).mode,'paint');assert.deepEqual(errors,[]);console.log(JSON.stringify({config,cycles:13,handoffRecall:true,offRestartsFirst:true,continuesAfterRestart:true}));await context.close();continue;}
 // The user's Gravity example through actual desktop clicks and touch taps.
 const nativeTap=id=>config.width<600?page.locator('#'+id).tap():page.locator('#'+id).click();
 await setup();await nativeTap('btnGravitationalSort');await nativeTap('btnGravitationalSort');await nativeTap('btnMagnetModes');assert.equal((await state()).armed,'magnet');assert(await page.locator('#btnGravitationalSort').evaluate(e=>e.classList.contains('mode-right')&&!e.classList.contains('simulation-active')));await page.screenshot({path:'/tmp/evolution-mode-memory/'+config.lang+'-inactive-gravity.png'});await nativeTap('btnGravitationalSort');assert.equal((await state()).mode,'right');await nativeTap('btnGravitationalSort');assert.equal((await state()).mode,'center_x');
 // Independent Wind remembers its chosen tool, without arming an engine.
 await setup();await tap('btnWind');await tap('btnWind');const wind=await page.evaluate(()=>memoryTest.wind());assert.equal(wind.mode,'paint');await tap('btnWind');await tap('btnWind');assert(!(await page.evaluate(()=>memoryTest.wind())).active);await tap('btnWind');assert.equal((await page.evaluate(()=>memoryTest.wind())).mode,'ripple');await tap('btnWind');
 // A live handoff keeps the established Play behavior, including Nudge's shared button.
 await setup();await tap('btnNudgeBrighter');await tap('btnNudgeBrighter');await tap('btnGravitationalSort');await tap('btnGravitationalSort');await tap('btnPlayPauseLife');await page.waitForFunction(()=>memoryTest.state().generation>=3);await tap('btnNudgeBrighter');assert.equal((await state()).armed,'nudgeDarker');assert((await state()).playing);await page.evaluate(()=>memoryTest.pause());
 // A newly recorded recall uses existing context commands, and replays independently of the toggle.
 await setup();await tap('btnCymatics');await tap('btnCymatics');await tap('btnTuring');await tap('btnCymatics');await tap('btnPlayPauseLife');await page.waitForFunction(()=>memoryTest.state().generation>=15);await tap('btnPlayPauseLife');const expected=await state(),recipe=await page.evaluate(()=>memoryTest.recipe());assert(recipe.includes('SIMULATION_RULES'));
 await tap('btnCymatics');await tap('btnTuring');const manualMode=await page.evaluate(()=>memoryTest.remembered('cymatics'));assert.equal(manualMode,1);
 async function replay(){await page.locator('#projectFileInput').setInputFiles({name:'remembered-cycle.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>memoryTest.state().loaded);await tap('btnMacroPlay');await page.waitForFunction(()=>!memoryTest.state().loaded);const replayed=await state();assert.deepEqual(replayed.board,expected.board);assert.deepEqual(replayed.runtime,expected.runtime);}
 await replay();assert.equal(await page.evaluate(()=>memoryTest.remembered('cymatics')),manualMode,'macro cannot replace memory');await tap('btnTuring');assert.equal(await page.locator('#btnCymatics').getAttribute('data-cymatics-map'),'diagonal');await tap('btnCymatics');assert.equal((await state()).mode,manualMode);
 await toggle(false);await replay();await toggle(true);
 // Legacy Resonance rules omit the map/phase markers; their Diagonal fallback must win.
 await setup();for(let i=0;i<5;i++)await tap('btnCymatics');assert.equal((await state()).mode,6);await tap('btnTuring');
 const legacyRules=await page.evaluate(()=>memoryTest.legacy());
 const legacy='[00:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":9,"pal":0,"sort":"luminance","sep":0,"board":"81x0"}\n[00:00:00.010] PLAY -> Armed: cymatics | Rules: '+JSON.stringify(legacyRules)+'\n[00:00:01.010] [GEN:60] PAUSE -> ---';
 async function oldReplay(){await page.locator('#projectFileInput').setInputFiles({name:'legacy.txt',mimeType:'text/plain',buffer:Buffer.from(legacy)});await page.waitForFunction(()=>memoryTest.state().loaded);await tap('btnMacroPlay');await page.waitForFunction(()=>memoryTest.state().playing&&memoryTest.state().mode===1);await page.waitForFunction(()=>!memoryTest.state().loaded);return state();}
 const oldOn=await oldReplay();assert.equal(await page.evaluate(()=>memoryTest.remembered('cymatics')),6); // A manual settings choice after replay is eligible for memory again.
 const icon=await page.locator('#btnCymatics').boundingBox();await page.mouse.move(icon.x+icon.width/2,icon.y+icon.height/2);await page.mouse.down();await page.mouse.move(icon.x+icon.width/2,icon.y+icon.height/2-35,{steps:5});await page.mouse.up();
 const dialog=page.locator('#cymaticsSettingsDialog');await dialog.waitFor({state:'visible'});await dialog.locator('[data-cymatics-map=interference]').click();await dialog.locator('[type=submit]').click();await tap('btnTuring');assert.equal(await page.evaluate(()=>memoryTest.remembered('cymatics')),4,'manual settings after replay replace memory');
await toggle(false);const oldOff=await oldReplay();assert.deepEqual(oldOn.board,oldOff.board);assert.deepEqual(oldOn.runtime,oldOff.runtime);await toggle(true);
 await page.evaluate(()=>memoryTest.reset());assert.equal(await page.evaluate(()=>memoryTest.remembered('cymatics')),undefined,'reset clears session modes');
 await page.reload();await page.waitForFunction(()=>window.memoryTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));assert(await page.locator('#rememberEvolutionModesToggle').isChecked());assert.equal(await page.evaluate(()=>memoryTest.remembered('gravitationalSort')),undefined,'refresh starts empty');
 await page.evaluate(()=>memoryTest.tech());await page.screenshot({path:'/tmp/evolution-mode-memory/'+config.lang+'-menu.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({config,defaultOff:true,inactiveIcons:13,recall:true,off:true,wind:true,liveHandoff:true,recordedReplay:true,legacyReplay:true,profileReset:true,reload:true}));await context.close();
}}finally{await browser.close();server.close();}
