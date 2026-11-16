// The five specified steps, real native actions, persistence and outer-artwork isolation.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist'),artifacts='/tmp/chapter-one-check';await mkdir(artifacts,{recursive:true});
let app=await readFile(root+'/js/app.js','utf8');
app=app.replace('      initializeApp();',`window.chapterTest={state:()=>({board:getCurrentState(),settings:getWorkspaceSettings(),history:history.length,future:future.length,logs:[...artRecipeLog]}),tech:()=>modals.openTechnicianMenu()};initializeApp().then(()=>chapterTest.ready=true);`);
for(const ms of [5000,1500,2000])app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(name==='js/app.js'?app:await readFile(path.join(root,name)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{for(const config of [{width:1280,height:900,lang:'he'},{width:1024,height:768,lang:'en'},{width:1440,height:900,lang:'en'},{width:900,height:600,lang:'he'}]){
    const motion=config.width===1280?'no-preference':'reduce';
    const context=await browser.newContext({viewport:{width:config.width,height:config.height},serviceWorkers:'block',reducedMotion:motion});
    await context.addInitScript(lang=>localStorage.setItem('userLanguage',lang),config.lang);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const boot=async()=>{await page.goto(base);await page.waitForFunction(()=>window.chapterTest?.ready);};await boot();
    const card=page.locator('.chapter-coach'),frame=page.frameLocator('.chapter-frame');
    const step=async name=>{await page.waitForFunction(name=>document.querySelector('.chapter-one-tour')?.dataset.step===name,name);await page.waitForTimeout(160);
        await page.screenshot({path:`${artifacts}/${config.lang}-${config.width}-${name}.png`});
        const geometry=await page.evaluate(()=>{const root=document.querySelector('.chapter-one-tour'),f=root.querySelector('iframe').getBoundingClientRect(),c=root.querySelector('section').getBoundingClientRect(),board=root.querySelector('iframe').contentDocument.querySelector('#boardCanvas').getBoundingClientRect(),footer=root.querySelector('footer').getBoundingClientRect();return {frame:{x:f.x,right:f.right,y:f.y,bottom:f.bottom},coach:{x:c.x,right:c.right,y:c.y,bottom:c.bottom},board:{x:board.x+f.x,right:board.right+f.x,y:board.y+f.y,bottom:board.bottom+f.y},footer:{y:footer.y,bottom:footer.bottom},scroll:root.querySelector('iframe').contentWindow.scrollY};});
        assert(geometry.frame.right<=geometry.coach.x+1||geometry.coach.right<=geometry.frame.x+1,'coach must never cover the app');
        assert(geometry.board.x>=geometry.frame.x-1&&geometry.board.right<=geometry.frame.right+1&&geometry.board.y>=geometry.frame.y-1&&geometry.board.bottom<=geometry.frame.bottom+1,'whole board fits its own viewport');
        assert(geometry.footer.y>=geometry.coach.y&&geometry.footer.bottom<=geometry.coach.bottom+1,'navigation stays visible');assert.equal(geometry.scroll,0,'the practice document must not scroll away');
    };
    await step('intro');
    const original=await page.evaluate(()=>chapterTest.state()),storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
    const initial=await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());
    assert.equal(initial.n,21);assert.equal(initial.paletteName,'Journey');assert.equal(initial.selectedColorIndex,-1);assert.equal(initial.rainbow,false);assert.equal(initial.brushSize,1);assert.equal(initial.symmetryMode,'off');assert(initial.separatorPx>0);assert.equal(initial.playing,false);assert(new Set(initial.tiles).size>15,'initial board is a random color field');
    await card.locator('[data-next]').click();await step('palette');assert(await card.locator('[data-next]').isDisabled());
    assert.equal(await page.locator('.chapter-highlight,.chapter-touch-hint').count(),0,'there are no rectangular guidance frames or stroke rings');
    const paletteGlow=frame.locator('#btnPalette.chapter-guide-glow');await paletteGlow.waitFor();
    const pulse=await paletteGlow.evaluate(el=>{
        const animation=el.getAnimations().find(a=>a.animationName==='chapter-guide-breathe');
        if(!animation)return {animated:false,filter:getComputedStyle(el).filter};
        animation.pause();animation.currentTime=0;const low=getComputedStyle(el).filter;
        animation.currentTime=2400;const high=getComputedStyle(el).filter;animation.play();return {animated:true,low,high};
    });
    if(motion==='reduce'){assert.equal(pulse.animated,false);assert.notEqual(pulse.filter,'none','reduced motion retains static guidance');}
    else{assert.equal(pulse.animated,true);assert.notEqual(pulse.low,pulse.high,'the target really breathes between two glow strengths');}
    const before=await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());
    await frame.locator('#btnPalette').click();await page.waitForTimeout(500);assert(await card.locator('[data-next]').isDisabled());
    await frame.locator('#btnPalette').focus();await frame.locator('#btnPalette').press('Enter');await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
    const after=await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());assert.notEqual(after.paletteIndex,before.paletteIndex);assert.equal(after.n,21);assert.equal(await frame.locator('#paletteModal.modal-visible').count(),0,'palette taps do not open the picker');
    await card.locator('[data-next]').click();await step('picker');
    const button=await frame.locator('#btnPalette').boundingBox();await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();await page.mouse.move(button.x+button.width/2,button.y+button.height/2+65,{steps:6});await page.mouse.up();
    await frame.locator('#paletteModal.modal-visible').waitFor();assert(await card.locator('[data-next]').isDisabled());
    await card.locator('[data-palette-tip]').waitFor();assert.deepEqual(await card.locator('[data-palette-tip] dt').allTextContents(),['23','64','264','•']);
    await page.waitForFunction(()=>document.querySelector('.chapter-frame').contentDocument.querySelectorAll('.palette-choice-symbol.chapter-guide-glow').length>1);
    assert.equal(await frame.locator('#palette-choice-panel.chapter-guide-glow').count(),0,'the collection has glowing icons, not a glowing rectangle');
    const tipGeometry=await card.locator('[data-palette-tip]').evaluate(el=>{const r=el.getBoundingClientRect(),c=el.closest('section').getBoundingClientRect(),f=el.closest('section').querySelector('footer').getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,coachTop:c.top,coachLeft:c.left,coachRight:c.right,footerTop:f.top};});
    assert(tipGeometry.top>=tipGeometry.coachTop&&tipGeometry.bottom<=tipGeometry.footerTop&&tipGeometry.left>=tipGeometry.coachLeft&&tipGeometry.right<=tipGeometry.coachRight,'palette advice stays within the coach and above its navigation');
    const selected=frame.locator('#palette-choice-panel .palette-choice:not(.is-current)').first();const selectedIndex=Number(await selected.getAttribute('data-palette-index'));await selected.click();await page.waitForTimeout(100);
    await frame.locator('#palette-apply.chapter-guide-glow').waitFor();assert.equal(await frame.locator('.palette-choice-symbol.chapter-guide-glow').count(),0,'guidance follows the current action');
    await page.screenshot({path:`${artifacts}/${config.lang}-${config.width}-picker-choice.png`});await frame.locator('#palette-apply').click();await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
    assert.equal((await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read())).paletteIndex,selectedIndex,'chosen palette is applied and kept');
    await card.locator('[data-next]').click();await step('random');assert(await card.locator('[data-next]').isDisabled());
    await frame.locator('#btnRandom.chapter-guide-glow').waitFor();assert.equal(await frame.locator('#btnPalette.chapter-guide-glow').count(),0);
    assert(await card.locator('[data-palette-tip]').isHidden(),'palette advice is limited to the picker');
    const tiles=await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().tiles);
    await frame.locator('#btnRandom').click();await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
    assert.notDeepEqual(await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().tiles),tiles);
    await card.locator('[data-next]').click();await step('tile');
    const hint=page.locator('.chapter-cell-glow');assert.equal(await hint.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px','cell guidance is soft light without a ring');
    const canvas=frame.locator('#boardCanvas');const clickTile=async index=>{const r=await canvas.boundingBox();await page.mouse.click(r.x+(index%21+.5)*r.width/21,r.y+(Math.floor(index/21)+.5)*r.height/21);await page.waitForTimeout(130);};
    for(const i of [100,101,100])await clickTile(i);assert(await card.locator('[data-next]').isDisabled(),'three different-square clicks do not complete the task');
    await clickTile(100);assert(await card.locator('[data-next]').isDisabled());await clickTile(100);await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
    const finalState=await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());assert.equal(finalState.selectedColorIndex,-1);assert.equal(finalState.n,21);assert.equal(finalState.playing,false);
    await card.locator('[data-next]').click();assert.equal(await page.locator('.chapter-one-tour').count(),0);assert.deepEqual(await page.evaluate(()=>chapterTest.state()),original,'outer artwork/settings/undo/log are untouched');
    for(const [key,value]of Object.entries(storage))if(key!=='colorGridChapterOneV1')assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),value);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('colorGridChapterOneV1')).status),'complete');
    await boot();assert.equal(await page.locator('.chapter-one-tour').count(),0,'completed chapter does not reopen');
    await page.evaluate(()=>chapterTest.tech());await page.locator('#technicianDialog [data-chapter-one-reset]').click();await boot();await step('intro');
    await card.locator('[data-next]').click();await step('palette');await card.locator('[data-exit]').click();await boot();await step('palette');assert(await card.locator('[data-next]').isDisabled(),'resume requires new actions on its fresh practice board');
    // Fast taps must both count. Opening the picker through its alternative
    // button must work, and Escape closes that picker before exiting the lesson.
    await frame.locator('#btnPalette').click();await frame.locator('#btnPalette').click();await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
    await card.locator('[data-next]').click();await step('picker');await card.locator('[data-open]').click();await frame.locator('#paletteModal.modal-visible').waitFor();
    await frame.locator('#paletteModal [aria-selected="true"]').press('Escape');await page.waitForTimeout(350);assert.equal(await page.locator('.chapter-one-tour').count(),1,'Escape closes the palette window first');assert.equal(await frame.locator('#paletteModal.modal-visible').count(),0);
    await frame.locator('#btnPalette').focus();await frame.locator('#btnPalette').press('Escape');assert.equal(await page.locator('.chapter-one-tour').count(),0,'Escape outside a picker exits the lesson');
    assert.deepEqual(errors,[]);console.log('PASS chapter one',config);await context.close();
}
// Desktop-only first release: phones keep the regular app.
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const page=await context.newPage();await page.goto(base+'?tour=1');await page.waitForFunction(()=>window.chapterTest?.ready);assert.equal(await page.locator('.chapter-one-tour').count(),0);console.log('PASS desktop-only gate');await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
