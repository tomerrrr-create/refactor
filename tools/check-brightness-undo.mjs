// Real paused painting, saved brightness rules, repeated Undo/Redo and macro compatibility.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',f)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.BRIGHTNESS_LANG||c.lang===process.env.BRIGHTNESS_LANG)){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');source=source.replace('      initializeApp();',`window.brightnessTest={
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');updatePaletteHeader();n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=3+i%12;t.isGold=false;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');updateSimulationUtilityControl();evolutionTuning=validateEvolutionTuning();armSimulation('brightnessEvo');brightnessEvoMode='brightness';updateBrightnessEvoButtonUI();selectedColorIndex=20;selectedColor=palette()[20];isRainbowModeActive=false;isBrushModeOn=true;isContinuousBrushOn=false;brushSize=1;history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();},
 state:()=>({board:boardState.map(t=>t.k),snapshot:getCurrentState(),settings:getWorkspaceSettings(),mode:brightnessEvoMode,history:history.length,future:future.length,loaded:isMacroLoaded,macro:isMacroPlaying,logs:[...artRecipeLog],playing:isLifePlaying,gen:currentGenerationCount}),open:()=>modals.openBrightnessSettingsModal(),tech:()=>modals.openTechnicianMenu(),recipe:async()=>await createArtRecipeFile().text(),macro:playMacro,restore:s=>applyState(s)
 };initializeApp().then(()=>brightnessTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.brightnessTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>brightnessTest.setup());
 const state=()=>page.evaluate(()=>brightnessTest.state()),tap=e=>config.width<600?e.tap():e.click(),canvas=page.locator('#boardCanvas'),dialog=page.locator('#brightnessEvoTuningDialog');
 async function paint(col,row){const b=await canvas.boundingBox(),position={x:(col+.5)*b.width/21,y:(row+.5)*b.height/21};if(config.width<600)await canvas.tap({position});else await canvas.click({position});}
 async function open(){await page.evaluate(()=>brightnessTest.open());await dialog.waitFor({state:'visible'});}
 async function save(smoothing,contrast,mode='brightness'){await open();await dialog.locator('#brightnessEvoTuning_smoothing').fill(String(smoothing));await dialog.locator('#brightnessEvoTuning_contrast').fill(String(contrast));await dialog.locator('[data-mode="'+mode+'"]').click();await dialog.locator('[type=submit]').click();}
 const initial=await state();for(const [x,y] of [[4,4],[8,8],[12,12]])await paint(x,y);assert.equal((await state()).history,3);
 await save(.1,.2);assert.equal((await state()).history,3,'saving paused settings adds no drawing action');for(const [x,y] of [[15,5],[5,15]])await paint(x,y);const painted=await state();assert.equal(painted.history,5);
 for(let i=0;i<5;i++){await tap(page.locator('#btnUndo'));const s=await state();assert.deepEqual(s.snapshot.evolutionTuning.brightnessEvo,{smoothing:.1,contrast:.2});assert.equal(s.mode,'brightness');assert.deepEqual(s.settings.evolutionTuning.brightnessEvo,{smoothing:.1,contrast:.2});}assert.deepEqual((await state()).board,initial.board);
 for(let i=0;i<5;i++){await tap(page.locator('#btnRedo'));assert.deepEqual((await state()).snapshot.evolutionTuning.brightnessEvo,{smoothing:.1,contrast:.2});}assert.deepEqual((await state()).board,painted.board);
 await open();assert.equal(await dialog.locator('#brightnessEvoTuning_smoothing').inputValue(),'0.1');await dialog.locator('#brightnessEvoTuning_smoothing').fill('0.3');await dialog.locator('[data-cancel]').click();assert.equal((await state()).settings.evolutionTuning.brightnessEvo.smoothing,.1);
 await tap(page.locator('#btnStepForward'));const result=await state(),recipe=await page.evaluate(()=>brightnessTest.recipe());assert(recipe.includes('EVOLUTION_TUNING'));
 await save(.75,.6,'contrast');const prefs=(await state()).settings;
 await page.locator('#projectFileInput').setInputFiles({name:'brightness-undo.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>brightnessTest.state().loaded);await page.evaluate(()=>brightnessTest.macro());await page.waitForFunction(()=>!brightnessTest.state().loaded&&!brightnessTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,result.board,'Undo/Redo and retained brightness replay exactly');assert.deepEqual((await state()).settings,prefs,'macro restores user preferences');
 await page.evaluate(s=>brightnessTest.restore(s),result.snapshot);assert.deepEqual((await state()).snapshot.evolutionTuning.brightnessEvo,{smoothing:.1,contrast:.2},'explicit projects still restore recorded values');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
