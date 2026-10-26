// Native touch regression check. Touch events are delivered through Chromium's
// input pipeline, not dispatchEvent, so browser scrolling is exercised too.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=process.env.PROFILE_ARTIFACTS||'/tmp/profile-session-check';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';const data=await readFile(path.join(root,'dist',file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
// Exercise actual Save, export, import, copy and reset controls. Hooks only
// expose runtime snapshots and open modals; production assets stay untouched.
const results=[];
try{for(const config of [{width:1280,height:900,lang:'en'},{width:390,height:844,lang:'he'},{width:320,height:568,lang:'ru'},{width:844,height:390,lang:'nl'}]){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.width<600,hasTouch:config.width<600,serviceWorkers:'block',acceptDownloads:true});
 await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 let source=await readFile(path.join(root,'dist/js/app.js'),'utf8');
 source=source.replace('      initializeApp();',`window.profileTest={snapshot:captureProfileSettings,tech:()=>modals.openTechnicianMenu(),gol:()=>modals.openGolSettingsModal(),reset:()=>settingsProfiles.resetToDefaults(),replay:()=>settingsProfiles.beginReplay(),endReplay:()=>settingsProfiles.endReplay(),edit:()=>{const s=captureProfileSettings();s.settings.rules.erosion.erosionStages.channels=5;s.settings.rules.gravity.strength=.25;s.settings.evolutionTuning={...structuredClone(DEFAULT_EVOLUTION_TUNING),breathe:{speed:2,depth:1}};importWorkspaceSettings(s.settings,s.identity);settingsProfiles.refresh();}};initializeApp().then(()=>profileTest.ready=true);`);
 for(const ms of [5000,1500,2000])source=source.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
 await page.route(base+'/js/app.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 const boot=async(reload=false)=>{if(reload)await page.reload();else await page.goto(base);await page.waitForFunction(()=>window.profileTest?.ready);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
 const snap=()=>page.evaluate(()=>profileTest.snapshot());
 const tech=async()=>{await page.evaluate(()=>profileTest.tech());await page.locator('#technicianDialog').waitFor({state:'visible'});};
 const actions=async()=>{if(!(await page.locator('#profileActions').isVisible()))await page.locator('[data-profile-dot="0"]').click();};
 const golEdit=async()=>{await page.evaluate(()=>profileTest.gol());await page.locator('#btnGolPresetNaive').click();await page.locator('#btnGolSettingsSave').click();await page.waitForTimeout(350);};
 await boot();const baseline=await snap();
 await golEdit();await page.evaluate(()=>profileTest.edit());const edited=await snap();
 assert.notDeepEqual(edited.settings.cycles.gameOfLife,baseline.settings.cycles.gameOfLife);
 await tech();await page.locator('[data-profile-choice="1"]').click();await page.locator('[data-profile-choice="0"]').click();
 assert.deepEqual((await snap()).settings.rules,edited.settings.rules,'session edits survive profile switching');
 await boot(true);let reopened=await snap();
 assert.deepEqual(reopened.settings.rules,baseline.settings.rules);assert.deepEqual(reopened.settings.cycles,baseline.settings.cycles);assert.deepEqual(reopened.settings.evolutionTuning,baseline.settings.evolutionTuning);
 // Export provides a backup but never commits to the current profile.
 await golEdit();await page.evaluate(()=>profileTest.edit());await tech();await actions();
 const downloaded=page.waitForEvent('download');await page.locator('#btnProfileExport').click();const download=await downloaded;
 const exported=await readFile(await download.path(),'utf8');assert(exported.startsWith('FYI_SETTINGS_V1'));
 await boot(true);assert.deepEqual((await snap()).settings.rules,baseline.settings.rules);
 // Explicit Save persists all runtime simulation settings, leaving the default star.
 await golEdit();await page.evaluate(()=>profileTest.edit());const custom=await snap();await tech();await actions();
 assert.equal(await page.locator('#profileActions button').count(),4);
 assert(await page.locator('#btnProfileSave').getAttribute('aria-label'));
 await page.screenshot({path:path.join(artifacts,config.lang+'-profile-actions.png')});
 await page.locator('#btnProfileSave').click();assert.equal(await page.locator('#profileStatus').getAttribute('data-debug-text'),'profile_saved');
 assert(!(await page.locator('[data-profile-choice="0"] .profile-dirty').evaluate(e=>e.hidden)));
 await boot(true);reopened=await snap();assert.deepEqual(reopened.settings.rules,custom.settings.rules);assert.deepEqual(reopened.settings.cycles,custom.settings.cycles);assert.deepEqual(reopened.identity,custom.identity);assert.deepEqual(reopened.settings.evolutionTuning,custom.settings.evolutionTuning);
 // Copy is an explicit save to the destination; cancellation never overwrites it.
 await tech();await actions();await page.locator('#btnProfileCopy').click();await page.locator('[data-copy-target="1"]').click();await page.locator('#btnProfileTransferCancel').click();
 await actions();await page.locator('#btnProfileCopy').click();await page.locator('[data-copy-target="1"]').click();await page.locator('#btnProfileTransferConfirm').click();
 await page.locator('[data-profile-choice="1"]').click();assert.deepEqual((await snap()).settings.rules,custom.settings.rules);await page.locator('[data-profile-choice="0"]').click();
 // File import cancellation preserves current state; confirmation persists it.
 await page.evaluate(()=>profileTest.reset());await actions();
 await page.locator('#profileSettingsFile').setInputFiles({name:'settings.txt',mimeType:'text/plain',buffer:Buffer.from(exported)});await page.locator('#btnProfileTransferCancel').click();assert.deepEqual((await snap()).settings.rules,baseline.settings.rules);
 await page.locator('#profileSettingsFile').setInputFiles({name:'settings.txt',mimeType:'text/plain',buffer:Buffer.from(exported)});await page.locator('#btnProfileTransferConfirm').click();
 await boot(true);assert.deepEqual((await snap()).settings.rules,custom.settings.rules);
 // Actual reset UI removes both saved overrides and the default star.
 await tech();await page.locator('#btnResetWorkspace').click();await page.locator('#btnConfirmWorkspaceReset').click();
 assert(await page.locator('[data-profile-choice="0"] .profile-dirty').evaluate(e=>e.hidden));
 await boot(true);assert.deepEqual((await snap()).settings.rules,baseline.settings.rules);assert.deepEqual((await snap()).settings.cycles,baseline.settings.cycles);
 assert.deepEqual(errors,[]);results.push({...config,passed:true});console.log('PASS',JSON.stringify(config));await context.close();
}await writeFile(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();await new Promise(r=>server.close(r));}
