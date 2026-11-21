import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SIMULATION_MODES } from '../js/simulation-families.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
let app = await readFile(root + 'js/app.js', 'utf8');
app = app.replace('        refreshSimulationFamilies();\n\n\n        dom.btnPlayPauseLife', `        refreshSimulationFamilies();
        window.familyTest = {
            technician: () => modals.openTechnicianMenu(),
            setup: () => { isSimModeActive = true; dom.controlsContainer.classList.add('sim-mode-active');
                dom.btnPlayPauseLife.classList.remove('control-hidden'); evolutionDrawer.applyLayout(); },
            select: key => activateFamilyMode(SIMULATION_MODES.get(key)),
            snapshot: () => ({ active: previewActiveMode()?.key, control: displayedEvolutionControl(), playing: isLifePlaying,
                board: boardState.map(({ k, v, isGold }) => [k, v, !!isGold]), generation: currentGenerationCount }),
            parseRecipe: () => parseMacroText(artRecipeLog.join('\\n')).length,
            play: togglePlayPauseLife, pause: pauseLife
        };

        dom.btnPlayPauseLife`);
assert(app.includes('window.familyTest'));
for (const ms of [5000, 1500, 2000]) app = app.replace(`await new Promise(r => setTimeout(r, ${ms}));`, '');
const server = createServer(async (req, res) => {
    try {
        const file = new URL(req.url, 'http://local').pathname.slice(1) || 'index.html';
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(file === 'js/app.js' ? app : await readFile(root + file));
    } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });

