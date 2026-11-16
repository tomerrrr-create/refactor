import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runChapterThree} from './chapter-three-browser-flow.mjs';
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
 await page.goto(base+'?tour=3&lang='+config.lang);await page.waitForFunction(()=>window.chapterTest?.ready);const original=await page.evaluate(()=>chapterTest.state());
 await runChapterThree(page,config);assert.deepEqual(await page.evaluate(()=>chapterTest.state()),original,'the outer board, history and preferences remain untouched');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('colorGridChapterOneV1')).status),'active');
 console.log('PASS chapter three',config);
 await page.goto(base+'?tour=3&lang='+config.lang);await page.waitForFunction(()=>document.querySelector('.chapter-one-tour')?.dataset.step==='source-drag');
 await page.locator('.chapter-coach [data-skip]').click();await page.waitForFunction(()=>document.querySelector('.chapter-one-tour')?.dataset.step==='load-color');
 await page.locator('.chapter-coach [data-exit]').click();await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('.chapter-one-tour')?.dataset.step==='load-color');assert(await page.locator('.chapter-coach [data-next]').isDisabled(),'resume requires a fresh color choice');
 await page.locator('.chapter-coach [data-exit]').click();
 // Jump to a resumed free-drawing lesson: its private prerequisites must be restored.
 await page.evaluate(()=>localStorage.setItem('colorGridChapterOneV1',JSON.stringify({version:1,status:'active',step:'free-draw'})));await page.goto(base);
 await page.waitForFunction(()=>{const b=document.querySelector('.chapter-frame')?.contentWindow.chapterOnePractice;if(!b)return false;const s=b.read();return s.n===249&&s.simMode&&s.colors.length>=264;});assert(await page.locator('.chapter-coach [data-next]').isDisabled(),'restoring a board does not complete the drawing task');
 await context.close();
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
