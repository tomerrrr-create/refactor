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
        await page.screenshot({ path: '/tmp/fyi-simulation-family-' + lang + '.png' });
        const downloaded = page.waitForEvent('download');
        await editor.locator('[data-export]').click();
        const json = await readFile(await (await downloaded).path(), 'utf8');
        assert.equal(JSON.parse(json).families.find(entry => entry.id === 'islands').name, 'Mixed flow');
        await editor.locator('button[type=submit]').click();
        assert.deepEqual((await state()).board, board);
        const islands = page.locator('#btnIslands');
        assert.match(await islands.getAttribute('aria-label'), /^Mixed flow/);
        assert.equal(await islands.locator('.simulation-family-icon').getAttribute('data-mode'), 'gravitationalSort:pinwheel');
        await islands.click();
        assert.equal((await state()).active, 'gravitationalSort:pinwheel');
        assert.equal((await state()).control, 'islands');
        await islands.press('Alt+ArrowUp');
        const menu = page.locator('.simulation-family-menu');
        await menu.waitFor();
        await menu.locator('div button').first().click();
        await page.locator('#gravitationalSortSettingsModal').waitFor({ state: 'visible', timeout: 3000 });
        await page.locator('#btnGsSettingsCancel').first().click();
        await page.evaluate(() => familyTest.play());
        await islands.click();
        assert.equal((await state()).active, 'islands:classic');
        assert.equal((await state()).playing, true);
        await page.evaluate(() => familyTest.pause());
        await islands.click();
        assert.equal((await state()).active, undefined);
        assert((await page.evaluate(() => familyTest.parseRecipe())) > 0);
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
        }
        assert.deepEqual(errors, []);
        console.log('PASS', lang, viewport);
        await context.close();
    }
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
