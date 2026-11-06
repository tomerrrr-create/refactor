// DLA dimensions, drawing and one-shot Contours history on desktop and mobile.
// Only test responses expose hooks; runtime/PRNG are not serialized by DLA.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace("    performAction(() => {\n        window.logArtEvent('CONTOUR_APPLY'","    window.dlaContourBefore=getCurrentState();\n    performAction(() => {\n        window.logArtEvent('CONTOUR_APPLY'");
source=source.replace('      initializeApp();',`window.dlaHistory={
 setup:genetics=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.colors.length===23);updatePaletteHeader();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=Math.floor(i%21/5)%2?12:3;t.isGold=false;});armSimulation('dla');dlaMode=genetics?'genetics':'no-genetics';dlaRules.colorGenetics=genetics;contourActionRules={sensitivity:75,lineColor:'darkest'};isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();brushSize=1;brushShape='circle';symmetryMode='off';setBrushMode(true,false);history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({n,tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),anim:isAnimating,playing:isLifePlaying,mode:dlaMode,history:history.length,future:future.length,gen:currentGenerationCount,armed:armedSimulation,loaded:isMacroLoaded,macro:isMacroPlaying}),
 runtime:()=>({n:dlaState?.n,walkers:dlaState?.walkers.length,empty:dlaState?.emptyIndices.length,valid:!!dlaState&&dlaState.crystal.size===boardState.filter(t=>t.k>0&&!t.isGold).length&&[...dlaState.crystal].every(i=>i>=0&&i<n*n&&boardState[i].k>0&&!boardState[i].isGold)&&dlaState.emptyIndices.every(i=>i>=0&&i<n*n&&(boardState[i].k===0||boardState[i].isGold))&&dlaState.walkers.every(w=>w.x>=0&&w.x<n&&w.y>=0&&w.y<n)}),
 paintColor:i=>{selectedColorIndex=i;selectedColor=palette()[i];updateColorPickerButtonUI();},
 expected:()=>Simulations.runContourGeneration({n,currentBoardState:boardState,currentPalette:palette(),contourRules:contourActionRules}).map(t=>({k:t.k,v:t.v,isGold:t.isGold})),
 resize:resizeBoard,disarm:resetArmedState,contourBefore:()=>window.dlaContourBefore,
 play:togglePlayPauseLife,pause:pauseLife,step:stepForward,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro
 };initializeApp().then(()=>dlaHistory.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1280,height:900,lang:'en',touch:false},{width:390,height:844,lang:'he',touch:true}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.touch,isMobile:config.touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.dlaHistory?.ready);
 const state=()=>page.evaluate(()=>dlaHistory.state()),board=s=>({n:s.n,tiles:s.tiles}),tap=t=>config.touch?t.tap():t.click();

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
 async function undo(){await tap(page.locator('#btnUndo'));}async function redo(){await tap(page.locator('#btnRedo'));}
 for(const genetics of (process.env.DLA_CONTOURS_ONLY?[]:[true,false]))for(const live of [false,true])for(const method of ['up','down','custom']){
  await page.evaluate(g=>dlaHistory.setup(g),genetics);const initial=board(await state());
  if(live){await page.evaluate(()=>dlaHistory.play());await page.waitForFunction(()=>dlaHistory.state().gen>=2);}
  if(method==='custom'){await resizeGesture(-35);await page.locator('#resizeInput').fill('31');await tap(page.locator('#btnConfirmResize'));}
  else await resizeInDirection(method);
  await page.waitForFunction(()=>!dlaHistory.state().anim&&dlaHistory.state().n!==21);if(live)await page.evaluate(()=>dlaHistory.pause());
  const resized=board(await state()),cell=Math.floor(resized.n*.4),index=cell*resized.n+cell;
  await page.evaluate(i=>dlaHistory.paintColor(i),(resized.tiles[index].k+1)%23);
  const canvas=page.locator('#boardCanvas'),r=await canvas.boundingBox(),position={x:r.width*(cell+.5)/resized.n,y:r.height*(cell+.5)/resized.n};if(config.touch)await canvas.tap({position});else await canvas.click({position});const drawn=board(await state());assert.notDeepEqual(drawn,resized);
  const expected=await page.evaluate(()=>dlaHistory.expected()),history=(await state()).history;assert.notDeepEqual(expected,drawn.tiles,'fixture contains visible contour boundaries');await tap(page.locator('#btnContoursAction'));const outlined=board(await state());assert.deepEqual(outlined.tiles,expected);assert.equal((await state()).history,history+1,'Contours owns exactly one action');assert.equal((await state()).playing,false);assert.equal((await state()).armed,'dla');
  await undo();assert.deepEqual(board(await state()),drawn,'Undo Contours restores exact painted board');await undo();assert.deepEqual(board(await state()),resized,'Undo drawing preserves resize');
  for(let i=0;(await state()).history;i++){assert(i<20);await undo();}assert.deepEqual(board(await state()),initial,'Undo reaches original board dimensions and pixels');const undoneRecipe=await page.evaluate(()=>dlaHistory.recipe());
  for(let i=0;(await state()).future;i++){assert(i<20);await redo();}assert.deepEqual(board(await state()),outlined,'Redo restores resize, painting and Contours in order');
  const redoRecipe=await page.evaluate(()=>dlaHistory.recipe());assert(redoRecipe.includes('GRID_RESIZE'));assert(redoRecipe.includes('CONTOUR_APPLY'));assert(redoRecipe.includes('UNDO'));assert(redoRecipe.includes('REDO'));
  await page.evaluate(()=>dlaHistory.step());const runtime=await page.evaluate(()=>dlaHistory.runtime());assert.equal(runtime.n,outlined.n);assert(runtime.valid,'DLA resumes using only current-board indices and walkers');
  const stepRecipe=await page.evaluate(()=>dlaHistory.recipe());assert(stepRecipe.includes('STEP FORWARD'));
  for(const [name,recipe,expectedSize,exact] of [['undo',undoneRecipe,21,initial],['redo',redoRecipe,outlined.n,live?null:outlined],['step',stepRecipe,outlined.n,null]]){
   await page.locator('#projectFileInput').setInputFiles({name:'dla-'+name+'.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>dlaHistory.state().loaded);await page.evaluate(()=>dlaHistory.macro());await page.waitForFunction(()=>!dlaHistory.state().loaded&&!dlaHistory.state().macro&&!dlaHistory.state().playing,null,{timeout:30000});
   const replayed=await state();assert.equal(replayed.n,expectedSize,`${name} replay dimensions`);assert.equal(replayed.tiles.length,expectedSize**2);assert(replayed.tiles.every(t=>Number.isInteger(t.k)&&t.k>=0&&t.k<23));if(exact)assert.deepEqual(board(replayed),exact,`${name} replay without retained random DLA growth is exact`);
   if(name==='step'){assert.equal(replayed.armed,'dla');assert.equal(replayed.mode,genetics?'genetics':'no-genetics');assert((await page.evaluate(()=>dlaHistory.runtime())).valid,'replayed step retains coherent DLA indices');}
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({lang:config.lang,genetics,live,method,passed:true,loggerAndThreeReplays:true}));
 }
 // Exhausted DLA + Contours must restart growth, and Undo/Redo must retain each
 // visible result. DLA's later random evolution is not an exact replay promise.
 for(const genetics of [true,false]){
  await page.evaluate(g=>dlaHistory.setup(g),genetics);assert.equal((await page.evaluate(()=>dlaHistory.runtime())).walkers,0);const full=board(await state()),expected=await page.evaluate(()=>dlaHistory.expected());
  await page.evaluate(()=>dlaHistory.play());await page.waitForFunction(()=>dlaHistory.state().gen>=2);await tap(page.locator('#btnContoursAction'));const outlined=board(await state());assert.deepEqual(outlined.tiles,expected);assert(!(await state()).playing);let runtime=await page.evaluate(()=>dlaHistory.runtime());assert(runtime.walkers>0&&runtime.empty>0&&runtime.valid,'Contours reopens exhausted DLA growth');
  await undo();assert.deepEqual(board(await state()),full);await redo();assert.deepEqual(board(await state()),outlined);
  const history=(await state()).history,recipe=await page.evaluate(()=>dlaHistory.recipe());
  // This run began on a full board, so DLA did not change its pixels; replay of
  // that recording and the deterministic Contours operation must be exact.
  await page.locator('#projectFileInput').setInputFiles({name:'dla-contours.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>dlaHistory.state().loaded);await page.evaluate(()=>dlaHistory.macro());await page.waitForFunction(()=>!dlaHistory.state().loaded&&!dlaHistory.state().macro&&!dlaHistory.state().playing,null,{timeout:30000});assert.deepEqual(board(await state()),outlined);
  await page.evaluate(()=>dlaHistory.play());await page.waitForFunction(()=>dlaHistory.state().gen>=5);await page.evaluate(()=>dlaHistory.pause());assert((await state()).tiles.filter(t=>t.k>0).length>outlined.tiles.filter(t=>t.k>0).length,'DLA really grows into reopened cells');assert((await state()).history>0&&history>0);assert.deepEqual(errors,[]);
  // Contours during genuinely growing DLA owns a separate Undo action.
  await page.evaluate(()=>dlaHistory.resize(81));await page.waitForFunction(()=>!dlaHistory.state().anim&&dlaHistory.state().n===81);const beforeRun=board(await state());
  await page.evaluate(()=>dlaHistory.play());await page.waitForFunction(()=>dlaHistory.state().gen>=2);await tap(page.locator('#btnContoursAction'));const withContours=board(await state()),captured=await page.evaluate(()=>dlaHistory.contourBefore());
  assert.notDeepEqual(board(captured),beforeRun,'DLA changed pixels before Contours');assert(!(await state()).playing);await undo();assert.deepEqual(board(await state()),board(captured),'Undo removes only Contours from a growing DLA run');await undo();assert.deepEqual(board(await state()),beforeRun,'next Undo removes the preceding DLA run');await redo();await redo();assert.deepEqual(board(await state()),withContours);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({lang:config.lang,genetics,recoveryAndContoursReplay:true,growingDlaContoursUndo:true}));
 }
 // The same utility is an independent action with no simulation selected.
 await page.evaluate(()=>{dlaHistory.setup(true);dlaHistory.disarm();});const plain=board(await state()),plainExpected=await page.evaluate(()=>dlaHistory.expected());await tap(page.locator('#btnContoursAction'));const plainOutlined=board(await state());assert.deepEqual(plainOutlined.tiles,plainExpected);await undo();assert.deepEqual(board(await state()),plain);await redo();assert.deepEqual(board(await state()),plainOutlined);assert.deepEqual(errors,[]);
 await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
