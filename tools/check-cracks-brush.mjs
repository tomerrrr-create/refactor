// Verify opening defaults, live brush/rainbow sources, history and macro replay.
// Runtime hooks are injected into responses; production assets have no test hooks.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.CRACKS_BRUSH_ARTIFACTS||'/tmp/cracks-brush-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});



try {for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}].filter(c=>!process.env.CRACKS_LANG||c.lang===process.env.CRACKS_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.cracksTest={
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');updatePaletteHeader();n=81;initializeBoardAndCanvas(true);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();boardState.forEach((t,i)=>{t.k=t.v=12+Math.floor((i%81)/14)%5;t.isGold=false;});contourRules={sensitivity:75,lineColor:'darkest'};selectedColorIndex=12;selectedColor=palette()[12];brushSize=3;isRainbowModeActive=false;isBrushModeOn=true;isContinuousBrushOn=false;updateColorPickerButtonUI();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 exhaust:(hard=false)=>{pauseLife();armSimulation('contour');n=21;initializeBoardAndCanvas(true);contourMode='cracks';cracksState=createCracksState(n);armedSimulation='contour';boardState.forEach(t=>{t.k=t.v=11;t.isGold=false;});for(let i=0;i<500;i++)boardState=runContourEvolution({n,currentBoardState:boardState,currentPalette:palette(),contourRules});if(hard){contourRules.material={enabled:true,strength:80};boardState.forEach(t=>{t.k=t.v=2;});}brushSize=7;selectedColorIndex=12;selectedColor=palette()[12];history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();updateColorPickerButtonUI();updateContourButtonUI();},
 brush:({index=-1,rainbow=false})=>{selectedColorIndex=index;selectedColor=index<0?null:palette()[index];isRainbowModeActive=rainbow;updateColorPickerButtonUI();updateGlowEffect();},
 sort:applySortMethod,state:()=>({colors:[...palette()],anchor:sortColorsArray(C.PALETTES[activePaletteIndex].originalColors,'luminance')[0],mode:contourMode,armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,board:boardState.map(t=>t.k),snapshot:getCurrentState(),loaded:isMacroLoaded,macro:isMacroPlaying,logs:[...artRecipeLog],historyDepth:history.length,undoTarget:history.at(-1)?.before}),
 liveExport:()=>{const file=createArtRecipeFile(),snapshot=getCurrentState();pauseLife();return file.text().then(text=>({text,snapshot}));},play:togglePlayPauseLife,pause:pauseLife,undo,redo,restore:state=>applyState(state),recipe:async()=>await createArtRecipeFile().text(),macro:playMacro,prefs:()=>getWorkspaceSettings(),legacy:()=>applyMacroRules('Armed: contour | Sort: luminance | Rules: {"sensitivity":75,"lineColor":"darkest"}')
 };initializeApp().then(()=>cracksTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.cracksTest?.ready);assert.deepEqual(await page.evaluate(()=>cracksTest.prefs().rules.contour.growth),{branchChance:55,branchInterval:8,curvature:130},'each opening starts with Fibonacci');assert.equal(await page.evaluate(()=>cracksTest.prefs().rules.contour.lineColor),'brush');await page.evaluate(()=>cracksTest.setup());
 const state=()=>page.evaluate(()=>cracksTest.state()),button=page.locator('#btnContour'),before=await state();
 const tap=target=>config.width<600?target.tap():target.click();
 const canvas=page.locator('#boardCanvas'),dialog=page.locator('#cracksSettingsDialog');
 async function openSettings(){const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();await dialog.waitFor({state:'visible'});}
 if(process.env.CRACKS_DEFAULTS_ONLY){
  await tap(button);await openSettings();await dialog.locator('[data-reset]').click();assert.equal(await dialog.locator('[data-cracks-color="brush"]').getAttribute('aria-pressed'),'true');await dialog.locator('[data-cancel]').click();assert.equal((await state()).snapshot.contourState.rules.lineColor,'darkest','Cancel retains explicit fixture preferences');
  await openSettings();await dialog.locator('[data-cracks-color="lightest"]').click();await dialog.locator('[type=submit]').click();assert.equal((await state()).snapshot.contourState.rules.lineColor,'lightest');
  await page.reload();await page.waitForFunction(()=>window.cracksTest?.ready);assert.equal(await page.evaluate(()=>cracksTest.prefs().rules.contour.lineColor),'brush','opening overrides saved line color');assert.deepEqual(errors,[]);console.log(JSON.stringify({config,defaultsPassed:true}));await context.close();continue;
 }
 // Brush-source colors, rainbow runtime, paused painting and exact macro replay.
 await page.evaluate(()=>cracksTest.setup());await tap(button);await openSettings();
 assert.equal(await dialog.locator('select').count(),0);assert.equal(await dialog.locator('[data-cracks-color]').count(),4);
 assert(await dialog.locator('[data-cracks-color]').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1;})));
 await dialog.locator('#cracksLineColor').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,config.lang+'-line-colors.png')});
 await dialog.locator('[data-cracks-color="brush"]').focus();await page.keyboard.press('Space');
 assert.equal(await dialog.locator('[data-cracks-color="brush"]').getAttribute('aria-pressed'),'true');
 await dialog.locator('[data-cracks-preset="fibonacci-bloom"]').click();await dialog.locator('[type=submit]').click();
 await page.evaluate(()=>cracksTest.brush({index:8}));await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cracksTest.state().gen>=8);
 assert((await state()).board.includes(8));await page.evaluate(()=>cracksTest.brush({index:20}));const switchGeneration=(await state()).gen;
 await page.waitForFunction(gen=>cracksTest.state().gen>=gen+8,switchGeneration);assert((await state()).board.includes(20));
 await page.evaluate(()=>cracksTest.brush({rainbow:true}));const rainbowGeneration=(await state()).gen;
 await page.waitForFunction(gen=>cracksTest.state().gen>=gen+12,rainbowGeneration);await tap(page.locator('#btnPlayPauseLife'));
 const rainbowBefore=await state();assert(Object.keys(rainbowBefore.snapshot.contourState.cracksState.rainbowTrail).length>0);
 await page.evaluate(()=>cracksTest.undo());assert.equal((await state()).snapshot.contourState.rules.lineColor,'brush');assert.deepEqual((await state()).snapshot.contourState.growth,{branchChance:55,branchInterval:8,curvature:130});
 await page.evaluate(()=>cracksTest.redo());assert.deepEqual((await state()).snapshot.contourState.cracksState.rainbowTrail,rainbowBefore.snapshot.contourState.cracksState.rainbowTrail);assert.deepEqual((await state()).board,rainbowBefore.board);
 const rainbowSnapshot=JSON.parse(JSON.stringify((await state()).snapshot));await page.evaluate(s=>cracksTest.restore(s),rainbowSnapshot);assert.deepEqual((await state()).snapshot.contourState,rainbowSnapshot.contourState);
 // Paint over a visited rainbow cell during Pause, then resume in rainbow mode.
 const marked=rainbowBefore.board.findIndex((_,i)=>{const chunk=rainbowBefore.snapshot.contourState.cracksState.rainbowTrail[Math.floor(i/256)];return i%81>2&&i%81<78&&Math.floor(i/81)>2&&Math.floor(i/81)<78&&!!(parseInt(chunk?.[Math.floor(i%256/4)]??'0',16)&1<<(i%4));});assert(marked>=0);
 await page.evaluate(()=>cracksTest.brush({index:7}));
 const rainbowBox=await canvas.boundingBox(),rainbowPoint={x:(marked%81+.5)*rainbowBox.width/81,y:(Math.floor(marked/81)+.5)*rainbowBox.height/81};
 if(config.width<600)await canvas.tap({position:rainbowPoint});else await canvas.click({position:rainbowPoint});
 const covered=await state(),chunk=covered.snapshot.contourState.cracksState.rainbowTrail[Math.floor(marked/256)];assert(!(parseInt(chunk?.[Math.floor(marked%256/4)]??'0',16)&1<<(marked%4)));assert.equal(covered.snapshot.contourState.cracksState.steps,rainbowBefore.snapshot.contourState.cracksState.steps,'paused paint does not advance growth');
 await page.evaluate(()=>cracksTest.brush({rainbow:true}));await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cracksTest.state().gen>=12);await tap(page.locator('#btnPlayPauseLife'));
 const brushFinished=await state(),brushRecipe=await page.evaluate(()=>cracksTest.recipe());assert(brushRecipe.includes('"brush"'));assert(brushRecipe.includes('"rainbow":true'));
 const brushPrefs=await page.evaluate(()=>cracksTest.prefs());await page.evaluate(()=>cracksTest.brush({index:3}));
 await page.locator('#projectFileInput').setInputFiles({name:'rainbow-cracks.txt',mimeType:'text/plain',buffer:Buffer.from(brushRecipe)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});
 assert.deepEqual((await state()).board,brushFinished.board,'brush colors and rainbow resume replay exactly');assert.deepEqual(await page.evaluate(()=>cracksTest.prefs()),brushPrefs,'macro preserves saved preferences');
 // An empty brush falls back to darkest, and a reload ignores saved growth tuning.
 await page.evaluate(()=>cracksTest.brush({}));await openSettings();await dialog.locator('[data-cracks-preset="crystal-paths"]').click();await dialog.locator('[type=submit]').click();assert.deepEqual((await state()).snapshot.contourState.growth,{branchChance:40,branchInterval:22,curvature:0});
 await page.reload();await page.waitForFunction(()=>window.cracksTest?.ready);assert.deepEqual(await page.evaluate(()=>cracksTest.prefs().rules.contour.growth),{branchChance:55,branchInterval:8,curvature:130});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
