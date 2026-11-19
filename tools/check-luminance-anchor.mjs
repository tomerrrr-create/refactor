import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist');await mkdir('/tmp/luminance-anchor-check',{recursive:true});
let source=await readFile(root+'/js/app.js','utf8');
source=source.replace('      initializeApp();',`window.anchorTest={
 state:()=>({magnet:magnetRules.anchorColor==='luminance',life:gameOfLifeRules.deadColor==='luminance',anchorIndex:magnetRules.anchorColorIndex,tiles:boardState.map(t=>[t.k,t.v,!!t.isGold]),playing:isLifePlaying,sort:currentSortMethod}),
 tech:()=>modals.openTechnicianMenu(),magnet:()=>modals.openMagnetSettingsModal(),life:()=>modals.openGolSettingsModal(),
 setup:()=>{pauseLife();resetArmedState();n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>t.k=t.v=i%paletteLen());currentSortMethod='reversed';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,'reversed'));renderToScreen(null);},
 raw:(magnet,life)=>{if(magnet)magnetRules.anchorColor='luminance';else delete magnetRules.anchorColor;if(life)gameOfLifeRules.deadColor='luminance';else delete gameOfLifeRules.deadColor;},
 saveProfile:()=>settingsProfiles.refresh(),profile:()=>captureProfileSettings(),
 record:()=>artRecipeLog.join(String.fromCharCode(10)),
 start:simulation=>{armSimulation(simulation);togglePlayPauseLife();},pause:pauseLife
 };initializeApp().then(()=>anchorTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(name==='js/app.js'?source:await readFile(path.join(root,name)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 const boot=async()=>{await page.goto(base);await page.waitForFunction(()=>window.anchorTest?.ready);};
 const state=()=>page.evaluate(()=>anchorTest.state());
 const closeTech=()=>page.locator('#btnTechnicianCloseTop').click();
 const tech=async()=>{await page.evaluate(()=>anchorTest.tech());await page.locator('#btnConfigureFeatures').click();return page.locator('#luminanceAnchorToggle');};
 const modal=async(name,on,save=true)=>{
  await page.evaluate(name=>anchorTest[name](),name);const target=page.locator(name==='magnet'?'#btnMagnetAnchorColor':'#btnGolDeadColor');await target.waitFor();
  if((await target.getAttribute('aria-checked'))!==String(on))await target.click();
  const button=name==='magnet'?(save?'#btnMagnetSettingsSave':'#btnMagnetSettingsCancel'):(save?'#btnGolSettingsSave':'#btnGolSettingsCancel');
  await page.locator(button).click();await page.waitForTimeout(250);
 };
 await boot();assert((await state()).magnet&&(await state()).life);let toggle=await tech();assert(await toggle.isChecked());await toggle.uncheck();await closeTech();await page.evaluate(()=>anchorTest.setup());const original=await state();
 toggle=await tech();await toggle.check();assert((await state()).magnet&&(await state()).life);assert.deepEqual((await state()).tiles,original.tiles);assert.equal((await state()).sort,'reversed');await page.screenshot({path:`/tmp/luminance-anchor-check/${config.lang}-technicians.png`});await closeTech();
 await modal('magnet',false,false);toggle=await tech();assert(await toggle.isChecked(),'Cancel does not change the technician preference');await closeTech();
 await modal('magnet',false);assert(!(await state()).magnet&&(await state()).life);toggle=await tech();assert(!(await toggle.isChecked()));await closeTech();
 await boot();assert(!(await state()).magnet&&!(await state()).life,'saved Off resets both on the next visit');assert.equal((await state()).anchorIndex,-1);
 await modal('magnet',true);toggle=await tech();assert(!(await toggle.isChecked()),'one On is still a mixed state');await closeTech();
 await modal('life',true);toggle=await tech();assert(await toggle.isChecked(),'both independent On values enable the switch');await closeTech();
 // Persist conflicting profile values, then verify that the device preference wins at startup.
 await page.evaluate(()=>{anchorTest.raw(false,false);anchorTest.saveProfile();});await page.evaluate(()=>anchorTest.tech());if(!(await page.locator('#profileActions').isVisible()))await page.locator('[data-profile-dot="0"]').click();await page.locator('#btnProfileSave').click();await closeTech();await boot();assert((await state()).magnet&&(await state()).life,'saved technician On overrides profile/modal Off');
 await modal('life',false);assert((await state()).magnet&&!(await state()).life);toggle=await tech();assert(!(await toggle.isChecked()));await closeTech();await boot();assert(!(await state()).magnet&&!(await state()).life);
 toggle=await tech();await toggle.focus();await page.keyboard.press('Space');assert((await state()).magnet&&(await state()).life);await toggle.uncheck();assert(!(await state()).magnet&&!(await state()).life);assert.equal((await state()).anchorIndex,-1);await closeTech();
 // Updating the switch during a run uses existing live-rule recording and leaves playback running.
 await page.evaluate(()=>anchorTest.start('magnet'));toggle=await tech();await toggle.check();assert((await state()).playing);await closeTech();assert((await page.evaluate(()=>anchorTest.record())).includes('SIMULATION_RULES'));await page.evaluate(()=>anchorTest.pause());
 toggle=await tech();await toggle.uncheck();await closeTech();await page.evaluate(()=>anchorTest.start('gameOfLife'));toggle=await tech();await toggle.check();assert((await state()).playing);await closeTech();assert((await page.evaluate(()=>anchorTest.record())).split('\n').filter(line=>line.includes('SIMULATION_RULES')).at(-1).includes('"deadColor":"luminance"'));await page.evaluate(()=>anchorTest.pause());
 // Profile Reset restores the factory anchors and the device switch together.
 toggle=await tech();await toggle.uncheck();
 const beforeReset=await state();
 const resetDialog=page.locator('#workspaceResetConfirmation');
 await page.locator('#btnResetWorkspace').click();
 await page.locator('#btnCancelWorkspaceReset').click();
 await resetDialog.waitFor({state:'hidden'});
 assert(!(await toggle.isChecked()));
 await page.locator('#btnResetWorkspace').click();
 await page.locator('#btnConfirmWorkspaceReset').click();
 await resetDialog.waitFor({state:'hidden'});
 const afterReset=await state();
 assert(afterReset.magnet&&afterReset.life);
 assert(await toggle.isChecked());
 assert.deepEqual(afterReset.tiles,beforeReset.tiles);
 await closeTech();await boot();
 assert((await state()).magnet&&(await state()).life,'Reset saves On for the next visit');
 assert.deepEqual(errors,[]);console.log('PASS Luminance Anchor',config);await context.close();
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
