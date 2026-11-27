// Native mouse/touch coverage for the technician mode layout and engine-independent recipes.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import { MODE_LAYOUT_KEY, createModeLayout } from '../js/simulation-mode-layout.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
let app = await readFile(root+'js/app.js', 'utf8');
app = app.replace('      initializeApp();', `window.modeLayoutTest = {
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
    state:()=>({mode:modeLayout ? activeLayoutMode() : activeVorticesMode() ?? (armedSimulation === 'gravitationalSort' ? gsMode : spiralMode), engine:armedSimulation,control:activeEvolutionControl(),playing:isLifePlaying,
        gen:currentGenerationCount,project:getCurrentState(),
        settings:getWorkspaceSettings(),logs:[...artRecipeLog],loaded:isMacroLoaded,animated:isAnimating}),
    enterCreation:()=>{if (isSimModeActive) toggleSimMode({immediate:true});}
}; initializeApp().then(()=>modeLayoutTest.ready=true);`);
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
        if (process.env.MODE_LAYOUT_LANG && process.env.MODE_LAYOUT_LANG!==lang) continue;
        const context=await browser.newContext({viewport:touch?{width:320,height:740}:{width:1280,height:900},
            hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
        await context.addInitScript(() => {
            localStorage.setItem('colorGridExperimentalSimulationsV1', JSON.stringify({ spiral: true }));
            localStorage.setItem('colorGridOpeningChoice', 'false');
        });
        await context.addInitScript(language=>localStorage.setItem('userLanguage',language),lang);
        const page=await context.newPage(),errors=[];
        page.setDefaultTimeout(7000);
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:'+server.address().port);
        await page.waitForFunction(()=>window.modeLayoutTest?.ready);
        await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());modeLayoutTest.enter();});
        const tap=id=>touch?page.locator(id).tap():page.locator(id).click();
        // Native touch exercises drawer controls. Click dialog actions after the CDP swipe ends.
        const state=()=>page.evaluate(()=>modeLayoutTest.state());
        const hub='#btnInk', nav='#btnEvolutionDrawerInternal', play='#btnPlayPauseLife';
        async function swipeUp(id, distance = 40) {
            const r=await page.locator(id).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
            if (!touch) {
                await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-distance,{steps:5});await page.mouse.up();
            } else {
                const cdp=await context.newCDPSession(page);
                await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
                for (let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-distance*i/5}]});
                await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
            }
        }
        const gravity = '#btnGravitationalSort', geo = '#btnSpiral';
        const editor = page.locator('#simulationModeEditor');
        const picker = page.locator('#assignedSimulationModes');
        const browserLayout = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), MODE_LAYOUT_KEY);
        const visibleControl = async id => {
            for (let index = 0; index < 3; index++) {
                if (await page.locator(id).isVisible()) return;
                await tap(nav);
            }
            assert.fail('Missing drawer control: ' + id);
        };
        const openEditor = async () => {
            await swipeUp('#btnToggleSimMode', touch ? 18 : 40);
            await page.locator('#technicianDialog').waitFor({state:'visible'});
            await tap('#btnSimulationModeEditor');
            await editor.waitFor({state:'visible'});
            const box = await editor.boundingBox();
            assert(box.x >= 0 && box.x + box.width <= (touch ? 320 : 1280));
            assert(await editor.evaluate(el => el.scrollWidth === el.clientWidth));
        };
        const family = id => editor.locator('#modeLayoutFamily').selectOption(id);
        const row = mode => editor.locator('[data-mode="' + mode + '"]');
        const move = (mode, to) => row(mode).locator('select').selectOption(to);
        const apply = async () => {
            await editor.locator('[data-copy=apply]').click();
            await editor.waitFor({ state: 'hidden' });
        };
        const assertMode = async (button, mode, engine) => {
            assert.equal((await state()).mode, mode);
            assert.equal((await state()).engine, engine);
            assert.equal(await page.locator(button).getAttribute('aria-pressed'), 'true');
            assert.equal(await page.locator(button + ' > svg:visible').count(), 1);
            assert.equal(await page.locator(button + ' > [data-mode-layout-icon]').getAttribute('data-mode-layout-icon'), mode);
            assert.equal(await page.locator(':is(#btnSpiral,#btnInk,#btnGravitationalSort)[aria-pressed=true]').count(), 1);
        };
        const replay = async (recording, name) => {
            await page.locator('#projectFileInput').setInputFiles({
                name, mimeType:'text/plain', buffer:Buffer.from(recording.logs.join('\n'))
            });
            await page.waitForFunction(() => modeLayoutTest.state().loaded);
            await tap('#btnMacroPlay');
            await page.waitForFunction(() => !modeLayoutTest.state().loaded && !modeLayoutTest.state().animated, null, {timeout:30000});
            assert.deepEqual((await state()).project.tiles, recording.project.tiles, name + ' replay');
        };
        await visibleControl(hub);
        await tap(hub);
        assert.equal((await state()).mode, 'turbine2');
        await swipeUp(hub);
        const nativeCircular = page.locator('#vorticesCycleDialog');
        await nativeCircular.waitFor({state:'visible'});
        assert.equal(await nativeCircular.locator('input').count(), 8);
        await nativeCircular.locator('[data-cancel]').click();
        await visibleControl(gravity);
        for (let index = 0; index < 8; index++) await tap(gravity);
        assert.equal((await state()).mode, 'pinwheel');
        await tap('#btnStepForward');
        const legacy = await state();
        assert(legacy.logs.some(line => line.includes('STEP FORWARD') && line.includes('"direction":"pinwheel"')));

        await openEditor();
        assert.equal(await browserLayout(), null);
        const familyPicker = editor.locator('#modeLayoutFamily');
        await move('pinwheel', 'spiral');
        assert.equal(await familyPicker.inputValue(), 'gravitationalSort');
        assert.equal(await row('pinwheel').count(), 0);
        await row('center_x').locator('input').uncheck();
        await move('center_x', 'spiral');
        assert.equal(await familyPicker.inputValue(), 'gravitationalSort');
        assert.equal(await row('center_x').count(), 0);
        await family('ink');
        await move('circular', 'spiral');
        assert.equal(await familyPicker.inputValue(), 'ink');
        assert.equal(await row('circular').count(), 0);
        await family('spiral');
        await row('pinwheel').locator('[data-order=up]').click();
        await row('pinwheel').locator('[data-order=up]').click();
        assert(!(await row('center_x').locator('input').isChecked()));
        const downloading = page.waitForEvent('download');
        await editor.locator('[data-copy=export]').click();
        const download = await downloading;
        const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
        assert.deepEqual(exported.families.spiral.map(entry => entry.id), ['pinwheel','radial','down','center_x','circular']);
        await apply();
        assert.deepEqual(await browserLayout(), exported);
        assert.deepEqual((await state()).project.tiles, legacy.project.tiles, 'Applying a layout leaves the board intact');
        assert.equal((await state()).control, 'spiral');

        await page.reload();
        await page.waitForFunction(() => window.modeLayoutTest?.ready);
        await page.evaluate(() => {
            document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
            modeLayoutTest.enter();
        });
        assert.deepEqual(await browserLayout(), exported);
        await visibleControl(geo);
        await swipeUp(nav);
        const evolutionMap = page.locator('#evolutionDrawerDialog');
        await evolutionMap.waitFor({state:'visible'});
        for (const label of ['gravitationalSort', 'spiral', 'ink']) {
            const slot = await page.locator('[data-evolution-id=' + label + ']').getAttribute('data-evolution-slot');
            assert.equal(await evolutionMap.locator('[data-drawer-slot="' + slot + '"] svg').count(), 1);
        }
        await evolutionMap.locator('[data-close]').click();
        await tap(geo);
        await assertMode(geo, 'pinwheel', 'gravitationalSort');
        if (touch) await swipeUp(geo);
        else await page.locator(geo).press('Alt+ArrowUp');
        await picker.waitFor({state:'visible'});
        assert.deepEqual(await picker.locator('[data-mode]').evaluateAll(nodes => nodes.map(node => node.dataset.mode)), ['pinwheel','radial','down','center_x','circular']);
        await picker.locator('[data-mode=center_x]').click();
        await assertMode(geo, 'center_x', 'gravitationalSort');
        await swipeUp(geo);
        await picker.locator('.mode-layout-actions button').last().click();
        await page.locator('#gravitationalSortSettingsModal.modal-visible').waitFor({state:'visible'});
        assert(!(await page.locator('#gravityCycleOptions').isVisible()));
        await page.locator('#gsStrength').fill('75');
        await page.locator('#btnGsSettingsSave').click();
        await page.locator('#gravitationalSortSettingsModal').waitFor({state:'hidden'});
        assert.equal((await state()).project.gravityRules.strength, .75);
        await tap(geo);
        await assertMode(geo, 'circular', 'cymatics');
        await swipeUp(geo);
        await picker.locator('.mode-layout-actions button').last().click();
        const resonance = page.locator('#cymaticsSettingsDialog');
        await resonance.waitFor({state:'visible'});
        assert.deepEqual(await resonance.locator('[data-cymatics-map]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.cymaticsMap)), ['circular']);
        await resonance.locator('[data-cancel]').click();
        await tap(geo);
        assert.equal((await state()).control, null);
        await tap(geo);
        await assertMode(geo, 'pinwheel', 'gravitationalSort');
        await tap(play);
        await page.waitForFunction(() => modeLayoutTest.state().gen >= 3);
        await tap(geo);
        await assertMode(geo, 'radial', 'spiral');
        assert((await state()).playing);
        await page.waitForFunction(() => modeLayoutTest.state().gen >= 3);
        await tap(geo);
        await assertMode(geo, 'down', 'spiral');
        await tap(geo);
        await assertMode(geo, 'circular', 'cymatics');
        await page.waitForFunction(() => modeLayoutTest.state().gen >= 3);
        await tap(play);
        const current = await state();
        assert(current.logs.some(line => line.includes('SIMULATION_RULES') && line.includes('Armed: gravitationalSort') && line.includes('"direction":"pinwheel"')));
        assert(current.logs.some(line => line.includes('SIMULATION_RULES') && line.includes('Armed: spiral') && line.includes('"method":"down"')));
        assert(!current.logs.some(line => line.includes('Simulation Mode Layout')));
        await replay(current, 'assigned-modes.txt');
        await replay(legacy, 'legacy-modes.txt');

        await openEditor();
        await editor.locator('[data-copy=reset]').click();
        assert.deepEqual(await browserLayout(), exported, 'Reset edits a draft');
        await apply();
        assert.deepEqual(await browserLayout(), createModeLayout());
        await replay(current, 'after-factory-reset.txt');

        await openEditor();
        const file = editor.locator('input[type=file]');
        await file.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":1}')});
        await editor.locator('[role=status]').filter({hasText:/.+/}).waitFor();
        assert.deepEqual(await browserLayout(), createModeLayout());
        await file.setInputFiles(await download.path());
        await editor.waitFor();
        await family('spiral');
        await row('pinwheel').waitFor();
        await apply();
        assert.deepEqual(await browserLayout(), exported);
        await visibleControl(hub);
        await swipeUp(hub);
        await picker.waitFor({state:'visible'});
        assert.equal(await picker.locator('[data-mode=circular]').count(), 0);
        await picker.locator('.mode-layout-actions button').first().click();
        assert.equal(await page.evaluate(() => ['btnGravitationalSort','btnSpiral','btnInk'].filter(id => document.querySelectorAll('#' + id).length === 1).length), 3);
        await page.evaluate(() => modeLayoutTest.enterCreation());
        const creation = await state();
        await openEditor();
        await family('spiral');
        const enabledModes = editor.locator('input[type=checkbox]:checked');
        while (await enabledModes.count()) await enabledModes.first().uncheck();
        await apply();
        assert.deepEqual((await state()).project.tiles, creation.project.tiles);
        await visibleControl(geo);
        await tap(geo);
        await picker.waitFor({state:'visible'});
        await picker.locator('[data-mode=radial]').click();
        await assertMode(geo, 'radial', 'spiral');
        assert.deepEqual(errors, []);
        console.log(lang + ': layout editing, drawers, native tuning and old/new recipe replay passed');
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
