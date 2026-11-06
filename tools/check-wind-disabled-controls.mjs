// Wind temporarily disables brush-color and Symmetry controls without changing choices.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.windTest={
 setup:()=>{pauseLife();setWindMode(false);resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%paletteLen();t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');updateSimulationUtilityControl();selectedColorIndex=5;selectedColor=palette()[5];isRainbowModeActive=false;brushSize=3;symmetryMode='vertical';updateSymmetryUI();updateColorPickerButtonUI();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({brush:{color:selectedColor,index:selectedColorIndex,rainbow:isRainbowModeActive,size:brushSize,symmetry:symmetryMode},wind:windMode,mode:windSettings.mode,settings:windSettings,board:boardState.map(t=>({k:t.k,isGold:t.isGold})),history:history.length,playing:isLifePlaying,gen:currentGenerationCount,armed:armedSimulation,macro:isMacroPlaying,logs:[...artRecipeLog]}),
 recipe:async()=>await createArtRecipeFile().text(),
 replay:text=>{pauseLife();setWindMode(false);macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},
 openColors:()=>modals.openColorPickerModal(),
 live:()=>{armSimulation('nudgeBrighter');togglePlayPauseLife();},pause:pauseLife
 };initializeApp().then(()=>windTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(file==='js/app.js'?source:await readFile(root+file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox'],headless:true});
try{for(const lang of ['en','he','ru','nl'])for(const touch of [false,true]){
 const ctx=await browser.newContext({viewport:{width:touch?390:1280,height:touch?844:900},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 await ctx.addInitScript(lang=>localStorage.setItem('userLanguage',lang),lang);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.windTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>windTest.setup());
 const state=()=>page.evaluate(()=>windTest.state()),tap=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 async function swipe(selector,dy){const r=await page.locator(selector).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 if(touch){const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/5}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:5});await page.mouse.up();}await page.waitForTimeout(80);}

 const blocked=['#btnColorPicker','#btnSymmetry'],initial=await state();
 const boxes=await Promise.all(blocked.map(id=>page.locator(id).boundingBox()));
 await tap('#btnWind');await page.waitForTimeout(450);
 for(let i=0;i<blocked.length;i++){
  const id=blocked[i],button=page.locator(id);assert(await button.isDisabled());assert.equal(await button.evaluate(e=>getComputedStyle(e).opacity),'0.18');assert.deepEqual(await button.boundingBox(),boxes[i]);
  const r=await button.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  await swipe(id,-35);await swipe(id,35);const held=await button.boundingBox();
  if(touch){const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:held.x+held.width/2,y:held.y+held.height/2}]});await page.waitForTimeout(1250);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(1250);await page.mouse.up();}
  await button.evaluate(e=>{e.click();e.dispatchEvent(new MouseEvent('click',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',altKey:true,bubbles:true}));});
  assert.deepEqual((await state()).brush,initial.brush);assert.deepEqual((await state()).board,initial.board);assert.equal((await state()).history,initial.history);assert.deepEqual((await state()).logs,initial.logs);
  assert(!await page.locator('#colorPickerModal').isVisible());
 }
 for(const id of ['#btnWind','#btnPalette','#btnCycleSort','#btnGap','#btnContoursAction'])assert(await page.locator(id).isEnabled());
 await page.evaluate(()=>windTest.openColors());await page.locator('#colorPickerModal').waitFor({state:'visible'});
 const mirror=page.locator('#btnColorPickerSymmetry');assert(await mirror.isDisabled());assert.equal(await mirror.evaluate(e=>getComputedStyle(e).opacity),'0.18');await mirror.evaluate(e=>{e.click();e.dispatchEvent(new MouseEvent('click',{bubbles:true}));});assert.deepEqual((await state()).brush,initial.brush);
 await page.evaluate(()=>document.getElementById('btnColorPickerCloseTop').click());await page.locator('#colorPickerModal').waitFor({state:'hidden'});
 // Availability stays consistent through all three Wind effects and its Off slot.
 for(let i=0;i<3;i++){await tap('#btnWind');const on=(await state()).wind;for(const id of blocked)assert.equal(await page.locator(id).isDisabled(),on);assert.deepEqual((await state()).brush,initial.brush);}
 assert(!(await state()).wind);for(const id of blocked)assert(await page.locator(id).isEnabled());
 await tap('#btnColorPicker');assert.notEqual((await state()).brush.index,initial.brush.index);await tap('#btnSymmetry');assert.notEqual((await state()).brush.symmetry,initial.brush.symmetry);
 // Escape and returning to Creation also release exactly the same controls.
 await tap('#btnWind');await page.keyboard.press('Escape');for(const id of blocked)assert(await page.locator(id).isEnabled());
 await tap('#btnWind');await tap('#btnToggleSimMode');await page.waitForTimeout(650);assert(!(await state()).wind);for(const id of blocked)assert(await page.locator(id).isEnabled());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({lang,touch,passed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
