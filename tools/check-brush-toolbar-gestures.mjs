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
 async function swipe(selector,dy,dx=0){const r=await page.locator(selector).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 if(touch){const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up();}await page.waitForTimeout(80);}


 const initial=await state(),sizes=[1,3,5,7,9,11,13,15,23];
 const color=page.locator('#btnColorPicker');
 const label=size=>size===23?'XL':String(size);
 for(const direction of [1,-1,-1,-1,1]){
  const before=await state(),expected=sizes[(sizes.indexOf(before.brush.size)+direction+sizes.length)%sizes.length];
  await swipe('#btnColorPicker',0,direction*45);
  const after=await state();assert.equal(after.brush.size,expected);assert.equal(await color.textContent(),label(expected));
  assert.equal(after.brush.index,before.brush.index);assert.equal(after.brush.rainbow,before.brush.rainbow);assert.equal(after.brush.symmetry,before.brush.symmetry);
  assert.deepEqual(after.board,before.board);assert.equal(after.history,before.history);
 }
 await page.waitForTimeout(950);assert.equal(await color.locator('svg').count(),1,'feedback restores color icon');
 const beforeClear=await state();await swipe('#btnColorPicker',40);const cleared=await state();
 assert.equal(cleared.brush.color,null);assert.equal(cleared.brush.index,-1);assert(!cleared.brush.rainbow);assert.equal(cleared.brush.size,beforeClear.brush.size);assert.equal(cleared.brush.symmetry,beforeClear.brush.symmetry);
 await swipe('#btnColorPicker',0,45);assert.equal((await state()).brush.index,-1,'size change does not select a color');
 await tap('#btnColorPicker');assert.notEqual((await state()).brush.index,-1,'tap still selects a color');
 const previous=(await state()).brush.size;await swipe('#btnPalette',0,45);assert.equal((await state()).brush.size,sizes[(sizes.indexOf(previous)+1)%sizes.length]);assert.equal(await page.locator('#btnPalette').textContent(),label((await state()).brush.size));
 await page.waitForTimeout(950);
 await swipe('#btnColorPicker',-40);await page.locator('#colorPickerModal').waitFor({state:'visible'});await page.locator('#btnColorPickerCloseTop').click();await page.waitForTimeout(350);
 const brush=await state();
 for(let effect=0;effect<3;effect++){
  for(let i=0;i<=effect;i++)await tap('#btnWind');
  assert((await state()).wind);assert(await color.isDisabled());assert(await page.locator('#btnSymmetry').isDisabled());
  await swipe('#btnWind',40);const off=await state();assert(!off.wind);assert(await color.isEnabled());assert(await page.locator('#btnSymmetry').isEnabled());assert.deepEqual(off.brush,brush.brush);
 }
 await page.evaluate(()=>windTest.live());await page.waitForTimeout(100);const generation=(await state()).gen;
 await tap('#btnWind');await swipe('#btnWind',40);assert(!(await state()).wind);assert((await state()).playing);assert((await state()).gen>=generation);await page.evaluate(()=>windTest.pause());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({lang,touch,gesturesPassed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
