// Real panel entry/exit, simultaneous touches, artwork/history and recipe replay.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const artifacts = '/tmp/baby-mode-check'; await mkdir(artifacts, { recursive: true });
let source = await readFile(root + 'js/app.js', 'utf8');
source = source.replace('      initializeApp();', `window.babyTest={
 setup:(size=11,panel=false)=>{pauseLife();setWindMode(false);resetArmedState();n=size;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=1+i%(paletteLen()-1);t.isGold=i===0;});isSimModeActive=panel;dom.controlsContainer.classList.toggle('sim-mode-active',panel);dom.btnPlayPauseLife.classList.toggle('control-hidden',!panel);updateSimulationUtilityControl();symmetryMode='vertical';updateSymmetryUI();brushSize=3;selectedColorIndex=5;selectedColor=palette()[5];isRainbowModeActive=false;updateColorPickerButtonUI();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);updateLayout();},
 state:()=>({baby:isBabyMode,n,sort:currentSortMethod,rainbow:isRainbowModeActive,brush:brushSize,shape:brushShape,panel:isSimModeActive,symmetry:symmetryMode,selected:selectedColorIndex,wind:windMode,mode:windSettings.mode,playing:isLifePlaying,armed:armedSimulation,gen:currentGenerationCount,board:boardState.map(t=>({hex:palette()[t.k],gold:!!t.isGold})),history:history.length,future:future.length,layout:[...evolutionSlots],logs:[...artRecipeLog],macro:isMacroPlaying,loaded:isMacroLoaded}),
 tech:()=>modals.openTechnicianMenu(),undo,redo,pause:pauseLife,
 recipe:async()=>await createArtRecipeFile().text(),
 replay:text=>{pauseLife();setWindMode(false);macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();}
 };initializeApp().then(()=>babyTest.ready=true);`);
