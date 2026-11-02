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
 const anchor=async(panel,icon)=>page.evaluate(({panel,icon})=>{
  const p=document.querySelector(panel).getBoundingClientRect(),i=document.querySelector(icon).getBoundingClientRect();
  return {top:p.top,bottom:p.bottom,width:p.width,x:i.left+i.width/2,y:i.top+i.height/2};
 },{panel,icon});
 const colorAnchor=await anchor('.brush-picker-panel','#colorPickerPaletteName');
 await page.evaluate(()=>document.getElementById('btnColorPickerPalette').click());await page.waitForTimeout(50);
 const midway=await page.evaluate(()=>{const a=document.getElementById('colorPickerModal'),b=document.getElementById('paletteModal');return {out:a.classList.contains('picker-handoff-outgoing'),in:b.classList.contains('picker-handoff-incoming'),inert:a.inert,hidden:a.getAttribute('aria-hidden'),outBackground:getComputedStyle(a).backgroundColor,backdropOpacity:getComputedStyle(b).opacity,panelOpacity:Number(getComputedStyle(b.firstElementChild).opacity),headerOpacity:getComputedStyle(b.querySelector('.palette-picker-header')).opacity,bodyOpacity:Number(getComputedStyle(b.querySelector('.palette-picker-content')).opacity),outHeaderVisibility:getComputedStyle(a.querySelector('.brush-picker-heading')).visibility,animations:b.querySelector('.palette-picker-content').getAnimations().map(a=>({time:a.currentTime,state:a.playState,duration:a.effect.getTiming().duration}))};});
 assert(midway.out&&midway.in&&midway.inert);assert.equal(midway.hidden,'true');assert.equal(midway.outBackground,'rgba(0, 0, 0, 0)');assert.equal(midway.backdropOpacity,'1','backdrop does not fade to the board');assert.equal(midway.panelOpacity,1,'frame stays opaque');assert.equal(midway.headerOpacity,'1','destination header stays opaque');assert.equal(midway.outHeaderVisibility,'hidden','no duplicate header');assert.equal(midway.bodyOpacity,0,'new body waits until the old view clears');assert(midway.animations.some(a=>a.duration===260),'new body fades in gently over 260ms');
 await waitForHandoff(page);assert.equal(await page.locator('.picker-handoff-incoming,.picker-handoff-outgoing').count(),0);assert(!(await page.locator('#colorPickerModal').isVisible()));assert(await page.locator('#paletteModal').isVisible());
 const divider=await page.evaluate(()=>['.brush-picker-heading','.palette-picker-header'].map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return {color:s.borderBottomColor,width:s.borderBottomWidth,y:r.bottom,left:r.left,right:r.right};}));
 assert.deepEqual(divider[0],divider[1],'both views share the same fine full-width header divider');
 const paletteAnchor=await anchor('#paletteModal .palette-picker-panel','#palette-current-preview .palette-current-icon');
 for(const key of ['top','width','x','y'])assert(Math.abs(colorAnchor[key]-paletteAnchor[key])<1,'picker anchor matches: '+key);
 for(const a of [colorAnchor,paletteAnchor])assert(a.top>=0&&a.bottom<=config.height,'panels stay inside viewport');
 const paletteLayout=await page.locator('#paletteModal').evaluate(modal=>{
  const preview=modal.querySelector('#palette-current-preview'),footer=modal.querySelector('#palette-current-summary');
  const header=preview.getBoundingClientRect(),details=footer.querySelector('.palette-current-details').getBoundingClientRect(),bottom=footer.getBoundingClientRect(),tabs=modal.querySelector('.palette-group-tab').getBoundingClientRect();
  const children=[...footer.querySelector('.palette-current-details').children].map(e=>e.getBoundingClientRect());
  const contentLeft=Math.min(...children.map(r=>r.left)),contentRight=Math.max(...children.map(r=>r.right));
  return {aligned:Math.abs(header.top+header.height/2-tabs.top-tabs.height/2)<1,centered:Math.abs((contentLeft+contentRight)-(bottom.left+bottom.right))<2,headerRibbon:!!preview.querySelector('.palette-color-ribbon'),headerIcon:!!preview.querySelector('.palette-current-icon'),headerGrid:preview.querySelectorAll('.palette-current-mosaic i').length,iconWidth:preview.querySelector('.palette-current-icon').getBoundingClientRect().width,iconHeight:preview.querySelector('.palette-current-icon').getBoundingClientRect().height,buttonWidth:header.width,buttonHeight:header.height,icon:preview.querySelector('.palette-current-icon').innerHTML,footerIcon:footer.querySelector('.palette-current-details')?.firstElementChild?.classList.contains('palette-current-icon'),footerRibbon:!!footer.querySelector('.palette-color-ribbon'),headerOverflow:preview.scrollWidth>preview.clientWidth+1};
 });
 assert(paletteLayout.aligned&&paletteLayout.centered&&!paletteLayout.headerRibbon&&paletteLayout.headerIcon&&paletteLayout.headerGrid===0&&paletteLayout.iconWidth===28&&paletteLayout.iconHeight===28.5&&paletteLayout.buttonWidth===44&&paletteLayout.buttonHeight===44&&paletteLayout.footerIcon&&!paletteLayout.footerRibbon&&!paletteLayout.headerOverflow,'matching 28px palette icon and 44px navigation button, with the footer icon retained');
 assert.equal(paletteLayout.icon,await page.locator('#colorPickerPaletteName').innerHTML(),'same palette artwork in both headers');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'palette-current-preview','focus follows the navigation anchor');
 await page.screenshot({path:path.join(artifacts,config.lang+'-palette-layout.png')});
 // Both the new header (keyboard) and existing footer (pointer) open colors.
 await page.locator('#palette-current-preview').focus();await page.keyboard.press('Enter');await waitForHandoff(page);
 assert(await page.locator('#colorPickerModal').isVisible());
 await page.locator('#btnColorPickerPalette').click();await waitForHandoff(page);
 await page.locator('#palette-current-summary').click();await waitForHandoff(page);assert(await page.locator('#colorPickerModal').isVisible());assert(!(await page.locator('#paletteModal').isVisible()));
 assert.deepEqual(await page.locator('.brush-picker-panel').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),geometry);
 // Sample the composed backdrop on every frame in both directions: exactly
 // one 90% black layer must remain, without either flashing or doubling up.
 const backdropSamples=await page.evaluate(async()=>{
  const sample=()=>1-['colorPickerModal','paletteModal'].reduce((light,id)=>{
   const style=getComputedStyle(document.getElementById(id));
   if(style.visibility==='hidden')return light;
   const color=style.backgroundColor,alpha=color.startsWith('rgba')?Number(color.match(/[\d.]+/g).at(-1)):1;
   return light*(1-alpha*Number(style.opacity));
  },1);
  const samples=[sample()];const frames=[];
  for(const id of ['btnColorPickerPalette','palette-current-preview']){
   document.getElementById(id).click();
   await new Promise(resolve=>{const start=performance.now();const frame=()=>{
    samples.push(sample());const modal=document.querySelector('.picker-handoff-incoming')||document.querySelector('#colorPickerModal.modal-visible,#paletteModal.modal-visible');const panel=modal.firstElementChild;const r=panel.getBoundingClientRect();const button=modal.querySelector('#btnColorPickerPalette,#palette-current-preview').getBoundingClientRect();frames.push({top:r.top,bottom:r.bottom,x:button.x+button.width/2,y:button.y+button.height/2,opacity:getComputedStyle(panel).opacity});const oldBody=document.querySelector('.picker-handoff-outgoing .brush-picker-body,.picker-handoff-outgoing .palette-picker-content');const newBody=modal.querySelector('.brush-picker-body,.palette-picker-content');if(oldBody)frames.at(-1).overlap=Number(getComputedStyle(oldBody).opacity)>.001&&Number(getComputedStyle(newBody).opacity)>.001;if(performance.now()-start<520)requestAnimationFrame(frame);else resolve();
   };frame();});
  }
  return {samples,frames};
 });
 for(const frame of backdropSamples.frames){assert(Math.abs(frame.top-colorAnchor.top)<1);assert(Math.abs(frame.x-colorAnchor.x)<1&&Math.abs(frame.y-colorAnchor.y)<1,'navigation stays fixed on every frame');assert.equal(frame.opacity,'1');assert(!frame.overlap,'old and new grids never overlap');assert(frame.bottom<=config.height+1);}
 assert(backdropSamples.samples.length>4);assert(backdropSamples.samples.every(alpha=>Math.abs(alpha-.9)<.001),'backdrop stays at 90% throughout both handoffs');
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
