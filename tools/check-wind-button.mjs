// Dedicated Wind control: real mouse/touch gestures, history and recorded replay.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let source=await readFile(root+'js/app.js','utf8');
source=source.replace('      initializeApp();',`window.windTest={
 setup:()=>{pauseLife();setWindMode(false);resetArmedState();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%paletteLen();t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');updateSimulationUtilityControl();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();renderToScreen(null);},
 state:()=>({wind:windMode,mode:windSettings.mode,settings:windSettings,board:boardState.map(t=>({k:t.k,isGold:t.isGold})),history:history.length,playing:isLifePlaying,gen:currentGenerationCount,armed:armedSimulation,macro:isMacroPlaying,logs:[...artRecipeLog]}),
 recipe:async()=>await createArtRecipeFile().text(),
 replay:text=>{pauseLife();setWindMode(false);macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},
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
 assert.deepEqual(await page.locator('#btnWind').evaluate(e=>[getComputedStyle(e).gridRowStart,getComputedStyle(e).gridColumnStart]),['2','1']);
 assert.deepEqual(await page.locator('#btnNudgeBrighter').evaluate(e=>[getComputedStyle(e).gridRowStart,getComputedStyle(e).gridColumnStart]),['3','5']);
 const initial=await state(),colorIcon=await page.locator('#btnColorPicker').innerHTML();
 await swipe('#btnColorPicker',35);assert.equal((await state()).wind,false);
 await page.locator('#btnColorPicker').focus();await page.keyboard.press('Alt+ArrowDown');assert.equal((await state()).wind,false);
 for(const mode of ['ripple','paint','displace','off']){await tap('#btnWind');assert.equal(await page.locator('#btnWind').getAttribute('data-wind-mode'),mode);assert.equal(await page.locator('#btnWind').getAttribute('aria-pressed'),String(mode!=='off'));assert.equal(await page.locator('#btnColorPicker').innerHTML(),colorIcon);assert.equal(await page.locator('#btnWind').evaluate(e=>getComputedStyle(e).color==='rgb(255, 215, 0)'),mode!=='off');assert.deepEqual(await page.locator('#btnWind').evaluate(e=>({shadow:getComputedStyle(e).boxShadow,background:getComputedStyle(e).backgroundColor})),{shadow:'none',background:'rgba(0, 0, 0, 0)'});assert.equal(await page.locator('#btnWind').evaluate(e=>e.getAnimations().filter(a=>a.effect.getKeyframes().some(f=>'boxShadow' in f)).length),0);}
 assert.deepEqual((await state()).board,initial.board);assert.equal((await state()).history,initial.history);
 await tap('#btnWind');await swipe('#btnWind',-35);await page.locator('#windSettingsDialog').waitFor({state:'visible'});
 await tap('#windSettingsDialog [data-cancel]');assert.equal(await page.evaluate(()=>document.activeElement.id),'btnWind');assert.equal((await state()).mode,'ripple');
 await page.locator('#btnWind').focus();await page.keyboard.press('Alt+ArrowUp');await page.locator('#windSettingsDialog').waitFor({state:'visible'});await page.keyboard.press('Escape');assert((await state()).wind);
 // Saving settings changes only the current mode and survives an Off/on cycle.
 await swipe('#btnWind',-35);await page.locator('#windSettingsDialog').waitFor({state:'visible'});
 await page.locator('#wind_speed').fill('1.25');await page.locator('#wind_speed').dispatchEvent('input');await tap('#windSettingsDialog [type=submit]');assert.equal((await state()).settings.speed,1.25);
 for(let i=0;i<4;i++)await tap('#btnWind');assert.equal((await state()).mode,'ripple');assert.equal((await state()).settings.speed,1.25);
 // A painted wave is recorded and remains a single artwork action on stop.
 await tap('#btnWind');assert.equal((await state()).mode,'paint');const before=(await state()).board;
 const board=await page.locator('#boardCanvas').boundingBox();if(touch)await page.touchscreen.tap(board.x+board.width*.5,board.y+board.height*.5);else await page.mouse.click(board.x+board.width*.5,board.y+board.height*.5);
 await page.waitForTimeout(220);await tap('#btnWind');const after=await state();assert(after.history>0);assert.notDeepEqual(after.board,before);assert(after.logs.some(x=>x.includes('WIND_WAVE')));assert(after.logs.some(x=>x.includes('WIND_END')));
 await tap('#btnWind');assert(!(await state()).wind);await tap('#btnUndo');assert.deepEqual((await state()).board,before);await tap('#btnRedo');assert.deepEqual((await state()).board,after.board);
 const recipe=await page.evaluate(()=>windTest.recipe()),settings=await page.evaluate(()=>localStorage.getItem('colorGridWindSettingsV1'));
 await page.evaluate(text=>windTest.replay(text),recipe);await page.waitForFunction(()=>!windTest.state().macro,{},{timeout:20000});assert.equal(await page.evaluate(()=>localStorage.getItem('colorGridWindSettingsV1')),settings);assert.equal(await page.locator('#btnWind').getAttribute('aria-pressed'),'false');
 // Running evolution retains its identity and generation timeline across the cycle.
 await page.evaluate(()=>windTest.setup());await page.evaluate(()=>windTest.live());await page.waitForTimeout(150);const gen=(await state()).gen;
 for(let i=0;i<4;i++)await tap('#btnWind');const live=await state();assert(live.playing);assert.equal(live.armed,'nudgeBrighter');assert(live.gen>=gen);await page.evaluate(()=>windTest.pause());
 await tap('#btnWind');await tap('#btnToggleSimMode');await page.waitForTimeout(650);assert(!(await state()).wind);assert.equal(await page.locator('#btnWind').isVisible(),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({lang,touch,passed:true}));await ctx.close();
}}finally{await browser.close();server.close();}
