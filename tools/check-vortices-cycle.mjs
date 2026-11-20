// Native mouse/touch coverage for the circular modes and the two Resonance dialogs.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
let app = await readFile(root+'js/app.js', 'utf8');
app = app.replace('      initializeApp();', `window.circularTest = {
    enter() {
        stopMacro(); pauseLife(); resetArmedState();
        isSimModeActive=true; dom.controlsContainer.classList.add('sim-mode-active');
        dom.btnPlayPauseLife.classList.remove('control-hidden'); updateSimulationUtilityControl();
        n=31; initializeBoardAndCanvas(true);
        boardState.forEach((tile,index)=>{tile.k=tile.v=(index*7+3)%paletteLen();tile.isGold=index===0;});
        gravitationalSortRules.strength=.25;
        Math.random=()=>.42; Date.now=()=>1700000000000;
        history=[];future=[];artRecipeLog=[];historyRecipeCursor=0;logCurrentStateAsInit();
    },
    state:()=>({mode:activeVorticesMode(),control:activeEvolutionControl(),playing:isLifePlaying,
        gen:currentGenerationCount,project:getCurrentState(),
        settings:getWorkspaceSettings(),logs:[...artRecipeLog],loaded:isMacroLoaded,animated:isAnimating}),
    openTech:()=>modals.openTechnicianMenu(), memory:value=>cycleMemory.setEnabled(value)
}; initializeApp().then(()=>circularTest.ready=true);`);
for (const ms of [5000,1500,2000]) app=app.replace('await new Promise(r => setTimeout(r, '+ms+'));','');
const server=createServer(async(req,res)=>{
    try {
        const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
        const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
        res.setHeader('Content-Type',type);
        res.end(file==='js/app.js'?app:await readFile(root+file));
    } catch { res.writeHead(404);res.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try {
    for (const [lang,touch] of [['en',false],['he',true]]) {
        if (process.env.VORTICES_LANG && process.env.VORTICES_LANG!==lang) continue;
        const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},
            hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
        await context.addInitScript(()=>localStorage.setItem('colorGridExperimentalSimulationsV1',JSON.stringify({spiral:true})));
        await context.addInitScript(language=>localStorage.setItem('userLanguage',language),lang);
        const page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:'+server.address().port);
        await page.waitForFunction(()=>window.circularTest?.ready);
        await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());circularTest.enter();});
        const tap=id=>touch?page.locator(id).tap():page.locator(id).click();
        // Native touch exercises drawer controls. Click dialog actions after the CDP swipe ends.
        const dialogAction=id=>page.locator(id).click();
        const state=()=>page.evaluate(()=>circularTest.state());
        const hub='#btnInk', nav='#btnEvolutionDrawerInternal', play='#btnPlayPauseLife';
        const menu=page.locator('#cymaticsSettingsDialog');
        const cycleDialog='#vorticesCycleDialog';
        const cycleMenu=page.locator(cycleDialog);
        const checkbox=mode=>cycleMenu.locator('input[value='+mode+']');
        async function swipeUp(id) {
            const r=await page.locator(id).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
            if (!touch) {
                await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-38,{steps:5});await page.mouse.up();
            } else {
                const cdp=await context.newCDPSession(page);
                await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
                for (let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-8*i}]});
                await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
            }
        }
        const visibleMaps=()=>menu.locator('[data-cymatics-map]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.cymaticsMap).sort());
        const order=['turbine2','flow','left','cosmic','black_hole','a','circular','tornado'];
        const defaultOrder=order.filter(mode=>mode!=='a'&&mode!=='tornado');
        const circularName=lang==='he'?'אמפתיה מעגלית':'Circular Empathy';
        assert(await page.locator(hub).isVisible());
        await page.evaluate(()=>circularTest.openTech());
        assert.equal(await page.locator('#inkExperimentToggle').count(),0);
        await tap('#btnTechnicianCloseTop');
        for (const mode of defaultOrder) {
            await tap(hub);assert.equal((await state()).mode,mode);
        }
        await tap(hub);assert.equal((await state()).control,null);
        await tap(hub);await swipeUp(hub);await cycleMenu.waitFor({state:'visible'});
        assert.deepEqual(await cycleMenu.locator('input').evaluateAll(nodes=>nodes.map(input=>input.value)),order);
        assert.deepEqual(await cycleMenu.locator('input:checked').evaluateAll(nodes=>nodes.map(input=>input.value)),defaultOrder);
        assert.equal(await cycleMenu.getByRole('checkbox',{name:circularName,exact:true}).inputValue(),'circular');
        await checkbox('a').check();await checkbox('tornado').check();
        await dialogAction(cycleDialog+' [type=submit]');
        await cycleMenu.waitFor({state:'hidden'});
        await page.evaluate(()=>circularTest.enter());
        for (const mode of order) {
            const before=(await state()).project.tiles;
            await tap(hub);
            const selected=await state();
            assert.equal(selected.mode,mode);
            assert.deepEqual(selected.project.tiles,before,'selecting a paused mode preserves the board');
            assert.equal(await page.locator(hub).getAttribute('aria-pressed'),'true');
            assert.deepEqual(await page.locator(hub+' svg:visible').evaluateAll(ns=>ns.map(n=>n.dataset.vorticesIcon)),[mode==='tornado'?'flow':mode]);
            if (mode==='a') {
                assert.equal(await page.locator(hub+' svg:visible path').getAttribute('d'),
                    await page.locator('#iconGsCircle path').getAttribute('d'));
            }
            assert.equal(await page.locator(hub+' .vortices-tornado-badge').isVisible(),mode==='tornado');
            for (const source of ['#btnSpiral','#btnGravitationalSort','#btnCymatics']) {
                assert(!(await page.locator(source).getAttribute('class')).includes('simulation-active'));
            }
            if (mode==='turbine2') {
                assert.equal(selected.project.gravityRules.strength,.6);
                assert.equal(selected.settings.rules.gravity.strength,.25);
            }
            if (mode==='flow') {
                await swipeUp(hub);
                assert(await page.locator('#inkSettingsDialog').isVisible());
                assert.equal(await page.locator('#ink-flow').inputValue(),'75');
                await dialogAction('#inkSettingsDialog [data-cancel]');
            }
            if (mode==='cosmic'||mode==='circular') {
                if (mode==='circular') assert.equal(await page.locator(hub).getAttribute('aria-label'),circularName);
                assert.equal(selected.project.cymaticsState.rules.reversePaletteOrder,true);
                await swipeUp(hub);await menu.waitFor({state:'visible'});
                await page.waitForTimeout(350);
                assert.deepEqual(await visibleMaps(),['circular','cosmic']);
                assert.equal(await menu.locator('[data-resonance-cycle]:visible').count(),0);
                assert.equal(await menu.locator('[data-cymatics-map='+mode+']').getAttribute('aria-pressed'),'true');
                if(mode==='cosmic') {
                    await menu.locator('#cymaticsStrength').fill('65');
                    await dialogAction('#cymaticsSettingsDialog [type=submit]');
                    await menu.waitFor({state:'hidden'});
                    assert.equal((await state()).project.cymaticsState.rules.strength,65);
                    assert.equal((await state()).project.cymaticsState.rules.reversePaletteOrder,true);
                } else {await dialogAction('#cymaticsSettingsDialog [data-cancel]');await menu.waitFor({state:'hidden'});}
            } else if (mode!=='flow') {
                await swipeUp(hub);await cycleMenu.waitFor({state:'visible'});
                assert.deepEqual(await cycleMenu.locator('input:checked').evaluateAll(nodes=>nodes.map(input=>input.value)),order);
                await dialogAction(cycleDialog+' [data-cancel]');
                await cycleMenu.waitFor({state:'hidden'});
            }
        }
        await tap(hub);assert.equal((await state()).control,null);
        await tap(nav);
        await tap('#btnSpiral');assert.equal((await state()).project.spiralMethod,'radial');
        await swipeUp('#btnSpiral');
        await page.locator("#spiralSettingsModal").waitFor({state:"visible"});
        assert.deepEqual(await page.locator('.spiral-method-btn').evaluateAll(ns=>ns.map(n=>n.dataset.method)),['radial','down','triangle_gravity','square_flow','triangle_weave','fibonacci']);
        await dialogAction('#btnSpiralSettingsCancel');await page.locator('#spiralSettingsModal').waitFor({state:'hidden'});
        await tap(nav);
        await tap('#btnGravitationalSort');await swipeUp('#btnGravitationalSort');
        await page.locator("#gravitationalSortSettingsModal").waitFor({state:"visible"});
        assert.deepEqual(await page.locator('.gs-direction-btn[data-direction]').evaluateAll(ns=>ns.map(n=>n.dataset.direction)),['up','right','center_x','pinwheel']);
        await dialogAction('.gs-direction-btn[data-direction=pinwheel]');
        assert(await page.locator('#gsStrength').isDisabled());
        await dialogAction('#btnGsSettingsSave');
        await page.locator('#gravitationalSortSettingsModal').waitFor({state:'hidden'});
        assert.equal((await state()).project.gravityRules.direction,'pinwheel');
        assert(await page.locator('#iconGsPinwheel').isVisible());
        await tap('#btnGravitationalSort');assert.equal((await state()).control,null);
        for (const direction of ['up','right','center_x','pinwheel']) {
            await tap('#btnGravitationalSort');assert.equal((await state()).project.gravityRules.direction,direction);
        }
        await tap('#btnGravitationalSort');assert.equal((await state()).control,null);
        await tap(nav);await tap('#btnCymatics');
        assert.equal((await state()).project.cymaticsState.rules.resonanceVersion,4);
        await swipeUp('#btnCymatics');await menu.waitFor({state:'visible'});
        await page.waitForTimeout(350);
        assert.deepEqual(await visibleMaps(),['clouds','diagonal','grid','interference']);
        await dialogAction('#cymaticsSettingsDialog [data-reset]');await dialogAction('#cymaticsSettingsDialog [type=submit]');await menu.waitFor({state:'hidden'});
        assert.equal((await state()).settings.cymaticsStrengths.cosmic,65,'Reset only resets the maps in the open dialog');
        // Handoff to the source button must not disarm the same shared engine.
        await tap(nav);
        await page.evaluate(()=>circularTest.memory(true));
        await tap('#btnGravitationalSort');
        await tap(hub);
        assert.equal((await state()).mode,'turbine2');
        await tap('#btnGravitationalSort');
        assert.equal((await state()).control,'gravitationalSort');
        await page.evaluate(()=>circularTest.memory(false));
        await page.evaluate(()=>circularTest.enter());
        for (let i=0;i<4;i++) await tap('#btnGravitationalSort');
        assert.equal((await state()).project.gravityRules.direction,'pinwheel');
        await tap('#btnStepForward');
        await tap(hub);await tap(play);
        for (const mode of [...order.slice(1),order[0]]) {
            await page.waitForFunction(()=>circularTest.state().gen>=3);
            await tap(hub);
            assert.equal((await state()).mode,mode);
            assert((await state()).playing);
        }
        await tap(play);
        const final=await state();
        await page.locator('#projectFileInput').setInputFiles({name:'circular.txt',mimeType:'text/plain',buffer:Buffer.from(final.logs.join('\n'))});
        await page.waitForFunction(()=>circularTest.state().loaded);
        await tap('#btnMacroPlay');
        await page.waitForFunction(()=>!circularTest.state().loaded&&!circularTest.state().animated,null,{timeout:30000});
        assert.deepEqual((await state()).project.tiles,final.project.tiles,'controlled clock/RNG round trip through all engines');

        await page.evaluate(()=>circularTest.enter());
        await tap(hub);assert.equal((await state()).mode,'turbine2');
        await swipeUp(hub);await cycleMenu.waitFor({state:'visible'});
        await checkbox('turbine2').uncheck();
        await dialogAction(cycleDialog+' [data-cancel]');
        await swipeUp(hub);await cycleMenu.waitFor({state:'visible'});
        assert(await checkbox('turbine2').isChecked(),'Cancel discards the draft');
        for (const mode of order.filter(mode=>mode!=='left')) await checkbox(mode).uncheck();
        assert(await checkbox('left').isDisabled(),'The last mode that can open the list stays selected');
        await dialogAction(cycleDialog+' [type=submit]');
        await cycleMenu.waitFor({state:'hidden'});
        assert.equal((await state()).mode,'turbine2','Saving does not interrupt the current mode');
        await tap(hub);assert.equal((await state()).mode,'left','Cycle continues forward from an excluded active mode');
        await tap(play);
        await page.waitForFunction(()=>circularTest.state().gen>=3);
        await tap(hub);
        assert((await state()).playing);
        assert((await state()).gen>=3,'A single enabled mode keeps playing without restarting');
        await tap(play);
        await tap(hub);assert.equal((await state()).control,null,'Pause still permits Off');
        await page.reload();
        await page.waitForFunction(()=>window.circularTest?.ready);
        await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());circularTest.enter();});
        if (!(await page.locator(hub).isVisible())) await tap(nav);
        await tap(hub);assert.equal((await state()).mode,'left','The enabled selection survives reload');
        await swipeUp(hub);await cycleMenu.waitFor({state:'visible'});
        assert.deepEqual(await cycleMenu.locator('input:checked').evaluateAll(nodes=>nodes.map(input=>input.value)),['left']);
        assert.deepEqual(errors,[]);console.log('PASS circular mode cycle',lang);await context.close();
    }
}finally{await browser.close();server.close();}
