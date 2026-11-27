// Regression: selected gold versus remembered inactive icons in both drawers.
import {readFile,writeFile} from 'node:fs/promises';import {createServer} from 'node:http';import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),rows=[];
const artifacts='/tmp/drawer-button-colors';await (await import('node:fs/promises')).mkdir(artifacts,{recursive:true});
let source=await readFile(root+'/js/app.js','utf8');source=source.replace('      initializeApp();',`window.buttonAudit={
 setup:(memory,theme)=>{pauseLife();cycleMemory.setEnabled(memory);cycleMemory.clear();resetArmedState();isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');applySimulationTheme(theme);refreshCycleIcons();},
 state:()=>({armed:armedSimulation,breathe:breatheEvoMode,dla:dlaMode,playing:isLifePlaying,memory:cycleMemory.enabled()}),
 };initializeApp().then(()=>buttonAudit.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?source:await readFile(path.join(root,f)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),touch?'he':'en');
 await context.addInitScript(()=>localStorage.setItem('colorGridExperimentalSimulationsV1',JSON.stringify({breathe:true})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>buttonAudit.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const tap=async id=>{const b=page.locator('#'+id);if(await b.getAttribute('data-evolution-page-hidden')!==null){await page.locator('#btnEvolutionDrawerInternal').click();await page.waitForTimeout(300);}if(touch)await b.tap();else{await b.click();await page.mouse.move(0,0);}await page.waitForTimeout(100);};
 const capture=async(label,id)=>{await page.waitForTimeout(450);const result=await page.locator('#'+id).evaluate(e=>{const visible=[...e.querySelectorAll(':scope > svg')].filter(svg=>getComputedStyle(svg).display!=='none');const probe=document.createElement('span');probe.style.color='var(--sim-color)';e.append(probe);const expected=getComputedStyle(probe).color;probe.style.color='var(--gold)';const expectedGold=getComputedStyle(probe).color;probe.remove();return {expected,expectedGold,classes:e.className,active:e.classList.contains('simulation-active'),disabled:e.disabled,theme:getComputedStyle(document.documentElement).getPropertyValue('--sim-color').trim(),gold:getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),icons:visible.map(svg=>({id:svg.id,stroke:getComputedStyle(svg).stroke,fill:getComputedStyle(svg).fill,shapes:[...svg.querySelectorAll('circle,path,ellipse')].map(c=>({id:c.id,stroke:getComputedStyle(c).stroke,fill:getComputedStyle(c).fill}))}))};});const state=await page.evaluate(()=>buttonAudit.state());
  assert.equal(result.active,state.armed===(id==='btnDla'?'dla':'breathe'),label+' selected state');
  for(const icon of result.icons){
   if(id==='btnShowBreatheMenu')assert.equal(icon.stroke,result.active?result.expectedGold:result.expected,label+' Breathe stroke');
   else for(const shape of icon.shapes)assert.equal(shape.fill,result.active&&(state.dla==='genetics'||shape.id==='dla-circle-top')?result.expectedGold:result.expected,label+' DLA node '+shape.id);
  }
  rows.push({touch,label,id,state,...result});};
 for(const memory of [false,true])for(const theme of ['blue','gold','teal']){
  for(const [id,cycle]of [['btnShowBreatheMenu',5],['btnDla',3]]){
   await page.evaluate(({memory,theme})=>buttonAudit.setup(memory,theme),{memory,theme});await capture('fresh/'+memory+'/'+theme,id);
   for(let i=0;i<cycle;i++){await tap(id);await capture('cycle-'+i+'/'+memory+'/'+theme,id);}
   if(theme==='blue')await page.locator('#'+id).screenshot({path:artifacts+'/'+id+'-'+touch+'-memory-'+memory+'-after-cycle.png'});
   await tap(id);await capture('selected-again/'+memory+'/'+theme,id);
   await tap('btnGravitationalSort');await capture('handoff/'+memory+'/'+theme,id);
   await tap('btnPlayPauseLife');await capture('other-running/'+memory+'/'+theme,id);await tap('btnPlayPauseLife');
   // A remembered non-default Group/No genetics symbol also returns to theme ink.
   await page.evaluate(({memory,theme})=>buttonAudit.setup(memory,theme),{memory,theme});
   await tap(id);await tap(id);await tap('btnGravitationalSort');await capture('second-mode-handoff/'+memory+'/'+theme,id);
  }
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({touch,scenarios:rows.filter(r=>r.touch===touch).length,errors}));await context.close();
}}finally{await writeFile(artifacts+'/results.json',JSON.stringify(rows,null,2));await browser.close();await new Promise(r=>server.close(r));}
