// Native touch regression check. Touch events are delivered through Chromium's
// input pipeline, not dispatchEvent, so browser scrolling is exercised too.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.HOLD_ARTIFACTS||'/tmp/palette-hold-colors';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results=[];
try{for(const config of [{width:1280,height:900,touch:false},{width:390,height:844,touch:true}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.touch,hasTouch:config.touch,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.holdTest={duration:C.LONG_PRESS_SHOW_MS,state:()=>({index:activePaletteIndex,palette:[...palette()],color:selectedColorIndex,size:brushSize,shape:brushShape,board:boardState.map(t=>t.k),log:artRecipeLog.join('~'),history:history.length})};initializeApp().then(()=>holdTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.holdTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const button=page.locator('#btnPalette'),state=()=>page.evaluate(()=>holdTest.state());
 const center=async()=>{const r=await button.boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};};
 const cdp=config.touch?await context.newCDPSession(page):null;
 const down=async point=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});else{await page.mouse.move(point.x,point.y);await page.mouse.down();}};
 const up=async()=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();};
 const duration=await page.evaluate(()=>holdTest.duration),before=await state();
 await down(await center());await page.waitForTimeout(duration+150);
 assert(await page.locator('#colorPickerModal').evaluate(e=>e.classList.contains('modal-visible')));
 assert(!(await page.locator('#paletteModal').evaluate(e=>e.classList.contains('modal-visible'))));
 await up();await page.waitForTimeout(150);assert.deepEqual(await state(),before,'opening release never changes palette, color, board, history or recipe');
 assert(await page.locator('#colorPickerModal').evaluate(e=>e.classList.contains('modal-visible')));
 const swatches=page.locator('#colorPickerSwatches button[data-color]');
 const target=await swatches.evaluateAll((buttons,color)=>buttons.findIndex(b=>b.dataset.color!==color),before.palette[before.color]);assert(target>=0);
 const chosen=await swatches.nth(target).getAttribute('data-color');await swatches.nth(target).click();assert.equal((await state()).color,before.palette.indexOf(chosen));assert.deepEqual((await state()).board,before.board,'a new deliberate selection selects the brush color without painting a tile');
 await page.locator('#btnColorPickerCloseTop').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'btnPalette');await page.waitForTimeout(320);
 if(config.touch){const point=await center();await page.touchscreen.tap(point.x,point.y);}else await button.click();
 await page.waitForTimeout(350);assert.notEqual((await state()).index,before.index,'ordinary tap still cycles palettes');
 for(const dy of [-50,50]){
  const point=await center();await down(point);
  if(cdp){for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y+dy*i/8}]});}
  else await page.mouse.move(point.x,point.y+dy,{steps:8});
  await up();await page.waitForTimeout(100);
  assert(await page.locator('#paletteModal').evaluate(e=>e.classList.contains('modal-visible')),'up/down swipes retain the palette chooser');
  assert(!(await page.locator('#colorPickerModal').evaluate(e=>e.classList.contains('modal-visible'))));
  await page.locator('#btnPaletteModalClose').click();await page.waitForTimeout(320);
 }
 assert.deepEqual(errors,[]);results.push({...config,passed:true});console.log('PASS',JSON.stringify(config));await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
