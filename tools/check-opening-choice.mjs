import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../dist/', import.meta.url);
let app = await readFile(new URL('js/app.js', root), 'utf8');
app = app.replace('      initializeApp();', `window.openingTest = {
    state: () => ({
        size: n, pixels: boardState.map(cell => [cell.k, cell.v, cell.isGold]),
        history: history.length, recipe: artRecipeLog.length, simulation: isSimModeActive,
        playing: isLifePlaying, selected: selectedColorIndex, lastColor: palette().length - 1,
        brushColor: selectedColor, firstColor: palette()[0],
        brushSize, separator: separatorPx, settings: {...simulationInitSettings}
    }),
    initSnapshot: () => JSON.parse(artRecipeLog.find(line => line.includes(' INIT_STATE -> ')).split(' INIT_STATE -> ')[1])
}; initializeApp().then(() => openingTest.ready = true);`);
if (!process.env.REAL_SPLASH) {
    for (const ms of [5000, 1500, 2000]) {
        app = app.replace('await new Promise(r => setTimeout(r, ' + ms + '));', '');
    }
}

const server = createServer(async (req, res) => {
    try {
        const file = new URL(req.url, root).pathname.slice(1) || 'index.html';
        const type = file.endsWith('.js') ? 'text/javascript'
            : file.endsWith('.css') ? 'text/css'
            : file.endsWith('.html') ? 'text/html' : 'application/octet-stream';
        res.setHeader('Content-Type', type);
        res.end(file === 'js/app.js' ? app : await readFile(new URL(file, root)));
    } catch {
        res.writeHead(404);
        res.end();
    }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({
    headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']
});

try {
    for (const mobile of [false, true]) {
        const context = await browser.newContext({
            viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
            isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block',
            reducedMotion: mobile ? 'reduce' : 'no-preference'
        });
        await context.addInitScript(lang => {
            if (sessionStorage.getItem('testLanguageSet')) return;
            localStorage.setItem('userLanguage', lang);
            sessionStorage.setItem('testLanguageSet', 'true');
        }, mobile ? 'he' : 'en');
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const choice = page.locator('#openingChoiceDialog');
        const eclipse = page.locator('#openingEclipse');
        const continueButton = page.locator('#openingContinue');
        const veil = page.locator('#openingResetVeil');
        const gate = page.locator('#openingChoiceGate');
        const control = page.locator('#btnToggleSimMode');
        const tap = locator => mobile ? locator.tap() : locator.click();
        const coords = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
        const tapAt = async locator => {
            const { x, y, width, height } = await locator.boundingBox();
            await coords(x + width / 2, y + height / 2);
        };
        const state = () => page.evaluate(() => openingTest.state());
        const boot = async (reload = false) => {
            if (reload) await page.reload();
            else await page.goto(base);
            await page.waitForFunction(() => window.openingTest?.ready);
            assert.equal(await choice.isVisible(), false, 'the menu waits for a tap');
        };
        await boot();
        assert(await gate.isVisible());
        assert(await page.locator('#openingChoiceToggle').isChecked());
        const initial = await state();
        await tapAt(page.locator('#boardCanvas'));
        await choice.waitFor({ state: 'visible' });
        assert.deepEqual(await state(), initial, 'the opening tap does not draw or log');
        assert.equal(await choice.getAttribute('dir'), mobile ? 'rtl' : 'ltr');
        const labels = mobile ? ['יצירה', 'אבולוציה'] : ['Creation', 'Evolution'];
        assert.deepEqual(await choice.locator('button[data-opening-choice]').allInnerTexts(), labels);
        assert(await eclipse.isVisible() && await eclipse.isDisabled(), 'reset is visible and requires a board choice');
        assert(await continueButton.isVisible() && await continueButton.isDisabled());
        assert.deepEqual(await choice.locator('[data-opening-choice]').evaluateAll(buttons =>
            buttons.map(button => button.getAttribute('aria-pressed'))), ['false', 'false']);
        for (const action of [continueButton, eclipse]) {
            assert.equal((await action.textContent()).trim(), '');
            assert(await action.getAttribute('aria-label'));
            assert.equal(await action.getAttribute('title'), null);
            assert(await action.locator('svg').isVisible());
        }
        assert.equal(await choice.locator('.opening-choice-mark svg').innerHTML(), await control.locator('svg').innerHTML());
        assert.equal(await choice.locator('.opening-choice-mark').getAttribute('aria-hidden'), 'true');
        assert.equal(await choice.locator('[data-opening-choice=evolve] svg').innerHTML(),
            await page.locator('#btnContourColorLuminance svg').innerHTML());
        assert(await choice.locator('[data-opening-choice=create] .glyph-special-reset').isVisible());
        await page.screenshot({ path: '/tmp/fyi-start-choice-' + (mobile ? 'mobile' : 'desktop') + '.png', animations: 'disabled' });
        const dialogHeight = await choice.evaluate(el => el.offsetHeight);
        await tap(choice.locator('[data-opening-choice=create]'));
        assert(await choice.isVisible(), 'selection keeps the modal open');
        assert.equal(await choice.evaluate(el => el.offsetHeight), dialogHeight);
        assert(await eclipse.isEnabled(), 'reset can be used immediately after the first selection');
        assert(await continueButton.isEnabled());
        assert.equal(await choice.locator('[data-opening-choice=create]').getAttribute('aria-pressed'), 'true');
        await tap(continueButton);
        await choice.waitFor({ state: 'hidden' });
        assert.deepEqual(await state(), initial, 'Create keeps the displayed board and its history');
        assert.equal(await gate.isVisible(), false);
        await tapAt(page.locator('#boardCanvas'));
        assert.notDeepEqual((await state()).pixels, initial.pixels, 'the next tap can draw normally');

        const resetThroughEclipse = async (mode, expectedSize) => {
            await page.evaluate(() => {
                localStorage.setItem('colorGridSimulationDrawerColors', '["gold","gold","gold"]');
                localStorage.setItem('colorGridInterfaceZoom', '70');
                localStorage.setItem('colorGridProfileDraftsV1', '{"version":1}');
                localStorage.setItem('foreign-storage', 'keep');
            });
            assert(await eclipse.isEnabled());
            const navigation = page.waitForEvent('framenavigated', frame => frame === page.mainFrame());
            await tap(eclipse);
            if (!mobile) {
                await veil.waitFor({ state: 'visible' });
                assert.equal(await veil.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)');
                assert.equal(await veil.locator('svg').count(), 0);
                assert.equal(await veil.evaluate(el => getComputedStyle(el).animationName), 'opening-reset-darken');
            }
            await navigation;
            await page.waitForFunction(() => window.openingTest?.ready);
            assert.equal(await gate.isVisible(), false, 'a reset skips the menu');
            assert.equal(await choice.isVisible(), false);
            assert.equal(await page.locator('#splashScreen').count(), 0);
            assert.equal(await page.locator('#appContainer').evaluate(el => el.inert), false);
            assert.equal((await state()).simulation, mode === 'evolve');
            assert.equal((await state()).size, expectedSize);
            assert(await page.evaluate(() =>
                localStorage.getItem('colorGridInterfaceZoom') !== '70' &&
                localStorage.getItem('colorGridSimulationDrawerColors') !== '["gold","gold","gold"]' &&
                localStorage.getItem('colorGridProfileDraftsV1') !== '{"version":1}' &&
                localStorage.getItem('userLanguage') === null &&
                localStorage.getItem('foreign-storage') === 'keep' &&
                sessionStorage.getItem('colorGridEclipseResume') === null));
        };

        await boot(true);
        await tap(gate);
        assert(await eclipse.isVisible() && await eclipse.isDisabled());
        await tap(choice.locator('[data-opening-choice=create]'));
        await resetThroughEclipse('create', initial.size);

        await boot(true);
        await tap(gate);
        await tap(choice.locator('[data-opening-choice=create]'));
        await tap(choice.locator('[data-opening-choice=evolve]'));
        assert(await choice.isVisible());
        assert.equal(await choice.locator('[data-opening-choice=create]').getAttribute('aria-pressed'), 'false');
        assert.equal(await choice.locator('[data-opening-choice=evolve]').getAttribute('aria-pressed'), 'true');
        assert(!(await state()).simulation, 'Evolution waits for Continue or the eclipse');
        await page.screenshot({ path: '/tmp/fyi-start-selected-' + (mobile ? 'mobile' : 'desktop') + '.png', animations: 'disabled' });
        assert.equal(await choice.locator('[data-opening-choice=evolve]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(215, 179, 110)');
        await resetThroughEclipse('evolve', 249);
        const resetEvolved = await state();
        assert.equal(resetEvolved.selected, 0);
        assert.equal(resetEvolved.brushColor, resetEvolved.firstColor);
        assert.equal(resetEvolved.brushSize, resetEvolved.settings.brushSize);
        assert.equal(resetEvolved.separator, 0);
        assert(resetEvolved.pixels.every(([color, value, gold]) =>
            color >= 0 && color <= resetEvolved.lastColor && color === value && !gold));
        assert(new Set(resetEvolved.pixels.map(([color]) => color)).size > 1);
        const snapshot = await page.evaluate(() => openingTest.initSnapshot());
        assert.equal(snapshot.n, resetEvolved.size);
        const recordedColors = snapshot.board.split(',').flatMap(run => {
            const [count, color] = run.split('x').map(Number);
            return Array(count).fill(color);
        });
        assert.deepEqual(recordedColors, resetEvolved.pixels.map(([color]) => color));

        await boot(true);
        await tapAt(control);
        await choice.waitFor({ state: 'visible' });
        assert(!(await state()).simulation, 'the opening tap does not activate the toolbar control');
        await tap(choice.locator('[data-opening-choice=evolve]'));
        await tap(continueButton);
        await page.waitForFunction(() => {
            const state = openingTest.state();
            return state.simulation && state.size === state.settings.boardSize;
        });
        const evolved = await state();
        assert.equal(evolved.size, 249);
        assert.equal(evolved.brushSize, evolved.settings.brushSize);
        assert.equal(evolved.selected, evolved.lastColor);
        assert.equal(evolved.separator, 0);
        assert(evolved.pixels.every(([color, value]) => color === 0 && value === 0));
        assert.equal(evolved.playing, false);
        assert.equal(await gate.isVisible(), false);

        await boot(true);
        await coords(8, 8);
        await choice.waitFor({ state: 'visible' });
        await page.keyboard.press('Escape');
        await choice.waitFor({ state: 'hidden' });
        const { x, y, width, height } = await control.boundingBox();
        const start = { x: x + width / 2, y: y + height / 2 };
        if (mobile) {
            const session = await context.newCDPSession(page);
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, y: start.y - 45 }] });
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await session.detach();
        } else {
            await page.mouse.move(start.x, start.y);
            await page.mouse.down();
            await page.mouse.move(start.x, start.y - 45, { steps: 4 });
            await page.mouse.up();
        }
        const tech = page.locator('#technicianDialog');
        await tech.waitFor({ state: 'visible' });
        const features = page.locator('#btnConfigureFeatures');
        if (await features.getAttribute('aria-expanded') === 'false') await features.press('Enter');
        await tap(page.locator('#openingChoiceToggle'));
        assert.equal(await page.locator('#openingChoiceToggle').isChecked(), false);
        await boot(true);
        assert.equal(await gate.isVisible(), false, 'turning the flag off skips the choice after reload');
        assert.equal(await page.locator('#openingChoiceToggle').isChecked(), false);
        await tap(control);
        await page.waitForFunction(() => openingTest.state().simulation);
        assert.equal(await choice.isVisible(), false);
        assert.notEqual((await state()).size, 249, 'ordinary mode switch still retains the board');
        const boardControl = await control.boundingBox();
        const holdAt = { x: boardControl.x + boardControl.width / 2, y: boardControl.y + boardControl.height / 2 };
        if (mobile) {
            const session = await context.newCDPSession(page);
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [holdAt] });
            await page.waitForTimeout(720);
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await session.detach();
        } else {
            await page.mouse.move(holdAt.x, holdAt.y);
            await page.mouse.down();
            await page.waitForTimeout(720);
            await page.mouse.up();
        }
        await page.waitForFunction(() => openingTest.state().size === 249);
        const relativeBrush = ({ selected, lastColor, brushColor, firstColor, ...board }) =>
            ({ ...board, brushIsLast: selected === lastColor });
        assert.deepEqual(relativeBrush(await state()), relativeBrush(evolved),
            'Evolve and a real hold produce the same board and logger state even if startup chooses different palettes');

        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ mobile, passed: true }));
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
