// Verify Nudge selection, recording and replay through the browser.
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts='/tmp/nudge-legacy-check';await mkdir(artifacts,{recursive:true});
// Record with the exact application before the unified Nudge change.
const legacyRoot=await mkdtemp(path.join(tmpdir(),'nudge-legacy-'));
const archive=execFileSync('git',['archive','4d2357209bfd507121dee3f18c4ad61470a8b115'],{cwd:root,maxBuffer:32*1024*1024});
execFileSync('tar',['-xf','-','-C',legacyRoot],{input:archive});
const server=createServer(async(req,res)=>{try{
 const parts=new URL(req.url,'http://local').pathname.slice(1).split('/'),version=parts.shift();
 const f=parts.join('/')||'index.html',dir=version==='old'?legacyRoot:path.join(root,'dist');
 res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(dir,f)));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
async function open(version,config){
 const context=await browser.newContext({viewport:config,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(version==='old'?legacyRoot:path.join(root,'dist'),'js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.legacyTest={
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=0;currentSortMethod='luminance';n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=5+i%4;t.isGold=i===0;});isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');dom.btnPlayPauseLife.classList.remove('control-hidden');evolutionSlots=validateEvolutionSlots(['nudgeBrighter','nudgeDarker',...DEFAULT_EVOLUTION_SLOTS.slice(2)]);evolutionDrawer.applyLayout();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();},
 state:()=>({board:boardState.map(t=>({k:t.k,v:t.v,isGold:t.isGold})),gen:currentGenerationCount,playing:isLifePlaying,loaded:isMacroLoaded,macro:isMacroPlaying}),
 record:async()=>await createArtRecipeFile().text(),pause:pauseLife,
 };initializeApp().then(()=>legacyTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/'+version+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base+'/'+version+'/');await page.waitForFunction(()=>legacyTest.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 return {context,page,errors};
}
try{for(const config of [{width:1280,height:900},{width:390,height:844}]){
 const old=await open('old',config),page=old.page;await page.evaluate(()=>legacyTest.setup());
 const initial=await page.evaluate(()=>legacyTest.state());
 await page.locator('#btnNudgeBrighter').click();assert.equal((await page.evaluate(()=>legacyTest.state())).board[1].k,initial.board[1].k+1);
 await page.locator('#btnStepForward').click();await page.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>legacyTest.state().gen>=4);await page.evaluate(()=>legacyTest.pause());
 await page.locator('#btnNudgeDarker').click();await page.locator('#btnStepForward').click();await page.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>legacyTest.state().gen>=2);await page.evaluate(()=>legacyTest.pause());
 const expected=await page.evaluate(()=>legacyTest.state()),historyRecipe=await page.evaluate(()=>legacyTest.record());
 assert(historyRecipe.includes('NUDGE -> Brighter'));assert(historyRecipe.includes('NUDGE -> Darker'));assert(!historyRecipe.includes('Nudge Mode Changed'));
 await page.locator('#btnUndo').click();await page.locator('#btnRedo').click();assert.deepEqual((await page.evaluate(()=>legacyTest.state())).board,expected.board);
 const undoRecipe=await page.evaluate(()=>legacyTest.record());
 // Also exercise the older non-history parser with the same operations.
 const plainRecipe=historyRecipe.split('\n').filter(line=>!line.includes('HISTORY_ACTION ->')).map(line=>{
  if(!line.includes('INIT_STATE ->'))return line;
  const at=line.indexOf(' -> ')+4,init=JSON.parse(line.slice(at));delete init.recipeVersion;return line.slice(0,at)+JSON.stringify(init);
 }).join('\n');
 const fresh=await open('new',config);
 for(const [name,recipe] of [['old-history',historyRecipe],['old-history-undo-redo',undoRecipe],['old-non-history',plainRecipe]]){
  await writeFile(path.join(artifacts,config.width+'-'+name+'.txt'),recipe);
  await fresh.page.locator('#projectFileInput').setInputFiles({name:name+'.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});
  await fresh.page.waitForFunction(()=>legacyTest.state().loaded);
  await fresh.page.locator('#btnMacroPlay').click();
  await fresh.page.waitForFunction(()=>!legacyTest.state().loaded&&!legacyTest.state().macro,null,{timeout:30000});
  assert.deepEqual((await fresh.page.evaluate(()=>legacyTest.state())).board,expected.board,name+' matches old application pixel for pixel');
  console.log('PASS',config.width,name);
 }
 assert.deepEqual(old.errors,[]);assert.deepEqual(fresh.errors,[]);await old.context.close();await fresh.context.close();
}}finally{await browser.close();server.close();await rm(legacyRoot,{recursive:true,force:true});}
