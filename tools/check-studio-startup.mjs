// Match static-host slash normalization, rather than testing only /studio/.
// Verify actual browser script/iframe loading, CTA readiness and video output.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://local');let path=url.pathname;
  if(['/studio/','/nested/studio/'].includes(path)){res.writeHead(308,{Location:path.slice(0,-1)+url.search});res.end();return;}
  if(path.startsWith('/nested/'))path=path.slice('/nested'.length);
  if(path.startsWith('/standalone/'))path='/studio/'+path.slice('/standalone/'.length);
  if(path==='/studio')path='/studio/index.html';
  if(path.endsWith('/'))path+='index.html';
  const file=path.slice(1);
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');
  res.end(await readFile(root+file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const fixture='[00:00:00.000] INIT_STATE -> {"recipeVersion":2,"n":9,"pal":0,"sort":"luminance","sep":0,"board":"81x0"}\n[00:00:00.100] DRAW_STROKE -> [{"i":4,"k":2}]';
const cases=[
 {path:'/studio?lang=he',directory:'/studio/',mode:'computed',export:true,editor:true},
 {path:'/studio/?lang=en',directory:'/studio/',mode:'realtime',export:true},
 {path:'/studio/index.html?lang=he',directory:'/studio/'},
 {path:'/nested/studio?lang=en',directory:'/nested/studio/',editor:true},
 {path:'/standalone/index.html?lang=en',directory:'/standalone/'}
];
try{for(const cfg of cases){
 const ctx=await browser.newContext({serviceWorkers:'block'}),page=await ctx.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
 await page.goto(origin+cfg.path);assert.equal(await page.evaluate(()=>document.baseURI),origin+cfg.directory);
 await page.locator('#file').setInputFiles({name:'startup-test.txt',mimeType:'text/plain',buffer:Buffer.from(fixture)});
 await page.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:20000});
 assert(!(await page.locator('#format').textContent()).includes('בודק'));
 assert.equal(await page.locator('#error').textContent(),'');
 if(cfg.export){
  await page.locator('[name="mode"][value="'+cfg.mode+'"]').check();
  await page.locator('[name="size"][value="540"]').check();await page.locator('[name="fps"][value="15"]').check();
  await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').click();
  await page.locator('#download').waitFor({state:'visible',timeout:60000});
  const report=await page.evaluate(()=>lastExportReport);assert(report.bytes>1000);assert(report.encodedFrames>0);
 }
 if(cfg.editor){await page.locator('#editorTab').click();await page.waitForFunction(()=>{const button=document.getElementById('editorPlay');return button&&!button.disabled;},null,{timeout:20000});await page.locator('#videoTab').click();assert(await page.locator('#videoPanel').isVisible());}
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS',JSON.stringify(cfg));await ctx.close();
}}finally{await browser.close();server.close();}