for (const ms of [5000,1500,2000]) source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(file==='js/app.js'?source:await readFile(root+file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try {
for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.BABY_LANG||process.env.BABY_LANG===c.lang)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:true,isMobile:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);localStorage.setItem('colorGridInterfaceZoom','90');},config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.babyTest?.ready);
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>babyTest.state());
 const visibleControls=()=>page.locator('#controlsContainer > button').evaluateAll(buttons=>buttons.filter(b=>getComputedStyle(b).display!=='none'&&getComputedStyle(b).visibility!=='hidden').map(b=>b.id).sort());
 const tap=async selector=>page.locator(selector).click();
 async function enter(size=11,panel=false){
  await page.evaluate(({size,panel})=>babyTest.setup(size,panel),{size,panel});const before=await state();await page.evaluate(()=>babyTest.tech());
  assert.equal(await page.locator('.technician-branches a').count(),2);
  for(const a of await page.locator('.technician-branches a').all()) {assert.equal(await a.getAttribute('target'),'_blank');assert((await a.getAttribute('href')).startsWith('https://'));}
  await tap('#btnBabyMode');assert((await state()).baby);return before;
 }
 async function unlock(confirm=true){
  const lock=page.locator('#btnBabyExit');await lock.hover();await page.mouse.down();await page.waitForTimeout(3150);await page.mouse.up();
  await page.locator('#babyExitDialog').waitFor({state:'visible'});await tap('#babyExitDialog '+(confirm?'[data-confirm]':'[data-cancel]'));
 }
 async function strokeTwo(checkPausedHistory=true){
  const r=await page.locator('#boardCanvas').boundingBox(),cdp=await context.newCDPSession(page);
  const point=(id,x,y)=>({id,x:r.x+r.width*x,y:r.y+r.height*y});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,.15,.2)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,.15,.2),point(2,.15,.75)]});
  for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,.15+.1*i,.2),point(2,.15+.1*i,.75)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point(2,.55,.75)]});
  const partial=await state();if(checkPausedHistory)assert.equal(partial.history,1,'entry only, group remains open after first lift');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(2,.75,.75)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }
 const before=await enter(),entered=await state();
 assert.equal(entered.n,249);assert.equal(entered.sort,'dark-rainbow');assert(entered.rainbow);assert(!entered.playing);assert.equal(entered.armed,'brightnessEvo');assert.equal(entered.symmetry,'off');assert.deepEqual(entered.layout,before.layout);
 for(let row=0;row<11;row++)for(let col=0;col<11;col++)assert.deepEqual(entered.board[(119+row)*249+119+col],before.board[row*11+col],'original artwork centered without resampling');
 assert.equal(entered.board.filter(t=>t.gold).length,1);
 assert.deepEqual(await visibleControls(),['btnColorPicker','btnPlayPauseLife','btnWind','btnBrightnessEvo','btnIslands','btnGravitationalSort','btnNudgeBrighter'].sort());
 assert.equal(await page.locator('#btnStepForward').isVisible(),false);
 await page.evaluate(()=>babyTest.tech());assert.equal(await page.locator('#technicianDialog').evaluate(e=>e.open),false,'technicians unavailable');
 // Brief holds do not unlock; cancelling a completed hold retains Baby mode.
 await page.locator('#btnBabyExit').click({delay:200});assert.equal(await page.locator('#babyExitDialog').evaluate(e=>e.open),false);
 await unlock(false);assert((await state()).baby);
 await strokeTwo();const painted=await state();assert.equal(painted.history,2);assert.notDeepEqual(painted.board,entered.board);
 const packets=painted.logs.filter(line=>line.includes(' DRAW_STROKE -> ')).map(line=>JSON.parse(line.split(' DRAW_STROKE -> ')[1]));
 assert(packets.flat().some(t=>Math.floor(t.i/249)<65),'first finger recorded');assert(packets.flat().some(t=>Math.floor(t.i/249)>170),'second finger recorded');
 await page.evaluate(()=>babyTest.undo());assert.deepEqual((await state()).board,entered.board);
 await page.evaluate(()=>babyTest.redo());assert.deepEqual((await state()).board,painted.board);
 // Wind retains its existing cycle and disables color selection only while active.
 for(const mode of ['ripple','paint','displace','off']){await tap('#btnWind');assert.equal((await state()).wind,mode!=='off');assert.equal(await page.locator('#btnColorPicker').isDisabled(),mode!=='off');if(mode!=='off')assert.equal((await state()).mode,mode);}
 await tap('#btnColorPicker');await page.locator('#colorPickerModal.modal-visible').waitFor();
 assert.equal(await page.locator('#btnColorPickerSort').isVisible(),false);
 await tap('[data-brush-size="7"]');assert.equal((await state()).brush,7);
 await tap('[data-brush-shape="ring"]');assert.equal((await state()).shape,'ring');
 await tap('#btnColorPickerPalette');await page.locator('#paletteModal.modal-visible').waitFor();
 await tap('#btnPaletteModalClose');await page.locator('#paletteModal').waitFor({state:'hidden'});
 // Compare paused multitouch recipe before running stochastic evolutions.
 const recipe=await page.evaluate(()=>babyTest.recipe());
 await page.screenshot({path:artifacts+'/'+config.lang+'-baby.png'});
 await unlock();const exited=await state();assert(!exited.baby);assert.equal(exited.n,249);assert.deepEqual(exited.board,painted.board);assert.equal(exited.panel,before.panel);assert.deepEqual(exited.layout,before.layout);assert.equal(exited.symmetry,before.symmetry);
 await page.evaluate(text=>babyTest.replay(text),recipe);await page.waitForFunction(()=>!babyTest.state().loaded&&!babyTest.state().macro,null,{timeout:60000});assert.deepEqual((await state()).board,painted.board,'multitouch recipe replays artwork');
 // Cropping centers a larger board too, with the existing simulation panel restored.
 const large=await enter(251,true),cropped=await state();assert.deepEqual(cropped.board[0],large.board[252]);assert.deepEqual(cropped.board.at(-1),large.board[249*251+249]);
 await tap('#btnPlayPauseLife');await page.waitForFunction(()=>babyTest.state().gen>=2);
 await strokeTwo(false);assert((await state()).playing,'simultaneous drawing leaves playback running');
 await tap('#btnPlayPauseLife');const livePainted=await state(),liveRecipe=await page.evaluate(()=>babyTest.recipe());
 await page.evaluate(()=>babyTest.undo());await page.evaluate(()=>babyTest.redo());assert.deepEqual((await state()).board,livePainted.board,'live multitouch redo restores combined result');
 await tap('#btnPlayPauseLife');
 for(const id of ['btnIslands','btnGravitationalSort','btnNudgeBrighter','btnBrightnessEvo']){await tap('#'+id);assert((await state()).playing,'handoff keeps playback running');}
 await tap('#btnPlayPauseLife');assert(!(await state()).playing);
 await tap('#btnWind');await unlock();assert(!(await state()).wind);assert((await state()).panel);
 assert.equal(await page.locator('#btnBabyExit').isVisible(),false);assert.equal(await page.locator('#btnEvolutionDrawer').isVisible(),true);
 assert.equal(await page.locator('#btnEvolutionDrawer').isEnabled(),true,'drawer navigation is restored on exit');
 await writeFile(artifacts+'/'+config.lang+'-live.txt',liveRecipe);await writeFile(artifacts+'/'+config.lang+'-live-expected.json',JSON.stringify(livePainted));await page.evaluate(text=>babyTest.replay(text),liveRecipe);await page.waitForFunction(()=>!babyTest.state().loaded&&!babyTest.state().macro,null,{timeout:60000});const replayed=await state();await writeFile(artifacts+'/'+config.lang+'-live-actual.json',JSON.stringify(replayed));const different=replayed.board.flatMap((t,i)=>t.hex!==livePainted.board[i].hex||t.gold!==livePainted.board[i].gold?[i]:[]);assert.equal(different.length,0,'live multitouch recipe: '+JSON.stringify({different:different.slice(0,12),expectedGen:livePainted.gen,actualGen:replayed.gen,expectedArmed:livePainted.armed,actualArmed:replayed.armed}));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await context.close();
}
} finally {await browser.close();await new Promise(r=>server.close(r));}
