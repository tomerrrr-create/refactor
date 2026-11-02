// Verify quiet dialog entry and retained keyboard focus across settings windows.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.SETTINGS_FOCUS_ARTIFACTS||'/tmp/settings-focus-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});



try {
 for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
  await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
  source=source.replace('      initializeApp();',"window.settingsFocusTest={\n open:(kind)=>{pauseLife();resetArmedState();isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');\n const simulations={cracks:'contour',nudge:'nudgeBrighter',resonance:'cymatics',erosion:'erosion',brightness:'brightnessEvo',breathe:'breathe',islands:'islands',dla:'dla'};\n if(simulations[kind])armSimulation(simulations[kind]);\n const actions={cracks:()=>modals.openCracksSettingsModal(),nudge:()=>modals.openNudgeSettingsModal(),contours:()=>modals.openContourSettingsModal(),resonance:()=>cymaticsSettingsUI.open(),wind:()=>windSettingsUI.open(),erosion:()=>modals.openErosionSettingsModal(),brightness:()=>modals.openBrightnessSettingsModal(),breathe:()=>modals.openBreatheSettingsModal(),islands:()=>modals.openIslandsSettingsModal(),dla:()=>modals.openDlaSettingsModal(),sort:()=>modals.openSortCycleModal(),separators:()=>modals.openSeparatorCycleModal(),layout:()=>document.getElementById('btnEvolutionDrawer').click()};actions[kind]();}\n };initializeApp().then(()=>settingsFocusTest.ready=true);");
  for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
  await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>settingsFocusTest.ready);
  await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  for(const kind of ['cracks','nudge','contours','resonance','wind','erosion','brightness','breathe','islands','dla','sort','separators','layout']){
   await page.evaluate(kind=>settingsFocusTest.open(kind),kind);
   await page.waitForFunction(()=>document.activeElement?.classList.contains('settings-entry-heading'),null,{timeout:2000}).catch(async error=>{throw new Error(kind+' '+JSON.stringify(await page.evaluate(()=>({active:document.activeElement.outerHTML,headings:[...document.querySelectorAll('.settings-entry-heading')].map(h=>({id:h.id,visibility:getComputedStyle(h).visibility,display:getComputedStyle(h).display,rect:h.getBoundingClientRect().width,inert:h.closest('[inert]')?.id})),open:[...document.querySelectorAll('dialog[open],.modal-visible')].map(e=>e.id)})))+' '+error.message);});
   const initial=await page.evaluate(()=>{const h=document.activeElement,dialog=h.closest('dialog')||h.closest('#contourSettingsModal');return {heading:h.matches('h1,h2'),outline:getComputedStyle(h).outlineStyle,inside:!!dialog,id:dialog?.id};});
   assert(initial.heading&&initial.inside,kind+' opens on its title');assert.equal(initial.outline,'none',kind+' has no initial focus frame');
   await page.keyboard.press('Tab');
   assert(await page.evaluate(()=>document.activeElement.matches('button,input,select,textarea')&&document.activeElement.matches(':focus-visible')),kind+' retains keyboard focus indication');
   const range=page.locator('#'+initial.id+' input[type=range]:not(:disabled)').first();
   if(await range.count()){await range.focus();const focus=await range.evaluate(e=>({active:e===document.activeElement,actual:document.activeElement.id,visible:e.matches(':focus-visible'),outline:getComputedStyle(e).outlineStyle,visibility:getComputedStyle(e).visibility}));assert(focus.active&&focus.visible,kind+' keyboard slider focus remains visible '+JSON.stringify(focus));}
   await page.keyboard.press('Escape');await page.waitForTimeout(330);
   assert(!(await page.locator('#'+initial.id).isVisible()),kind+' closes with Escape');
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({config,focusPassed:true}));await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
