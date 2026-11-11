// Exercise the real file picker, opening-palette catalogue and Play controls.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {PALETTES} from '../js/data/palettes.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const jade=PALETTES.findIndex(p=>p.originalName==='Jade Tides 264');
const autumn=PALETTES.findIndex(p=>p.originalName==='Autumn into Winter 264');
const glacier=PALETTES.findIndex(p=>p.originalName==='Glacier Pulse 264');
let app=await readFile(root+'js/app.js','utf8');
app=app.replace('      initializeApp();',`window.paletteUITest={trace:[],state:()=>({loaded:isMacroLoaded,playing:isMacroPlaying,palette:activePaletteIndex})};
const originalExecute=executeMacroAction;
executeMacroAction=action=>{originalExecute(action);paletteUITest.trace.push({event:action.eventName,palette:activePaletteIndex});};
initializeApp().then(()=>paletteUITest.ready=true);`);
for(const ms of [5000,1500,2000])app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const f=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(f==='js/app.js'?app:await readFile(root+f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const init={recipeVersion:2,n:5,pal:jade,sort:'luminance',sep:0,board:'25x5'};
const fixture=[
 '[00:00:00.000] INIT_STATE -> '+JSON.stringify(init),
 '[00:00:00.050] DRAW_STROKE -> [{"i":4,"k":3}]',
 '[00:00:00.100] HISTORY_ACTION -> {"recipeVersion":2,"id":1,"from":0,"to":2}',
 '[00:00:00.150] UNDO -> '+JSON.stringify({recipeVersion:2,id:1,settings:{n:5,activePaletteIndex:jade,separatorPx:0,currentSortMethod:'luminance'}}),
 '[00:00:01.000] Palette Change -> '+PALETTES[glacier].originalName+' | Sort: luminance',
 '[00:00:01.500] DRAW_STROKE -> [{"i":5,"k":2}]'
].join('\n');
try{for(const config of [{lang:'en',width:1280,height:1000},{lang:'he',width:390,height:844}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.width<600,serviceWorkers:'block'});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>paletteUITest?.ready);
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 for(const selection of [autumn,null,jade,0]){
  await page.locator('#projectFileInput').setInputFiles({name:'palette-history.txt',mimeType:'text/plain',buffer:Buffer.from(fixture)});
  await page.waitForFunction(()=>paletteUITest.state().loaded);await page.evaluate(()=>paletteUITest.trace=[]);
  if(selection!==null){
   await page.locator('#btnChangeInitPalette').click();
   const group=selection===0?'classic':'continuous';
   await page.locator('#paletteModal [data-palette-group="'+group+'"]').click();
   await page.locator('#paletteModal .palette-choice[data-palette-index="'+selection+'"]').click();
   await page.locator('#palette-apply').click();
  }
  await page.locator('#btnMacroPlay').click();
  await page.waitForFunction(()=>!paletteUITest.state().loaded,null,{timeout:15000});
  const trace=await page.evaluate(()=>paletteUITest.trace);
  assert.equal(trace.find(a=>a.event==='INIT_STATE').palette,selection??jade);
  assert.equal(trace.find(a=>a.event==='HISTORY_SETTINGS').palette,selection??jade,'Undo of drawing retains selected palette');
  assert.equal(trace.find(a=>a.event==='Palette Change').palette,glacier,'explicit switch executes');
  assert.equal((await page.evaluate(()=>paletteUITest.state())).palette,glacier);
 }
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(config),'real file import, palette selection, drawing Undo, explicit change and fresh-file reset');await context.close();
}}finally{await browser.close();server.close();}
