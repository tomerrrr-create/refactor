import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runChapterFour} from './chapter-four-browser-flow.mjs';
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
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?tour=4&lang='+config.lang);await page.waitForFunction(()=>window.chapterTest?.ready);const original=await page.evaluate(()=>chapterTest.state());
 await runChapterFour(page,config);assert.deepEqual(await page.evaluate(()=>chapterTest.state()),original,'outer artwork, preferences and history remain untouched');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('colorGridChapterOneV1')).status),'active');
 console.log('PASS chapter four',config);
 // A resumed Pause lesson must never start playback without a user action.
 await page.evaluate(()=>localStorage.setItem('colorGridChapterOneV1',JSON.stringify({version:1,status:'active',step:'evolution-pause'})));await page.goto(base);
 await page.waitForFunction(()=>{const b=document.querySelector('.chapter-frame')?.contentWindow.chapterOnePractice;return b?.read().armedSimulation==='gravitationalSort';});
 assert(!(await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read())).playing);assert(await page.locator('.chapter-coach [data-next]').isDisabled());
 await page.frameLocator('.chapter-frame').locator('#btnPlayPauseLife').click();await page.waitForTimeout(150);await page.frameLocator('.chapter-frame').locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);await page.locator('.chapter-coach [data-next]').click();
 assert.deepEqual(errors,[]);console.log('PASS resumed Pause',config.lang);
 await page.evaluate(()=>localStorage.setItem('colorGridChapterOneV1',JSON.stringify({version:1,status:'active',step:'evolution-play'})));await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('.chapter-coach h2').textContent&&!/…/.test(document.querySelector('.chapter-coach h2').textContent));
 await page.frameLocator('.chapter-frame').locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().playing);
 await page.evaluate(()=>window.detachedPractice=document.querySelector('.chapter-frame').contentWindow.chapterOnePractice);
 await page.locator('.chapter-coach [data-exit]').click();assert.equal(await page.evaluate(()=>detachedPractice.read().playing),false,'exiting explicitly stops the practice run');
 assert.deepEqual(errors,[]);await context.close();console.log('PASS exit during playback',config.lang);
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
