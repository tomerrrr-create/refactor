// Verify smooth picker handoffs, interruption, focus and reduced motion.
// Runtime hooks are injected into responses; production assets have no test hooks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.PICKER_TRANSITION_ARTIFACTS||'/tmp/picker-transition-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const waitForHandoff = page => page.waitForFunction(
 ()=>!document.querySelector('.picker-handoff-incoming,.picker-handoff-outgoing'),
 null,{timeout:2000});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});



try {
 const results=[];
 for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.pickerTransitionTest={open:()=>modals.openColorPickerModal(),state:()=>({palette:activePaletteIndex,board:boardState.map(t=>[t.k,t.v,t.isGold]),size:brushSize,shape:brushShape,logs:[...artRecipeLog]})};initializeApp().then(()=>pickerTransitionTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.pickerTransitionTest?.ready);await page.evaluate(()=>pickerTransitionTest.open());await page.waitForTimeout(350);
 const before=await page.evaluate(()=>pickerTransitionTest.state());
 const geometry=await page.locator('.brush-picker-panel').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 await page.evaluate(()=>document.getElementById('btnColorPickerPalette').click());await page.waitForTimeout(50);
 const midway=await page.evaluate(()=>{const a=document.getElementById('colorPickerModal'),b=document.getElementById('paletteModal');return {out:a.classList.contains('picker-handoff-outgoing'),in:b.classList.contains('picker-handoff-incoming'),inert:a.inert,hidden:a.getAttribute('aria-hidden'),outBackground:getComputedStyle(a).backgroundColor,backdropOpacity:getComputedStyle(b).opacity,panelOpacity:Number(getComputedStyle(b.firstElementChild).opacity),animations:b.firstElementChild.getAnimations().map(a=>({time:a.currentTime,state:a.playState,duration:a.effect.getTiming().duration}))};});
 assert(midway.out&&midway.in&&midway.inert);assert.equal(midway.hidden,'true');assert.equal(midway.outBackground,'rgba(0, 0, 0, 0)');assert.equal(midway.backdropOpacity,'1','backdrop does not fade to the board');assert(midway.panelOpacity>=0&&midway.panelOpacity<=1);assert(midway.animations.some(a=>a.duration===220),'panel uses the 220ms handoff animation');
 await waitForHandoff(page);assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0);assert(!(await page.locator('#colorPickerModal').isVisible()));assert(await page.locator('#paletteModal').isVisible());
 await page.locator('#palette-current-summary').click();await waitForHandoff(page);assert(await page.locator('#colorPickerModal').isVisible());assert(!(await page.locator('#paletteModal').isVisible()));
 assert.deepEqual(await page.locator('.brush-picker-panel').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),geometry);
 // Several handoffs inside the transition must leave one interactive panel.
 for(let i=0;i<6;i++){await page.evaluate(i=>document.getElementById(i%2?'palette-current-summary':'btnColorPickerPalette').click(),i);await page.waitForTimeout(20);}
 await waitForHandoff(page);assert(await page.locator('#colorPickerModal').isVisible());assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0);
 assert(await page.locator('#colorPickerModal').evaluate(e=>!e.inert&&!e.hasAttribute('aria-hidden')));
 // Closing the destination during a handoff must not resurrect either picker.
 await page.evaluate(()=>document.getElementById('btnColorPickerPalette').click());await page.waitForTimeout(20);
 await page.evaluate(()=>document.getElementById('btnPaletteModalClose').click());
 assert.equal(await page.locator('#paletteModal').evaluate(e=>e.classList.contains('modal-visible')),false,'close is accepted during the handoff');
 assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0,'close clears the handoff immediately');
 // Wait for the 300ms CSS close fade to finish. A fixed 350ms delay can
 // observe a late animation frame on busy or headless browsers.
 await page.locator('#paletteModal').waitFor({state:'hidden',timeout:2000});
 await page.locator('#colorPickerModal').waitFor({state:'hidden',timeout:2000});
 await page.waitForTimeout(350);
 assert(!(await page.locator('#colorPickerModal').isVisible()));assert(!(await page.locator('#paletteModal').isVisible()));
 assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>pickerTransitionTest.open());await page.locator('#btnColorPickerPalette').click();assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0);await page.locator('#palette-current-summary').click();assert(await page.locator('#colorPickerModal').isVisible());assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0);
 assert.deepEqual(await page.evaluate(()=>pickerTransitionTest.state()),before,'handoffs do not alter painting, settings or logger');assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(artifacts,config.lang+'.png')});results.push({config,passed:true});console.log(JSON.stringify(results.at(-1)));await context.close();
 }
 await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));
} finally {await browser.close();server.close();}
