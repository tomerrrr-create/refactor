// Real file loading and pointer navigation; expose observations and manual Stop only.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.overlayTest={stop:stopMacro,state:()=>({loaded:isMacroLoaded,playing:isMacroPlaying,fullscreen:isMacroFullscreen,animating:isAnimating,overlay:dom.macroOverlay.className,opacity:getComputedStyle(dom.macroOverlay).opacity,controls:getComputedStyle(dom.controlsContainer).opacity,board:boardState.map(t=>t.k),last:paletteLen()-1})};initializeApp().then(()=>overlayTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const viewport of [{width:1280,height:1000},{width:390,height:844}]){
 for(const scenario of ['ordinary','before-entry','during-entry','after-entry','manual-stop','escape-exit']){
  const context=await browser.newContext({viewport,serviceWorkers:'block',isMobile:viewport.width<600,hasTouch:viewport.width<600});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.overlayTest?.ready);
  await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  const delay=scenario==='before-entry'?150:scenario==='during-entry'?650:scenario==='manual-stop'?2000:1200;
  const stamp='00:00:'+String(Math.floor(delay/1000)).padStart(2,'0')+'.'+String(delay%1000).padStart(3,'0');
  const recipe='[00:00:00.000] INIT_STATE -> '+JSON.stringify({recipeVersion:2,n:9,pal:0,sort:'luminance',sep:0,board:'81x0'})+'\n['+stamp+'] Invert Colors -> Sort: luminance\n';
  await page.locator('#projectFileInput').setInputFiles({name:'overlay.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});
  await page.waitForFunction(()=>overlayTest.state().loaded);await page.locator('#btnMacroPlay').click();
  if(scenario!=='ordinary')await page.locator('#boardCanvas').click();
  if(scenario==='manual-stop'){
   await page.waitForFunction(()=>overlayTest.state().fullscreen&&overlayTest.state().animating);
   await page.evaluate(()=>overlayTest.stop());
  }
  if(scenario==='escape-exit'){
   await page.waitForFunction(()=>!overlayTest.state().playing&&overlayTest.state().fullscreen&&overlayTest.state().animating);
   // Match the browser's Escape/fullscreenchange path before the queued exit runs.
   await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();else document.dispatchEvent(new Event('fullscreenchange'));});
  }
  await page.waitForFunction(()=>!overlayTest.state().playing&&!overlayTest.state().animating);
  await page.waitForTimeout(500);
  const state=await page.evaluate(()=>overlayTest.state());
  assert.equal(state.loaded,false,scenario);assert.equal(state.fullscreen,false,scenario);
  assert.equal(state.overlay,'macro-overlay',scenario);assert.equal(state.opacity,'0',scenario);assert.equal(state.controls,'1',scenario);
  assert(state.board.every(k=>k===(scenario==='manual-stop'?0:state.last)),scenario+' preserves macro drawing');
  if(scenario!=='manual-stop'){
   await page.locator('#btnUndo').click();assert((await page.evaluate(()=>overlayTest.state())).board.every(k=>k===0),'Undo');
   await page.locator('#btnRedo').click();assert.deepEqual((await page.evaluate(()=>overlayTest.state())).board,state.board,'Redo');
  }
  await page.locator('#btnRandom').click();await page.waitForTimeout(300);
  assert.notDeepEqual((await page.evaluate(()=>overlayTest.state())).board,state.board,'first Random click reaches the button');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({viewport,scenario,passed:true}));await context.close();
 }
}}finally{await browser.close();await new Promise(r=>server.close(r));}
