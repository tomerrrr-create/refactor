// Verify smooth picker handoffs, interruption, focus and reduced motion.
// Runtime hooks are injected into responses; production assets have no test hooks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.PICKER_TRANSITION_ARTIFACTS||'/tmp/cracks-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const waitForHandoff = page => page.waitForFunction(
 ()=>!document.querySelector('.picker-handoff-incoming,.picker-handoff-outgoing'),
 null,{timeout:2000});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});



try {for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}].filter(c=>!process.env.CRACKS_LANG||c.lang===process.env.CRACKS_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.cracksTest={
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');updatePaletteHeader();n=81;initializeBoardAndCanvas(true);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();boardState.forEach((t,i)=>{t.k=t.v=12+Math.floor((i%81)/14)%5;t.isGold=false;});contourRules={sensitivity:75,lineColor:'darkest'};selectedColorIndex=12;selectedColor=palette()[12];brushSize=3;isRainbowModeActive=false;isBrushModeOn=true;isContinuousBrushOn=false;updateColorPickerButtonUI();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 exhaust:(hard=false)=>{pauseLife();armSimulation('contour');n=21;initializeBoardAndCanvas(true);contourMode='cracks';cracksState=createCracksState(n);armedSimulation='contour';boardState.forEach(t=>{t.k=t.v=11;t.isGold=false;});for(let i=0;i<500;i++)boardState=runContourEvolution({n,currentBoardState:boardState,currentPalette:palette(),contourRules});if(hard){contourRules.material={enabled:true,strength:80};boardState.forEach(t=>{t.k=t.v=2;});}brushSize=7;selectedColorIndex=12;selectedColor=palette()[12];history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();updateColorPickerButtonUI();updateContourButtonUI();},
 state:()=>({mode:contourMode,armed:armedSimulation,playing:isLifePlaying,gen:currentGenerationCount,board:boardState.map(t=>t.k),snapshot:getCurrentState(),loaded:isMacroLoaded,macro:isMacroPlaying,logs:[...artRecipeLog],historyDepth:history.length,undoTarget:history.at(-1)?.before}),
 liveExport:()=>{const file=createArtRecipeFile(),snapshot=getCurrentState();pauseLife();return file.text().then(text=>({text,snapshot}));},play:togglePlayPauseLife,pause:pauseLife,undo,redo,restore:state=>applyState(state),recipe:async()=>await createArtRecipeFile().text(),macro:playMacro,prefs:()=>getWorkspaceSettings(),legacy:()=>applyMacroRules('Armed: contour | Sort: luminance | Rules: {"sensitivity":75,"lineColor":"darkest"}')
 };initializeApp().then(()=>cracksTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.cracksTest?.ready);await page.evaluate(()=>cracksTest.setup());
 const state=()=>page.evaluate(()=>cracksTest.state()),button=page.locator('#btnContour'),before=await state();
 const tap=target=>config.width<600?target.tap():target.click();
 assert(await button.evaluate(e=>e.classList.contains('cracks-active')),'idle icon defaults to Cracks');
 await tap(button);assert.equal((await state()).mode,'cracks');assert.equal((await state()).armed,'contour');await tap(button);assert.equal((await state()).mode,'contours');await tap(button);assert.equal((await state()).armed,null);assert.deepEqual((await state()).board,before.board);
 await tap(button);assert(await button.evaluate(e=>e.classList.contains('cracks-active')));
 // Cracks has its own draft-based settings; Contours retains its old modal.
 async function openSettings(){const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();await page.locator('#cracksSettingsDialog').waitFor({state:'visible'});}
 await openSettings();const dialog=page.locator('#cracksSettingsDialog'),enabled=dialog.locator('#cracksMaterialEnabled'),strength=dialog.locator('#cracksMaterialStrength');
 assert(await enabled.isChecked());assert.equal(await strength.inputValue(),'40');assert.equal(await dialog.getAttribute('dir'),config.lang==='he'?'rtl':'ltr');const settingsBefore=await state();
 await enabled.uncheck();assert(await strength.isDisabled());await dialog.locator('[data-cancel]').click();assert.deepEqual((await state()).snapshot,settingsBefore.snapshot);
 await openSettings();await strength.focus();await strength.press('Home');for(let i=0;i<12;i++)await strength.press('ArrowRight');await dialog.locator('[type=submit]').click();assert.equal((await state()).snapshot.contourState.material.strength,60);assert.deepEqual((await state()).board,settingsBefore.board);
 assert.equal((await state()).historyDepth,settingsBefore.historyDepth,'saving preferences creates no drawing Undo action');
 await openSettings();await dialog.locator('[data-reset]').click();assert.equal(await strength.inputValue(),'40');await page.keyboard.press('Escape');assert.equal((await state()).snapshot.contourState.material.strength,60);
 await openSettings();await dialog.locator('#cracksLineColor').selectOption('lightest');await dialog.locator('[type=submit]').click();assert.equal((await state()).snapshot.contourState.rules.lineColor,'lightest');assert.equal((await state()).historyDepth,settingsBefore.historyDepth);await openSettings();await dialog.locator('#cracksLineColor').selectOption('darkest');await dialog.locator('[type=submit]').click();
 await openSettings();assert(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}));await dialog.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{})));});await page.screenshot({path:path.join(artifacts,config.lang+'-material-settings.png')});await dialog.locator('[data-cancel]').click();assert(await button.evaluate(e=>document.activeElement===e));
 await tap(page.locator('#btnStepForward'));await page.waitForFunction(()=>cracksTest.state().snapshot.contourState?.cracksState?.steps>0);assert((await state()).board.some(k=>k===0));const runStart=await state();
 await page.evaluate(()=>cracksTest.play());await page.waitForFunction(()=>cracksTest.state().gen>=20);await tap(button);assert((await state()).playing);assert.equal((await state()).mode,'contours');await tap(button);assert((await state()).playing);assert.equal((await state()).mode,'cracks');
 await openSettings();assert((await state()).playing);await enabled.uncheck();await dialog.locator('[type=submit]').click();assert((await state()).playing);assert.equal((await state()).snapshot.contourState.material.enabled,false);
 await tap(page.locator('#boardCanvas'));await page.waitForFunction(()=>cracksTest.state().gen>=45);await page.evaluate(()=>cracksTest.pause());
 const finished=await state();assert(finished.logs.some(line=>line.includes('DRAW_STROKE')));assert(finished.logs.some(line=>line.includes('SIMULATION_RULES')));const recipe=await page.evaluate(()=>cracksTest.recipe());
 await page.screenshot({path:path.join(artifacts,config.lang+'-cracks.png')});
 await page.evaluate(()=>cracksTest.undo());assert.deepEqual((await state()).board,finished.undoTarget.tiles.map(t=>t.k),'Undo restores the existing live-stroke history boundary');await page.evaluate(()=>cracksTest.redo());assert.deepEqual((await state()).board,finished.board);
 // A JSON serialization round trip retains tips and the PRNG cursor.
 const saved=JSON.parse(JSON.stringify(finished.snapshot));await page.evaluate(s=>cracksTest.restore(s),saved);assert.deepEqual((await state()).snapshot.contourState,saved.contourState);
 // Replay must use recorded material rules even when the user's current
 // preference is different, and restore that preference on completion.
 await openSettings();await enabled.check();await strength.focus();await strength.press('End');await dialog.locator('[type=submit]').click();
 const prefs=await page.evaluate(()=>cracksTest.prefs());assert.equal(prefs.rules.contour.material.strength,100);assert(prefs.rules.contour.material.enabled);
 await page.locator('#projectFileInput').setInputFiles({name:'cracks.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,finished.board,'recorded live mode changes and brush input replay exactly');assert.deepEqual(await page.evaluate(()=>cracksTest.prefs()),prefs,'replay does not overwrite preferences');
 await page.evaluate(()=>cracksTest.legacy());assert.equal((await state()).mode,'contours','old recipes retain the original engine');assert.deepEqual(errors,[]);
 if(config.lang==='en'){
  await page.evaluate(()=>cracksTest.setup());await tap(button);assert.equal((await state()).mode,'cracks');await page.evaluate(()=>cracksTest.play());await page.waitForFunction(()=>cracksTest.state().gen>=12);
  const live=await page.evaluate(()=>cracksTest.liveExport());assert(/\[GEN:\d+\] PAUSE/.test(live.text));
  await page.locator('#projectFileInput').setInputFiles({name:'live-cracks.txt',mimeType:'text/plain',buffer:Buffer.from(live.text)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,live.snapshot.tiles.map(t=>t.k),'export during growth captures its final generation');
 }
 // Exhaustion alone must not make Play a no-op while soft material remains.
 await page.evaluate(()=>{cracksTest.setup();cracksTest.exhaust();});
 const dormant=await state();
 await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cracksTest.state().gen>=8);await tap(page.locator('#btnPlayPauseLife'));
 const restarted=await state();assert.notDeepEqual(restarted.board,dormant.board,'Play revives exhausted cracks without requiring new paint');
 await page.evaluate(()=>cracksTest.undo());assert.deepEqual((await state()).snapshot.contourState,dormant.snapshot.contourState,'Undo restores exhausted runtime before reseeding');
 await page.evaluate(()=>cracksTest.redo());assert.deepEqual((await state()).board,restarted.board);
 const restartRecipe=await page.evaluate(()=>cracksTest.recipe());await page.locator('#projectFileInput').setInputFiles({name:'restart.txt',mimeType:'text/plain',buffer:Buffer.from(restartRecipe)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,restarted.board,'resume-only reseeding replays exactly');
 // An exhausted hard board stays protected; disabling material while running
 // must revive it without a second Pause/Play or an extra brush gesture.
 await page.evaluate(()=>{cracksTest.setup();cracksTest.exhaust(true);});
 const hardBoard=(await state()).board;
 await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cracksTest.state().gen>=8);assert.deepEqual((await state()).board,hardBoard);
 await openSettings();await enabled.uncheck();await dialog.locator('[type=submit]').click();assert((await state()).playing);
 await page.waitForFunction(()=>cracksTest.state().board.some(k=>k===0));await tap(page.locator('#btnPlayPauseLife'));
 assert.notDeepEqual((await state()).board,hardBoard,'turning material Off revives exhausted growth');
 // Regression: exhaust every tip, pause, cover old cracks with a color patch,
 // then resume through real controls. The queued restart must survive history
 // and replay, and must not advance while paused.
 await page.evaluate(()=>cracksTest.setup());await page.evaluate(()=>cracksTest.exhaust());
 const exhausted=await state();assert.equal(exhausted.snapshot.contourState.cracksState.tips.length,0);assert.equal(exhausted.snapshot.contourState.cracksState.roots,3);
 const target=exhausted.board.findIndex((k,i)=>k===0&&i%21>4&&i%21<16&&Math.floor(i/21)>4&&Math.floor(i/21)<16);assert(target>=0);
 const canvas=page.locator('#boardCanvas'),box=await canvas.boundingBox(),point={x:(target%21+.5)*box.width/21,y:(Math.floor(target/21)+.5)*box.height/21};
 if(config.width<600)await canvas.tap({position:point});else await canvas.click({position:point});
 const painted=await state(),queued=painted.snapshot.contourState.cracksState;assert(queued.pendingSeed!==null);assert(!painted.playing);assert.deepEqual(queued.tips,[]);
 await page.waitForTimeout(150);assert.deepEqual((await state()).board,painted.board,'Pause keeps the new patch still');
 await page.evaluate(()=>cracksTest.undo());assert.deepEqual((await state()).board,exhausted.board);await page.evaluate(()=>cracksTest.redo());assert.deepEqual((await state()).snapshot.contourState.cracksState,queued);
 await tap(page.locator('#btnPlayPauseLife'));await page.waitForFunction(()=>cracksTest.state().gen>=8);await tap(page.locator('#btnPlayPauseLife'));
 const renewed=await state();assert(renewed.board.some((k,i)=>k===0&&painted.board[i]!==0),'new cracks grow inside the painted material after Play');
 const resumeRecipe=await page.evaluate(()=>cracksTest.recipe());await page.locator('#projectFileInput').setInputFiles({name:'resume-cracks.txt',mimeType:'text/plain',buffer:Buffer.from(resumeRecipe)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,renewed.board,'paused paint and renewal replay exactly');assert.deepEqual(errors,[]);
 // Paused regular painting: repeated Undo may cross older 100% strokes,
 // but must retain the user's saved 40%, On/Off and line-color preferences.
 await page.evaluate(()=>cracksTest.setup());await tap(button);
 await openSettings();await strength.focus();await strength.press('End');await dialog.locator('[type=submit]').click();
 await tap(canvas);
 await openSettings();await strength.focus();await strength.press('Home');for(let i=0;i<8;i++)await strength.press('ArrowRight');await dialog.locator('#cracksLineColor').selectOption('lightest');await dialog.locator('[type=submit]').click();
 assert.equal((await state()).historyDepth,1,'only the first painting is in history');
 await tap(canvas);await tap(canvas);const paintedPreferences=await state();
 for(let i=0;i<3;i++){await tap(page.locator('#btnUndo'));const current=await state();assert.equal(current.snapshot.contourState.material.strength,40,'Undo across the old settings retains 40%');assert.equal(current.snapshot.contourState.material.enabled,true);assert.equal(current.snapshot.contourState.rules.lineColor,'lightest');}
 for(let i=0;i<3;i++){await tap(page.locator('#btnRedo'));assert.equal((await state()).snapshot.contourState.material.strength,40);assert.equal((await state()).snapshot.contourState.rules.lineColor,'lightest');}
 assert.deepEqual((await state()).board,paintedPreferences.board,'Redo restores the painting exactly');
 await openSettings();await enabled.uncheck();await dialog.locator('[type=submit]').click();await tap(page.locator('#btnUndo'));assert.equal((await state()).snapshot.contourState.material.enabled,false,'Undo also preserves saved Off');await tap(page.locator('#btnRedo'));
 await tap(page.locator('#btnStepForward'));const historyResult=await state();
 const historyRecipe=await page.evaluate(()=>cracksTest.recipe());await page.locator('#projectFileInput').setInputFiles({name:'cracks-preferences-history.txt',mimeType:'text/plain',buffer:Buffer.from(historyRecipe)});await page.waitForFunction(()=>cracksTest.state().loaded);await page.evaluate(()=>cracksTest.macro());await page.waitForFunction(()=>!cracksTest.state().loaded&&!cracksTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,historyResult.board,'Undo/Redo recipe uses the retained settings');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
