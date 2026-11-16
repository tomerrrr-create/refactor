import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runChapterFive} from './chapter-five-browser-flow.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist');await mkdir('/tmp/chapter-one-check',{recursive:true});
let app=await readFile(root+'/js/app.js','utf8');
app=app.replace('      initializeApp();',`window.chapterTest={state:()=>({board:getCurrentState(),settings:getWorkspaceSettings(),history:history.length,future:future.length,logs:[...artRecipeLog]})};initializeApp().then(()=>chapterTest.ready=true);`);
for(const ms of [5000,1500,2000])app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(name==='js/app.js'?app:await readFile(path.join(root,name)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:900,height:600,lang:'he',explore:false},{width:1280,height:900,lang:'en',explore:true}].filter(c=>!process.env.CHAPTER_VIEWPORT_WIDTH||c.width===Number(process.env.CHAPTER_VIEWPORT_WIDTH))){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?tour=5&lang='+config.lang);await page.waitForFunction(()=>window.chapterTest?.ready);const original=await page.evaluate(()=>chapterTest.state()),originalFlags=await page.evaluate(()=>localStorage.getItem('colorGridExperimentalSimulationsV1'));
 await runChapterFive(page,config);assert.deepEqual(await page.evaluate(()=>chapterTest.state()),original,'outer artwork, settings and history remain unchanged');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('colorGridChapterOneV1')).status),'complete');
 assert.equal(await page.evaluate(()=>localStorage.getItem('colorGridExperimentalSimulationsV1')),originalFlags,'practice exploration never changes real experiment preferences');console.log('PASS chapter five',config);
 // Resume the wave lesson without starting playback on the user's behalf.
 await page.evaluate(()=>localStorage.setItem('colorGridChapterOneV1',JSON.stringify({version:1,status:'active',step:'live-wave'})));await page.goto(base);
 await page.waitForFunction(()=>{const b=document.querySelector('.chapter-frame')?.contentWindow.chapterOnePractice;return b?.read().windMode;});assert(!(await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read())).playing);
 await page.frameLocator('.chapter-frame').locator('#btnPlayPauseLife').click();await page.waitForTimeout(150);const canvas=await page.frameLocator('.chapter-frame').locator('#boardCanvas').boundingBox();await page.mouse.click(canvas.x+canvas.width/2,canvas.y+canvas.height/2);await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
 await page.evaluate(()=>window.detachedPractice=document.querySelector('.chapter-frame').contentWindow.chapterOnePractice);await page.locator('.chapter-coach [data-exit]').click();assert.equal(await page.evaluate(()=>detachedPractice.read().windMode),false);assert.equal(await page.evaluate(()=>detachedPractice.read().playing),false);assert.deepEqual(errors,[]);await context.close();console.log('PASS wave resume and exit',config.lang);
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
