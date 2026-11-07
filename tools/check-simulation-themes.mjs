// Supported theme controls, running/resting restoration and retired preferences.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.themeTest={
 setup:()=>{pauseLife();isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();armSimulation('nudgeBrighter');},
 tech:()=>modals.openTechnicianMenu(),state:()=>({settings:getWorkspaceSettings(),board:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),history:history.length,playing:isLifePlaying})
 };initializeApp().then(()=>themeTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(f==='js/app.js'?source:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}]){
 const ctx=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await ctx.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const boot=async reload=>{if(reload)await page.reload();else await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.themeTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const state=()=>page.evaluate(()=>themeTest.state()),tap=selector=>config.width<600?page.locator(selector).tap():page.locator(selector).click();
 const tech=async()=>{await page.evaluate(()=>themeTest.tech());await page.locator('#technicianDialog').waitFor({state:'visible'});};
 const ink=()=>page.locator('#btnGravitationalSort svg').first().evaluate(e=>getComputedStyle(e).stroke);
 await boot(false);await page.evaluate(()=>themeTest.setup());await tech();
 for(const group of ['#simulationThemeSettings','#simulationPlaybackThemeSettings']){
  assert.deepEqual(await page.locator(group+' [data-theme]').evaluateAll(es=>es.map(e=>e.dataset.theme)),['blue','gold','teal']);
  assert((await page.locator(group+' [data-theme]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')))).every(Boolean));
 }
 assert.equal(await page.locator('#simModeBackground .sim-theme-layer').count(),0);
 for(const [rest,playback]of [['blue','gold'],['gold','teal'],['teal','blue']]){
  const before=await state();await tap('#simulationThemeSettings [data-theme='+rest+']');await tap('#simulationPlaybackThemeSettings [data-theme='+playback+']');
  const selected=await state();assert.deepEqual(selected.board,before.board);assert.equal(selected.history,before.history);assert.equal(selected.settings.simulationTheme,rest);assert.equal(selected.settings.simulationPlaybackTheme,playback);
  await tap('#btnTechnicianCloseTop');await tap('#btnPlayPauseLife');assert((await state()).playing);assert.equal(await page.locator('html').getAttribute('data-simulation-effective-theme'),playback);await page.waitForTimeout(450);
  assert.equal(await ink(),({blue:'rgb(63, 81, 181)',gold:'rgb(118, 103, 65)',teal:'rgb(104, 189, 181)'})[playback]);
  await tap('#btnPlayPauseLife');assert.equal(await page.locator('html').getAttribute('data-simulation-effective-theme'),rest);await page.waitForTimeout(450);
  assert.equal(await ink(),({blue:'rgb(63, 81, 181)',gold:'rgb(165, 139, 84)',teal:'rgb(104, 189, 181)'})[rest]);await tech();
 }
 await page.waitForTimeout(350);await boot(true);let current=await state();assert.equal(current.settings.simulationTheme,'teal');assert.equal(current.settings.simulationPlaybackTheme,'blue');
 // Saved legacy profiles normalize only the retired appearance fields.
 await page.evaluate(()=>{const key='colorGridProfileDraftsV1',saved=JSON.parse(localStorage.getItem(key));for(const p of saved.profiles)for(const kind of ['saved','draft']){p[kind].settings.simulationTheme='silver';p[kind].settings.simulationPlaybackTheme='pink';p[kind].settings.brush.size=7;p[kind].settings.startup.boardSize=27;p[kind].settings.startup.brushSize=7;}localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('colorGridSimulationTheme','ice');localStorage.setItem('colorGridSimulationPlaybackTheme','silver');});
 await boot(true);current=await state();assert.equal(current.settings.simulationTheme,'blue');assert.equal(current.settings.simulationPlaybackTheme,'gold');assert.equal(current.settings.brush.size,7);assert.equal(current.settings.startup.boardSize,27);
 // Import an actual old settings TXT without losing unrelated settings.
 await page.locator('#projectFileInput').setInputFiles({name:'old-appearance-settings.txt',mimeType:'text/plain',buffer:Buffer.from('FYI_SETTINGS_V1\n'+JSON.stringify({version:1,settings:{simulationTheme:'pink',simulationPlaybackTheme:'ice',brush:{size:5},startup:{boardSize:35}}}))});
 await page.waitForFunction(()=>themeTest.state().settings.brush.size===5);current=await state();assert.equal(current.settings.startup.boardSize,35);assert.equal(current.settings.simulationTheme,'blue');assert.equal(current.settings.simulationPlaybackTheme,'gold');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
