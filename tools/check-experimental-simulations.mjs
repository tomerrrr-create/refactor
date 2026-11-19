// Independent opt-ins, device persistence, reserved layouts and replay compatibility.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),touch?'he':'en');
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.flagsTest={
 panel:()=>{isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');},
 tech:()=>modals.openTechnicianMenu(),map:()=>evolutionDrawer.open(),
 state:()=>({armed:armedSimulation,playing:isLifePlaying,slots:[...evolutionSlots],pixels:boardState.map(t=>t.k),settings:getWorkspaceSettings(),logs:[...artRecipeLog]}),
 recipe:()=>{armSimulation('network');stepForward();return artRecipeLog.join('\\n');},
 replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},
 done:()=>!isMacroPlaying&&!isLifePlaying&&!isMacroLoaded,
 start:()=>{armSimulation('oil');togglePlayPauseLife();},
 loaded:value=>{isMacroLoaded=value;}
 };initializeApp().then(()=>flagsTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const boot=async reload=>{await(reload?page.reload():page.goto(base));await page.waitForFunction(()=>window.flagsTest?.ready);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());flagsTest.panel();});};
 const state=()=>page.evaluate(()=>flagsTest.state());
 const close=()=>page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const tech=async()=>{await page.evaluate(()=>flagsTest.tech());await page.waitForTimeout(100);};
 const toggle=async(id,value)=>{await page.locator('#'+id+'ExperimentToggle').setChecked(value);};
 const ids=['oil','network'],buttons={oil:'btnOil',network:'btnNetwork'};
 await boot(false);
 await page.locator('#btnEvolutionDrawerInternal').click();await page.waitForTimeout(300);
 const original=(await state()).slots;
 for(const id of ids)assert(!(await page.locator('#'+buttons[id]).isVisible()),id+' defaults hidden');
 await page.evaluate(()=>flagsTest.map());
 for(const id of ids)assert.equal(await page.locator('[data-drawer-evolution="'+id+'"]').count(),0);
 assert.equal(await page.locator('.drawer-feature-hidden').count(),2);
 assert.equal(await page.locator('[data-drawer-evolution="ink"]').count(),1);await close();
 assert(await page.locator('#btnInk').isVisible());
 await tech();assert.equal(await page.locator('#inkExperimentToggle').count(),0);
 for(const id of ids)assert(!(await page.locator('#'+id+'ExperimentToggle').isChecked()));
 // A different profile must not change device opt-ins.
 await toggle('network',true);
 await page.locator('[data-profile-choice="1"]').click();assert(await page.locator('#networkExperimentToggle').isChecked());
 await toggle('oil',true);await toggle('network',true);await close();
 for(const id of ids)assert(await page.locator('#'+buttons[id]).isVisible());
 await page.evaluate(()=>flagsTest.start());await tech();await toggle('oil',false);
 assert.equal((await state()).playing,false);assert.equal((await state()).armed,null);await close();
 const recipe=await page.evaluate(()=>flagsTest.recipe()),recorded=(await state()).pixels;
 await tech();await toggle('oil',false);await toggle('network',false);await close();
 assert.deepEqual((await state()).slots,original);
 await page.evaluate(text=>flagsTest.replay(text),recipe);await page.waitForFunction(()=>flagsTest.done(),null,{timeout:20000});assert.deepEqual((await state()).pixels,recorded);
 for(const id of ids)assert(!(await page.locator('#'+buttons[id]).isVisible()));
 // Loaded recipes cannot change the device flags underneath replay.
 await page.evaluate(()=>flagsTest.loaded(true));await tech();for(const id of ids)assert(await page.locator('#'+id+'ExperimentToggle').isDisabled());await close();await page.evaluate(()=>flagsTest.loaded(false));
 await boot(true);await tech();for(const id of ids)assert(!(await page.locator('#'+id+'ExperimentToggle').isChecked()));
 assert.deepEqual(errors,[]);console.log('PASS experimental visibility',JSON.stringify({touch,persistence:true,profiles:true,layout:true,replay:true}));await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
