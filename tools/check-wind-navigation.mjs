// Mouse/touch/keyboard regression for symmetry/Wind and simulation Plus/separators.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts='/tmp/wind-navigation-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(path.join(root,'dist',file)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const mobile=config.width<600,context=await browser.newContext({viewport:config,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.windNavTest={
 setup:()=>{pauseLife();resetArmedState();isSimModeActive=false;dom.controlsContainer.classList.remove('sim-mode-active','sim-separator-control');updateSimulationUtilityControl();n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=i%palette().length;t.isGold=false;});selectedColorIndex=3;selectedColor=palette()[3];isRainbowModeActive=false;brushSize=3;brushShape='square';symmetryMode='horizontal';updateColorPickerButtonUI();updateSymmetryUI();},
 state:()=>({wind:windMode,mode:windSettings.mode,symmetry:symmetryMode,color:selectedColorIndex,size:brushSize,shape:brushShape,playing:isLifePlaying,gen:currentGenerationCount,board:boardState.map(t=>t.k),logs:[...artRecipeLog]}),
 sim:()=>{isSimModeActive=true;dom.controlsContainer.classList.add('sim-mode-active');updateSimulationUtilityControl();armSimulation('gameOfLife');},play:togglePlayPauseLife,pause:pauseLife,
 open:()=>modals.openColorPickerModal(),undo,redo
 };initializeApp().then(()=>windNavTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.windNavTest?.ready);await page.evaluate(()=>windNavTest.setup());
 const state=()=>page.evaluate(()=>windNavTest.state()),sym=page.locator('#btnSymmetry'),color=page.locator('#btnColorPicker'),plus=page.locator('#btnResizeUp'),gap=page.locator('#btnGap');
 const cdp=mobile?await context.newCDPSession(page):null;
 async function drag(button,dy){const r=await button.boundingBox();assert(r);const x=r.x+r.width/2,y=r.y+r.height/2;
  if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:5});await page.mouse.up();}
 }
 const before=await state(),colorIcon=await color.innerHTML();
 await drag(color,35);assert(!(await state()).wind,'color down no longer enters Wind');
 await drag(sym,35);assert((await state()).wind);assert.equal(await sym.getAttribute('data-wind-mode'),'ripple');assert.equal(await color.innerHTML(),colorIcon);
 const tap=button=>mobile?button.tap():button.click();
 await tap(sym);assert.equal((await state()).mode,'paint');await tap(sym);assert.equal((await state()).mode,'displace');await tap(sym);assert.equal((await state()).mode,'ripple');
 await drag(sym,-35);await page.locator('dialog[open]').waitFor({state:'visible'});await page.keyboard.press('Escape');assert((await state()).wind);
 await drag(sym,35);assert(!(await state()).wind);assert.equal((await state()).symmetry,before.symmetry);assert.deepEqual((await state()).board,before.board);assert.deepEqual((await state()).logs,before.logs);
 await sym.focus();await page.keyboard.press('Alt+ArrowDown');assert((await state()).wind);await page.keyboard.press('Alt+ArrowDown');assert(!(await state()).wind);
 // The mirrored picker control uses the same Wind/symmetry actions.
 await page.evaluate(()=>windNavTest.open());await page.locator('#btnColorPickerSymmetry').waitFor({state:'visible'});
 const mirrored=page.locator('#btnColorPickerSymmetry');await drag(mirrored,35);assert((await state()).wind);assert.equal(await mirrored.getAttribute('data-wind-mode'),'ripple');await drag(mirrored,35);assert(!(await state()).wind);await page.locator('#btnColorPickerCloseTop').click();await page.locator('#colorPickerModal').waitFor({state:'hidden'});
 // Painting still records and commits one undoable Wind batch after moving its control.
 const drawingBefore=(await state()).board;
 await drag(sym,35);await tap(sym);await tap(page.locator('#board'));
 await page.waitForTimeout(180);await drag(sym,35);
 const painted=await state();assert(painted.logs.some(line=>line.includes('WIND_WAVE')));assert(painted.logs.some(line=>line.includes('WIND_END')));
 assert.notDeepEqual(painted.board,drawingBefore);await page.evaluate(()=>windNavTest.undo());assert.deepEqual((await state()).board,drawingBefore);await page.evaluate(()=>windNavTest.redo());assert.deepEqual((await state()).board,painted.board);
 await page.evaluate(()=>windNavTest.sim());const plusBox=await plus.boundingBox();await drag(plus,35);assert(await gap.isVisible());assert(!(await plus.isVisible()));assert(await sym.isVisible());const gapBox=await gap.boundingBox();assert(Math.abs(plusBox.x-gapBox.x)<1&&Math.abs(plusBox.y-gapBox.y)<1,'separators replace Plus in its own slot');
 await drag(gap,-35);await page.locator('#separatorCycleDialog').waitFor({state:'visible'});await page.locator('#btnCancelSeparatorCycle').click();await drag(gap,35);assert(await plus.isVisible());assert(!(await gap.isVisible()));
 // Wind and separator access do not pause a run or alter brush preferences.
 await page.evaluate(()=>windNavTest.play());await page.waitForFunction(()=>windNavTest.state().gen>1);const gen=(await state()).gen;
 await drag(sym,35);assert((await state()).wind);await drag(plus,35);assert(await sym.isVisible());await tap(sym);assert((await state()).playing);await drag(gap,35);await drag(sym,35);assert(!(await state()).wind);assert((await state()).playing);await page.waitForFunction(g=>windNavTest.state().gen>g,gen);await page.evaluate(()=>windNavTest.pause());
 const after=await state();for(const key of ['symmetry','color','size','shape'])assert.equal(after[key],before[key]);
 await page.screenshot({path:path.join(artifacts,config.lang+'.png')});assert.deepEqual(errors,[]);console.log(JSON.stringify({config,passed:true}));await context.close();
}}finally{await browser.close();server.close();}
