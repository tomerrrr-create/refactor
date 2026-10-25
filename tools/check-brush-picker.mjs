// Run after build-vercel.mjs. Test hooks are injected into responses only.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.BRUSH_ARTIFACTS||'/tmp/brush-picker-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',name));res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results=[];
try{for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},serviceWorkers:'block',isMobile:config.width<600,hasTouch:config.width<600});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('modals = initializeModals(contextForModals);','window.brushContext=contextForModals;modals = initializeModals(contextForModals);');
 source=source.replace('      initializeApp();',`window.brushTest={
 open:target=>modals.openColorPickerModal(target??null),tech:()=>modals.openTechnicianMenu(),lang:setCurrentLang,
 setup:(size=31)=>{pauseLife();n=size;initializeBoardAndCanvas(true);setBrushMode(true,false);brushSize=1;brushShape='circle';symmetryMode='off';selectedColorIndex=0;selectedColor=palette()[0];isRainbowModeActive=false;boardState.forEach(t=>{t.k=2;t.v=2;t.isGold=false;t.prevK=null;});history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();hasPerformedInitialAutofill=true;hasUsedRandomize=true;hasTriggeredFirstNudge=true;renderToScreen(null);},
 state:()=>({n,brushSize,brushShape,selectedColorIndex,rainbow:isRainbowModeActive,tiles:boardState.map(t=>[t.k,t.isGold]),history:history.length,logs:artRecipeLog.join('\\n')}),
 mode:mode=>setBrushMode(mode!=='copy',mode==='continuous'),copySource:()=>{boardState[160].k=1;boardState[160].v=1;renderToScreen(null);},symmetry:mode=>{symmetryMode=mode;updateSymmetryUI();},
 undo,redo,record:()=>artRecipeLog.join('\\n'),getSettings:getWorkspaceSettings,
 replay:text=>{pauseLife();isExecutingMacroCommand=true;try{for(const action of parseMacroText(text))executeMacroAction(action);}finally{isExecutingMacroCommand=false;}},
 largePalette:()=>{activePaletteIndex=C.PALETTES.findIndex(p=>p.colors.length===264);selectedColorIndex=0;selectedColor=palette()[0];},
 smallPalette:()=>{activePaletteIndex=C.PALETTES.findIndex(p=>p.colors.length>=4&&p.colors.length<=C.COLORS_PER_PAGE);selectedColorIndex=0;selectedColor=palette()[0];},
 live:()=>{if(armedSimulation!=='gravitationalSort')armSimulation('gravitationalSort');togglePlayPauseLife();},stop:pauseLife,gen:()=>currentGenerationCount
 };initializeApp().then(()=>brushTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await p.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await p.goto(base);await p.waitForFunction(()=>window.brushTest?.ready);await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const open=async target=>{await p.evaluate(t=>brushTest.open(t),target);await p.locator('#btnColorPickerCloseTop').waitFor({state:'visible'});};
 const close=async()=>{await p.locator('#btnColorPickerCloseTop').click();await p.waitForTimeout(320);};
 const point=async(x,y)=>{await p.locator('#boardCanvas').scrollIntoViewIfNeeded();return p.locator('#boardCanvas').evaluate((canvas,{x,y})=>{const r=canvas.getBoundingClientRect(),n=brushTest.state().n;return {x:r.x+(x+.5)*r.width/n,y:r.y+(y+.5)*r.height/n};},{x,y});};
 const tap=async(x,y)=>{const q=await point(x,y);if(config.width<600)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);};
 const shape=async value=>p.locator(`[data-brush-shape="${value}"]`).click();
 const size=async value=>p.locator(`[data-brush-size="${value}"]`).click();
 await p.evaluate(()=>brushTest.setup());await open();
 assert.equal(await p.locator('[data-brush-shape]').count(),3);assert.equal(await p.locator('#btnNextPalette, #btnPrevPalette, #colorPickerHeader').count(),0);assert(await p.locator('[data-brush-shape]').evaluateAll(buttons=>buttons.every(b=>!b.textContent.trim()&&b.getAttribute('aria-label')&&b.title)));assert(await p.locator('#colorPickerPaletteName').evaluate(e=>e.closest('.brush-picker-heading')!==null));assert.equal(await p.locator('[data-brush-size]').count(),9);
 assert.equal(await p.locator('[data-brush-size="21"]').textContent(),'XL');
 const before=await p.evaluate(()=>brushTest.state());
 await p.locator('#colorPickerSwatches button[data-color]').nth(3).click();
 await shape('square');await size(21);
 let state=await p.evaluate(()=>brushTest.state());assert.equal(state.brushShape,'square');assert.equal(state.brushSize,21);assert.equal(state.selectedColorIndex,3);assert.deepEqual(state.tiles,before.tiles);assert(await p.locator('#colorPickerModal').evaluate(e=>e.classList.contains('modal-visible')));
 const geometry=await p.locator('.brush-picker-panel').evaluate(panel=>{const b=panel.getBoundingClientRect(),body=panel.querySelector('.brush-picker-body');return {x:b.x,y:b.y,w:b.width,h:b.height,overflow:body.scrollWidth>body.clientWidth+1};});
 assert(geometry.x>=10&&geometry.y>=10&&geometry.x+geometry.w<=config.width-10&&geometry.y+geometry.h<=config.height-10);assert(!geometry.overflow);
 assert(geometry.w<=340 && geometry.x>=24,'compact width retains 24px side margins');
 assert(geometry.h<=config.height*.82+1,'height is bounded to 82% of the viewport');
 await p.locator('.brush-picker-body').evaluate(body=>body.scrollTop=0);
 const headerGeometry=await p.locator('.brush-picker-heading').evaluate(header=>({height:header.getBoundingClientRect().height,gap:document.getElementById('colorPickerSwatches').getBoundingClientRect().top-header.getBoundingClientRect().bottom,border:getComputedStyle(header).borderBottomWidth}));assert.equal(headerGeometry.height,65.5);assert.equal(headerGeometry.gap,18);assert.equal(headerGeometry.border,'1px');
 const swatch=await p.locator('#colorPickerSwatches button[data-color]').first().boundingBox();assert(swatch.width>=43.9&&swatch.width<=48.1,'colors remain compact and touchable');
 await p.screenshot({path:path.join(artifacts,`${config.lang}-picker.png`)});
 await p.locator('#btnColorPickerCloseTop').click();await p.waitForTimeout(320);await open();assert.equal(await p.locator('[data-brush-size="21"]').getAttribute('aria-pressed'),'true');await close();
 // Actual pointer input, all shapes, including single-cell and oversized brushes.
 for(const form of ['circle','square','diamond'])for(const width of [1,7,21]){
  await p.evaluate(()=>brushTest.setup());await open();await shape(form);await size(width);await close();await tap(15,15);
  state=await p.evaluate(()=>brushTest.state());const r=(width-1)/2;const count=form==='square'?width*width:form==='diamond'?1+2*r*(r+1):({1:1,7:29,21:317}[width]);
  assert.equal(state.tiles.filter(t=>t[0]===0).length,count,`${form}/${width} pointer footprint`);assert.equal(state.history,1);
  await p.evaluate(()=>brushTest.undo());assert((await p.evaluate(()=>brushTest.state())).tiles.every(t=>t[0]===2));await p.evaluate(()=>brushTest.redo());assert.deepEqual((await p.evaluate(()=>brushTest.state())).tiles,state.tiles);
  const recording=await p.evaluate(()=>brushTest.record());await p.evaluate(text=>brushTest.replay(text),recording);assert.deepEqual((await p.evaluate(()=>brushTest.state())).tiles,state.tiles,'macro replays concrete stroke exactly');
 }
 // XL on a small board clips to the board, never wraps or resizes it.
 await p.evaluate(()=>brushTest.setup(5));await open();await shape('square');await size(21);await close();await tap(0,0);state=await p.evaluate(()=>brushTest.state());assert.equal(state.n,5);assert(state.tiles.every(t=>t[0]===0));
 // Continuous strokes and copy mode use the same selected footprint.
 await p.evaluate(()=>{brushTest.setup();brushTest.mode('continuous');});await open();await shape('diamond');await size(3);await close();
 let a=await point(5,15),b=await point(25,15);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:5});await p.mouse.up();state=await p.evaluate(()=>brushTest.state());for(let x=5;x<=25;x++)assert.equal(state.tiles[15*31+x][0],0,'continuous path has no gaps');assert.equal(state.history,1);
 await p.evaluate(()=>{brushTest.setup();brushTest.mode('copy');brushTest.copySource();});await open();await shape('square');await size(3);await close();
 a=await point(5,5);b=await point(15,15);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:5});await p.mouse.up();state=await p.evaluate(()=>brushTest.state());assert.equal(state.history,1);assert.equal(state.tiles.filter(t=>t[0]===1).length,10,'copy source plus nine destination cells');
 // Palette paging and rainbow leave the picker open and keep shape/size.
 await p.evaluate(()=>{brushTest.setup();brushTest.largePalette();});await open();await shape('diamond');await size(21);
 // A normal vertical wheel pages only over the color grid. The debounce must
 // consume extra events too, while wheel over the tools still scrolls normally.
 await p.locator('#colorPickerSwatches').scrollIntoViewIfNeeded();
 const wheel=async(deltaY)=>p.locator('#colorPickerSwatches').evaluate((grid,deltaY)=>{
  const body=grid.closest('.brush-picker-body'),before=body.scrollTop;
  const event=new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true});grid.dispatchEvent(event);
  return {prevented:event.defaultPrevented,before,after:body.scrollTop};
 },deltaY);
 let event=await wheel(100);assert(event.prevented);assert.equal(event.after,event.before);assert.equal(await p.locator('#colorPickerPagination .active').getAttribute('data-page'),'1');
 event=await wheel(100);assert(event.prevented);assert.equal(await p.locator('#colorPickerPagination .active').getAttribute('data-page'),'1','debounced event does not page twice');
 await p.waitForTimeout(210);await wheel(-100);assert.equal(await p.locator('#colorPickerPagination .active').getAttribute('data-page'),'0','reverse wheel returns to previous page');
 if(config.width===1280){
  await p.waitForTimeout(210);await p.locator('#colorPickerSwatches').hover();
  const scrollBefore=await p.locator('.brush-picker-body').evaluate(body=>body.scrollTop);
  await p.mouse.wheel(0,100);await p.waitForTimeout(80);
  assert.equal(await p.locator('#colorPickerPagination .active').getAttribute('data-page'),'1','real mouse wheel pages colors');
  assert.equal(await p.locator('.brush-picker-body').evaluate(body=>body.scrollTop),scrollBefore);
  await p.waitForTimeout(210);await wheel(-100);
 }
 assert(await p.locator('.brush-picker-tools').evaluate(tools=>{const event=new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true});tools.dispatchEvent(event);return !event.defaultPrevented;}),'tools do not intercept wheel scrolling');
 await p.locator('#colorPickerPagination [data-page="1"]').click();await p.locator('#colorPickerSwatches button[data-color]').first().click();assert((await p.evaluate(()=>brushTest.state())).selectedColorIndex>=24);
 await p.locator('#colorPickerSwatches button').first().click();assert((await p.evaluate(()=>brushTest.state())).rainbow);assert.equal((await p.evaluate(()=>brushTest.state())).brushSize,21);await close();await tap(15,15);state=await p.evaluate(()=>brushTest.state());assert.equal(state.history,1);assert(state.tiles.some(t=>t[0]!==2));
 // Tile hold flow: choosing color still edits that tile immediately, without closing.
 await p.evaluate(()=>brushTest.setup());await open(480);await p.locator('#colorPickerSwatches button[data-color]').first().click();state=await p.evaluate(()=>brushTest.state());assert.equal(state.tiles[480][0],0);assert.equal(state.tiles.filter(t=>t[0]===0).length,1);assert.equal(state.history,1);await close();
 // Symmetry mirrors the full selected shape.
 await p.evaluate(()=>{brushTest.setup();brushTest.symmetry('vertical');});await open();await shape('square');await size(3);await close();await tap(5,5);state=await p.evaluate(()=>brushTest.state());assert.equal(state.tiles.filter(t=>t[0]===0).length,18);
 // Brush selections round trip through profile export validation; old files are covered by node tests.
 const settings=await p.evaluate(()=>brushTest.getSettings());assert.equal(settings.brush.shape,'square');assert.equal(settings.brush.size,3);
 // Simulation remains running while selecting and using the brush.
 await p.evaluate(()=>{brushTest.setup();brushTest.live();});const generation=await p.evaluate(()=>brushTest.gen());await open();await shape('diamond');await size(7);await close();await tap(15,15);await p.waitForTimeout(100);assert(await p.evaluate(()=>brushTest.gen())>generation);await p.evaluate(()=>brushTest.stop());
 // Startup and initialization lists expose exactly the nine supported sizes.
 await p.evaluate(()=>brushTest.tech());assert.equal(await p.locator('#startupBrushSize option').count(),9);assert.equal(await p.locator('#initBrushSize option').count(),9);await p.evaluate(()=>document.getElementById('technicianDialog').close());
 await open();assert.equal(await p.locator('.brush-picker-footer').count(),0);await p.locator('[data-brush-size="21"]').focus();await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.getElementById('colorPickerModal').contains(document.activeElement)));await p.keyboard.press('Escape');await p.waitForTimeout(320);assert(!(await p.locator('#colorPickerModal').evaluate(e=>e.classList.contains('modal-visible'))));
 await p.evaluate(()=>brushTest.smallPalette());await open();event=await wheel(100);assert(!event.prevented,'single-page palette allows ordinary content scrolling');await close();
 assert.deepEqual(errors,[]);results.push({...config,passed:true});console.log('PASS',JSON.stringify(config));await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
