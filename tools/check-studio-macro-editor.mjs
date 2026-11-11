import {readFile,mkdir} from 'node:fs/promises';import {createServer} from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const root=fileURLToPath(new URL('../dist/',import.meta.url));
const app=await readFile(root+'studio/engine/js/app.js','utf8');const instrumented=app.replace('window.macroVideoEngine = {','window.studioEditTest={state:()=>getCurrentState()};window.macroVideoEngine = {');
const server=createServer(async(req,res)=>{try{let f=new URL(req.url,'http://local').pathname.slice(1);if(!f||f.endsWith('/'))f+='index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');res.end(f==='studio/engine/js/app.js'?instrumented:await readFile(path.join(root,f)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});await mkdir('/tmp/studio-editor',{recursive:true});
const fixture=[
 '[00:00:00.000] INIT_STATE -> '+JSON.stringify({recipeVersion:2,n:9,pal:0,sort:'luminance',sep:0,board:'81x5',gold:[0]}),
 '[00:00:00.050] PLAY -> Armed: nudgeBrighter | Sort: luminance | Rules: {"nudgeTimingVersion":1,"intervalMs":100}',
 '[00:00:00.500] [GEN:3] PAUSE -> ---',
 '[00:00:00.550] Spiral Mode Changed -> tornado',
 '[00:00:00.600] PLAY -> Armed: spiral | Sort: luminance | Rules: {"method":"tornado","tornadoVersion":3,"tornadoFrame":0}',
 '[00:00:01.000] [GEN:12] PAUSE -> ---',
 '[00:00:01.100] PLAY -> Armed: spiral | Sort: luminance | Rules: {"method":"tornado","tornadoVersion":3,"tornadoFrame":12}',
 '[00:00:01.500] [GEN:10] PAUSE -> ---',
 '[00:00:01.600] DRAW_STROKE -> [{"i":40,"k":8,"isGold":false}]'].join('\n');
try{for(const cfg of [{lang:'en',width:1280,height:1000},{lang:'he',width:390,height:844}]){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.width<600,serviceWorkers:'block'}),page=await context.newPage(),requests=[],errors=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/studio/?lang='+cfg.lang);await page.waitForTimeout(350);
 assert(!requests.some(u=>/\/(editor|macro-edit-model|macro-editor-engine)\.js/.test(u)));await page.locator('#editorTab').click();
 assert.equal(page.frames().filter(f=>f.url().includes('editor=1')).length,0,'no editing engine before a file is chosen');
 await page.locator('#editorFile').setInputFiles({name:'journey.txt',mimeType:'text/plain',buffer:Buffer.from(fixture)});await page.waitForFunction(()=>!document.querySelector('#editorPlay').disabled);
 const ef=()=>page.frames().find(f=>f.url().includes('editor=1'));
 assert.equal(await page.locator('[data-hold="6"]').count(),0,'resume is not marked safe');
 const allRows=await page.locator('#editorActions > li').evaluateAll(rows=>rows.map(r=>r.dataset.from));
 const safeRows=await page.locator('#editorActions > li[data-safe]').evaluateAll(rows=>rows.map(r=>({from:r.dataset.from,title:r.querySelector('summary').textContent})));
 const beforeFilter=await ef().evaluate(()=>macroEditorEngine.state());
 const toggleFilter=()=>cfg.width<600?page.locator('#editorSafeFilter').tap():page.locator('#editorSafeFilter').click();
 await toggleFilter();assert.equal(await page.locator('#editorSafeFilter').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await page.locator('#editorActions > li').evaluateAll(rows=>rows.map(r=>({from:r.dataset.from,title:r.querySelector('summary').textContent}))),safeRows,'filter preserves original numbers and safe targets');
 assert.deepEqual(await ef().evaluate(()=>macroEditorEngine.state()),beforeFilter,'filter does not touch playback');
 await toggleFilter();assert.deepEqual(await page.locator('#editorActions > li').evaluateAll(rows=>rows.map(r=>r.dataset.from)),allRows);
 await toggleFilter();

 await page.locator('[data-hold="4"]').click();await page.waitForFunction(()=>!document.querySelector('#editorStart').disabled);
 await page.waitForTimeout(150);const boundary=await ef().evaluate(()=>macroEditorEngine.state());assert.equal(boundary.boundary,4);assert(!boundary.running);const board=await ef().evaluate(()=>studioEditTest.state());assert(board.tiles[0].isGold);
 const frozen=await ef().evaluate(()=>studioEditTest.state());await page.waitForTimeout(200);assert.deepEqual(await ef().evaluate(()=>studioEditTest.state()),frozen,'paused engine clock freezes all simulation state');await page.locator('#editorStart').click();assert(await page.locator('#editorSelection').isVisible());assert(!(await page.locator('#editorSave').isDisabled()));
 const downloadEvent=page.waitForEvent('download');await page.locator('#editorSave').click();const download=await downloadEvent;const saved=await download.path(),text=await readFile(saved,'utf8');assert(text.includes('ISLANDS_INIT'));assert(!text.includes('freshStart'));assert(!text.includes('"values"'));
 await page.screenshot({path:'/tmp/studio-editor/'+cfg.lang+'.png',fullPage:true});
 // Cropped file and original source run through the unchanged application
 // player (inside the generated Studio engine), including exact phase restore.
 const run=async recipe=>ef().evaluate(async text=>{macroEditorEngine.stop();macroVideoEngine.start(text,520);for(let i=0;i<1000;i++){await exportClock.tickAsync(40);const s=macroVideoEngine.draw();if(!s.playing)return studioEditTest.state();}throw Error('Replay did not finish');},recipe);
 const finalNew=await run(text),finalOriginal=await run(fixture);assert.deepEqual(finalNew.tiles,finalOriginal.tiles,'cropped continuation matches deterministic source');
 await page.locator('#editorReset').click();await page.locator('#editorPlay').click();await page.waitForTimeout(180);await page.locator('#editorPlay').click();await page.locator('#editorNextSafe').click();await page.waitForFunction(()=>!document.querySelector('#editorStart').disabled);assert(!(await ef().evaluate(()=>macroEditorEngine.state())).running);assert.equal((await ef().evaluate(()=>macroEditorEngine.state())).boundary,4,'next safe skips middle and resume points');
 await page.locator('[data-hold="1"]').click();await page.waitForFunction(()=>!document.querySelector('#editorStart').disabled);assert.equal((await ef().evaluate(()=>macroEditorEngine.state())).boundary,1,'earlier marker restarts and navigates automatically');
 await page.locator('#videoTab').click();assert(await page.locator('#videoPanel').isVisible());assert(await page.locator('#editorPanel').isHidden());
 if(cfg.lang==='en'){
  await page.locator('#file').setInputFiles({name:'trimmed.txt',mimeType:'text/plain',buffer:Buffer.from(text)});
  await page.locator('[name="size"][value="540"]').check();await page.locator('[name="fps"][value="15"]').check();
  await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').click();await page.locator('#download').waitFor({state:'visible',timeout:60000});assert((await page.evaluate(()=>lastExportReport.bytes))>0,'video export still works');
 }
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(cfg),'lazy loading, safe handoff, resume exclusion, checkpoint preview, TXT download and unchanged-player replay');await context.close();
}}finally{await browser.close();server.close();}
