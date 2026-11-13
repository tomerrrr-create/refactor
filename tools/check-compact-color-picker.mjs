// Real app A/B switch, dense pointer selection and legacy paging regression.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let app=await readFile(root+'js/app.js','utf8');
app=app.replace('      initializeApp();',`window.compactTest={
 setup(){n=9;initializeBoardAndCanvas(true);switchToPalette(C.PALETTES.findIndex(p=>p.originalName==='Autumn into Winter 264'));},
 palette:count=>switchToPalette(C.PALETTES.findIndex(p=>p.colors.length===count)),
 open:()=>modals.openColorPickerModal(),tech:()=>modals.openTechnicianMenu(),
 state:()=>({selected:selectedColorIndex,rainbow:isRainbowModeActive,palette:activePaletteIndex,settings:getWorkspaceSettings(),board:boardState.map(t=>t.k),log:artRecipeLog.length}),
 expected:color=>palette().indexOf(color)
};initializeApp().then(()=>compactTest.ready=true);`);
for(const ms of [5000,1500,2000])app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?app:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});await mkdir('/tmp/compact-color-picker',{recursive:true});
try{for(const cfg of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:320,height:568},{lang:'nl',width:844,height:390}].filter(c=>!process.env.COMPACT_LANG||c.lang===process.env.COMPACT_LANG)){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.width<600,isMobile:cfg.width<600,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),cfg.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.compactTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.evaluate(()=>compactTest.setup());
 const open=()=>page.evaluate(()=>compactTest.open()),state=()=>page.evaluate(()=>compactTest.state());
 const grid=page.locator('#colorPickerSwatches'),buttons=grid.locator('button');
 const close=()=>page.locator('#btnColorPickerCloseTop').click();
 const toggle=async value=>{await page.evaluate(()=>compactTest.tech());await page.locator('#compactColorsToggle').setChecked(value);await page.locator('#btnTechnicianCloseTop').click();};
 await open();await page.locator('#btnColorPageNext').waitFor({state:'visible'});assert.equal(await buttons.count(),25);await close();
 await page.waitForTimeout(400);const before=await state();await toggle(true);assert.deepEqual(await state(),before,'toggle does not change artwork/settings/logger');await open();
 assert.equal(await buttons.count(),265);assert(!(await page.locator('#btnColorPageNext').isVisible()));
 for(const count of [23,64,264]){
  await close();await page.evaluate(count=>compactTest.palette(count),count);await open();await page.waitForTimeout(80);assert.equal(await buttons.count(),count+1);
  const geometry=await grid.evaluate(e=>{const r=e.getBoundingClientRect(),b=e.closest('.brush-picker-body').getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,bodyTop:b.top,bodyBottom:b.bottom,overflow:e.scrollWidth>e.clientWidth+1};});
  assert(!geometry.overflow);assert(geometry.top>=geometry.bodyTop-1&&geometry.bottom<=geometry.bodyBottom+1,'all colors visible together '+JSON.stringify({cfg,count,geometry}));
  const swatch=buttons.nth(count-2);
  if(cfg.width<600)await swatch.tap();else await swatch.click();
  assert.equal(await grid.locator('.is-selected').count(),1,'one persistent color selection');
  const frame=await grid.locator('.is-selected').evaluate(e=>({shadow:getComputedStyle(e,'::before').boxShadow,z:getComputedStyle(e,'::before').zIndex}));
  assert(frame.shadow.includes('rgb(255, 255, 255)')&&frame.shadow.includes('rgb(17, 17, 17)'));assert.equal(frame.z,'2','selection frame paints above the fill');
  await grid.screenshot({path:'/tmp/compact-color-picker/'+cfg.lang+'-'+count+'-selected.png'});
  if(cfg.width<600)await buttons.nth(0).tap();else await buttons.nth(0).click();
  assert.equal(await buttons.nth(0).getAttribute('aria-pressed'),'true','Rainbow selection is retained');
  assert.notEqual(await buttons.nth(0).evaluate(e=>getComputedStyle(e,'::before').boxShadow),'none','Rainbow has a persistent frame');

 }
 const center=async index=>{const r=await buttons.nth(index).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
 const expected=await buttons.nth(121).getAttribute('data-color');const chosen=await page.evaluate(color=>compactTest.expected(color),expected);
 const a=await center(31),b=await center(121),prior=await state();
 let cdp;
 if(cfg.width<600){cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});}
 else{await page.mouse.move(a.x,a.y);await page.mouse.down();}
 assert.equal((await state()).selected,prior.selected,'preview never commits on contact');assert(await page.locator('.compact-color-preview').isVisible());
 if(cdp){const left=await buttons.nth(1).boundingBox(),right=await buttons.nth(2).boundingBox();const gap={x:(left.x+left.width+right.x)/2,y:left.y+left.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[gap]});await page.waitForTimeout(30);assert(await page.locator('.compact-color-preview').isVisible(),'touch gap retains preview');await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();}
 assert.equal((await state()).selected,chosen,'release chooses final drag color');assert(!(await page.locator('.compact-color-preview').isVisible()));
 // Hover should keep the same enlarged node within a tile and across its
 // nearest half-gap, while never changing the committed color.
 const hoverRect=await buttons.nth(1).boundingBox(),nextRect=await buttons.nth(2).boundingBox();
 await page.mouse.move(hoverRect.x+hoverRect.width/2,hoverRect.y+hoverRect.height/2);await page.waitForTimeout(30);
 await page.evaluate(()=>window.compactPreviewNode=document.querySelector('.compact-color-preview').firstElementChild);
 for(let i=0;i<6;i++)await page.mouse.move(hoverRect.x+hoverRect.width/2+i*.1,hoverRect.y+hoverRect.height/2);
 await page.waitForTimeout(30);assert(await page.evaluate(()=>compactPreviewNode===document.querySelector('.compact-color-preview').firstElementChild),'same-color movement reuses preview content');
 await page.mouse.move((hoverRect.x+hoverRect.width+nextRect.x)/2,hoverRect.y+hoverRect.height/2);await page.waitForTimeout(30);assert(await page.locator('.compact-color-preview').isVisible(),'internal gap keeps preview visible');
 assert.equal((await state()).selected,chosen,'hover never changes the committed selection');
 assert.equal(await grid.locator('.is-selected').count(),1,'candidate does not replace selection');
 const committed=await state(),start=await center(55),outside={x:5,y:5};
 if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[outside]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(outside.x,outside.y);await page.mouse.up();}
 assert.equal((await state()).selected,committed.selected,'release outside cancels');
 if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal((await state()).selected,committed.selected);}
 await buttons.nth(200).focus();await page.keyboard.press('Enter');assert(await buttons.nth(200).getAttribute('aria-pressed')==='true','keyboard selection');
 if(cfg.width<600)await buttons.nth(0).tap();else await buttons.nth(0).click();assert((await state()).rainbow,'Rainbow still works');
 await page.screenshot({path:'/tmp/compact-color-picker/'+cfg.lang+'.png'});
 await close();await toggle(false);await open();assert.equal(await buttons.count(),25);assert(await page.locator('#btnColorPageNext').isVisible());const firstPageColor=await buttons.nth(1).getAttribute('data-color');await page.locator('#btnColorPageNext').click();assert.notEqual(await buttons.nth(1).getAttribute('data-color'),firstPageColor,'legacy arrows still page');
 await close();await page.evaluate(()=>compactTest.palette(23));await open();
 const normal=buttons.nth(21);if(cfg.width<600)await normal.tap();else await normal.click();
 assert.equal(await normal.getAttribute('aria-pressed'),'true');assert.notEqual(await normal.evaluate(e=>getComputedStyle(e,'::before').boxShadow),'none','normal 23-color view retains selection frame');
 if(cfg.width<600)await buttons.nth(0).tap();else await buttons.nth(0).click();
 assert.equal(await buttons.nth(0).getAttribute('aria-pressed'),'true');assert.notEqual(await buttons.nth(0).evaluate(e=>getComputedStyle(e,'::before').boxShadow),'none','normal Rainbow retains selection frame');
 await grid.screenshot({path:'/tmp/compact-color-picker/'+cfg.lang+'-normal-rainbow.png'});
 await close();await toggle(true);await page.reload();await page.waitForFunction(()=>window.compactTest?.ready);assert.equal(await page.locator('#compactColorsToggle').isChecked(),false,'reload resets experiment');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({cfg,allColors:true,drag:true,cancel:true,keyboard:true,rainbow:true,legacyPaging:true,sessionOnly:true}));await context.close();
}}finally{await browser.close();server.close();}
