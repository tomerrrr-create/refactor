// Record real legacy journeys before testing separate Cracks/Contours controls.
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts='/tmp/contour-separation-check';await mkdir(artifacts,{recursive:true});
const oldRoot=await mkdtemp(path.join(tmpdir(),'contour-before-'));
execFileSync('tar',['-xf','-','-C',oldRoot],{input:execFileSync('git',['archive','be7b937d5486ad582a24f520c618558c2b790b54'],{cwd:root,maxBuffer:32*1024*1024})});
const server=createServer(async(req,res)=>{try{const parts=new URL(req.url,'http://local').pathname.slice(1).split('/'),version=parts.shift(),file=parts.join('/')||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(version==='old'?oldRoot:path.join(root,'dist'),file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
async function open(version,config={width:1280,height:900,lang:'en'}){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},serviceWorkers:'block',hasTouch:config.width<600,isMobile:config.width<600});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(version==='old'?oldRoot:path.join(root,'dist'),'js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.splitTest={
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');currentSortMethod='luminance';n=21;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=2+(i*7)%12;t.isGold=i===0;});contourRules={sensitivity:75,lineColor:'darkest'};${version==='new'?"contourActionRules={sensitivity:75,lineColor:'darkest'};":''}isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();updateContourButtonUI();},
 state:()=>({board:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),armed:armedSimulation,mode:contourMode,playing:isLifePlaying,gen:currentGenerationCount,history:history.length,loaded:isMacroLoaded,macro:isMacroPlaying}),
 play:togglePlayPauseLife,pause:pauseLife,step:stepForward,undo,redo,arm:armSimulation,macro:playMacro,recipe:async()=>await createArtRecipeFile().text(),prefs:getWorkspaceSettings,${version==='new'?"expectedUtility:()=>Simulations.runContourGeneration({n,currentBoardState:boardState,currentPalette:palette(),contourRules:contourActionRules}).map(t=>({k:t.k,v:t.v,isGold:t.isGold})),":''}
 expected:()=>Simulations.runContourGeneration({n,currentBoardState:boardState,currentPalette:palette(),contourRules:{sensitivity:75,lineColor:'darkest'}}).map(t=>({k:t.k,v:t.v,isGold:t.isGold})),
 };initializeApp().then(()=>splitTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/'+version+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base+'/'+version+'/');await page.waitForFunction(()=>splitTest.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>splitTest.setup());return {page,context,errors};
}
const fixtures=[];
try{
 const old=await open('old'),p=old.page;
 for(const mixed of [true,false]){
  await p.evaluate(()=>splitTest.setup());await p.locator('#btnContour').click();
  if(mixed){await p.evaluate(()=>splitTest.play());await p.waitForFunction(()=>splitTest.state().gen>=4);await p.locator('#btnContour').click();await p.waitForFunction(()=>splitTest.state().gen>=7);await p.locator('#btnContour').click();await p.waitForFunction(()=>splitTest.state().gen>=10);await p.evaluate(()=>splitTest.pause());}
  await p.locator('#btnContour').click();await p.evaluate(()=>splitTest.step());await p.evaluate(()=>splitTest.play());await p.waitForFunction(()=>splitTest.state().gen>=3);await p.evaluate(()=>splitTest.pause());
  const fixture={name:mixed?'old-mixed':'old-contours',text:await p.evaluate(()=>splitTest.recipe()),expected:(await p.evaluate(()=>splitTest.state())).board};fixtures.push(fixture);await writeFile(path.join(artifacts,fixture.name+'.txt'),fixture.text);await writeFile(path.join(artifacts,fixture.name+'.json'),JSON.stringify(fixture.expected));
 }
 const contour=fixtures[1];const plain=contour.text.split('\n').filter(line=>!line.includes('HISTORY_ACTION ->')).map(line=>{if(!line.includes('INIT_STATE ->'))return line;const at=line.indexOf(' -> ')+4,value=JSON.parse(line.slice(at));delete value.recipeVersion;return line.slice(0,at)+JSON.stringify(value);}).join('\n');fixtures.push({name:'old-contours-non-history',text:plain,expected:contour.expected});assert.deepEqual(old.errors,[]);await old.context.close();
 if(process.env.CONTOUR_RECORD_ONLY){console.log('PASS legacy recordings captured',fixtures.map(f=>f.name));}
 else for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}].filter(c=>!process.env.CONTOUR_LANG||c.lang===process.env.CONTOUR_LANG)){
  const fresh=await open('new',config),page=fresh.page,state=()=>page.evaluate(()=>splitTest.state()),action=page.locator('#btnContoursAction'),cracks=page.locator('#btnContour');
  const initial=await state(),expected=await page.evaluate(()=>splitTest.expected());await action.click();assert.deepEqual((await state()).board,expected);assert.equal((await state()).armed,null);assert.equal((await state()).history,1);await page.locator('#btnUndo').click();assert.deepEqual((await state()).board,initial.board);await page.locator('#btnRedo').click();assert.deepEqual((await state()).board,expected);
  let text=await page.evaluate(()=>splitTest.recipe());assert(text.includes('CONTOUR_APPLY'));await replay(text,expected);
  await page.evaluate(()=>splitTest.setup());await cracks.click();const armed=await state();assert.equal(armed.mode,'cracks');assert.deepEqual(armed.board,initial.board);await cracks.click();assert.equal((await state()).armed,null);await cracks.click();await page.evaluate(()=>splitTest.play());await page.waitForFunction(()=>splitTest.state().gen>=4);await action.click();assert.equal((await state()).playing,false);assert.equal((await state()).mode,'cracks');assert.equal((await state()).armed,'contour');
  const live=await state();text=await page.evaluate(()=>splitTest.recipe());await replay(text,live.board);
  const r=await action.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();await page.locator('#contourSettingsModal').waitFor({state:'visible'});assert(!(await page.locator('#contourSensitivitySlider').isDisabled()));await page.locator('#btnContourSettingsCancel').click();
  const cracksPreferences=(await page.evaluate(()=>splitTest.prefs())).rules.contour;
  await openUtility();await page.locator('#contourSensitivitySlider').fill('90');await page.locator('#btnContourColorLight').click();await page.locator('#btnContourSettingsCancel').click();assert.deepEqual((await page.evaluate(()=>splitTest.prefs())).rules.contour,cracksPreferences);
  await openUtility();assert.equal(await page.locator('#contourSensitivitySlider').inputValue(),'75');await page.locator('#contourSensitivitySlider').fill('90');await page.locator('#btnContourColorLight').click();await page.locator('#btnContourSettingsSave').click();
  const preferences=await page.evaluate(()=>splitTest.prefs());assert.deepEqual(preferences.rules.contour,cracksPreferences,'Contours preferences never rewrite Cracks');assert.deepEqual(preferences.contourAction,{sensitivity:90,lineColor:'lightest'});
  const utilityExpected=await page.evaluate(()=>splitTest.expectedUtility());await action.click();assert.deepEqual((await state()).board,utilityExpected);const savedPreferences=await page.evaluate(()=>splitTest.prefs());await replay(await page.evaluate(()=>splitTest.recipe()),utilityExpected);assert.deepEqual(await page.evaluate(()=>splitTest.prefs()),savedPreferences,'macro does not replace personal utility preferences');
  async function openUtility(){await page.locator('#contourSettingsModal').waitFor({state:'hidden'});const r=await action.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-35,{steps:5});await page.mouse.up();await page.locator('#contourSettingsModal').waitFor({state:'visible'});}

  assert(await action.evaluate(button=>{const b=button.getBoundingClientRect(),s=document.querySelector('#btnSymmetry').getBoundingClientRect(),o=document.querySelector('#simModeBackground').getBoundingClientRect();return b.top>=s.bottom&&Math.abs(b.left+b.width/2-s.left-s.width/2)<1&&b.left>=o.right;}));
  await page.evaluate(()=>splitTest.setup());for(const fixture of fixtures)await replay(fixture.text,fixture.expected);
  assert.deepEqual(fresh.errors,[]);await page.screenshot({path:path.join(artifacts,config.lang+'.png')});console.log('PASS',JSON.stringify(config));await fresh.context.close();
  async function replay(text,expected){await page.locator('#projectFileInput').setInputFiles({name:'contours.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>splitTest.state().loaded);await page.evaluate(()=>splitTest.macro());await page.waitForFunction(()=>!splitTest.state().loaded&&!splitTest.state().macro,null,{timeout:30000});assert.deepEqual((await state()).board,expected,'old/new journey replay is exact');}
 }
}finally{await browser.close();server.close();await rm(oldRoot,{recursive:true,force:true});}
