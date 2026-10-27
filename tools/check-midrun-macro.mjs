// Load a supplied mid-run logger file through the real file input and Play UI.
// MACRO_BASELINE optionally reproduces the pre-fix stall from an app.js copy.
// After verifying the visible start, accelerate waits and pump real generations
// without rendering every intermediate frame to check the complete recording.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.MACRO_ARTIFACTS||'/tmp/midrun-macro-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});

const input=process.argv[2];if(!input)throw Error('Pass a macro .txt path');
try{for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
 const context=await browser.newContext({viewport,serviceWorkers:'block',isMobile:viewport.width<600,hasTouch:viewport.width<600});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
 let source=await readFile(process.env.MACRO_BASELINE||path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.macroTest={debug:()=>({step:currentMacroStep,total:macroQueue.length,playing:isMacroPlaying,life:isLifePlaying,n,gen:currentGenerationCount,next:macroQueue[currentMacroStep]?.eventName,board:boardState.reduce((s,t)=>s+t.k,0)}),accelerate:()=>{const base=macroQueue[Math.max(0,currentMacroStep-1)]?.delta||0;for(let i=currentMacroStep;i<macroQueue.length;i++)macroQueue[i].delta=base+(macroQueue[i].delta-base)/1000;macroStartTime=performance.now()-base;renderToScreen=()=>{};},pump:()=>{for(let i=0;i<100&&isMacroPlaying&&isLifePlaying;i++){cancelAnimationFrame(animationFrameId);gameLoop();}cancelAnimationFrame(animationFrameId);},parse:parseMacroText,stop:stopMacro,record:()=>artRecipeLog.join(String.fromCharCode(10))};initializeApp().then(()=>macroTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.macroTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const before=await page.evaluate(()=>macroTest.debug());await page.locator('#projectFileInput').setInputFiles(input);await page.waitForFunction(()=>document.getElementById('macroOverlay').classList.contains('active'));await page.locator('#btnMacroPlay').click();await page.waitForTimeout(1800);
 let state=await page.evaluate(()=>macroTest.debug());console.log(process.env.MACRO_BASELINE?'BASELINE':'OPEN',viewport.width,JSON.stringify(state));
 if(process.env.MACRO_BASELINE){assert.equal(state.step,0);assert.equal(state.board,before.board);await context.close();continue;}
 assert(state.step>0);assert.equal(state.n,249);assert(state.board>0,'recorded brush edits paint on the loaded board');assert.deepEqual(errors,[]);await page.screenshot({path:path.join(artifacts,viewport.width+'-playing.png')});
 await page.evaluate(()=>macroTest.accelerate());let last=-1,stalled=0;
 const deadline=Date.now()+240000;
 while(state.playing&&Date.now()<deadline){await page.evaluate(()=>macroTest.pump());await page.waitForTimeout(5);state=await page.evaluate(()=>macroTest.debug());if(state.step===last)stalled++;else{last=state.step;stalled=0;}if(stalled>400)throw Error('Stalled: '+JSON.stringify(state));}
 console.log('END',viewport.width,JSON.stringify(state));assert(!state.playing,'whole file reaches its end');assert(!state.life);assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
