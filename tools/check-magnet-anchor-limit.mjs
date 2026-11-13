// Session-only selector, new/legacy macro limits, live drawing, history and profile isolation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',file)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results=[];
const artifacts=process.env.MAGNET_LIMIT_ARTIFACTS||'/tmp/magnet-anchor-limit-check';await mkdir(artifacts,{recursive:true});
try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});await context.addInitScript(touch=>{localStorage.setItem('userLanguage',touch?'he':'en');Math.random=()=>.25;},touch);
 const page=await context.newPage(),errors=[],pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 let source=await readFile(root+'/dist/js/app.js','utf8');
 source=source.replace('      initializeApp();',`window.capTest={
 setup:(limit,method)=>{stopMacro();pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Mono');currentSortMethod='luminance';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,currentSortMethod));n=101;initializeBoardAndCanvas(true);armSimulation('magnet');magnetRules={method,anchorColorIndex:-1};magnetMode=method;boardState.forEach((t,i)=>{t.k=t.v=i%5===0?0:(i*7)%paletteLen();t.isGold=i%173===0;});brushSize=3;brushShape='diamond';symmetryMode='off';selectedColorIndex=paletteLen()-1;selectedColor=palette().at(-1);setBrushMode(true,true);isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');dom.btnStepForward.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();renderToScreen(null);window.capsUsed=[];togglePlayPauseLife();},
 stop:()=>stopMacro(),tech:()=>modals.openTechnicianMenu(),
 queueFirst:()=>macroQueue.find(a=>a.eventName==='PLAY')?.details,selected:()=>magnetAnchorLimit,effective:()=>effectiveMagnetAnchorLimit(),validate:parseMacroText,
 anchorBrush:()=>{selectedColorIndex=0;selectedColor=palette()[0];},
 state:()=>({loaded:isMacroLoaded,macro:isMacroPlaying,tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:!!t.isGold})),playing:isLifePlaying,gen:currentGenerationCount,rules:{...magnetRules},observed:[...new Set(window.capsUsed||[])]}),
 record:()=>artRecipeLog.join(String.fromCharCode(10)),settings:()=>getWorkspaceSettings(),
 
 replay:text=>{pauseLife();window.capsUsed=[];macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},done:()=>!isMacroPlaying&&!isLifePlaying};initializeApp().then(()=>capTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const engine=(await readFile(root+'/dist/js/simulations/magnet.js','utf8')).replace('const anchorLimit = limitOverride ?? (magnetRules.anchorLimit || 300);','const anchorLimit = limitOverride ?? (magnetRules.anchorLimit || 300); (window.capsUsed??=[]).push(anchorLimit);');
 await page.route(base+'/js/simulations/magnet.js',r=>r.fulfill({contentType:'text/javascript',body:engine}));
 await page.goto(base);await page.waitForFunction(()=>window.capTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const cdp=touch?await context.newCDPSession(page):null;
 const stroke=async(reverse)=>{const r=await page.locator('#boardCanvas').boundingBox(),a={x:r.x+r.width*.25,y:r.y+r.height*(reverse?.6:.4)},b={x:r.x+r.width*.7,y:r.y+r.height*(reverse?.4:.6)};
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/4,y:a.y+(b.y-a.y)*i/4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up();}
 };
 const choose=async limit=>{await page.evaluate(()=>capTest.tech());await page.locator('#magnetAnchorLimit').selectOption(String(limit));await page.evaluate(()=>document.getElementById('technicianDialog').close());assert.equal(await page.evaluate(()=>capTest.selected()),limit);};
 assert.equal(await page.evaluate(()=>capTest.selected()),300);
 const choices=await page.locator('#magnetAnchorLimit option').evaluateAll(options=>options.map(o=>Number(o.value)));assert.deepEqual(choices,[300,600,1000,1500,2000]);
 for(const method of touch||process.env.MAGNET_LIMIT_FOCUS?['magnet']:['magnet','cosmic_magnet','time_magnet','expand'])for(const limit of process.env.MAGNET_LIMIT_FOCUS?[300,600]:[300,600,1000,1500,2000]){
  const errorStart=errors.length;await choose(limit);await page.evaluate(({limit,method})=>capTest.setup(limit,method),{limit,method});await page.waitForFunction(()=>capTest.state().gen>=2);await stroke(false);await page.evaluate(()=>capTest.anchorBrush());await stroke(true);await page.waitForTimeout(40);const live=(await page.evaluate(()=>capTest.state())).playing;
  await page.locator('#btnUndo').click();const undo=(await page.evaluate(()=>capTest.state())).tiles;await page.locator('#btnRedo').click();const expected=(await page.evaluate(()=>capTest.state())).tiles;
  const recipe=await page.evaluate(()=>capTest.record());await writeFile(path.join(artifacts,method+'-'+limit+(touch?'-touch':'')+'.txt'),recipe);
  await choose(limit===2000?600:2000);
  await page.evaluate(text=>capTest.replay(text),recipe);await page.waitForFunction(()=>capTest.done(),null,{timeout:15000});const replay=await page.evaluate(()=>capTest.state());
  const result={touch,method,limit,liveDrawing:live,undoChangesBoard:JSON.stringify(undo)!==JSON.stringify(expected),recordedLimit:limit===300?!recipe.includes('"anchorLimit"'):recipe.includes('"anchorLimit":'+limit),replayMatches:JSON.stringify(expected)===JSON.stringify(replay.tiles),observedReplayLimits:replay.observed,errors:errors.slice(errorStart)};
  assert(result.liveDrawing);assert(result.undoChangesBoard);assert(result.recordedLimit);assert(result.replayMatches);assert.deepEqual(result.observedReplayLimits,[limit]);assert.equal(Object.hasOwn(replay.rules,'anchorLimit'),false);assert.deepEqual(result.errors,[]);
  assert.equal(await page.evaluate(()=>capTest.effective()),limit===2000?600:2000,'completion restores manual choice');
  results.push(result);console.log(JSON.stringify({...result,errors:result.errors.map(e=>e.slice(0,180))}));
 }
 if(!touch){
  const text=await readFile(path.join(artifacts,'magnet-300.txt'),'utf8');
  await choose(2000);await page.evaluate(text=>capTest.replay(text),text);await page.waitForFunction(()=>capTest.done(),null,{timeout:15000});assert.deepEqual((await page.evaluate(()=>capTest.state())).observed,[300],'legacy playback ignores chosen 2000');
  const exported=await page.evaluate(async()=>{const {serializeWorkspaceSettings}=await import('/js/workspace-settings.js');return serializeWorkspaceSettings(capTest.settings());});assert(!exported.includes('anchorLimit'));
  for(const bad of ['null','0','-300','301','2500','"2000"']){const invalid=text.replaceAll('"anchorColorIndex":-1','"anchorColorIndex":-1,"anchorLimit":'+bad);assert(await page.evaluate(text=>{try{capTest.validate(text);return false;}catch{return true;}},invalid),'invalid cap rejected before playback');}
 }
 if(!touch){
  const init=(await readFile(path.join(artifacts,'magnet-300.txt'),'utf8')).match(/INIT_STATE -> (.*)/)[1];
  const file=(limit,gap=false)=>'[12:00:00.000] INIT_STATE -> '+init+'\n[12:00:00.010] PLAY -> Armed: magnet | Sort: luminance | Rules: '+JSON.stringify({method:'magnet',anchorColorIndex:-1,...(limit===300?{}:{anchorLimit:limit})})+'\n[12:00:00.020] [GEN:8] PAUSE -> ---'+(gap?'\n[12:00:02.000] PLAY -> Armed: magnet | Sort: luminance | Rules: '+JSON.stringify({method:'magnet',anchorColorIndex:-1,anchorLimit:limit})+'\n[12:00:02.010] [GEN:8] PAUSE -> ---':'');
  const upload=async text=>{await page.locator('#projectFileInput').setInputFiles({name:'anchor-limit.txt',mimeType:'text/plain',buffer:Buffer.from(text)});const expected=text.match(/PLAY -> (.*)/)[1];await page.waitForFunction(expected=>capTest.state().loaded&&capTest.queueFirst()===expected,expected);await page.evaluate(()=>window.capsUsed=[]);};
  await choose(2000);await upload(file(600,true));await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>capTest.state().macro&&!capTest.state().playing&&capTest.state().observed.includes(600)&&capTest.state().gen>=8);assert.equal(await page.evaluate(()=>capTest.effective()),600);
  await choose(1500);assert.equal(await page.evaluate(()=>capTest.effective()),600,'personal change does not override the loaded macro during its pause');await page.waitForFunction(()=>!capTest.state().loaded,null,{timeout:15000});assert.deepEqual((await page.evaluate(()=>capTest.state())).observed,[600]);assert.equal(await page.evaluate(()=>capTest.effective()),1500);
  await upload(file(1000,true));await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>capTest.state().playing&&capTest.state().observed.includes(1000));await upload(file(300));await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>!capTest.state().loaded,null,{timeout:15000});assert.deepEqual((await page.evaluate(()=>capTest.state())).observed,[300],'file replacement clears the previous recorded limit');
  await upload(file(600,true));await page.locator('#btnMacroPlay').click();await page.waitForFunction(()=>capTest.state().playing&&capTest.state().observed.includes(600));await page.evaluate(()=>capTest.stop());assert.equal(await page.evaluate(()=>capTest.effective()),1500,'Stop restores personal choice');
  console.log('PASS actual TXT import, recorded pause/resume, file replacement and Stop');
 }
 // Live cap changes are generation-stamped and survive brush history resolution.
 await choose(600);await page.evaluate(()=>capTest.setup(600,'magnet'));await page.waitForFunction(()=>capTest.state().gen>=2);await stroke(false);await choose(1500);await stroke(true);await page.locator('#btnUndo').click();await page.locator('#btnRedo').click();
 const liveExpected=(await page.evaluate(()=>capTest.state())).tiles,liveRecipe=await page.evaluate(()=>capTest.record());assert(liveRecipe.includes('SIMULATION_RULES')&&liveRecipe.includes('"anchorLimit":1500'));
 await choose(2000);await page.evaluate(text=>capTest.replay(text),liveRecipe);await page.waitForFunction(()=>capTest.done(),null,{timeout:15000});assert.deepEqual((await page.evaluate(()=>capTest.state())).tiles,liveExpected,'live cap changes reproduce the grid');
 const liveObserved=(await page.evaluate(()=>capTest.state())).observed;assert(liveObserved.includes(600)&&liveObserved.includes(1500));
 await page.evaluate(()=>capTest.tech());await page.locator('#magnetAnchorLimit').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,touch?'touch.png':'desktop.png')});await page.evaluate(()=>document.getElementById('technicianDialog').close());
 const before=await page.evaluate(()=>JSON.stringify(capTest.settings()));await choose(1000);assert.equal(await page.evaluate(()=>JSON.stringify(capTest.settings())),before,'choosing a cap does not touch profile settings');
 await page.reload();await page.waitForFunction(()=>window.capTest?.ready);assert.equal(await page.evaluate(()=>capTest.selected()),300,'reload resets the session experiment');
 await page.setViewportSize({width:320,height:568});await page.evaluate(()=>capTest.tech());await page.locator('#magnetAnchorLimit').scrollIntoViewIfNeeded();
 const narrow=await page.locator('.magnet-anchor-limit-option').evaluate(el=>{const label=el.querySelector('label').getBoundingClientRect(),select=el.querySelector('select').getBoundingClientRect();return {overflow:el.scrollWidth>el.clientWidth+1,overlap:Math.min(label.right,select.right)>Math.max(label.left,select.left)&&Math.min(label.bottom,select.bottom)>Math.max(label.top,select.top)};});assert(!narrow.overflow&&!narrow.overlap,'selector fits the narrow menu');
 assert.deepEqual(pageErrors,[]);assert.deepEqual(errors,[]);
 console.log('PASS',touch?'touch/Hebrew':'desktop/English','live changes, legacy 300, profile isolation, session reset');
 results.push({touch,pageErrors});if(cdp)await cdp.detach();await context.close();
}}finally{await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));await browser.close();server.close();}
