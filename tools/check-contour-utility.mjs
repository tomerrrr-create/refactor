// Contours/Separators share a utility slot; Symmetry stays independent.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.utilityTest={
 setup:()=>{pauseLife();setWindMode(false);resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%paletteLen();t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.controlsContainer.classList.remove('sim-separator-control');updateSimulationUtilityControl();symmetryMode='vertical';updateSymmetryUI();contourActionRules={sensitivity:75,lineColor:'darkest'};history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({symmetry:symmetryMode,separator:separatorPx,board:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),history:history.length,future:future.length,playing:isLifePlaying,gen:currentGenerationCount,armed:armedSimulation,macro:isMacroPlaying,logs:[...artRecipeLog]}),
 debug:()=>({loaded:isMacroLoaded,breathing:isBreathing,executing:isExecutingMacroCommand,anim:isAnimating,pointerId:pointerState.id,classes:dom.controlsContainer.className,contours:{disabled:dom.btnContoursAction.disabled,style:getComputedStyle(dom.btnContoursAction).pointerEvents}}),
 expected:()=>Simulations.runContourGeneration({n,currentBoardState:boardState,currentPalette:palette(),contourRules:contourActionRules}).map(t=>({k:t.k,v:t.v,isGold:t.isGold})),openColors:()=>modals.openColorPickerModal(),
 recipe:async()=>await createArtRecipeFile().text(),
 replay:text=>{pauseLife();setWindMode(false);macroQueue=parseMacroText(text);if(!macroQueue.some(a=>a.eventName==='CONTOUR_APPLY'))throw Error('Missing recorded contour command');currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},
 live:()=>{armSimulation('nudgeBrighter');togglePlayPauseLife();},pause:pauseLife
 };initializeApp().then(()=>utilityTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(file==='js/app.js'?source:await readFile(root+file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox'],headless:true});
try{for(const lang of ['en','he','ru','nl'].filter(l=>!process.env.UTILITY_LANG||l===process.env.UTILITY_LANG))for(const touch of [false,true].filter(t=>!process.env.UTILITY_MOUSE_ONLY||!t)){
 const ctx=await browser.newContext({viewport:{width:touch?390:1280,height:touch?844:900},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 await ctx.addInitScript(lang=>localStorage.setItem('userLanguage',lang),lang);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.utilityTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>utilityTest.setup());
 const state=()=>page.evaluate(()=>utilityTest.state()),tap=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 async function swipe(selector,dy){await page.locator(selector).click({trial:true});const r=await page.locator(selector).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 if(touch){const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/5}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:5});await page.mouse.up();}await page.waitForTimeout(80);}

 const contour='#btnContoursAction',gap='#btnGap',sym='#btnSymmetry';
 assert(await page.locator(contour).isVisible());assert(!await page.locator(gap).isVisible());assert(await page.locator(sym).isVisible());
 const contourBox=await page.locator(contour).boundingBox(),symBox=await page.locator(sym).boundingBox(),initial=await state();
 await swipe(sym,35);assert(await page.locator(contour).isVisible());assert(!await page.locator(gap).isVisible());assert.deepEqual(await state(),initial,'downward Symmetry swipe is inert');
 await swipe(contour,35);assert(!await page.locator(contour).isVisible());assert(await page.locator(gap).isVisible());assert(await page.locator(sym).isVisible());assert.deepEqual(await page.locator(gap).boundingBox(),contourBox);assert.deepEqual(await page.locator(sym).boundingBox(),symBox);assert.deepEqual(await state(),initial,'swap does not draw, log, alter history or settings');
 await swipe(gap,-35);await page.locator('#separatorCycleDialog').waitFor({state:'visible'});await tap('#btnCancelSeparatorCycle');assert.deepEqual(await state(),initial);
 await tap(gap);const separatorState=await state();assert.notEqual(separatorState.separator,initial.separator);assert.deepEqual(separatorState.board,initial.board);await tap('#btnUndo');assert.deepEqual((await state()).board,initial.board);await tap('#btnRedo');assert.equal((await state()).separator,separatorState.separator);
 await swipe(gap,35);assert(await page.locator(contour).isVisible());assert(!await page.locator(gap).isVisible());assert(await page.locator(sym).isVisible());
 await swipe(contour,-35);await page.locator('#contourSettingsModal').waitFor({state:'visible'});await tap('#btnContourSettingsCancel');
 await page.evaluate(()=>utilityTest.setup());const before=(await state()).board,expected=await page.evaluate(()=>utilityTest.expected());await tap(contour);const after=await state();assert.deepEqual(after.board,expected);assert.equal(after.history,1);assert(after.logs.some(x=>x.includes('CONTOUR_APPLY')));
 await tap('#btnUndo');assert.deepEqual((await state()).board,before);await tap('#btnRedo');assert.deepEqual((await state()).board,after.board);
 const recipe=await page.evaluate(()=>utilityTest.recipe());await page.evaluate(text=>utilityTest.replay(text),recipe);await page.waitForFunction(()=>!utilityTest.state().macro,{},{timeout:20000});assert.deepEqual((await state()).board,after.board);
 // The picker mirrors Separators only when they are exposed on the toolbar.
 await page.evaluate(()=>utilityTest.setup());await swipe(contour,35);await page.evaluate(()=>utilityTest.openColors());await page.locator('#colorPickerModal').waitFor({state:'visible'});
 const mirror='#btnColorPickerSymmetry';assert.equal(await page.locator(mirror+' .picker-gap-value').count(),1);await swipe(mirror,35);assert.equal(await page.locator(mirror+' [data-symmetry-icon]').count(),1);const beforeMirror=await state();await swipe(mirror,35);assert.deepEqual(await state(),beforeMirror);await page.evaluate(()=>document.getElementById('btnColorPickerCloseTop').click());await page.locator('#colorPickerModal').waitFor({state:'hidden'});assert(await page.locator(contour).isVisible());assert(await page.locator(sym).isVisible());
 // Utility presentation switches do not interrupt or restart a live evolution.
 await page.evaluate(()=>utilityTest.setup());await page.evaluate(()=>utilityTest.live());await page.waitForTimeout(150);const gen=(await state()).gen;
 await swipe(contour,35);assert((await state()).playing);assert(await page.locator(gap).isVisible(),JSON.stringify(await page.evaluate(()=>utilityTest.debug())));await swipe(gap,35);const live=await state();assert(live.playing);assert.equal(live.armed,'nudgeBrighter');assert(live.gen>=gen);assert.equal(live.logs.filter(x=>x.includes('CONTOUR_APPLY')).length,0);await page.evaluate(()=>utilityTest.pause());
 // Creation retains separate separator/symmetry controls and no contour button.
 await tap('#btnToggleSimMode');await page.waitForTimeout(650);assert(!await page.locator(contour).isVisible());assert(await page.locator(gap).isVisible());assert(await page.locator(sym).isVisible());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({lang,touch,passed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
