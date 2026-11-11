// Inject faults only into the served test copy; production actions stay unchanged.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      function goDark() {',`function goDark() { if(window.failEntryOnce){window.failEntryOnce=false;throw Error('test board interruption');}`);
source=source.replace('// Playback may start while the panel transition is pending.',`if(window.failPanelOnce){window.failPanelOnce=false;throw Error('test panel interruption');}
// Playback may start while the panel transition is pending.`);
source=source.replace('      initializeApp();',`window.cleanupTest={state:()=>({isAnimating,n,isSimModeActive})};initializeApp().then(()=>cleanupTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?source:await readFile(path.join(root,f)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.cleanupTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const panel=page.locator('#controlsContainer'),overlay=page.locator('#boardOverlay'),entry=page.locator('#btnToggleSimMode');
 const visible=async()=>{await page.waitForTimeout(1100);assert.equal(await panel.evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await overlay.evaluate(e=>getComputedStyle(e).opacity),'0');};
 const hold=async()=>{const r=await entry.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();};
 await page.evaluate(()=>window.failPanelOnce=true);await entry.click();await visible();assert.deepEqual(errors,['test panel interruption']);
 await entry.click();await visible();assert(await panel.evaluate(e=>e.classList.contains('sim-mode-active')));
 await page.evaluate(()=>window.failEntryOnce=true);await hold();await visible();assert.deepEqual(errors,['test panel interruption','test board interruption']);assert.equal(await page.evaluate(()=>cleanupTest.state().isAnimating),false);
 // Recovery does not require Random. The next ordinary hold succeeds directly.
 await hold();await visible();assert.equal(await page.evaluate(()=>cleanupTest.state().n),249);assert.equal(await page.evaluate(()=>cleanupTest.state().isAnimating),false);
 await entry.click();await visible();assert(!(await panel.evaluate(e=>e.classList.contains('sim-mode-active'))));
 await hold();await visible();assert(await panel.evaluate(e=>e.classList.contains('sim-mode-active')));assert.equal(errors.length,2);
 console.log('PASS interrupted panel and Go Dark cleanup, original errors, retry without Random, normal Creation and Simulation holds');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
