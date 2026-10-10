const { chromium } = require(process.env.PALETTE_TEST_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.PALETTE_TEST_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:1100,height:1000}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error' && /Failed to (replay|restore|parse)|Macro Draw/.test(m.text())) errors.push(m.text());});
 await page.route('https://**/*', async route => {
  try { const body=execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','30',route.request().url()],{maxBuffer:10*1024*1024}); await route.fulfill({status:200,contentType:'application/javascript',body}); }
  catch(e){await route.abort();}
 });
 // Test-only instrumentation of the served module; production files stay unchanged.
 await page.route('**/js/app.js', async route => {
  const response=await route.fetch(); let body=await response.text();
  body=body.replace('      initializeApp();', `window.testPalette = {
   state: getCurrentState, applyState, resize: resizeActivePalette, sort: applySortMethod,
   setLang: setCurrentLang, playPause: togglePlayPauseLife, undo, redo, switchToPalette, parse: parseMacroText, execute: executeMacroAction,
   palette: () => [...palette()], log: () => [...artRecipeLog], init: logCurrentStateAsInit,
   resetLog: () => { artRecipeLog = []; logCurrentStateAsInit(); },
   resetHistory: () => { history = []; future = []; },
   setTiles: tiles => { boardState = tiles; renderToScreen(null); },
   arm: armSimulation, step: stepForward, playing: () => isLifePlaying,
   selected: () => [selectedColor, selectedColorIndex],
   setSelected: i => { selectedColorIndex=i; selectedColor=palette()[i]; },
   setAnchor: i => { magnetRules.anchorColorIndex=i; },
   caches: () => ({ turing: turingState, dla: dlaState }),
   setDla: v => { dlaState=v; },
   setTuring: v => { turingState=v; }
  };\n      initializeApp();`);
  await route.fulfill({response,body});
 });
 await page.goto(process.env.PALETTE_TEST_URL || 'http://127.0.0.1:8087/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.testPalette && window.testPalette.state().tiles.length);
 await page.evaluate(()=>document.getElementById('splashScreen')?.remove());
 const fixture={n:9,activePaletteIndex:0,paletteName:'Journey',separatorPx:2,currentSortMethod:'luminance',tiles:Array.from({length:81},(_,i)=>({k:i%23+(i%5===0?46:0),v:i%23,isGold:i%11===0}))};
 await page.evaluate(s=>{testPalette.applyState(s);testPalette.resetHistory();testPalette.resetLog();testPalette.setSelected(10);testPalette.setAnchor(15);},fixture);
 const canvas=()=>page.locator('#boardCanvas').evaluate(c=>c.toDataURL());
 const oldCanvas=await canvas();
 const start=await page.evaluate(()=>({state:testPalette.state(),palette:testPalette.palette()}));
 console.log('Stage: actual long press and choices');
 const btn=page.locator('#btnPalette'); await btn.hover(); await page.mouse.down(); await page.waitForTimeout(680); await page.mouse.up();
 assert.equal(await page.locator('#paletteResizeModal').evaluate(e=>e.classList.contains('modal-visible')),true);
 assert.deepEqual(await page.locator('#paletteResizeOptions button').allTextContents(),['64','264','512']);
 await page.locator('#paletteResizeOptions button').filter({hasText:/^64$/}).click();
 const grown=await page.evaluate(()=>({state:testPalette.state(),palette:testPalette.palette()}));
 assert.equal(grown.palette.length,64); assert.equal(await canvas(),oldCanvas,'canvas colors unchanged');
 assert.equal(await page.locator('#paletteResizeToast').isVisible(),true); await page.waitForTimeout(1100); assert.equal(await page.locator('#paletteResizeToast').isVisible(),false);
 grown.state.tiles.forEach((t,i)=>assert.equal(grown.palette[t.k],start.palette[((start.state.tiles[i].k%23)+23)%23]));
 assert.equal(grown.palette[grown.state.selectedColorIndex],start.palette[10]);
 assert.equal(grown.palette[grown.state.magnetAnchorColorIndex],start.palette[15]);
 console.log('Stage: undo redo, sort, navigation, chained expansion');
 await page.evaluate(()=>testPalette.undo()); assert.equal(await canvas(),oldCanvas); assert.equal((await page.evaluate(()=>testPalette.palette())).length,23);
 await page.evaluate(()=>testPalette.redo()); assert.deepEqual(await page.evaluate(()=>testPalette.palette()),grown.palette);
 await page.evaluate(()=>testPalette.sort('reversed')); assert.equal((await page.evaluate(()=>testPalette.palette())).length,64); assert.equal(await canvas(),oldCanvas);
 assert.equal(await page.evaluate(()=>testPalette.selected()[0]),start.palette[10]);
 await page.evaluate(()=>{testPalette.switchToPalette(1);testPalette.switchToPalette(0);}); assert.equal((await page.evaluate(()=>testPalette.palette())).length,64);
 await page.evaluate(color=>testPalette.setSelected(testPalette.palette().indexOf(color)),start.palette[10]);
 await page.evaluate(()=>testPalette.resize(264)); assert.equal(await canvas(),oldCanvas);
 assert.equal(await page.evaluate(()=>testPalette.selected()[0]),start.palette[10]);
 await page.evaluate(()=>testPalette.resize(512)); assert.equal(await canvas(),oldCanvas);
 assert.equal(await page.evaluate(()=>testPalette.resize(1024)),false);
 await btn.hover(); await page.mouse.down(); await page.waitForTimeout(680); await page.mouse.up();
 assert.equal(await page.locator('#paletteResizeOptions button').count(),0); await page.keyboard.press('Escape');
 assert.equal(await page.locator('#paletteResizeModal').evaluate(e=>e.classList.contains('modal-visible')),false);
 const snapshot=await page.evaluate(()=>testPalette.state());
 console.log('Stage: saved JSON and fresh INIT replay');
 await page.evaluate(s=>{testPalette.applyState(s);testPalette.resetLog();},fixture);
 await page.evaluate(s=>testPalette.applyState(s),snapshot); assert.equal(await canvas(),oldCanvas);
 const recipe=await page.evaluate(()=>{testPalette.resetLog();return testPalette.log().join('\n');});
 await page.evaluate(s=>testPalette.applyState(s),fixture);
 await page.evaluate(log=>{for(const a of testPalette.parse(log))testPalette.execute(a);},recipe);
 assert.deepEqual(await page.evaluate(()=>testPalette.state().paletteOverrides),snapshot.paletteOverrides);
 assert.equal(await canvas(),oldCanvas);
 console.log('Stage: recorded resize replay and Undo/Redo squashing');
 await page.evaluate(s=>{testPalette.applyState(s);testPalette.resetHistory();testPalette.resetLog();testPalette.resize(64);testPalette.resize(264);testPalette.undo();testPalette.redo();},fixture);
 const actionRecipe=await page.evaluate(()=>testPalette.log().join('\n'));
 const expected=await page.evaluate(()=>testPalette.state());
 await page.evaluate(s=>testPalette.applyState(s),fixture);
 await page.evaluate(log=>{for(const a of testPalette.parse(log))testPalette.execute(a);},actionRecipe);
 assert.deepEqual(await page.evaluate(()=>testPalette.state().tiles.map(t=>[t.k,t.v,t.isGold])),expected.tiles.map(t=>[t.k,t.v,t.isGold]));
 assert.deepEqual(await page.evaluate(()=>testPalette.state().paletteOverrides),expected.paletteOverrides);
 await page.evaluate(s=>{testPalette.applyState(s);testPalette.resetHistory();testPalette.resetLog();testPalette.resize(64);testPalette.undo();},fixture);
 assert.equal(await page.evaluate(()=>testPalette.parse(testPalette.log().join('\n')).some(a=>a.eventName==='PALETTE_RESIZE')),false);
 console.log('Stage: reset logger then undo, and sort/undo/redo replay');
 for (const mode of ['reset-undo','sort-undo','sort-undo-redo']) {
  const record=await page.evaluate(({s,mode})=>{
   testPalette.applyState(s);testPalette.resetHistory();testPalette.resetLog();testPalette.resize(64);
   if(mode==='reset-undo')testPalette.resetLog();else testPalette.sort('reversed');
   testPalette.undo();if(mode==='sort-undo-redo')testPalette.redo();
   return {log:testPalette.log().join('\n'),state:testPalette.state()};
  },{s:fixture,mode});
  await page.evaluate(s=>testPalette.applyState(s),fixture);
  await page.evaluate(log=>{for(const a of testPalette.parse(log))testPalette.execute(a);},record.log);
  const state=await page.evaluate(()=>testPalette.state());
  assert.equal(state.currentSortMethod,record.state.currentSortMethod,mode);
  assert.deepEqual(state.paletteOverrides,record.state.paletteOverrides,mode);
  assert.deepEqual(state.tiles.map(t=>[t.k,t.v,t.isGold]),record.state.tiles.map(t=>[t.k,t.v,t.isGold]),mode);
 }
 console.log('Stage: click combinations and cancelled press');
 await page.evaluate(s=>testPalette.applyState(s),fixture);
 await btn.dblclick({delay:50});
 assert.equal(await page.locator('#paletteModal').evaluate(e=>e.classList.contains('modal-visible')),true);
 await page.locator('#btnPaletteModalClose').click(); await page.waitForTimeout(350);
 await btn.dispatchEvent('pointerdown',{pointerId:1}); await btn.dispatchEvent('pointercancel',{pointerId:1}); await page.waitForTimeout(650);
 assert.equal(await page.locator('#paletteResizeModal').evaluate(e=>e.classList.contains('modal-visible')),false);
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.testPalette&&testPalette.state().tiles.length);
 await page.evaluate(()=>document.getElementById('splashScreen')?.remove());
 console.log('Stage: actual macro upload/play and source restriction');
 await page.locator('#projectFileInput').setInputFiles({name:'palette.txt',mimeType:'text/plain',buffer:Buffer.from(actionRecipe)});
 await page.waitForTimeout(100); assert.equal(await page.locator('#btnChangeInitPalette').isDisabled(),true);
 await page.locator('#btnMacroPlay').click(); await page.waitForTimeout(2600);
 assert.equal((await page.evaluate(()=>testPalette.palette())).length,264);
 console.log('Stage: actual logger reset, RTL, and stopping a running simulation');
 await page.evaluate(s=>{testPalette.applyState(s);testPalette.resize(64);testPalette.setLang('he');},fixture);
 page.once('dialog',d=>d.accept());
 await page.locator('#btnSave').hover();await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();
 assert.equal(await page.evaluate(()=>JSON.parse(testPalette.log()[0].split(' -> ')[1]).paletteOverrides[0].colors.length),64);
 await page.locator('#btnPalette').hover();await page.mouse.down();await page.waitForTimeout(680);await page.mouse.up();
 assert.equal(await page.locator('#paletteResizeTitle').textContent(),'הגדלת פלטה');
 assert.deepEqual(await page.locator('#paletteResizeOptions button').allTextContents(),['264','512']);await page.keyboard.press('Escape');
 await page.evaluate(()=>{testPalette.arm('brightness');testPalette.playPause();});
 assert.equal(await page.evaluate(()=>testPalette.playing()),true);
 await page.evaluate(()=>testPalette.resize(264));assert.equal(await page.evaluate(()=>testPalette.playing()),false);
 await page.evaluate(()=>testPalette.undo());assert.equal(await page.evaluate(()=>testPalette.palette().length),64);
 console.log('Stage: simulation steps and continuous v');
 for (const sim of ['brightness','contrast','gameOfLife','erosion','magnet','turing','sandpile']) {
  await page.evaluate(({s,sim})=>{testPalette.applyState(s);testPalette.arm(sim);testPalette.resize(512);testPalette.step();}, {s:fixture,sim});
  const state=await page.evaluate(()=>testPalette.state()); assert(state.tiles.every(t=>Number.isFinite(t.k)&&Number.isFinite(t.v)&&t.k>=0&&t.k<512),sim);
 }
 console.log('Stage: both canvas render paths, animation indices and cached indices');
 for(const sep of [0,2]) {
  await page.evaluate(s=>testPalette.applyState(s),{...fixture,separatorPx:sep});
  const before=await canvas();await page.evaluate(()=>testPalette.resize(512));
  assert.equal(await canvas(),before,`separator ${sep}`);
 }
 const cacheResult=await page.evaluate(s=>{
  testPalette.applyState(s);const colors=testPalette.palette();
  const tiles=testPalette.state().tiles.map((tile,i)=>({...tile,prevK:i%23,v:(i%22)+0.25}));
  const before=tiles.map(tile=>({...tile}));
  testPalette.setTiles(tiles);
  testPalette.setDla({lastSuccessfulColorIndex:7});
  testPalette.setTuring({lastBoardK:Uint16Array.from(tiles,t=>t.k)});
  testPalette.resize(512);
  return {before,colors,after:testPalette.state().tiles,newColors:testPalette.palette(),
   cached:[...testPalette.caches().turing.lastBoardK],dla:testPalette.caches().dla.lastSuccessfulColorIndex};
 },fixture);
 cacheResult.after.forEach((tile,i)=>{
  assert.equal(cacheResult.newColors[tile.prevK],cacheResult.colors[cacheResult.before[i].prevK]);
  assert.equal(cacheResult.cached[i],tile.k);
  assert(Number.isFinite(tile.v)&&tile.v>=0&&tile.v<512);
 });
 assert.equal(cacheResult.newColors[cacheResult.dla],cacheResult.colors[7]);
 assert.deepEqual(errors,[]); console.log('PASS: browser UI, canvas, history, state, macro and simulation checks');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
