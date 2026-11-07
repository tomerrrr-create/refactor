// Native touch regression check. Touch events are delivered through Chromium's
// input pipeline, not dispatchEvent, so browser scrolling is exercised too.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.UNDO_ARTIFACTS||'/tmp/live-brush-undo';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results=[];
try{for(const config of [{width:1280,height:900,touch:false},{width:390,height:844,touch:true}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.touch,hasTouch:config.touch,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('function checkpointLiveSimulation() {','function checkpointLiveSimulation() { const checkpointTime=performance.now();');
 source=source.replace('    simulationStartState = boundary;','    (window.boundaries??=[]).push(boundary);(window.checkpointTimes??=[]).push(performance.now()-checkpointTime);simulationStartState = boundary;');
 source=source.replace('      initializeApp();',`window.undoTest={setup:(size,sim)=>{pauseLife();activePaletteIndex=0;currentSortMethod='luminance';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,currentSortMethod));n=size;initializeBoardAndCanvas(true);if(armedSimulation!==sim)armSimulation(sim);if(sim==='gameOfLife')setPersonalGameOfLifeRules({survival:[2,3],birth:[3]});if(sim==='gravitationalSort')gravitationalSortRules={direction:'up',strength:1};boardState.forEach((t,i)=>{t.k=t.v=i%5===0?0:(i*7)%paletteLen();t.isGold=false;});brushSize=3;brushShape='diamond';symmetryMode='off';selectedColorIndex=paletteLen()-1;selectedColor=palette().at(-1);setBrushMode(true,true);history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;window.boundaries=[];window.checkpointTimes=[];logCurrentStateAsInit();renderToScreen(null);togglePlayPauseLife();},state:()=>({n,tiles:boardState.map(t=>({k:t.k,isGold:t.isGold,v:t.v})),playing:isLifePlaying,gen:currentGenerationCount,boundary:window.boundaries.at(-1)?.tiles,checkpoints:window.boundaries.length,times:window.checkpointTimes,future:future.at(-1)?.after.tiles}),record:()=>artRecipeLog.join(String.fromCharCode(10)),replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},debug:()=>({playing:isLifePlaying,macro:isMacroPlaying,index:currentMacroStep,total:macroQueue.length,gen:currentGenerationCount,armed:armedSimulation,next:macroQueue.slice(currentMacroStep,currentMacroStep+3)}),done:()=>!isMacroPlaying&&!isLifePlaying};initializeApp().then(()=>undoTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.undoTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const cdp=config.touch?await context.newCDPSession(page):null;
 const stroke=async()=>{
  const r=await page.locator('#boardCanvas').boundingBox(),a={x:r.x+r.width*.3,y:r.y+r.height*.45},b={x:r.x+r.width*.65,y:r.y+r.height*.55};
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5}]});}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();}
 };
 for(const sim of ['gameOfLife','gravitationalSort'])for(const n of [21,249]){
  await page.evaluate(({n,sim})=>undoTest.setup(n,sim),{n,sim});await page.waitForTimeout(80);
  await stroke();let state=await page.evaluate(()=>undoTest.state());assert.equal(state.checkpoints,1);assert(state.playing);const boundary=state.boundary;
  await page.waitForTimeout(60);await page.locator('#btnUndo').click();state=await page.evaluate(()=>undoTest.state());assert(!state.playing);assert.deepEqual(state.tiles,boundary,`${sim}/${n} Undo returns exactly before drawing`);
  const undoRecipe=await page.evaluate(()=>undoTest.record()),after=state.future;
  await page.locator('#btnRedo').click();assert.deepEqual((await page.evaluate(()=>undoTest.state())).tiles,after);
  const redoRecipe=await page.evaluate(()=>undoTest.record());
  for(const [recipe,expected] of [[undoRecipe,boundary],[redoRecipe,after]]){
   await page.evaluate(text=>undoTest.replay(text),recipe);try{await page.waitForFunction(()=>undoTest.done(),{},{timeout:15000});}catch(error){console.log('DEBUG',JSON.stringify(await page.evaluate(()=>undoTest.debug())));await writeFile(path.join(artifacts,'failed-recipe.txt'),recipe);throw error;}
   assert.deepEqual((await page.evaluate(()=>undoTest.state())).tiles,expected,`${sim}/${n} macro reproduces Undo/Redo`);
  }
  results.push({...config,n,sim,checkpointMs:state.times[0]});console.log('PASS',JSON.stringify(results.at(-1)));
 }
 // Two consecutive strokes: each Undo stops at its own boundary, including
 // the intermediate Redo recipe whose segment ends at the next checkpoint.
 await page.evaluate(()=>undoTest.setup(21,'gameOfLife'));await page.waitForTimeout(80);await stroke();
 const firstBoundary=(await page.evaluate(()=>undoTest.state())).boundary;
 await page.waitForTimeout(80);await stroke();const secondBoundary=(await page.evaluate(()=>undoTest.state())).boundary;
 await page.waitForTimeout(60);const edits=[];
 for(const action of ['Undo','Undo','Redo','Redo']){
  await page.locator('#btn'+action).click();const state=await page.evaluate(()=>undoTest.state());edits.push({recipe:await page.evaluate(()=>undoTest.record()),tiles:state.tiles});
 }
 assert.deepEqual(edits[0].tiles,secondBoundary);assert.deepEqual(edits[1].tiles,firstBoundary);assert.deepEqual(edits[2].tiles,secondBoundary);
 for(const edit of edits){await page.evaluate(text=>undoTest.replay(text),edit.recipe);await page.waitForFunction(()=>undoTest.done(),{},{timeout:15000});assert.deepEqual((await page.evaluate(()=>undoTest.state())).tiles,edit.tiles,'repeated Undo/Redo macro reaches the exact boundary');}
 for(const sim of ['breathe','turing','islands']){
  await page.evaluate(sim=>undoTest.setup(21,sim),sim);await page.waitForTimeout(80);await stroke();const boundary=(await page.evaluate(()=>undoTest.state())).boundary;
  await page.waitForTimeout(40);await page.locator('#btnUndo').click();const stopped=await page.evaluate(()=>undoTest.state());assert(!stopped.playing);assert.deepEqual(stopped.tiles,boundary,sim+' restores exact brush boundary');
  await page.locator('#btnRedo').click();assert.deepEqual((await page.evaluate(()=>undoTest.state())).tiles,stopped.future);
 }
 assert.deepEqual(errors,[]);await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
