// Real resize gestures, drawing, history and recipe replay on desktop/mobile.
// Setup/state hooks exist only in intercepted browser responses.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('      initializeApp();',`window.resizeTest={
 setup:(sim=null)=>{pauseLife();resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%7;t.isGold=i===0;});if(sim)armSimulation(sim);brushSize=1;brushShape='circle';symmetryMode='off';selectedColorIndex=10;selectedColor=palette()[10];setBrushMode(true,false);history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({direction:resizeIncreasing,logs:[...artRecipeLog],n,tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),anim:isAnimating,playing:isLifePlaying,gen:currentGenerationCount,history:history.length,future:future.length,loaded:isMacroLoaded,macro:isMacroPlaying}),
 paintColor:index=>{selectedColorIndex=index;selectedColor=palette()[index];updateColorPickerButtonUI();},
 play:togglePlayPauseLife,pause:pauseLife,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro
 };initializeApp().then(()=>resizeTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1280,height:900,lang:'en',touch:false},{width:390,height:844,lang:'he',touch:true}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.touch,isMobile:config.touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.resizeTest?.ready);
 const state=()=>page.evaluate(()=>resizeTest.state()),board=s=>({n:s.n,tiles:s.tiles});
 const tap=target=>config.touch?target.tap():target.click();
 async function resizeGesture(dy){
  const r=await page.locator('#btnResizeUp').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(config.touch){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/5}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:5});await page.mouse.up();}
  await page.waitForTimeout(350);
 }
 async function resizeInDirection(method){
  const button=page.locator('#btnResizeUp'),direction=method==='up'?'increase':'decrease';
  if(await button.getAttribute('data-resize-direction')!==direction)await resizeGesture(35);
  assert.equal(await button.getAttribute('data-resize-direction'),direction);await tap(button);
 }


 assert.equal(await page.locator('#btnResizeDown').isVisible(),false);
 await page.evaluate(()=>resizeTest.setup());const untouched=await state();
 const resizeButton=page.locator('#btnResizeUp');await page.evaluate(()=>window.originalResizeSvg=document.querySelector('#btnResizeUp svg'));
 assert.equal(await resizeButton.getAttribute('data-resize-direction'),'increase');
 await resizeGesture(35);const minus=await state();assert.equal(minus.direction,false);
 assert.deepEqual(board(minus),board(untouched));assert.equal(minus.history,untouched.history);assert.deepEqual(minus.logs,untouched.logs);
 assert.equal(await resizeButton.locator('[data-resize-plus-stem]').isVisible(),false);
 await tap(page.locator('#btnToggleSimMode'));await page.waitForTimeout(1100);
 assert.equal(await resizeButton.getAttribute('data-resize-direction'),'decrease');assert.equal(await page.locator('#btnResizeDown').isVisible(),false);
 await resizeGesture(35);assert.equal((await state()).direction,true);
 assert(await page.evaluate(()=>document.querySelector('#btnResizeUp svg')===originalResizeSvg));
 assert.equal(await page.locator('.preset-swipe-feedback:visible').count(),0);
 await resizeGesture(35);await page.reload();await page.waitForFunction(()=>window.resizeTest?.ready);
 assert.equal(await resizeButton.getAttribute('data-resize-direction'),'increase','direction resets only on fresh app load');
 for(const sim of [null,'contour','contour-live','cymatics','nudgeBrighter'])for(const method of ['up','down','custom']){
  await page.evaluate(sim=>resizeTest.setup(sim),sim==='contour-live'?'contour':sim);const initial=board(await state());const live=sim==='nudgeBrighter'||sim==='contour-live';
  if(live){await page.evaluate(()=>resizeTest.play());await page.waitForFunction(()=>resizeTest.state().gen>=2);}
  if(method==='custom'){
   await resizeGesture(-35);await page.locator('#resizeInput').fill('31');await tap(page.locator('#btnConfirmResize'));
  }else await resizeInDirection(method);
  await page.waitForFunction(()=>!resizeTest.state().anim&&resizeTest.state().n!==21);if(live)await page.evaluate(()=>resizeTest.pause());
  const resized=board(await state());assert.equal(resized.n,method==='up'?27:method==='down'?15:31);
  await page.evaluate(index=>resizeTest.paintColor(index),((resized.tiles[Math.floor(resized.n*.4)*resized.n+Math.floor(resized.n*.4)].k+1)%23));
  const canvas=page.locator('#boardCanvas'),r=await canvas.boundingBox(),position={x:r.width*(Math.floor(resized.n*.4)+.5)/resized.n,y:r.height*(Math.floor(resized.n*.4)+.5)/resized.n};
  if(config.touch)await canvas.tap({position});else await canvas.click({position});const drawn=board(await state());assert.notDeepEqual(drawn,resized,`${config.lang}/${sim}/${method}: drawing changes a tile`);
  await tap(page.locator('#btnUndo'));assert.deepEqual(board(await state()),resized,'first Undo removes only drawing');
  if(!live){await tap(page.locator('#btnUndo'));assert.deepEqual(board(await state()),initial,'second Undo restores original dimensions and cropped/padded pixels');}
  for(let count=0;(await state()).history;count++){assert(count<20);await tap(page.locator('#btnUndo'));}
  assert.deepEqual(board(await state()),initial);
  for(let count=0;(await state()).future;count++){assert(count<20);await tap(page.locator('#btnRedo'));}
  assert.deepEqual(board(await state()),drawn,'Redo restores the complete result');
  const recipe=await page.evaluate(()=>resizeTest.recipe());await page.locator('#projectFileInput').setInputFiles({name:'resize-history.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>resizeTest.state().loaded);await page.evaluate(()=>resizeTest.macro());await page.waitForFunction(()=>!resizeTest.state().loaded&&!resizeTest.state().macro&&!resizeTest.state().playing,null,{timeout:30000});assert.deepEqual(board(await state()),drawn,'history recipe replay preserves resize and painting');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({lang:config.lang,sim,method,passed:true}));
 }
 await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
