// Verify presets through native dialog controls, including live recipe replay.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {FLUID_PRESETS,fluidPresetCopy} from '../js/fluid-presets.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/fluid-presets';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const [lang,touch] of [['en',false],['he',true],['ru',false],['nl',true]]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
 await context.addInitScript(()=>{if(!localStorage.getItem('colorGridExperimentalSimulationsV1'))localStorage.setItem('colorGridExperimentalSimulationsV1',JSON.stringify({ink:true,oil:true,network:true}));});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.fluidTest={
 setup:kind=>{stopMacro();pauseLife();resetArmedState();n=61;restoreSeparatorWidth(0);initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=(i*17)%paletteLen();t.isGold=i===0;});inkRules={...DEFAULT_INK_PREFERENCES};oilRules={...INITIAL_OIL_RULES};history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();kind==='ink'?cycleInkMode():cycleOilMode();renderToScreen(null);},
 open:kind=>kind==='ink'?inkSettingsUI.open():oilSettingsUI.open(),
 state:()=>({ink:{...inkRules},oil:{...oilRules},board:boardState.map(t=>({k:t.k,v:t.v,gold:!!t.isGold})),runtime:armedSimulation==='ink'?getInkSnapshot():getOilSnapshot(),logs:[...artRecipeLog],playing:isLifePlaying,generation:currentGenerationCount,loaded:isMacroLoaded}),
 play:togglePlayPauseLife,replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},done:()=>!isMacroPlaying&&!isLifePlaying&&!isMacroLoaded
 };initializeApp().then(()=>fluidTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base);await page.waitForFunction(()=>window.fluidTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>fluidTest.state());
 for(const kind of ['ink','oil']){
  await page.evaluate(kind=>fluidTest.setup(kind),kind);const initial=await state();
  const toolbar=page.locator(kind==='ink'?'#btnInk':'#btnOil');
  const defaultPreset=kind==='ink'?'whirlpools':'balanced';
  const paths=await toolbar.locator('svg path:not(.vortices-tornado-badge)').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d')));
  if(kind==='ink'){
   const name={en:'Color Vortices',he:'מערבולות צבע',ru:'Цветовые вихри',nl:'Kleurwervels'}[lang];
   assert.equal(await toolbar.getAttribute('aria-label'),name);
   assert.equal(await toolbar.locator('svg text').count(),0);
   assert(paths.length>0);
  }else{
   assert.equal((await toolbar.locator('svg text').textContent()).trim(),'B');
   assert.equal(paths.length,0);
  }
  const captured=await page.evaluate(async kind=>{
   const {captureMacroActivityIcon}=await import('./js/macro-activity.js');
   const {node}=captureMacroActivityIcon(document.getElementById(kind==='ink'?'btnInk':'btnOil'));
   const label=node.querySelector('text');
   return {paths:[...node.querySelectorAll('path')].map(path=>path.getAttribute('d')),text:label?.textContent,fill:label?.style.fill,stroke:node.style.stroke};
  },kind);
  if(kind==='ink'){assert.deepEqual(captured.paths,paths);assert(captured.stroke&&captured.stroke!=='none');}
  else {assert.equal(captured.text,'B');assert(captured.fill.length>0);}
  const open=async()=>{await page.evaluate(kind=>fluidTest.open(kind),kind);await page.waitForTimeout(250);};
  const dialog=page.locator('#'+kind+'SettingsDialog'),cards=dialog.locator('[data-preset]');
  await open();assert((await dialog.locator('h2 .fluid-original-symbol svg path').count())>0);assert.equal(await dialog.locator('h2 .fluid-original-symbol svg text').count(),0);if(kind==='ink'){assert.deepEqual(await dialog.locator('h2 svg path:not(.vortices-tornado-badge)').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d'))),paths);assert.equal((await dialog.locator('h2').textContent()).trim(),await toolbar.getAttribute('aria-label'));}assert.equal(await cards.count(),5);assert.equal(await dialog.locator('[data-preset="'+defaultPreset+'"]').getAttribute('aria-pressed'),'true');
  for(const preset of FLUID_PRESETS[kind]){
   const card=dialog.locator('[data-preset="'+preset.id+'"]');await(touch?card.tap():card.click());
   assert.equal(await card.getAttribute('aria-pressed'),'true');assert.equal(await card.locator('span').textContent(),fluidPresetCopy(preset,lang)[1]);
   for(const [key,value] of Object.entries(preset.rules))assert.equal(await dialog.locator('#'+kind+'-'+key).inputValue(),String(value));
   assert.deepEqual((await state())[kind],initial[kind],'preset selection stays a draft');assert.deepEqual((await state()).board,initial.board);
  }
  const last=FLUID_PRESETS[kind].at(-1),firstKey=Object.keys(last.rules)[0];await dialog.locator('#'+kind+'-'+firstKey).fill('1');
  assert.equal(await dialog.locator('[data-preset][aria-pressed="true"]').count(),0);
  await dialog.locator('[data-reset]').click();assert.equal(await dialog.locator('[data-preset="'+defaultPreset+'"]').getAttribute('aria-pressed'),'true');
  await dialog.locator('[data-preset="'+last.id+'"]').click();await dialog.locator('[data-cancel]').click();assert.deepEqual((await state())[kind],initial[kind]);
  await open();assert.equal(await dialog.locator('[data-preset="'+defaultPreset+'"]').getAttribute('aria-pressed'),'true');
  const chosen=FLUID_PRESETS[kind][1];await dialog.locator('[data-preset="'+chosen.id+'"]').click();await page.screenshot({path:path.join(artifacts,kind+'-'+lang+'.png')});await dialog.locator('[type=submit]').click();assert.deepEqual((await state())[kind],chosen.rules);assert.deepEqual((await state()).board,initial.board);
  // Save a different preset during a running session; replay the resulting rules.
  if(!process.env.FLUID_PRESETS_LAYOUT_ONLY&&(lang==='en'||lang==='he')){
   await page.evaluate(()=>fluidTest.play());await page.waitForFunction(()=>fluidTest.state().generation>=5);await open();await dialog.locator('[data-preset="'+last.id+'"]').click();await dialog.locator('[type=submit]').click();await page.waitForTimeout(70);await page.evaluate(()=>fluidTest.play());const recorded=await state();assert(recorded.logs.some(l=>l.includes('SIMULATION_RULES')&&l.includes(JSON.stringify(last.rules))));
   await page.evaluate(text=>fluidTest.replay(text),recorded.logs.join('\n'));await page.waitForFunction(()=>fluidTest.done(),null,{timeout:20000});const played=await state();assert.deepEqual(played.board,recorded.board);assert.deepEqual(played.runtime.state,recorded.runtime.state);
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS presets',lang,touch);await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
