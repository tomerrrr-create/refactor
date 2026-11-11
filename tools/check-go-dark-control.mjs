// Shared Go Dark control: actual pointer/touch holds, history and exported replay.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
let app=await readFile(root+'js/app.js','utf8');
app=app.replace('      initializeApp();',`const darkOriginalRandom=Math.random;window.darkTest={fixedRandom:value=>{Math.random=value?()=>.2:darkOriginalRandom;},
 setup(sim){pauseLife();setWindMode(false);resetArmedState();activePaletteIndex=0;updatePaletteHeader();n=9;initializeBoardAndCanvas(true);boardState.forEach((t,i)=>{t.k=t.v=(i%Math.min(10,paletteLen()));t.isGold=i===40;});simulationInitSettings={boardSize:15,brushSize:3,brushColor:'first',symmetry:'horizontal'};isSimModeActive=sim;dom.controlsContainer.classList.toggle('sim-mode-active',sim);dom.btnSpecialReset.classList.toggle('control-hidden',sim);dom.btnPlayPauseLife.classList.toggle('control-hidden',!sim);updateSimulationUtilityControl();history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();renderToScreen(null);updateLayout();},
 state:()=>({board:boardState.map(t=>[t.k,t.v,t.isGold]),n,palette:activePaletteIndex,sep:separatorPx,brush:brushSize,color:selectedColorIndex,symmetry:symmetryMode,sim:isSimModeActive,playing:isLifePlaying,gen:currentGenerationCount,animating:isAnimating,loaded:isMacroLoaded,logs:[...artRecipeLog]}),recipe:async()=>await createArtRecipeFile().text(),start(){armSimulation('nudgeBrighter');togglePlayPauseLife();},pause:pauseLife
 };initializeApp().then(()=>darkTest.ready=true);`);
for(const ms of [5000,1500,2000])app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?app:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
await mkdir('/tmp/go-dark-control',{recursive:true});
try{for(const config of [{lang:'en',width:1280,height:900},{lang:'he',width:390,height:844},{lang:'ru',width:375,height:667},{lang:'nl',width:1024,height:768}]){
 const touch=config.width<600,ctx=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 await ctx.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.darkTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const state=()=>page.evaluate(()=>darkTest.state()),tap=id=>touch?page.locator(id).tap():page.locator(id).click();
 async function hold(id){const r=await page.locator(id).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(touch){const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(1600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else {await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(1600);await page.mouse.up();}
  await page.waitForFunction(()=>!darkTest.state().animating);
 }
 const dark=page.locator('#btnDark');let creationLook;
 for(const sim of [false,true]){
  await page.evaluate(sim=>darkTest.setup(sim),sim);assert(await dark.isVisible());
  const look=await dark.evaluate(b=>({color:getComputedStyle(b).color,glyph:getComputedStyle(b.querySelector('span'),'::after').backgroundColor}));
  if(!sim)creationLook=look;else {assert.deepEqual(look,creationLook);const boxes=await page.locator('#btnWind,#btnDark,#btnRedo').evaluateAll(es=>Object.fromEntries(es.map(e=>{const r=e.getBoundingClientRect();return[e.id,{x:r.x,y:r.y}];})));assert.equal(boxes.btnWind.x,boxes.btnDark.x);assert.equal(boxes.btnDark.x,boxes.btnRedo.x);assert(boxes.btnWind.y<boxes.btnDark.y&&boxes.btnDark.y<boxes.btnRedo.y);}
  const before=await state();await tap('#btnDark');await page.waitForFunction(()=>!darkTest.state().animating);const after=await state();assert(after.board.every(t=>t[0]===0&&t[1]===0&&!t[2]));assert.equal(after.n,9);assert.equal(after.sim,sim);assert.equal(after.logs.filter(l=>l.includes('GO_DARK ->')).length,1);
  await tap('#btnUndo');assert.deepEqual((await state()).board,before.board);await tap('#btnRedo');assert.deepEqual((await state()).board,after.board);
 }
 await page.evaluate(()=>darkTest.setup(true));await tap('#btnDark');await page.waitForFunction(()=>!darkTest.state().animating);const final=await state(),recipe=await page.evaluate(()=>darkTest.recipe());assert(recipe.includes('GO_DARK ->'));
 await page.locator('#projectFileInput').setInputFiles({name:'go-dark.txt',mimeType:'text/plain',buffer:Buffer.from(recipe)});await page.waitForFunction(()=>darkTest.state().loaded);await tap('#btnMacroPlay');await page.waitForFunction(()=>!darkTest.state().loaded&&!darkTest.state().animating);assert.deepEqual((await state()).board,final.board);
 for(const sim of [false,true]){
  await page.evaluate(sim=>darkTest.setup(sim),sim);await hold('#btnToggleSimMode');const baseline=await state();
  await page.evaluate(sim=>darkTest.setup(sim),sim);await hold('#btnDark');const actual=await state();
  for(const key of ['board','n','sep','brush','color','symmetry','sim'])assert.deepEqual(actual[key],baseline[key],key);
  assert.equal(actual.n,15);assert.equal(actual.brush,3);assert(actual.board.every(t=>t[0]===0&&!t[2]));assert.equal(actual.logs.filter(l=>l.includes('INIT_STATE ->')).length,1);assert.equal(actual.logs.filter(l=>l.includes('GO_DARK ->')).length,0,'hold release must not add a tap');
 }
 await page.evaluate(()=>{darkTest.setup(false);darkTest.fixedRandom(true);});await tap('#btnSpecialReset');await page.waitForFunction(()=>!darkTest.state().animating);const visit=await state();
 for(const sim of [false,true]){
  await page.evaluate(sim=>darkTest.setup(sim),sim);
  const r=await dark.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  if(touch){const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else {await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-40,{steps:5});await page.mouse.up();}
  await page.waitForFunction(()=>!darkTest.state().animating);const actual=await state();
  for(const key of ['board','n','palette','sep','color'])assert.deepEqual(actual[key],visit[key],'swipe matches Visit somewhere: '+key);
  assert.equal(actual.sim,sim);assert.equal(actual.logs.filter(l=>l.includes('INIT_STATE ->')).length,2);assert.equal(actual.logs.filter(l=>l.includes('GO_DARK ->')).length,0);
 }
 await page.evaluate(()=>darkTest.fixedRandom(false));
 await page.evaluate(()=>{darkTest.setup(true);darkTest.start();});await page.waitForFunction(()=>darkTest.state().gen>=3);await hold('#btnDark');assert((await state()).playing);assert.equal((await state()).n,9);await tap('#btnDark');await page.waitForFunction(()=>!darkTest.state().animating);assert((await state()).playing);assert.equal((await state()).n,9);assert((await state()).logs.some(l=>l.includes('GO_DARK ->')));await page.evaluate(()=>darkTest.pause());
 await page.screenshot({path:'/tmp/go-dark-control/'+config.lang+'.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({config,position:true,tap:true,holdMatchesEntry:true,history:true,exportedReplay:true,visitSwipeMatches:true,playbackGuard:true}));await ctx.close();
}}finally{await browser.close();server.close();}
