// Native touch regression check. Touch events are delivered through Chromium's
// input pipeline, not dispatchEvent, so browser scrolling is exercised too.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.PALETTE_ARTIFACTS||'/tmp/palette-card-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results=[];
try{for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.paletteTest={open:()=>modals.openPaletteModal(),tech:()=>modals.openTechnicianMenu(),sort:method=>{applySortMethod(method);modals.populatePaletteModal();},state:()=>({index:activePaletteIndex,sortMethod:currentSortMethod,logs:artRecipeLog.join('~'),board:boardState.map(t=>t.k),colors:C.PALETTES.map(p=>[p.originalName,p.colors])})};initializeApp().then(()=>paletteTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.paletteTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>paletteTest.state());await page.evaluate(()=>paletteTest.open());await page.waitForTimeout(350);
 const before=await state();
 for(const group of ['classic','extended','continuous','archive']){
  await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();
  const header=await page.locator('#paletteModal .palette-picker-header').evaluate(header=>{
   const buttons=[...header.querySelectorAll('button')].sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
   return buttons.map(button=>({id:button.dataset.paletteGroup||'current',top:button.getBoundingClientRect().top}));
  });
  assert.deepEqual(header.map(button=>button.id),['classic','extended','current','continuous','archive']);
  assert(Math.max(...header.map(button=>button.top))-Math.min(...header.map(button=>button.top))<1,'header controls share one row');
  const description=await page.locator('#paletteModal .palette-group-description').textContent();
  if(group!=='archive')assert.equal(description,{classic:'23',extended:'64',continuous:'264'}[group]);
  else assert.equal(description,{en:'Under construction',he:'בבנייה',ru:'В разработке',nl:'In aanbouw'}[config.lang]);
  const geometry=await page.locator('#paletteModal .palette-choice-list').evaluate(list=>{
   const cards=[...list.children],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
   return {columns:getComputedStyle(list).gridTemplateColumns.split(' ').length,overflow:list.scrollWidth>list.clientWidth+1,cards:cards.map(c=>{const mosaic=c.querySelector('.palette-color-mosaic'),r=rect(mosaic);return{...r,gap:getComputedStyle(mosaic).gap,radius:getComputedStyle(mosaic.firstElementChild).borderRadius,cells:mosaic.children.length,label:c.getAttribute('aria-label'),icon:!!c.querySelector('.palette-choice-icon'),count:!!c.querySelector('.palette-choice-count')};})};
  });
  assert.equal(geometry.columns,3);assert(!geometry.overflow);assert(geometry.cards.length);
  for(const card of geometry.cards){assert(Math.abs(card.w-card.h)<.1,'color preview is square');assert.equal(card.cells,36);assert.equal(card.gap,'0px');assert.equal(card.radius,'0px');assert(card.label&&card.icon);assert.equal(card.count,group==='archive');}
  assert.deepEqual(await state(),before,'group browsing never changes board, palette or log');
  if(group==='classic')await page.screenshot({path:path.join(artifacts,config.lang+'-palette-cards.png')});
 }
 // Board sorting must never alter any group of catalogue previews or the footer.
 const preview=async()=>page.locator('#paletteModal .palette-color-mosaic, #paletteModal .palette-current-summary .palette-color-ribbon').evaluateAll(items=>items.map(item=>[...item.children].map(cell=>cell.style.backgroundColor)));
 for(const group of ['classic','extended','continuous','archive']){
  await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();const fixed=await preview();
  for(const method of ['dark-rainbow','reversed','temperature','hue']){
   await page.evaluate(method=>paletteTest.sort(method),method);
   await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();
   assert.deepEqual(await preview(),fixed,group+' previews stay fixed under '+method);
  }
 }
 await page.evaluate(method=>paletteTest.sort(method),before.sortMethod);
 await page.locator('#paletteModal [data-palette-group="classic"]').click();
 // Tabs retain their keyboard navigation and the selection stays accessible.
 await page.locator('#paletteModal [data-palette-group="archive"]').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#paletteModal [aria-selected="true"]').getAttribute('data-palette-group'),'classic');
 const selected=page.locator('#paletteModal .palette-choice[aria-pressed="true"]');
 if(await selected.count()){assert(await selected.locator('.palette-choice-name').evaluate(e=>getComputedStyle(e).color==='rgb(255, 215, 0)'));}
 const choice=page.locator('#paletteModal .palette-choice').nth(1),index=Number(await choice.getAttribute('data-palette-index'));
 await choice.click();await page.waitForTimeout(350);assert.equal((await state()).index,index);assert(!(await page.locator('#paletteModal').evaluate(e=>e.classList.contains('modal-visible'))));
 assert.deepEqual((await state()).colors,before.colors,'preview never edits the palette catalogue');
 // Reopening lands on the selected card even near the end of a long group.
 for(const group of ['classic','extended','continuous','archive']){
  await page.evaluate(()=>paletteTest.open());
  await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();
  const last=page.locator('#paletteModal .palette-choice').last();
  const lastIndex=Number(await last.getAttribute('data-palette-index'));
  await last.click();
  const selectedState=await state();
  await page.evaluate(()=>paletteTest.open());await page.waitForTimeout(350);
  assert.equal(await page.locator('#paletteModal [aria-selected="true"]').getAttribute('data-palette-group'),group);
  assert.equal((await state()).index,lastIndex);
  const visible=await page.locator('#paletteModal .palette-choice[aria-pressed="true"]').evaluate(card=>{
   const r=card.getBoundingClientRect(),list=card.parentElement.getBoundingClientRect();
   const overlap=Math.min(r.bottom,list.bottom)-Math.max(r.top,list.top);
   return overlap>=Math.min(r.height,list.height)-2;
  });
  assert(visible,'selected card fills the available viewport on opening: '+group);
  assert.deepEqual(await state(),selectedState,'opening does not change board or logs');
  await page.locator('#btnPaletteModalClose').click();
 }
 await page.evaluate(()=>paletteTest.open());
 await page.locator('#palette-current-preview').click();
 await page.waitForFunction(()=>document.querySelector('#colorPickerModal').classList.contains('modal-visible'));
 await page.keyboard.press('Escape');
 await page.evaluate(()=>paletteTest.tech());
 // Open the same shared chooser through Startup without changing the board.
 const startupButton=page.locator('#btnStartupPalette');
 if(!(await startupButton.isVisible()))await page.locator('#btnConfigureStartup').click();
 await startupButton.click();assert(await page.locator('#startupPaletteDialog .palette-color-mosaic').count());
 assert.equal(await page.locator('#startupPaletteDialog [data-palette-group="archive"]').count(),0);
 const startupBefore=await state();await page.locator('#startupPaletteDialog .palette-choice').first().click();assert.deepEqual(await state(),startupBefore);
 assert.deepEqual(errors,[]);results.push({...config,passed:true});console.log('PASS',JSON.stringify(config));await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
