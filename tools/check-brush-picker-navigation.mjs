// Verify the color picker's shared navigation and live controls.
// Runtime hooks are injected into responses; production assets have no test hooks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.PICKER_NAV_ARTIFACTS||'/tmp/picker-navigation-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});


try {
 const results=[];
 for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const mobile=config.width<600;
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.pickerNavTest={
 open:()=>modals.openColorPickerModal(),
 setup:()=>{pauseLife();resetArmedState();activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Journey');n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%palette().length;t.isGold=false;});sortCycleMethods=['luminance','temperature','hue'];selectSortMethod('luminance');symmetryMode='off';updateSymmetryUI();updatePaletteHeader();},
 state:()=>({sort:currentSortMethod,symmetry:symmetryMode,palette:activePaletteIndex,colors:boardState.map(t=>palette()[t.k]),gen:currentGenerationCount,playing:isLifePlaying,logs:[...artRecipeLog],shape:brushShape,size:brushSize}),
 sim:()=>{isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');armSimulation('gameOfLife');updateSimulationUtilityControl();},
 play:()=>togglePlayPauseLife(),pause:pauseLife,
 page:()=>colorPickerPage,pages:size=>{activePaletteIndex=C.PALETTES.findIndex(p=>size==='large'?p.colors.length>80:p.originalName==='Journey');updatePaletteHeader();modals.openColorPickerModal();},mainSymmetry:cycleSymmetryMode
 };initializeApp().then(()=>pickerNavTest.ready=true);`);
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.pickerNavTest?.ready);await page.waitForTimeout(500);
 await page.evaluate(()=>{pickerNavTest.setup();pickerNavTest.open();});await page.waitForTimeout(350);
 const state=()=>page.evaluate(()=>pickerNavTest.state());
 const sort=page.locator('#btnColorPickerSort'),sym=page.locator('#btnColorPickerSymmetry'),pal=page.locator('#btnColorPickerPalette');
 const boxes=await Promise.all([sort,pal,sym].map(b=>b.boundingBox()));assert(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x,'physical left sort / center palette / right symmetry in every language');assert(boxes.every(b=>b.width>=44&&b.height>=44));
 assert.equal(await page.locator('.brush-picker-navigation').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
 assert(!(await page.locator('#btnColorPageNext').isVisible()));assert(!(await page.locator('#btnColorPagePrevious').isVisible()));
 const shortHeight=await page.locator('.brush-picker-panel').evaluate(e=>e.getBoundingClientRect().height);
 await page.evaluate(()=>pickerNavTest.pages('large'));await page.waitForTimeout(200);
 const previous=page.locator('#btnColorPagePrevious'),next=page.locator('#btnColorPageNext');assert(await previous.isVisible());assert(await next.isVisible());
 assert(Math.abs(await page.locator('.brush-picker-panel').evaluate(e=>e.getBoundingClientRect().height)-shortHeight)<2,'arrows do not add a row or change dialog height');
 const pagingBefore=await state();await previous.click();assert(await page.evaluate(()=>pickerNavTest.page())>0,'previous wraps to last page');await next.click();assert.equal(await page.evaluate(()=>pickerNavTest.page()),0);await next.click();assert.equal(await page.evaluate(()=>pickerNavTest.page()),1);await previous.click();assert.equal(await page.evaluate(()=>pickerNavTest.page()),0);
 assert.deepEqual(await state(),pagingBefore,'paging does not paint, change the brush, or log an action');
 const arrowBox=await next.boundingBox(),gridBox=await page.locator('#colorPickerSwatches').boundingBox();assert(Math.abs(arrowBox.y+arrowBox.height/2-gridBox.y-gridBox.height/2)<1,'arrows centered beside colors');
 await page.screenshot({path:path.join(artifacts,config.lang+'-arrows.png')});
 await page.evaluate(()=>pickerNavTest.pages('small'));assert(!(await next.isVisible()));
 const before=await state(),swatches=()=>page.locator('#colorPickerSwatches .color-swatch').evaluateAll(items=>items.map(e=>e.querySelector('.color-swatch-inner')?.style.backgroundColor || ''));
 const originalSwatches=await swatches();
 for(const method of ['temperature','hue','luminance']){await sort.click();assert.equal((await state()).sort,method);assert.deepEqual((await state()).colors,before.colors,'sorting keeps existing painted colors');}
 await sort.click();assert.notDeepEqual(await swatches(),originalSwatches,'color picker rerenders in the chosen order');
 assert.equal(await sort.innerHTML(),(await page.locator('#btnCycleSort').innerHTML()).replace(/ id="[^"]*"/g,''));
 await sym.click();assert.equal((await state()).symmetry,'vertical');await sym.click();assert.equal((await state()).symmetry,'horizontal');
 assert.equal(await sym.innerHTML(),await page.locator('#btnSymmetry').innerHTML());
 await page.evaluate(()=>pickerNavTest.mainSymmetry());await page.waitForTimeout(20);assert.equal(await sym.innerHTML(),await page.locator('#btnSymmetry').innerHTML(),'main control updates the modal');
 async function drag(button,dy){const r=await button.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:5});await page.mouse.up();await page.waitForTimeout(100);}
 await drag(sym,-35);assert.equal((await state()).symmetry,'off');
 await drag(sort,-35);assert(await page.locator('#sortCycleDialog').isVisible());await page.locator('#btnCancelSortCycle').click();
 await page.evaluate(()=>pickerNavTest.sim());await drag(sym,35);assert.equal(await sym.getAttribute('data-relative-gap'),await page.locator('#btnGap').getAttribute('data-relative-gap'));
 assert.equal(await sym.locator('.picker-gap-value').count(),1);await sym.click();await drag(sym,-35);assert(await page.locator('#separatorCycleDialog').isVisible());await page.locator('#btnCancelSeparatorCycle').click();await drag(sym,35);assert.equal(await sym.locator('[data-symmetry-icon]').count(),1);
 await page.evaluate(()=>pickerNavTest.play());await page.waitForTimeout(200);assert((await state()).playing);const gen=(await state()).gen;await sort.click();assert((await state()).playing);await page.waitForTimeout(200);assert((await state()).gen>gen,'sorting during simulation does not stop it');await page.evaluate(()=>pickerNavTest.pause());
 const snapshot=await state();await page.screenshot({path:path.join(artifacts,config.lang+'.png')});
 await pal.click();await page.waitForTimeout(350);assert(await page.locator('#paletteModal').isVisible());assert(!(await page.locator('#colorPickerModal').isVisible()),'palette navigation closes the color picker');
 const footer=page.locator('#palette-current-summary');assert.equal(await footer.evaluate(e=>e.tagName),'BUTTON');assert.equal(await footer.locator('.palette-current-label').count(),0);
 const footerBefore=await state();
 for(const selector of ['.palette-current-icon','.palette-color-ribbon','.palette-current-name','.palette-choice-count',null]){
   if(selector)await footer.locator(selector).click();else await footer.click({position:{x:3,y:3}});
   await page.waitForTimeout(350);assert(await page.locator('#colorPickerModal').isVisible());assert(!(await page.locator('#paletteModal').isVisible()));assert.deepEqual(await state(),footerBefore,'footer navigation does not alter the board, brush, sorting or logger');
   await pal.click();await page.waitForTimeout(350);
 }
 await footer.focus();await page.keyboard.press('Space');await page.waitForTimeout(350);assert(await page.locator('#colorPickerModal').isVisible(),'native keyboard activation opens colors');await pal.click();await page.waitForTimeout(350);
 await page.screenshot({path:path.join(artifacts,config.lang+'-palette-footer.png')});
 const choices=page.locator('#paletteModalGrid [data-palette-index]');
 // Choose another visible palette using the actual picker cards.
 const cards=page.locator('#paletteModalGrid .palette-choice');
 if(await cards.count()>1){await cards.nth(1).click();await page.waitForTimeout(350);assert(!(await page.locator('#paletteModal').isVisible()));}
 else{await page.locator('#btnPaletteModalClose').click();}
 await page.evaluate(()=>pickerNavTest.open());await page.waitForTimeout(300);assert(await pal.getAttribute('aria-label'));assert.equal((await state()).size,snapshot.size);assert.equal((await state()).shape,snapshot.shape);
 assert.equal(await page.locator('#colorPickerModal [id="sortIconGroup"]').count(),0,'mirrored SVG has no duplicate IDs');assert.deepEqual(errors,[]);
 results.push({config,passed:true});console.log(JSON.stringify(results.at(-1)));await context.close();
 }
 await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));
}finally{await browser.close();server.close();}
