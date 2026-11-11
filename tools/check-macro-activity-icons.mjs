// Actual mode controls -> read-only activity snapshots, plus measured crossfades.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.iconTest={
 setup:()=>{pauseLife();n=9;initializeBoardAndCanvas(true);isMacroLoaded=true;isMacroPlaying=true;isMacroFullscreen=true;dom.appContainer.classList.add('macro-fullscreen');updateLayout();macroActivity.setEnabled(true);macroActivity.start();},
 mode:(sim,mode,record=true)=>{
  armedSimulation=sim;
  if(sim==='erosion'){erosionRules=restoreErosionRules({mode});updateErosionButtonUI();}
  if(sim==='gravitationalSort'){gsMode=mode;gravitationalSortRules.direction=mode;updateGravitationalSortButtonUI();}
  if(sim==='spiral'){spiralMode=mode;spiralRules.method=mode;updateSpiralButtonUI();}
  if(sim==='magnet'){magnetMode=mode;magnetRules.method=mode;updateMagnetButtonUI();}
  if(sim==='breathe'){breatheEvoMode=mode;updateBreatheEvoButtonUI();}
  if(sim==='brightnessEvo'){brightnessEvoMode=mode;updateBrightnessEvoButtonUI();}
  if(sim==='dla'){dlaMode=mode;updateDlaButtonUI();}
  if(sim==='cymatics'){replayCymaticsRules={...INITIAL_CYMATICS_RULES,resonanceVersion:CYMATICS_RESONANCE_MAPS[mode]};updateCymaticsButtonUI();}
  if(sim==='islands'){islandsSession={...createIslandsSession(1),mode};updateIslandsButtonUI();}
  if(sim==='contour'){contourMode='cracks';replayCracksGrowth={...DEFAULT_CRACKS_GROWTH,area:mode};updateContourButtonUI();}
  if(sim==='gameOfLife'){gameOfLifeMode=mode;updateGameOfLifeButtonUI();}
  if(sim==='sandpile'){chiFlowMode=mode;updateChiFlowButtonUI();}
  if(sim==='nudgeBrighter'||sim==='nudgeDarker')updateNudgeButtonUI();
  if(record)macroActivity.record({eventName:'PLAY',details:'Armed: '+sim+' | Rules: {}'});
 },stop:()=>macroActivity.stop()};initializeApp().then(()=>iconTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1700,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.iconTest?.ready);
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());iconTest.setup();});
 const panel=page.locator('#macroActivity'),current=panel.locator('.macro-activity-row:not([aria-hidden])');
 const settled=async()=>{await panel.waitFor({state:'visible'});await page.waitForTimeout(400);assert.equal(await panel.locator('.macro-activity-row').count(),1);};
 const mode=async(sim,value,record=true)=>page.evaluate(([s,m,r])=>iconTest.mode(s,m,r),[sim,value,record]);
 // Every alternate root SVG must be the actual visible symbol, not the first SVG.
 const modes={erosion:{channels:'iconErosionChannels','channels-solid':'iconErosionSolid',legacy:'iconErosionLegacy'},
 gravitationalSort:{up:'iconGsUp',right:'iconGsRight',center_x:'iconGsCenterX',turbine2:'iconGsTurbine2'},
 spiral:{b:'iconSpiralB',vortex:'iconSpiralVortex',left:'iconSpiralLeft',turbine2:'iconSpiralTurbine2',a:'iconSpiralA',radial:'iconSpiralRadial',down:'iconSpiralDown',black_hole:'iconSpiralBlackHole'},
 magnet:{magnet:'iconModeMagnet',cosmic_magnet:'iconModeCosmicMagnet',time_magnet:'iconModeTimeMagnet'},
 breathe:{solo:'iconBreatheSolo',group:'iconBreatheGroup','random-cell':'iconBreatheRandomCell','random-color':'iconBreatheRandomColor'}};
 for(const [sim,choices] of Object.entries(modes))for(const [value,id] of Object.entries(choices)){
  await mode(sim,value);await settled();assert.equal(await current.locator('.macro-activity-icon').getAttribute('data-source-icon'),id,sim+' '+value);
 }
 // Mode changes hidden from the activity text still update its symbol.
 await mode('erosion','channels');await settled();const label=await current.locator('.macro-activity-title').textContent(),geometry=await current.boundingBox();
 await mode('erosion','channels-solid',false);await page.waitForFunction(()=>document.querySelectorAll('#macroActivity .macro-activity-row').length===2);
 await panel.locator('.macro-activity-row').evaluateAll(rows=>rows.forEach(row=>row.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=80;})));
 const transition=await panel.locator('.macro-activity-row').evaluateAll(rows=>rows.map(row=>({opacity:Number(getComputedStyle(row).opacity),transform:getComputedStyle(row).transform,x:row.getBoundingClientRect().x,y:row.getBoundingClientRect().y,icon:row.querySelector('.macro-activity-icon').dataset.sourceIcon,html:row.outerHTML})));
 assert.equal(transition[0].icon,'iconErosionChannels');assert.equal(transition[1].icon,'iconErosionSolid');
 assert(transition.every(row=>row.opacity>0&&row.opacity<1),'both actions overlap smoothly');assert(Math.abs(transition.reduce((sum,x)=>sum+x.opacity,0)-1)<.03,'no flash or blackout');
 assert(transition.every(row=>row.transform==='none'));assert.equal(transition[0].x,transition[1].x);assert.equal(transition[0].y,transition[1].y);
 const frozen=transition[0].html;await mode('erosion','legacy',false);await page.waitForTimeout(105);
 assert.equal(await panel.locator('.macro-activity-row[aria-hidden]').evaluate(e=>e.outerHTML),frozen,'outgoing icon is frozen while control changes again');
 await panel.locator('.macro-activity-row').evaluateAll(rows=>rows.forEach(row=>row.getAnimations().forEach(animation=>animation.play())));
 await settled();assert.equal(await current.locator('.macro-activity-icon').getAttribute('data-source-icon'),'iconErosionLegacy');assert.equal(await current.locator('.macro-activity-title').textContent(),label);assert.deepEqual(await current.boundingBox(),geometry);
 // Shared SVGs retain only the selected map mark and all original per-mode paints.
 for(const map of ['diagonal','grid','circular','interference','clouds','cosmic']){
  await mode('cymatics',map);await settled();assert.deepEqual(await current.locator('[data-cymatics-map-mark]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cymaticsMapMark)),[map]);
 }
 for(const value of ['genetics','no-genetics']){
  await mode('dla',value);await settled();
  const fills=await page.evaluate(()=>({source:[...document.querySelectorAll('#btnDla circle')].map(e=>getComputedStyle(e).fill),copy:[...document.querySelectorAll('#macroActivity .macro-activity-row:not([aria-hidden]) circle')].map(e=>getComputedStyle(e).fill)}));assert.deepEqual(fills.copy,fills.source);
 }
 for(const value of ['brightness','contrast']){
  await mode('brightnessEvo',value);await settled();
  if(value==='contrast'){
   const gradient=await current.locator('linearGradient').getAttribute('id');assert(gradient.startsWith('macro-activity-icon-'));
   assert((await current.locator('svg').getAttribute('style')).includes('#'+gradient),'gradient points to its private definition');
  }
 }
 for(const [sim,attribute,values] of [['gameOfLife','data-gol-star',['personal','shuffle','coral']],['sandpile','data-chi-star',['personal','ripples','nova']]]){
  for(let i=0;i<values.length;i++){await mode(sim,values[i]);await settled();assert.equal(await current.locator('['+attribute+']').count(),i);}
 }
 for(const value of ['classic','proximity']){await mode('islands',value);await settled();assert.equal(await current.locator('.islands-proximity-mark').count(),0); // CSS classes are frozen away.
  assert.equal(await current.locator('circle').count(),value==='proximity'?1:0);}
 for(const value of ['all','dead']){await mode('contour',value);await settled();const opacity=await current.locator('svg [opacity]').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).opacity));assert(opacity.includes(value==='dead'?'1':'0'));}
 await mode('nudgeBrighter');await settled();await mode('nudgeDarker',null,false);await settled();assert((await current.locator('.macro-activity-title').textContent()).includes('backward'));
 assert.equal(await current.locator('path').getAttribute('d'),'M9 4 V 20 C 20 20, 20 4, 9 4 Z');
 await page.evaluate(()=>iconTest.stop());assert.equal(await panel.isVisible(),false);await page.waitForTimeout(300);assert.equal(await panel.locator('.macro-activity-row').count(),0);
 // Exercise rapid bursts deterministically against the same production fade controller.
 await page.evaluate(async()=>{
  const {createMacroActivityFade}=await import('/js/macro-activity.js');
  const container=document.createElement('div');container.className='macro-activity-current';document.body.append(container);
  const fade=createMacroActivityFade(container),row=text=>{const e=document.createElement('div');e.className='macro-activity-row';e.textContent=text;return e;};
  fade.show(row('first'));fade.show(row('second'));window.fadeTest={container,fade,row};
 });
 await page.waitForTimeout(65);
 const start=await page.evaluate(()=>fadeTest.container.lastElementChild.getAnimations()[0].startTime);
 await page.evaluate(()=>{for(let i=0;i<30;i++)fadeTest.fade.show(fadeTest.row('latest '+i));});
 assert.equal(await page.evaluate(()=>fadeTest.container.children.length),2);
 assert.equal(await page.evaluate(()=>fadeTest.container.lastElementChild.getAnimations()[0].startTime),start,'rapid events do not restart or queue fades');
 await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>fadeTest.container.textContent),'latest 29');assert.equal(await page.evaluate(()=>fadeTest.container.children.length),1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>fadeTest.fade.show(fadeTest.row('reduced')));assert.equal(await page.evaluate(()=>fadeTest.container.getAnimations({subtree:true}).length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{fadeTest.fade.show(fadeTest.row('cancelled'));fadeTest.fade.clear();});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>fadeTest.container.children.length),0);
 assert.deepEqual(errors,[]);console.log('PASS all simulation modes, frozen snapshots, gradients, 250ms crossfade, rapid bursts, reduced motion and cleanup');
}finally{await browser.close();await new Promise(r=>server.close(r));}
