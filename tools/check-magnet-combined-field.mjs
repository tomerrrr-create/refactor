// Session-only UI, native drawing, profile isolation, and new/legacy recipe playback.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),artifacts='/tmp/magnet-combined-field';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>{localStorage.setItem('userLanguage',lang);Math.random=()=>.25;},touch?'he':'en');
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.fieldTest={
 setup:method=>{stopMacro();pauseLife();resetArmedState();if(windMode)setWindMode(false);activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Mono');currentSortMethod='reversed';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,currentSortMethod));n=61;restoreSeparatorWidth(0);initializeBoardAndCanvas(true);armSimulation('magnet');magnetRules={method,anchorColorIndex:0};magnetMode=method;magnetCombinedField=false;boardState.forEach((t,i)=>{t.k=t.v=i%17===0?0:(i*7)%paletteLen();t.isGold=i%137===0;});brushSize=3;brushShape='diamond';symmetryMode='off';selectedColorIndex=0;selectedColor=palette()[0];setBrushMode(true,true);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();window.fieldRuns=[];renderToScreen(null);},
 open:()=>modals.openMagnetSettingsModal(),tech:()=>modals.openTechnicianMenu(),
 state:()=>({manual:magnetCombinedField,effective:effectiveMagnetCombinedField(),rules:{...magnetRules},playing:isLifePlaying,loaded:isMacroLoaded,gen:currentGenerationCount,tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:!!t.isGold})),settings:getWorkspaceSettings(),logs:[...artRecipeLog],runs:window.fieldRuns??[]}),
 replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;window.fieldRuns=[];playMacro();},
 validate:text=>{try{parseMacroText(text);return null;}catch(error){return error.message;}},
 done:()=>!isMacroPlaying&&!isLifePlaying&&!isMacroLoaded,
 };initializeApp().then(()=>fieldTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const engine=(await readFile(path.join(root,'js/simulations/magnet.js'),'utf8')).replace('    const nextBoardState = currentBoardState;', `    (window.fieldRuns??=[]).push({combined:fieldOverride??recordedMagnetCombinedField(magnetRules),method:magnetRules.method});\n    const nextBoardState = currentBoardState;`);
 await page.route(base+'/js/simulations/magnet.js',r=>r.fulfill({contentType:'text/javascript',body:engine}));
 const boot=async reload=>{await(reload?page.reload():page.goto(base));await page.waitForFunction(()=>window.fieldTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const state=()=>page.evaluate(()=>fieldTest.state()),tap=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 const open=async()=>{await page.evaluate(()=>fieldTest.open());await page.waitForTimeout(350);};
 const choose=async(value,save=true)=>{await open();await page.locator('#magnetCombinedField').setChecked(value);assert.equal(await page.locator('#magnetAnchorLimit button:disabled').count(),value?5:0);await tap(save?'#btnMagnetSettingsSave':'#btnMagnetSettingsCancel');await page.waitForTimeout(350);};
 const replay=async(text,file=false)=>{if(file){await page.evaluate(()=>window.fieldRuns=[]);await page.locator('#projectFileInput').setInputFiles({name:'combined-field.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>fieldTest.state().loaded);await tap('#btnMacroPlay');}else await page.evaluate(text=>fieldTest.replay(text),text);await page.waitForFunction(()=>fieldTest.done(),null,{timeout:20000});return state();};
 await boot(false);assert.equal((await state()).manual,false);await page.evaluate(()=>fieldTest.setup('magnet'));
 await open();assert.equal(await page.locator('#magnetCombinedField').isChecked(),false);
 await page.locator('#magnetCombinedField').focus();await page.keyboard.press('Space');assert.equal((await state()).manual,false,'draft is not applied');await tap('#btnMagnetSettingsCancel');await page.waitForTimeout(350);await open();assert.equal(await page.locator('#magnetCombinedField').isChecked(),false);await tap('#btnMagnetSettingsCancel');await page.waitForTimeout(350);
 for(const method of ['magnet','cosmic_magnet','time_magnet','expand']){
  await page.evaluate(method=>fieldTest.setup(method),method);await choose(true);const before=await state();assert(before.manual);assert(!JSON.stringify(before.settings).includes('fieldModel'));
  await tap('#btnStepForward');const after=await state();assert.notDeepEqual(after.tiles,before.tiles);assert(after.runs.at(-1).combined);assert(after.logs.some(line=>line.includes('"fieldModel":"combined-v1"')));
  await tap('#btnUndo');assert.deepEqual((await state()).tiles,before.tiles);assert((await state()).manual);await tap('#btnRedo');assert.deepEqual((await state()).tiles,after.tiles);
  const recipe=(await state()).logs.join('\n');assert.equal(await page.evaluate(text=>fieldTest.validate(text.replaceAll('combined-v1','combined-v99')),recipe),'Invalid Magnet field model');
  await choose(false);const played=await replay(recipe,method==='magnet');assert.deepEqual(played.tiles,after.tiles);assert(played.runs.length>0&&played.runs.every(run=>run.combined));assert.equal(played.manual,false);assert(!JSON.stringify(played.rules).includes('fieldModel'));
  // A legacy/off recording ignores the viewer's enabled experiment preference.
  await page.evaluate(method=>fieldTest.setup(method),method);await tap('#btnStepForward');const legacy=await state();const oldRecipe=legacy.logs.join('\n');assert(!oldRecipe.includes('fieldModel'));await choose(true);const oldPlayed=await replay(oldRecipe);assert.deepEqual(oldPlayed.tiles,legacy.tiles);assert(oldPlayed.runs.every(run=>!run.combined));assert.equal(oldPlayed.manual,true);
  console.log('PASS',JSON.stringify({touch,method,draft:true,undoRedo:true,newAndLegacyReplay:true,profileIsolation:true}));
 }
 // Native live brush/sort and changing the draft while running produce a
 // generation-stamped switch back to nearest mode in the same recording.
 await page.evaluate(()=>fieldTest.setup('magnet'));await choose(true);await tap('#btnPlayPauseLife');await page.waitForFunction(()=>fieldTest.state().gen>=2);
 const rect=await page.locator('#boardCanvas').boundingBox(),a={x:rect.x+rect.width*.25,y:rect.y+rect.height*.4},b={x:rect.x+rect.width*.65,y:rect.y+rect.height*.6};
 if(touch){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();}
 await tap('#btnCycleSort');await choose(false);const atSwitch=(await state()).gen;assert((await state()).playing);await page.waitForFunction(gen=>fieldTest.state().gen>gen,atSwitch);await tap('#btnPlayPauseLife');const live=await state();assert(live.logs.some(line=>line.includes('DRAW_STROKE')));assert(live.runs.some(run=>run.combined)&&live.runs.some(run=>!run.combined));
 const mixed=live.logs.join('\n');const mixedPlayed=await replay(mixed);assert.deepEqual(mixedPlayed.tiles,live.tiles);assert(mixedPlayed.runs.some(run=>run.combined)&&mixedPlayed.runs.some(run=>!run.combined));
 await choose(true);await open();await page.screenshot({path:path.join(artifacts,touch?'touch-he.png':'desktop-en.png')});await tap('#btnMagnetSettingsCancel');await page.waitForTimeout(350);
 await page.evaluate(()=>fieldTest.tech());if(!(await page.locator('#profileActions').isVisible()))await tap('[data-profile-dot="0"]');await tap('#btnProfileSave');await boot(true);assert.equal((await state()).manual,false);assert(!JSON.stringify((await state()).settings).includes('fieldModel'));await open();assert.equal(await page.locator('#magnetCombinedField').isChecked(),false);await tap('#btnMagnetSettingsCancel');
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({touch,liveDrawing:true,sort:true,liveFieldSwitch:true,mixedReplay:true,profileReloadOff:true}));await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
