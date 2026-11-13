// Engine compatibility through real live drawing, sorting, history and TXT replay.
// Optional MAGNET_BASELINE_FILE supplies an unchanged historical engine.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const engine=await readFile(path.join(root,'dist/js/simulations/magnet.js'),'utf8');
const reference=process.env.MAGNET_BASELINE_FILE?await readFile(process.env.MAGNET_BASELINE_FILE,'utf8'):engine.replaceAll('cachedAnchors.length > 8 ? nearestAnchorMap.build(n, cachedAnchors) : null','null');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 await context.addInitScript(touch=>{localStorage.setItem('userLanguage',touch?'he':'en');Math.random=()=>.25;},touch);
 const errors=[],pages={};
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.spatialTest={
 setup:(size,method)=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Mono');currentSortMethod='reversed';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,currentSortMethod));n=size;initializeBoardAndCanvas(true);armSimulation('magnet');magnetRules={method,anchorColorIndex:method==='time_magnet'?7:-1,...(size===249?{anchorColor:'luminance'}:{})};magnetMode=method;boardState.forEach((t,i)=>{t.k=t.v=i%5===0?0:(i*7)%paletteLen();t.isGold=i%137===0;});brushSize=3;brushShape='diamond';symmetryMode='off';selectedColorIndex=paletteLen()-1;selectedColor=palette().at(-1);setBrushMode(true,true);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);togglePlayPauseLife();},
 brush:()=>{selectedColorIndex=0;selectedColor=palette()[0];},
 state:()=>({tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:!!t.isGold})),playing:isLifePlaying,gen:currentGenerationCount}),
 record:()=>artRecipeLog.join(String.fromCharCode(10)),
 replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},
 done:()=>!isMacroPlaying&&!isLifePlaying};initializeApp().then(()=>spatialTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 for(const variant of ['current','reference']){
  const page=await context.newPage();pages[variant]=page;page.on('pageerror',e=>errors.push(e.message));
  await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
  if(variant==='reference')await page.route(base+'/js/simulations/magnet.js',r=>r.fulfill({contentType:'text/javascript',body:reference}));
  await page.goto(base);await page.waitForFunction(()=>window.spatialTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 }
 for(const method of ['magnet','cosmic_magnet','time_magnet','expand'])for(const n of [61,249]){
  const origin=n===61?'reference':'current',page=pages[origin];await page.bringToFront();
  await page.evaluate(({n,method})=>spatialTest.setup(n,method),{n,method});await page.waitForFunction(()=>spatialTest.state().gen>=2);
  const cdp=touch?await context.newCDPSession(page):null;
  const stroke=async(reverse=false)=>{const r=await page.locator('#boardCanvas').boundingBox(),a={x:r.x+r.width*.3,y:r.y+r.height*(reverse?.6:.4)},b={x:r.x+r.width*.65,y:r.y+r.height*(reverse?.4:.6)};
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();}
  };
  await stroke();assert((await page.evaluate(()=>spatialTest.state())).playing);
  await page.locator('#btnCycleSort').click();await page.evaluate(()=>spatialTest.brush());await stroke(true);
  await page.waitForTimeout(60);await page.locator('#btnUndo').click();assert(!(await page.evaluate(()=>spatialTest.state())).playing);
  const journeys=[{recipe:await page.evaluate(()=>spatialTest.record()),expected:(await page.evaluate(()=>spatialTest.state())).tiles}];
  await page.locator('#btnRedo').click();journeys.push({recipe:await page.evaluate(()=>spatialTest.record()),expected:(await page.evaluate(()=>spatialTest.state())).tiles});
  assert(journeys[1].recipe.includes('DRAW_STROKE'),'native painting was recorded');
  for(const journey of journeys)for(const variant of ['current','reference']){
   const target=pages[variant];await target.bringToFront();await target.evaluate(text=>spatialTest.replay(text),journey.recipe);await target.waitForFunction(()=>spatialTest.done(),null,{timeout:20000});assert.deepEqual((await target.evaluate(()=>spatialTest.state())).tiles,journey.expected,JSON.stringify({touch,n,method,origin,variant}));
  }
  if(cdp)await cdp.detach();console.log('PASS',JSON.stringify({touch,n,method,origin,liveDrawing:true,sort:true,undoRedo:true,oldAndNewReplay:true}));
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();server.close();}
