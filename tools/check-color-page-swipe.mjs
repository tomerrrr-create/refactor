// Native touch regression check. Touch events are delivered through Chromium's
// input pipeline, not dispatchEvent, so browser scrolling is exercised too.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.SWIPE_ARTIFACTS||'/tmp/color-page-swipe';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results=[];
try{for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:568},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.swipeTest={open:()=>{activePaletteIndex=C.PALETTES.findIndex(p=>p.colors.length===264);selectedColorIndex=-1;selectedColor=null;modals.openColorPickerModal();},page:()=>colorPickerPage,state:()=>({color:selectedColorIndex,brush:brushSize,shape:brushShape})};initializeApp().then(()=>swipeTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base);await page.waitForFunction(()=>window.swipeTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 await page.evaluate(()=>swipeTest.open());await page.waitForTimeout(350);
 const cdp=await context.newCDPSession(page),body=page.locator('.brush-picker-body'),grid=page.locator('#colorPickerSwatches');
 const activePage=()=>page.evaluate(()=>String(swipeTest.page()));
 const position=()=>body.evaluate(e=>({scroll:e.scrollTop,top:e.querySelector('#colorPickerSwatches').getBoundingClientRect().top}));
 const drag=async(start,dx,dy,check)=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  for(let i=1;i<=10;i++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+dx*i/10,y:start.y+dy*i/10}]});
   await page.waitForTimeout(16);if(check)await check();
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);
 };
 const before=await page.evaluate(()=>swipeTest.state());
 for(let i=0;i<16;i++){
  const box=await grid.boundingBox(),forward=i%2===0;
  const baseline=await position();
  const start={x:box.x+box.width*(forward?.8:.2),y:box.y+90};
  const dx=box.width*(forward?-.6:.6),dy=[22,-22,35,-35][i%4];
  await drag(start,dx,dy,async()=>{
   const now=await position();assert.equal(now.scroll,baseline.scroll,'no vertical scroll during horizontal touch');assert.equal(now.top,baseline.top,'no visual vertical movement during touch');
  });
  assert.equal(await activePage(),forward?'1':'0','one page per swipe in the correct direction');
  assert.deepEqual(await position(),baseline,'page render and release do not move the dialog');
  assert.deepEqual(await page.evaluate(()=>swipeTest.state()),before,'swipe never selects a color accidentally');
 }
 // Intentional vertical movement within colors scrolls, without paging.
 const maxScroll=await body.evaluate(e=>e.scrollHeight-e.clientHeight);
 const box=await grid.boundingBox(),pageBefore=await activePage();
 await drag({x:box.x+box.width/2,y:box.y+120},3,-80);
 await page.waitForTimeout(500);
 assert.equal(await activePage(),pageBefore);
 if(maxScroll>1)assert(await body.evaluate(e=>e.scrollTop>0),'vertical color-area gesture still scrolls; max='+maxScroll);
 else assert.equal(await body.evaluate(e=>e.scrollTop),0,'fitting content stays still');
 // Vertical movement outside colors is also unaffected.
 await body.evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(100);
 const tools=await page.locator('.brush-shape-options').boundingBox(),scrollBefore=await body.evaluate(e=>e.scrollTop);
 await drag({x:tools.x+tools.width/2,y:tools.y+20},0,70);await page.waitForTimeout(500);
 if(maxScroll>1)assert(await body.evaluate(e=>e.scrollTop)<scrollBefore,'vertical scrolling outside colors remains usable');
 else assert.equal(await body.evaluate(e=>e.scrollTop),0);
 assert.equal(await activePage(),pageBefore);
 // A subsequent normal tap still selects immediately and keeps the picker open.
 await body.evaluate(e=>e.scrollTop=0);await page.waitForTimeout(100);
 const swatch=await page.locator('#colorPickerSwatches button[data-color]').nth(2).boundingBox();
 await page.touchscreen.tap(swatch.x+swatch.width/2,swatch.y+swatch.height/2);
 assert.equal((await page.evaluate(()=>swipeTest.state())).color,2);assert(await page.locator('#colorPickerModal').evaluate(e=>e.classList.contains('modal-visible')));
 assert.deepEqual(errors,[]);results.push({width,horizontalSwipes:16,frameByFrameVerticalMovement:0,verticalScrolling:true,tap:true,passed:true});
 console.log('PASS',width);await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
