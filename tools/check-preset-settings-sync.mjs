// Active preset, settings drafts, explicit shortcut assignment and saved profile regression journeys.
// Native pointer/touch journeys for the two catalogue shortcuts.
import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(path.join(root,'js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.presetTest={
 setup:sim=>{pauseLife();resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%7;t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');armSimulation(sim);history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({board:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),gol:getGameOfLifeRecordingRules(),chi:getChiFlowRecordingRules(),armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,history:history.length,loaded:isMacroLoaded,macro:isMacroPlaying,logs:[...artRecipeLog]}),
 custom:sim=>{if(sim==='gameOfLife')gameOfLifeRules={survival:[1],birth:[1]};else chiFlowRules={awakening:[1],flow:[1],reach:3};},
 raw:()=>({gol:cloneGameOfLifeRules(gameOfLifeRules),chi:cloneChiFlowRules(chiFlowRules)}),tech:()=>modals.openTechnicianMenu(),capture:captureProfileSettings,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro,
 unselect:()=>armSimulation(null)
 };initializeApp().then(()=>presetTest.ready=true);`);for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?source:await readFile(path.join(root,f)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});

try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844}].filter(c=>!process.env.PRESET_LANG||c.lang===process.env.PRESET_LANG))for(const [sim,id,key,modal,save,close] of [['gameOfLife','btnGameOfLife','gol','gameOfLifeSettingsModal','btnGolSettingsSave','btnGolCloseTop'],['sandpile','btnSandpile','chi','chiFlowSettingsModal','btnChiSettingsSave','btnChiSettingsCancel']])for(const scenario of ['save','cancel','live_save','profile','same_preset_save','manual','manual_cancel','assign',...(sim==='gameOfLife'?['genetics']:[])].filter(s=>!process.env.PRESET_SCENARIO||s===process.env.PRESET_SCENARIO)){
 const mobile=config.width<600,context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.presetTest?.ready);await page.evaluate(s=>presetTest.setup(s),sim);
 const button=page.locator('#'+id),state=()=>page.evaluate(()=>presetTest.state()),tap=async t=>{if(mobile)await page.waitForTimeout(400);return mobile?t.tap():t.click();},cdp=await context.newCDPSession(page);
 async function swipe(dx,dy=0){const r=await button.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(50);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await page.waitForTimeout(50);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up();}await page.waitForTimeout(40);}
 const raw=()=>page.evaluate(()=>presetTest.raw());const prefs=()=>page.evaluate(()=>presetTest.capture());
 const original=(await state())[key];await swipe(35);const chosen=(await state())[key],chosenName=await page.locator('#evolutionPresetFeedback').textContent();assert.notDeepEqual(chosen,original);const rawBefore=(await raw())[key],prefsBefore=await prefs();
 if(scenario==='live_save'){await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>presetTest.state().gen>=3);}
 let modalName=null;
 if(scenario==='profile'){await page.evaluate(()=>presetTest.tech());await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await page.locator('[data-profile-choice="1"]').click();await page.locator('[data-profile-choice="0"]').click();await page.locator('#btnTechnicianCloseTop').click();}
 else{await swipe(0,-35);await page.locator('#'+modal).waitFor({state:'visible'});const active=page.locator('#'+modal+' .gol-preset-btn.active');modalName=(await active.textContent()).trim();if(scenario==='same_preset_save')await active.click();if(scenario==='genetics')await page.locator('#btnGolGenetics').click();if(['manual','manual_cancel'].includes(scenario))await page.locator('#'+modal+' .gol-chip-btn').first().click();if(scenario==='assign'){await page.locator('#'+modal+' [data-cycle-slot="1"]').click();await page.locator('#'+modal+' .gol-preset-btn').last().click();}await page.locator('#'+(['cancel','manual_cancel'].includes(scenario)?close:save)).click();await page.locator('#'+modal).waitFor({state:'hidden'});}
 const after=await state(),rawAfter=(await raw())[key],prefsAfter=await prefs();
 if(scenario==='assign'){
  const name=sim==='gameOfLife'?'gameOfLife':'chiFlow';assert.deepEqual(prefsAfter.settings.cycles[name][1],rawAfter,'explicit assignment saves its active rules to that slot');for(const i of [0,2])assert.deepEqual(prefsAfter.settings.cycles[name][i],prefsBefore.settings.cycles[name][i]);assert.notDeepEqual(rawAfter,rawBefore);
 }else{
  assert.deepEqual(prefsAfter.settings.cycles,prefsBefore.settings.cycles,'ordinary Save and preset selection cannot rewrite shortcuts');
  if(scenario==='manual'){assert.notDeepEqual(rawAfter,rawBefore);assert.deepEqual(prefsAfter.identity[sim==='gameOfLife'?'gameOfLife':'chiFlow'].yoursRules,rawAfter);}
  else assert.deepEqual(rawAfter,rawBefore,'active rules survive Save, Cancel and saved-profile round trips');
 }
 if(scenario==='genetics')assert.equal(after.gol.genetics,'palette-order');
 if(scenario==='live_save')assert(after.playing,'settings Save cannot pause live evolution');
 if(scenario==='profile'){
  await page.reload();await page.waitForFunction(()=>window.presetTest?.ready);assert.deepEqual((await raw())[key],rawBefore,'explicit profile Save retains active selection after reload');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,sim,scenario,passed:true}));await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
