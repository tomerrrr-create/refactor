// Native mouse/touch regression for holding selected ink on the paused board.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(root,'dist',file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try {for(const touch of [false,true]) {
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),touch?'he':'en');
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.holdTest={
 setup:()=>{stopMacro();pauseLife();resetArmedState();if(windMode)setWindMode(false);currentSortMethod='reversed';C.PALETTES.forEach(p=>p.colors=sortColorsArray(p.originalColors,currentSortMethod));activePaletteIndex=C.PALETTES.findIndex(p=>p.originalName==='Mono');n=101;restoreSeparatorWidth(0);initializeBoardAndCanvas(true);brushSize=1;brushShape='square';symmetryMode='off';setBrushMode(true,true);resetSelectedColor();boardState.forEach(t=>{t.k=t.v=0;t.isGold=false;});renderToScreen(null);},
 open:()=>modals.openColorPickerModal(),
 recordStart:()=>{history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;nextHistoryActionId=1;logCurrentStateAsInit();},
 state:()=>({selected:selectedColorIndex,rainbow:isRainbowModeActive,tiles:boardState.map(t=>({k:t.k,v:t.v,isGold:!!t.isGold})),pointer:pointerState.id,dialogs:[...document.querySelectorAll('dialog[open], .modal-visible')].map(d=>d.id),logs:[...artRecipeLog]}),
 replay:text=>{pauseLife();macroQueue=parseMacroText(text);currentMacroStep=0;pendingMacroPalette=null;isMacroLoaded=true;playMacro();},done:()=>!isMacroPlaying&&!isLifePlaying
 };initializeApp().then(()=>holdTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base);await page.waitForFunction(()=>window.holdTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>holdTest.state());
 const cdp=touch?await context.newCDPSession(page):null;
 const move=async point=>cdp?cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]}):page.mouse.move(point.x,point.y);
 const down=async point=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});else{await page.mouse.move(point.x,point.y);await page.mouse.down();}};
 const up=async()=>cdp?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.mouse.up();
 for(const rainbow of (process.env.HOLD_SHORTCUT_ONLY?[]:[false,true]))for(const gesture of ['release','drag','slow']) {
  await page.evaluate(()=>holdTest.setup());await page.evaluate(()=>holdTest.open());await page.waitForTimeout(350);
  const swatch=page.locator('#colorPickerSwatches button').nth(rainbow?0:64);if(touch)await swatch.tap();else await swatch.click();
  await page.locator('#btnColorPickerCloseTop').click();await page.waitForTimeout(350);
  await page.evaluate(()=>holdTest.recordStart());const before=await state();
  const rect=await page.locator('#boardCanvas').boundingBox(),start={x:rect.x+rect.width*.3,y:rect.y+rect.height*.5};
  await down(start);
  if(gesture==='slow'){for(let i=1;i<=8;i++){await move({x:start.x+i*.5,y:start.y});await page.waitForTimeout(100);}}
  else await page.waitForTimeout(750);
  const held=await state();assert.equal(held.selected,before.selected);assert.equal(held.rainbow,before.rainbow);assert.deepEqual(held.dialogs,[]);
  if(gesture==='drag')for(let i=1;i<=8;i++)await move({x:start.x+i*5,y:start.y});
  await up();const after=await state();assert.equal(after.pointer,null);assert(after.tiles.some(t=>t.k!==0),'held stroke paints');
  assert(after.logs.some(line=>line.includes('DRAW_STROKE')), 'stroke is recorded, including progressive packets');
  const recipe=after.logs.join('\n');
  await page.locator('#btnUndo').click();assert.deepEqual((await state()).tiles,before.tiles);
  await page.locator('#btnRedo').click();assert.deepEqual((await state()).tiles,after.tiles);
  await page.evaluate(text=>holdTest.replay(text),recipe);await page.waitForFunction(()=>holdTest.done(),null,{timeout:15000});assert.deepEqual((await state()).tiles,after.tiles);
  console.log('PASS',JSON.stringify({touch,rainbow,gesture,undoRedo:true,macro:true}));
 }
 // The unselected hold retains the picker shortcut and does not paint on release.
 await page.evaluate(()=>holdTest.setup());const before=await state(),rect=await page.locator('#boardCanvas').boundingBox();
 await down({x:rect.x+rect.width*.5,y:rect.y+rect.height*.5});await page.waitForTimeout(750);
 assert((await state()).dialogs.includes('colorPickerModal'));await up();assert.deepEqual((await state()).tiles,before.tiles);
 await page.locator('#btnColorPickerCloseTop').click();await page.waitForTimeout(350);
 // The dedicated Color/brush downward swipe still clears selected ink.
 await page.evaluate(()=>holdTest.open());await page.waitForTimeout(350);await page.locator('#colorPickerSwatches button').nth(64).click();await page.locator('#btnColorPickerCloseTop').click();await page.waitForTimeout(350);
 await page.locator('#btnColorPicker').scrollIntoViewIfNeeded();
 const button=await page.locator('#btnColorPicker').boundingBox(),a={x:button.x+button.width/2,y:button.y+2};
 await down(a);await move({x:a.x,y:a.y+30});await up();assert.equal((await state()).selected,-1);assert.equal((await state()).rainbow,false);
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({touch,emptyHoldPicker:true,swipeDownClear:true}));
 if(cdp)await cdp.detach();await context.close();
}} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
