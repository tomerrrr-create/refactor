// Natural EOF presentation never advances the engine or blackens the artwork.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/macro-ending-check';await mkdir(artifacts,{recursive:true});
let source=await readFile(path.join(root,'js/app.js'),'utf8');
source=source.replace('function stopMacro({ preserveFullscreen = false, preserveActivity = false } = {}) {','function stopMacro({ preserveFullscreen = false, preserveActivity = false } = {}) { if(preserveFullscreen)window.endingEOF=performance.now();');
source=source.replace('      initializeApp();',`window.endingTest={
 stop:stopMacro,full:toggleMacroFullScreen,
 zoom:value=>{interfaceZoom=value;updateLayout();},
 state:()=>({loaded:isMacroLoaded,macro:isMacroPlaying,playing:isLifePlaying,fullscreen:isMacroFullscreen,native:!!document.fullscreenElement,ending:!!macroEnding?.active(),returning:dom.appContainer.classList.contains('macro-returning'),gen:currentGenerationCount,n,tiles:boardState.map(t=>[t.k,t.v,!!t.isGold]),logs:[...artRecipeLog],eof:window.endingEOF,now:performance.now(),overlay:getComputedStyle(dom.boardOverlay).opacity,activity:{hidden:document.getElementById('macroActivity').hidden,opacity:getComputedStyle(document.getElementById('macroActivity')).opacity,icons:document.querySelectorAll('#macroActivity .macro-activity-row').length}})
 };initializeApp().then(()=>endingTest.ready=true);`);
for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file==='js/app.js'?source:await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const init=n=>'[00:00:00.000] INIT_STATE -> '+JSON.stringify({recipeVersion:2,n,pal:0,sort:'luminance',sep:0,board:Array.from({length:n*n},(_,i)=>'1x'+(i*7%23)).join(',')});
const recipe=init(9)+'\n[00:00:00.010] DRAW_STROKE -> [{"i":40,"k":5}]\n[00:00:00.800] PLAY -> Armed: gravitationalSort | Sort: luminance | Rules: {"direction":"up","strength":0.6}';
const replacement=init(11)+'\n[00:00:00.010] PLAY -> Armed: gravitationalSort | Sort: luminance | Rules: {"direction":"up","strength":0.6}\n[00:00:10.000] [GEN:600] PAUSE -> ---';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},isMobile:touch,hasTouch:touch,reducedMotion:touch?'reduce':'no-preference',serviceWorkers:'block'});
 await context.addInitScript(touch=>{localStorage.setItem('colorGridMacroActivity','true');localStorage.setItem('userLanguage',touch?'he':'en');Math.random=()=>.25;},touch);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(base);await page.waitForFunction(()=>window.endingTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 if(touch)await page.evaluate(()=>{document.documentElement.requestFullscreen=undefined;endingTest.zoom(80);});
 const state=()=>page.evaluate(()=>endingTest.state());
 const load=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'ending.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>endingTest.state().loaded);};
 const start=async(text=recipe,full=true)=>{await load(text);await page.locator('#btnMacroPlay').click();if(full){await page.evaluate(()=>endingTest.full());await page.waitForFunction(()=>endingTest.state().fullscreen);}};
 const waitEnding=()=>page.waitForFunction(()=>endingTest.state().ending,null,{timeout:5000});
 // A real file ending in PLAY has no PAUSE command: cleanup must freeze it now.
 await start();await waitEnding();const final=await state();assert(!final.loaded&&!final.macro&&!final.playing);assert(final.fullscreen);assert.equal(final.native,!touch);assert.equal(Number(final.overlay),0);assert(final.activity.icons>0);assert(!final.activity.hidden);
 await page.waitForTimeout(500);const faded=await state();assert(faded.fullscreen);assert.equal(Number(faded.activity.opacity),0);assert.deepEqual(faded.tiles,final.tiles);assert.equal(faded.gen,final.gen);assert.deepEqual(faded.logs,final.logs);
 await page.screenshot({path:path.join(artifacts,touch?'touch-held.png':'desktop-held.png')});
 const remaining=1200-((await state()).now-final.eof);if(remaining>0)await page.waitForTimeout(remaining);assert((await state()).fullscreen,'hold lasts at least 1.2 seconds');
 await page.waitForFunction(()=>!endingTest.state().fullscreen);const exited=await state();assert(exited.now-final.eof>=1450);assert(exited.now-final.eof<2300);assert.equal(Number(exited.overlay),0);assert.deepEqual(exited.tiles,final.tiles);
 await page.waitForFunction(()=>!endingTest.state().ending);assert(!(await state()).returning);assert((await state()).activity.hidden);
 // Non-fullscreen EOF stays immediate and produces the same final artwork/log.
 await start(recipe,false);await page.waitForFunction(()=>!endingTest.state().loaded);const ordinary=await state();assert(!ordinary.ending&&!ordinary.fullscreen);assert.deepEqual(ordinary.tiles,final.tiles);
 // Explicit Stop during the hold has no added delay, and cancels its exit timer.
 await start();await waitEnding();await page.evaluate(()=>endingTest.stop());assert(!(await state()).ending);assert(!(await state()).fullscreen);
 // Replacement file and a new fullscreen playback outlive the old hold timer.
 await start();await waitEnding();await load(replacement);assert(!(await state()).ending);await page.locator('#btnMacroPlay').click();await page.evaluate(()=>endingTest.full());await page.waitForTimeout(1800);const newRun=await state();assert(newRun.fullscreen&&newRun.loaded&&newRun.macro&&!newRun.ending);assert.equal(newRun.n,11);assert(!newRun.activity.hidden);assert.equal(Number(newRun.activity.opacity),1);await page.evaluate(()=>endingTest.stop());await page.waitForFunction(()=>!endingTest.state().fullscreen);await page.waitForTimeout(450);
 // Native Escape/fullscreen exit and mobile board taps cancel a pending ending.
 await start();await waitEnding();if(touch)await page.locator('#boardCanvas').tap();else await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!endingTest.state().fullscreen&&!endingTest.state().ending);assert.equal(Number((await state()).overlay),0);
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({touch,nativeFullscreen:!touch,reducedMotion:touch,frozenFrame:true,holdMs:Math.round(exited.now-final.eof),fade:true,manualStop:true,replacementCancellation:true,exitCancellation:true,ordinaryReplay:true}));await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
