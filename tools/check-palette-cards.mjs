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
 source=source.replace('      initializeApp();',`window.paletteTest={open:()=>modals.openPaletteModal(),undo,redo,recipe:async()=>await createArtRecipeFile().text(),macro:playMacro,startOverride:()=>{isSelectingMacroPalette=true;modals.openPaletteModal();},tech:()=>modals.openTechnicianMenu(),sort:method=>{applySortMethod(method);modals.populatePaletteModal();},state:()=>({history:history.length,future:future.length,loaded:isMacroLoaded,macro:isMacroPlaying,pending:pendingMacroPalette,selecting:isSelectingMacroPalette,index:activePaletteIndex,sortMethod:currentSortMethod,logs:artRecipeLog.join('~'),board:boardState.map(t=>t.k),colors:C.PALETTES.map(p=>[p.originalName,p.colors])})};initializeApp().then(()=>paletteTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.paletteTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>paletteTest.state());await page.evaluate(()=>paletteTest.open());await page.waitForTimeout(350);
 const before=await state();
 await page.locator('#btnPaletteModalClose').focus();await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>{const es=[...document.querySelectorAll('#paletteModal button, #paletteModal [tabindex="0"]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length);return document.activeElement===es.at(-1)}),'disabled Apply is skipped by the focus trap');
 for(const group of ['classic','extended','continuous','archive']){
  await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();
  const header=await page.locator('#paletteModal .palette-picker-header').evaluate(header=>{
   const buttons=[...header.querySelectorAll('button')].sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
   return buttons.map(button=>({id:button.dataset.paletteGroup||'current',top:button.getBoundingClientRect().top+button.getBoundingClientRect().height/2}));
  });
  assert.deepEqual(header.map(button=>button.id),['classic','extended','current','continuous','archive']);
  assert(Math.max(...header.map(button=>button.top))-Math.min(...header.map(button=>button.top))<1,'header controls share one row');
  assert.equal(await page.locator('#paletteModal .palette-group-description').count(),0);
  await page.waitForTimeout(220);
  const symbols=await page.locator('#paletteModal .palette-group-tab').evaluateAll(tabs=>tabs.map(tab=>{
   const symbol=tab.querySelector('.palette-group-symbol'),style=getComputedStyle(tab),ink=getComputedStyle(symbol),r=symbol.getBoundingClientRect(),b=tab.getBoundingClientRect();
   return {id:tab.dataset.paletteGroup,text:symbol.textContent,powers:[...symbol.querySelectorAll('sup')].map(s=>s.textContent),label:tab.getAttribute('aria-label'),title:tab.title,
    selected:tab.getAttribute('aria-selected')==='true',background:style.backgroundColor,image:style.backgroundImage,shadow:style.boxShadow,glow:ink.textShadow,weight:ink.fontWeight,size:ink.fontSize,
    fits:r.left>=b.left-1&&r.right<=b.right+1};
  }));
  assert.deepEqual(symbols.map(s=>[s.text,s.powers]),[['23',[]],['64',[]],['264',[]],['•',[]]]);
  for(const symbol of symbols){assert(symbol.label&&symbol.title&&symbol.fits);assert.equal(symbol.background,'rgba(0, 0, 0, 0)');assert.equal(symbol.image,'none');assert.equal(symbol.shadow,'none');assert.equal(symbol.weight,'400');assert.equal(symbol.size,'18px');assert.equal(symbol.glow==='none',!symbol.selected);}
  const geometry=await page.locator('#paletteModal .palette-choice-list').evaluate(list=>{
   const cards=[...list.children],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
   const style=getComputedStyle(list),rowHeight=cards[0].getBoundingClientRect().height;
   return {rowHeight,listHeight:list.clientHeight,rowLimit:3*rowHeight+2*parseFloat(style.rowGap)+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom),columns:getComputedStyle(list).gridTemplateColumns.split(' ').length,overflow:list.scrollWidth>list.clientWidth+1,cards:cards.map(c=>{const mosaic=c.querySelector('.palette-color-mosaic'),r=rect(mosaic);return{...r,gap:getComputedStyle(mosaic).gap,radius:getComputedStyle(mosaic.firstElementChild).borderRadius,cells:mosaic.children.length,mosaicColumns:getComputedStyle(mosaic).gridTemplateColumns.split(' ').length,centered:Math.abs(c.querySelector('.palette-choice-icon').getBoundingClientRect().left+c.querySelector('.palette-choice-icon').getBoundingClientRect().width/2-(c.querySelector('.palette-choice-name').getBoundingClientRect().left+c.querySelector('.palette-choice-name').getBoundingClientRect().width/2))<1,explicitCenter:getComputedStyle(c).alignItems==='center',order:c.querySelector('.palette-choice-icon').getBoundingClientRect().bottom<=c.querySelector('.palette-choice-name').getBoundingClientRect().top+1,previewHidden:getComputedStyle(mosaic.parentElement).display==='none',label:c.getAttribute('aria-label'),icon:!!c.querySelector('.palette-choice-icon'),count:!!c.querySelector('.palette-choice-count'),nameFits:c.querySelector('.palette-choice-name').getBoundingClientRect().bottom<=c.getBoundingClientRect().bottom-3};})};
  });
  assert.equal(geometry.columns,3);assert(!geometry.overflow);assert(geometry.cards.length);
  assert(geometry.listHeight<=geometry.rowLimit+1,'catalogue shows at most three rows');
  if(config.height>=800)assert(Math.abs(geometry.listHeight-geometry.rowLimit)<2,'tall viewports show exactly three complete rows');
  for(const card of geometry.cards){assert(card.previewHidden,'unselected cards only show icon/name');assert.equal(card.cells,9);assert.equal(card.mosaicColumns,3);assert(card.order,'icon stays above name');assert(card.centered&&card.explicitCenter,'palette icon is explicitly centered over its preview');assert.equal(card.gap,'0px');assert.equal(card.radius,'0px');assert(card.label&&card.icon&&card.nameFits,'palette names stay inside their touch targets');assert.equal(card.count,group==='archive');}
  const first=page.locator('#paletteModal .palette-choice').first(),box=await first.boundingBox();
  await first.click();assert.equal(await page.locator('#paletteModal .is-preview').count(),1);if(group==='classic')await page.screenshot({path:path.join(artifacts,config.lang+'-palette-draft.png')});
  const previewBox=await first.locator('.palette-color-mosaic').boundingBox();assert(previewBox.width>=50&&previewBox.width<=80.1);assert.equal(previewBox.width,previewBox.height);assert.deepEqual(await first.boundingBox(),box,'preview never resizes its tile');
  assert.equal(await first.locator('.palette-choice-name').isVisible(),false);assert.equal(await first.locator('.palette-choice-icon').isVisible(),false);
  await first.click();assert.equal(await page.locator('#paletteModal .is-preview').count(),0);assert(await page.locator('#palette-apply').isDisabled());
  assert.deepEqual(await state(),before,'group browsing never changes board, palette or log');
  if(group==='classic')await page.screenshot({path:path.join(artifacts,config.lang+'-palette-cards.png')});
 }
 // Board sorting must never alter any group of catalogue previews or the footer.
 const preview=async()=>page.locator('#paletteModal .palette-color-mosaic').evaluateAll(items=>items.map(item=>[...item.children].map(cell=>cell.style.backgroundColor)));
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
 const selected=page.locator('#paletteModal .palette-choice.is-current');
 if(await selected.count()){assert(await selected.locator('.palette-choice-name').evaluate(e=>getComputedStyle(e).color==='rgb(255, 215, 0)'));}
 const choice=page.locator('#paletteModal .palette-choice:not(.is-current)').first(),index=Number(await choice.getAttribute('data-palette-index'));
 const beforeChoice=await state();await choice.click();assert.deepEqual(await state(),beforeChoice,'preview changes no artwork or log');
 await page.locator('#paletteModal [data-palette-group="archive"]').click();assert(await page.locator('#palette-apply').isEnabled());assert.deepEqual(await state(),beforeChoice);await page.locator('#paletteModal [data-palette-group="classic"]').click();assert.equal(await page.locator('#paletteModal .is-preview').getAttribute('data-palette-index'),String(index),'draft survives category browsing');
 const next=page.locator('#paletteModal .palette-choice:not(.is-preview)').first();await next.click();assert.equal(await page.locator('#paletteModal .is-preview').count(),1);assert.equal(await choice.locator('.palette-choice-name').isVisible(),true);
 await page.keyboard.press('Escape');await page.evaluate(()=>paletteTest.open());await page.locator('#paletteModal [data-palette-group="classic"]').click();assert.equal(await page.locator('#paletteModal .is-preview').count(),0);assert(await page.locator('#palette-apply').isDisabled());assert.deepEqual(await state(),beforeChoice,'closing discards the draft');
 await choice.click();assert((await page.locator('#palette-current-summary .palette-current-name').textContent()).trim());await page.locator('#palette-apply').click();await page.waitForTimeout(350);assert.equal((await state()).index,index);assert(!(await page.locator('#paletteModal').evaluate(e=>e.classList.contains('modal-visible'))));
 assert.deepEqual((await state()).colors,before.colors,'preview never edits the palette catalogue');
 const applied=await state();await page.evaluate(()=>paletteTest.undo());assert.equal((await state()).index,beforeChoice.index);assert.deepEqual((await state()).board,beforeChoice.board);await page.evaluate(()=>paletteTest.redo());assert.deepEqual((await state()).board,applied.board);assert.equal((await state()).index,applied.index);
 const recipe=await page.evaluate(()=>paletteTest.recipe());await page.locator('#projectFileInput').setInputFiles({name:'palette-apply.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>paletteTest.state().loaded);await page.evaluate(()=>paletteTest.macro());await page.waitForFunction(()=>!paletteTest.state().loaded&&!paletteTest.state().macro,null,{timeout:30000});assert.equal((await state()).index,applied.index);assert.deepEqual((await state()).board,applied.board,'Apply journey and undo/redo replay exactly');

 // Reopening lands on the selected card even near the end of a long group.
 for(const group of ['classic','extended','continuous','archive']){
  await page.evaluate(()=>paletteTest.open());
  await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();
  const last=page.locator('#paletteModal .palette-choice').last();
  const lastIndex=Number(await last.getAttribute('data-palette-index'));
  await last.click();await page.locator('#palette-apply').click();
  const selectedState=await state();
  await page.evaluate(()=>paletteTest.open());await page.waitForTimeout(350);
  assert.equal(await page.locator('#paletteModal [aria-selected="true"]').getAttribute('data-palette-group'),group);
  assert.equal((await state()).index,lastIndex);
  const visible=await page.locator('#paletteModal .palette-choice.is-current').evaluate(card=>{
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
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const overrideBefore=await state();await page.evaluate(()=>paletteTest.startOverride());await page.locator('#paletteModal .palette-choice.is-current').click();assert(await page.locator('#palette-apply').isEnabled());await page.locator('#palette-apply').click();assert.equal((await state()).pending,overrideBefore.index);assert.deepEqual((await state()).board,overrideBefore.board);
 await page.evaluate(()=>paletteTest.startOverride());await page.locator('#btnPaletteModalClose').click();assert.equal((await state()).selecting,false,'cancelling leaves no macro-selection tool active');
 assert.deepEqual(errors,[]);results.push({...config,passed:true});console.log('PASS',JSON.stringify(config));await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
