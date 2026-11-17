import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runGallery} from './gallery-browser-flow.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist');await mkdir('/tmp/chapter-one-check',{recursive:true});
let app=await readFile(root+'/js/app.js','utf8');
app=app.replace('      initializeApp();',`window.chapterTest={state:()=>({board:getCurrentState(),settings:getWorkspaceSettings(),history:history.length,future:future.length,logs:[...artRecipeLog]})};initializeApp().then(()=>chapterTest.ready=true);`);
for(const ms of [5000,1500,2000])app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(name==='js/app.js'?app:await readFile(path.join(root,name)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:900,height:600,lang:'he'},{width:1280,height:900,lang:'en'}].filter(c=>!process.env.CHAPTER_VIEWPORT_WIDTH||c.width===Number(process.env.CHAPTER_VIEWPORT_WIDTH))){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 await page.goto(base+'?tour=gallery&lang='+config.lang);await page.waitForFunction(()=>window.chapterTest?.ready);const original=await page.evaluate(()=>chapterTest.state()),flags=await page.evaluate(()=>localStorage.getItem('colorGridExperimentalSimulationsV1'));
 await runGallery(page,{...config,ids:process.env.GALLERY_DEMO_IDS?.split(',')});assert.deepEqual(await page.evaluate(()=>chapterTest.state()),original,'the real artwork, history and preferences remain unchanged');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('colorGridChapterOneV1')).status),'complete');
 assert.equal(await page.evaluate(()=>localStorage.getItem('colorGridExperimentalSimulationsV1')),flags);console.log('PASS guided gallery',config);
 await page.evaluate(()=>localStorage.setItem('colorGridChapterOneV1',JSON.stringify({version:1,status:'active',step:'live-explore'})));await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('.chapter-coach [data-gallery]')&&!document.querySelector('.chapter-coach [data-gallery]').hidden);await page.locator('.chapter-coach [data-gallery]').click();
 await page.waitForFunction(()=>document.querySelector('.chapter-one-tour')?.dataset.step==='gallery-life-intro');
 const beforeSkip=await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().gallerySerial);await page.locator('.chapter-coach [data-skip]').click();await page.waitForFunction(()=>document.querySelector('.chapter-one-tour')?.dataset.step==='gallery-chi-intro');assert.equal(await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().gallerySerial),beforeSkip,'skipping an introduction never silently loads a board');await page.locator('.chapter-coach [data-gallery]').click();assert.equal(await page.locator('.chapter-one-tour').count(),0);
 await page.evaluate(()=>localStorage.setItem('colorGridChapterOneV1',JSON.stringify({version:1,status:'active',step:'gallery-magnet-anchor'})));await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('.chapter-frame')?.contentWindow.chapterOnePractice?.read().galleryId==='magnet');
 assert(await page.locator('.chapter-coach [data-next]').isDisabled(),'resuming requires a new learner action');
 const frame=page.frameLocator('.chapter-frame');await frame.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().playing);
 await page.evaluate(()=>window.detachedPractice=document.querySelector('.chapter-frame').contentWindow.chapterOnePractice);await page.locator('.chapter-coach [data-gallery]').click();assert.equal(await page.evaluate(()=>detachedPractice.read().playing),false,'Finish stops the practice engine');assert.deepEqual(errors,[]);
 await context.close();console.log('PASS gallery entry, skip, resume and finish',config.lang);
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
