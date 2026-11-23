// Six type drafts, four toolbar shortcuts, icons, 600-anchor defaults and legacy replay.
import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);Math.random=()=>.25;},touch?'he':'en');
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.fieldTest={
 setup:()=>{stopMacro();pauseLife();resetArmedState();n=31;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%11===0?0:i%paletteLen();t.isGold=i%139===0;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();},
 open:()=>modals.openMagnetSettingsModal(),tech:()=>modals.openTechnicianMenu(),
 state:()=>({mode:magnetMode,method:magnetRules.method,field:effectiveMagnetCombinedField(),limit:effectiveMagnetAnchorLimit(),playing:isLifePlaying,gen:currentGenerationCount,tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:!!t.isGold})),logs:[...artRecipeLog],settings:getWorkspaceSettings()}),
 replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},done:()=>!isMacroPlaying&&!isLifePlaying&&!isMacroLoaded,
 };initializeApp().then(()=>fieldTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>fieldTest.ready);
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());fieldTest.setup();});
 const state=()=>page.evaluate(()=>fieldTest.state()),tap=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 const open=async()=>{await page.evaluate(()=>fieldTest.open());await page.locator('#magnetSettingsModal').waitFor({state:'visible'});await page.waitForTimeout(250);};
 const save=()=>tap('#btnMagnetSettingsSave'),cancel=()=>tap('#btnMagnetSettingsCancel');
 const choose=method=>tap('[data-method="'+method+'"]');
 const cycle=['field_cosmic_magnet','magnet','cosmic_magnet','field_magnet'];
 assert.equal(await page.locator('#btnMagnetModes svg:visible').getAttribute('id'),'iconModeFieldCosmicMagnet');
 for(const method of [...cycle,'off']){
  await tap('#btnMagnetModes');assert.equal((await state()).mode,method);
  if(method==='off')continue;
  assert.equal((await state()).field,method.startsWith('field_'));
  if(!method.startsWith('field_'))assert.equal((await state()).limit,600);
  const visible=await page.locator('#btnMagnetModes > svg').evaluateAll(list=>list.filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id));assert.equal(visible.length,1);
  assert.equal(visible[0].includes('Field'),method.startsWith('field_'));
 }
 await tap('#btnMagnetModes');await open();assert.equal(await page.locator('#magnetCombinedField').count(),0);assert.deepEqual(await page.locator('#magnetAnchorLimit button').evaluateAll(buttons=>buttons.map(b=>Number(b.dataset.limit))),[300,600,1000]);
 assert.equal(await page.locator('#magnetMethodContainer button').count(),6);
 const names=touch?['קוסמי משולב','רגיל','קוסמי','רגיל משולב','מגנט זמן','התרחבות']:
  ['Combined Cosmic','Regular','Cosmic','Combined Regular','Time Magnet','Expand'];
 assert.deepEqual(await page.locator('#magnetMethodContainer .magnet-method-label').allTextContents(),names);
 assert.equal(await page.locator('#magnetMethodContainer').getByRole('button',{name:names[0],exact:true}).getAttribute('aria-pressed'),'true');
 const toolbarIcons=['iconModeFieldCosmicMagnet','iconModeMagnet','iconModeCosmicMagnet','iconModeFieldMagnet','iconModeTimeMagnet','iconModeExpand'];
 for(const [index,method] of [...cycle,'time_magnet','expand'].entries()){
  assert.equal(await page.locator('#magnetMethodContainer [data-method="'+method+'"] svg').innerHTML(),
   await page.locator('#'+toolbarIcons[index]).innerHTML());
 }
 assert.equal(await page.locator('#magnetAnchorLimit button:disabled').count(),3);
 const unchanged=(await state()).tiles;await choose('magnet');assert.equal(await page.locator('#magnetAnchorLimit [aria-pressed="true"]').getAttribute('data-limit'),'600');await cancel();assert.equal((await state()).mode,'field_cosmic_magnet');assert.deepEqual((await state()).tiles,unchanged);
 for(const method of [...cycle,'time_magnet','expand']){
  await open();await choose(method);assert.equal(await page.locator('#magnetAnchorLimit button:disabled').count(),method.startsWith('field_')?3:0);await save();assert.equal((await state()).mode,method);
 }
 // Settings-only Time wraps to the first shortcut.
 await open();await choose('time_magnet');await save();await tap('#btnMagnetModes');assert.equal((await state()).mode,'field_cosmic_magnet');
 await tap('#btnPlayPauseLife');await page.waitForFunction(()=>fieldTest.state().gen>=3);
 const generation=(await state()).gen;await tap('#btnMagnetModes');assert((await state()).playing);assert((await state()).gen>=generation);assert.equal((await state()).mode,'magnet');
 await tap('#btnMagnetModes');assert.equal((await state()).limit,600);await tap('#btnPlayPauseLife');
 const live=await state();await tap('#btnUndo');await tap('#btnRedo');assert.deepEqual((await state()).tiles,live.tiles);
 await page.evaluate(text=>fieldTest.replay(text),live.logs.join('\n'));await page.waitForFunction(()=>fieldTest.done(),null,{timeout:30000});assert.deepEqual((await state()).tiles,live.tiles);
 // A legacy combined payload runs the same engine as the new dedicated identity.
 await page.evaluate(()=>fieldTest.setup());await tap('#btnMagnetModes');await tap('#btnStepForward');
 const combined=await state(),legacy=combined.logs.join('\n').replaceAll('field_cosmic_magnet','cosmic_magnet').replaceAll('field_magnet','magnet');
 await page.evaluate(text=>fieldTest.replay(text),legacy);await page.waitForFunction(()=>fieldTest.done(),null,{timeout:30000});assert.deepEqual((await state()).tiles,combined.tiles);
 // The named type persists through the existing profile path.
 await page.evaluate(()=>fieldTest.setup());await tap('#btnMagnetModes');await open();await choose('field_magnet');await save();await page.evaluate(()=>fieldTest.tech());
 if(!(await page.locator('#profileActions').isVisible()))await tap('[data-profile-dot="0"]');await tap('#btnProfileSave');await page.reload();await page.waitForFunction(()=>fieldTest.ready);assert.equal((await state()).settings.rules.magnet.method,'field_magnet');
 await page.setViewportSize({width:320,height:568});await open();
 assert(await page.locator('#magnetMethodContainer').evaluate(container=>{
  const bounds=container.getBoundingClientRect();
  return [...container.querySelectorAll('button')].every(button=>{
   const rect=button.getBoundingClientRect(),label=button.querySelector('bdi');
   return rect.left>=bounds.left&&rect.right<=bounds.right+1&&rect.height>=44&&label.scrollWidth<=label.clientWidth+1;
  });
 }));
 await cancel();
 assert.deepEqual(errors,[]);console.log('PASS Magnet types',JSON.stringify({touch,cycle:true,drafts:true,icons:true,live:true,replay:true,legacy:true,profile:true}));await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