try {
    for (const [lang, viewport] of [['en', { width: 1280, height: 900 }], ['he', { width: 390, height: 844 }]]) {
        const context = await browser.newContext({ viewport, isMobile: lang === 'he', hasTouch: lang === 'he', acceptDownloads: true, serviceWorkers: 'block' });
        await context.addInitScript(lang => localStorage.setItem('userLanguage', lang), lang);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const boot = async () => {
            await page.waitForFunction(() => window.familyTest);
            await page.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); familyTest.setup(); });
        };
        const state = () => page.evaluate(() => familyTest.snapshot());
        await page.goto(base);
        await boot();
        const board = (await state()).board;
        const editor = page.locator('#simulationFamilyEditor');
        async function openEditor() {
            await page.evaluate(() => familyTest.technician());
            const features = page.locator('#btnConfigureFeatures');
            if (await features.getAttribute('aria-expanded') === 'false') await features.click();
            await page.locator('#btnSimulationFamilyEditor').click();
            await editor.waitFor();
        }
        async function swipeUp(button) {
            const { x, y, width, height } = await button.boundingBox();
            const center = { x: x + width / 2, y: y + height / 2 };
            if (lang === 'en') {
                await page.mouse.move(center.x, center.y);
                await page.mouse.down();
                await page.mouse.move(center.x, center.y - 38, { steps: 5 });
                await page.mouse.up();
                return;
            }
            const cdp = await context.newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [center] });
            for (const dy of [8, 16, 24, 32, 38]) {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x, y: center.y - dy }] });
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
        }
        await openEditor();
        const tab = id => editor.locator(`[data-family="${id}"]`);
        const pick = id => lang === 'en' ? tab(id).click() : editor.locator('.family-picker').selectOption(id);
        const row = mode => editor.locator(`[data-mode="${mode}"]`);
        for (const { family } of SIMULATION_MODES.values()) {
            if (await tab(family).getAttribute('aria-pressed') !== 'true') await pick(family);
        }
        assert.equal(await editor.locator('[data-family]').count(), 16);
        await pick('gravitationalSort');
        if (lang === 'en') await row('gravitationalSort:pinwheel').locator('.family-grip').dragTo(tab('islands'));
        else await row('gravitationalSort:pinwheel').locator('select').selectOption('islands');
        await row('gravitationalSort:pinwheel').locator('.family-order button').first().click();
        await row('gravitationalSort:pinwheel').locator('.family-order button').first().click();
        assert.equal(await tab('islands').getAttribute('aria-pressed'), 'true');
        assert.deepEqual(await editor.locator('.family-mode').evaluateAll(rows => rows.map(row => row.dataset.mode)),
            ['gravitationalSort:pinwheel', 'islands:classic', 'islands:oil']);
        await row('islands:oil').locator('input').uncheck();
        await editor.locator('.family-detail > input').fill('Mixed flow');
        await editor.locator('.family-detail > input').press('Tab');
        await pick('gravitationalSort');
        await row('gravitationalSort:center_x').locator('input').uncheck();
        await row('gravitationalSort:reverse_up').locator('input').check();
        await row('gravitationalSort:reverse_right').locator('input').check();
        await pick('ink');
        await row('ink:a').locator('input').check();
        await pick('spiral');
        await row('spiral:radial').locator('input').check();
        await pick('cymatics');
        await row('cymatics:2').locator('input').uncheck();
        await row('cymatics:5').locator('input').check();
        await pick('islands');
        await page.screenshot({ path: '/tmp/fyi-simulation-family-' + lang + '.png' });
        const downloaded = page.waitForEvent('download');
        await editor.locator('[data-export]').click();
        const json = await readFile(await (await downloaded).path(), 'utf8');
        assert.equal(JSON.parse(json).families.find(entry => entry.id === 'islands').name, 'Mixed flow');
        await editor.locator('button[type=submit]').click();
        assert.deepEqual((await state()).board, board);
        const visibleFamilyIcons = () => page.locator('#controlsContainer [data-family-preview]:visible').evaluateAll(buttons =>
            buttons.map(button => ({
                id: button.id,
                visible: [...button.querySelectorAll('svg')].filter(svg => {
                    const style = getComputedStyle(svg);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                }).length
            })));
        const icons = await visibleFamilyIcons();
        assert(icons.some(button => button.id === 'btnGravitationalSort'));
        assert(icons.some(button => button.id === 'btnMagnetModes'));
        assert(icons.every(button => button.visible === 1), JSON.stringify(icons));

        const islands = page.locator('#btnIslands');
        assert.match(await islands.getAttribute('aria-label'), /^Mixed flow/);
        assert.equal(await islands.locator('.simulation-family-icon').getAttribute('data-mode'), 'gravitationalSort:pinwheel');
        await islands.click();
        assert.equal((await state()).active, 'gravitationalSort:pinwheel');
        assert.equal((await state()).control, 'islands');
        await islands.press('Alt+ArrowUp');
        const gravitySettings = page.locator('#gravitationalSortSettingsModal');
        const cycleValues = (dialog, selector) => dialog.locator(selector).evaluateAll(inputs => inputs
            .filter(input => input.getClientRects().length > 0)
            .map(input => input.value));
        await gravitySettings.waitFor({ state: 'visible', timeout: 3000 });
        assert.deepEqual(await cycleValues(gravitySettings, '#gravityCycleOptions input:checked'), ['pinwheel']);
        await page.locator('#btnGsSettingsCancel').click();
        const menu = page.locator('.simulation-family-menu');
        assert.equal(await menu.isVisible(), false);
        await islands.press('Alt+ArrowDown');
        await menu.waitFor();
        assert.equal(await menu.locator('div button').count(), 1);
        await menu.locator('div button').first().click();
        assert.equal((await state()).active, 'islands:oil');
        await islands.click();
        assert.equal((await state()).active, 'gravitationalSort:pinwheel');
        await page.evaluate(() => familyTest.play());
        await islands.click();
        assert.equal((await state()).active, 'islands:classic');
        assert.equal((await state()).playing, true);
        await page.evaluate(() => familyTest.pause());
        await islands.click();
        assert.equal((await state()).active, undefined);
        assert((await page.evaluate(() => familyTest.parseRecipe())) > 0);

        const gravity = page.locator('#btnGravitationalSort');
        await gravity.click();
        await gravity.press('Alt+ArrowUp');
        await gravitySettings.waitFor();
        assert.deepEqual(await cycleValues(gravitySettings, '#gravityCycleOptions input:checked'),
            ['up', 'right', 'reverse_up', 'reverse_right']);
        assert.equal(await gravitySettings.locator('#gravityDirection-pinwheel').isVisible(), false);
        await gravitySettings.locator('input[value="right"]').uncheck();
        await page.locator('#btnGsSettingsSave').click();
        await gravitySettings.waitFor({ state: 'hidden' });
        await gravity.click();
        assert.equal((await state()).active, 'gravitationalSort:reverse_up');
        await gravity.press('Alt+ArrowUp');
        await gravitySettings.waitFor();
        assert.deepEqual(await cycleValues(gravitySettings, '#gravityCycleOptions input:checked'), ['up', 'reverse_up', 'reverse_right']);
        await page.locator('#btnGsSettingsCancel').click();

        const magnet = page.locator('#btnMagnetModes');
        await magnet.click();
        await swipeUp(magnet);
        const magnetSettings = page.locator('#magnetSettingsModal');
        await magnetSettings.waitFor();
        assert.equal(await menu.isVisible(), false);
        assert.equal(await magnetSettings.locator('#magnetMethodContainer button').count(), 6);
        await page.locator('#btnMagnetModalClose').click();

        const circular = page.locator('#btnInk');
        await circular.click();
        await swipeUp(circular);
        const circularSettings = page.locator('#vorticesCycleDialog');
        await circularSettings.waitFor();
        assert.equal(await menu.isVisible(), false);
        assert(await circularSettings.locator('input[value="a"]').isChecked());
        assert.equal(await circularSettings.locator('input[value="tornado"]').isChecked(), false);
        await circularSettings.locator('[data-cancel]').click();

        const drawer = page.locator('#btnEvolutionDrawerInternal');
        await drawer.click();
        const geometric = page.locator('#btnSpiral');
        await geometric.click();
        await geometric.press('Alt+ArrowUp');
        const geometricSettings = page.locator('#spiralSettingsModal');
        await geometricSettings.waitFor();
        assert(await geometricSettings.locator('#geometricFlowCycleOptions input[value="radial"]').isChecked());
        await page.locator('#btnSpiralSettingsCancel').click();

        const resonance = page.locator('#btnCymatics');
        await resonance.click();
        await resonance.press('Alt+ArrowUp');
        const resonanceSettings = page.locator('#cymaticsSettingsDialog');
        await resonanceSettings.waitFor();
        assert(await resonanceSettings.locator('[data-resonance-cycle="clouds"]').isChecked());
        assert.equal(await resonanceSettings.locator('[data-resonance-cycle="grid"]').isChecked(), false);
        await resonanceSettings.locator('[data-cancel]').click();
        await drawer.click();

        await page.locator('#btnSave').click();
        const settingsDownload = page.waitForEvent('download');
        await page.locator('#btnSaveSettings').click();
        const settingsText = await readFile(await (await settingsDownload).path(), 'utf8');
        const map = JSON.parse(settingsText.slice(settingsText.indexOf('\n') + 1)).settings.simulationFamilies;
        assert.equal(map.families.find(group => group.id === 'islands').modes[0].id, 'gravitationalSort:pinwheel');
        await page.reload();
        await boot();
        assert.match(await islands.getAttribute('aria-label'), /^Mixed flow/);
        await openEditor();
        await editor.locator('[data-reset]').click();
        await editor.locator('button[type=submit]').click();
        assert.equal(await islands.getAttribute('data-family-preview'), null);
        await page.locator('#btnSave').click();
        await page.locator('#projectFileInput').setInputFiles({ name: 'settings.txt', mimeType: 'text/plain', buffer: Buffer.from(settingsText) });
        await islands.locator('.simulation-family-icon[data-mode="gravitationalSort:pinwheel"]').waitFor();
        await openEditor();
        await editor.locator('[data-reset]').click();
        await editor.locator('input[type=file]').setInputFiles({ name: 'layout.json', mimeType: 'application/json', buffer: Buffer.from(json) });
        await pick('islands');
        await row('gravitationalSort:pinwheel').waitFor();
        await editor.locator('button[type=submit]').click();
        assert.match(await islands.getAttribute('aria-label'), /^Mixed flow/);
        if (lang === 'en') for (const mode of SIMULATION_MODES.keys()) {
            assert.equal(await page.evaluate(mode => familyTest.select(mode), mode), true, mode);
            assert.equal((await state()).active, mode);
            const icons = await visibleFamilyIcons();
            assert(icons.every(button => button.visible === 1), mode + ' ' + JSON.stringify(icons));
        }
        assert.deepEqual(errors, []);
        console.log('PASS', lang, viewport);
        await context.close();
    }
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
