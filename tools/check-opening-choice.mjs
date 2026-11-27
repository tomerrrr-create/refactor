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
        sort: currentSortMethod, paletteIndex: activePaletteIndex,
        brushSize, separator: separatorPx, settings: {...simulationInitSettings}
    }),
    openTechnicians: () => modals.openTechnicianMenu(),
    initSnapshot: () => JSON.parse(artRecipeLog.find(line => line.includes(' INIT_STATE -> ')).split(' INIT_STATE -> ')[1]),
    customiseEvolution: () => {
        switchToPalette(C.PALETTE_GROUPS.find(group => group.id === 'extended').indexes[0]);
        applySortMethod('reversed');
        simulationInitSettings = { ...simulationInitSettings, boardSize: 35, brushSize: 3, brushColor: 'last' };
    }
}; initializeApp().then(() => openingTest.ready = true);`);
if (!process.env.REAL_SPLASH) {
    for (const ms of [5000, 1500, 2000]) {
        app = app.replace('await new Promise(r => setTimeout(r, ' + ms + '));', '');
    }
}

const testUpdates = process.env.OPENING_UPDATE_ONLY === '1';
let deployment = 1;
let breakInstall = false;
const server = createServer(async (req, res) => {
    try {
        const file = new URL(req.url, root).pathname.slice(1) || 'index.html';
        const type = file.endsWith('.js') ? 'text/javascript'
            : file.endsWith('.css') ? 'text/css'
            : file.endsWith('.html') ? 'text/html' : 'application/octet-stream';
        if (breakInstall && file === 'styles.css') {
            res.writeHead(503).end();
            return;
        }
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 'no-store');
        const content = file === 'js/app.js' ? app : await readFile(new URL(file, root));
        if (!testUpdates) res.end(content);
        else if (file === 'service-worker.js') res.end(String(content).replace(/const VERSION = '[^']+';/, `const VERSION = 'test-${deployment}';`));
        else if (file === 'index.html') res.end(String(content).replace('<html ', `<html data-build="${deployment}" `));
        else res.end(content);
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
        deployment = 1;
        const context = await browser.newContext({
            viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
            isMobile: mobile, hasTouch: mobile, serviceWorkers: testUpdates ? 'allow' : 'block',
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
        if (testUpdates) {
            const choose = async mode => {
                await tap(gate);
                await tap(choice.locator(`[data-opening-choice="${mode}"]`));
                assert.deepEqual(await choice.locator('.opening-choice-actions button').allTextContents().then(labels => labels.map(label => label.trim())), ['Origin', 'Mine']);
            };
            const waitForReload = async action => {
                const navigating = page.waitForEvent('framenavigated', frame => frame === page.mainFrame());
                await action();
                await navigating;
                await page.waitForFunction(() => window.openingTest?.ready);
            };
            await page.waitForFunction(() => !!navigator.serviceWorker.controller);
            await page.evaluate(() => {
                localStorage.setItem('colorGridInterfaceZoom', '91');
                sessionStorage.setItem('colorGridOpeningUpdateResume', 'evolve');
            });
            await boot(true);
            assert(await gate.isHidden(), 'an update started in the previous release resumes directly');
            assert.equal((await state()).simulation, true);
            assert(await page.evaluate(() => sessionStorage.getItem('colorGridOpeningUpdateResume') === null));

            const discoverUpdate = () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
            const banner = page.locator('.pwa-update');
            deployment = 2;
            await discoverUpdate();
            await banner.waitFor({ state: 'visible' });
            assert.equal(await page.locator('html').getAttribute('data-build'), '1', 'background updates wait for acceptance');
            await waitForReload(() => tap(banner.locator('[data-update]')));
            assert.equal(await page.locator('html').getAttribute('data-build'), '2');
            assert(await gate.isVisible(), 'the standard banner reload still follows normal startup');
            await choose('create');
            await tap(continueButton);
            await page.evaluate(() => openingTest.openTechnicians());
            const technicianUpdate = page.locator('#btnTechnicianUpdate');
            const technicianStatus = page.locator('#technicianUpdateStatus');
            const artwork = await state();
            await tap(technicianUpdate);
            await page.waitForFunction(() => !document.getElementById('btnTechnicianUpdate').disabled);
            assert.equal(await technicianStatus.textContent(), mobile ? 'הגרסה שלך עדכנית.' : 'You’re up to date.');
            assert.deepEqual(await state(), artwork, 'checking from Technicians leaves the artwork in place when current');

            await context.setOffline(true);
            await tap(technicianUpdate);
            await page.waitForFunction(() => !document.getElementById('btnTechnicianUpdate').disabled);
            assert.equal(await technicianStatus.textContent(), mobile ? 'לא ניתן לבדוק או להתקין את העדכון.' : 'Couldn’t check or install the update.');
            assert.deepEqual(await state(), artwork);
            await context.setOffline(false);

            deployment = 3;
            breakInstall = true;
            await tap(technicianUpdate);
            await page.waitForFunction(() => !document.getElementById('btnTechnicianUpdate').disabled);
            assert.equal(await page.locator('html').getAttribute('data-build'), '2', 'a partial release does not reload');
            assert.deepEqual(await state(), artwork);
            breakInstall = false;

            deployment = 4;
            await waitForReload(() => tap(technicianUpdate));
            assert.equal(await page.locator('html').getAttribute('data-build'), '4');
            assert(await gate.isVisible(), 'Technicians update returns to ordinary startup');
            assert.equal(await page.evaluate(() => localStorage.getItem('colorGridInterfaceZoom')), '91');
            assert.deepEqual(errors, []);
            console.log(JSON.stringify({ mobile, updates: true }));
            await context.close();
            continue;
        }
        const initial = await state();
        await tapAt(page.locator('#boardCanvas'));
        await choice.waitFor({ state: 'visible' });
        assert.deepEqual(await state(), initial, 'the opening tap does not draw or log');
        assert.equal(await choice.getAttribute('dir'), mobile ? 'rtl' : 'ltr');
        const labels = mobile ? ['יצירה', 'אבולוציה'] : ['Creation', 'Evolution'];
        assert.deepEqual(await choice.locator('button[data-opening-choice]').allInnerTexts(), labels);
        const transparent = 'rgba(0, 0, 0, 0)';
        const actions = choice.locator('.opening-choice-actions');
        assert(await eclipse.isHidden() && await eclipse.isDisabled(), 'Origin is hidden until a board is selected');
        assert(await continueButton.isHidden() && await continueButton.isDisabled(), 'Mine is hidden until a board is selected');
        assert.equal(await choice.getByRole('button', { name: 'Mine', exact: true }).count(), 0);
        assert.equal(await choice.getByRole('button', { name: 'Origin', exact: true }).count(), 0);
        assert.deepEqual(await choice.locator('[data-opening-choice]').evaluateAll(buttons =>
            buttons.map(button => button.getAttribute('aria-pressed'))), ['false', 'false']);
        const cardStyles = () => choice.locator('[data-opening-choice]').evaluateAll(buttons => buttons.map(button => {
            const style = getComputedStyle(button);
            return [style.backgroundColor, style.borderTopColor, style.color];
        }));
        const initialCards = [[transparent, transparent, 'rgb(203, 196, 181)'], [transparent, transparent, 'rgb(203, 196, 181)']];
        assert.deepEqual(await cardStyles(), initialCards);
        assert(await choice.evaluate(dialog => dialog === document.activeElement));
        assert.equal(await choice.locator('.glyph-special-reset').evaluate(dot =>
            getComputedStyle(dot).backgroundColor), initialCards[0][2]);
        const openingMark = choice.locator('.opening-choice-mark svg');
        assert.equal(await openingMark.innerHTML(), await control.locator('svg').innerHTML());
        assert.equal(await openingMark.evaluate(el => el.getBoundingClientRect().width), 44);
        assert.equal(await openingMark.evaluate(el => getComputedStyle(el).transform), 'none');
        assert.equal(await choice.locator('.opening-choice-mark').getAttribute('aria-hidden'), 'true');
        assert.equal(await choice.locator('[data-opening-choice=evolve] svg').innerHTML(),
            await page.locator('#iconGsUp').innerHTML());
        assert(await choice.locator('[data-opening-choice=create] .glyph-special-reset').isVisible());
        await page.screenshot({ path: '/tmp/fyi-start-choice-' + (mobile ? 'mobile' : 'desktop') + '.png', animations: 'disabled' });
        const dialogHeight = await choice.evaluate(el => el.offsetHeight);
        await tap(choice.locator('[data-opening-choice=create]'));
        assert(await choice.isVisible(), 'selection keeps the modal open');
        assert.equal(await choice.evaluate(el => el.offsetHeight), dialogHeight);
        assert(await eclipse.isVisible() && await eclipse.isEnabled());
        assert(await continueButton.isVisible() && await continueButton.isEnabled());
        assert(await choice.getByRole('button', { name: 'Mine', exact: true }).isVisible());
        assert(await choice.getByRole('button', { name: 'Origin', exact: true }).isVisible());
        assert.deepEqual(await actions.locator('button').allInnerTexts(), ['Origin', 'Mine']);
        const actionBounds = await actions.boundingBox();
        const buttons = await Promise.all([eclipse.boundingBox(), continueButton.boundingBox()]);
        const centers = buttons.map(({ x, width }) => x + width / 2);
        assert(buttons.every(({ width, height }) => width >= 44 && height >= 44));
        assert(Math.abs((centers[0] + centers[1]) / 2 - (actionBounds.x + actionBounds.width / 2)) < 1);
        assert(mobile ? centers[0] > centers[1] : centers[0] < centers[1], 'Origin and Mine follow reading direction');
        assert(Math.abs(centers[1] - centers[0]) < 100, 'Mine and Origin form a compact, centered pair');
        assert.equal(await continueButton.evaluate(el => getComputedStyle(el).color), 'rgb(245, 206, 128)');
        assert.equal(await eclipse.evaluate(el => getComputedStyle(el).color), 'rgb(201, 211, 223)');
        assert.deepEqual(await actions.evaluate(el => [el, ...el.children].map(item => {
            const style = getComputedStyle(item);
            return [style.borderTopWidth, style.backgroundImage, style.backgroundColor,
                style.textShadow, style.animationName, style.transitionDuration];
        })), Array.from({length: 3}, () => ['0px', 'none', transparent, 'none', 'none', '0s']));
        if (!mobile) {
            await continueButton.hover();
            assert.equal(await continueButton.evaluate(el => getComputedStyle(el).textDecorationLine), 'underline');
            const bounds = await eclipse.boundingBox();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            await page.mouse.down();
            assert.equal(await eclipse.evaluate(el => getComputedStyle(el).color), 'rgb(255, 245, 223)');
            await page.mouse.move(0, 0);
            await page.mouse.up();
            await choice.locator('[data-opening-choice=evolve]').focus();
            await page.keyboard.press('Tab');
            assert(await eclipse.evaluate(el => el.matches(':focus-visible')));
            await page.keyboard.press('Tab');
            assert(await continueButton.evaluate(el => el.matches(':focus-visible')));
            assert.equal(await continueButton.evaluate(el => getComputedStyle(el).textDecorationLine), 'underline');
        }
        assert.equal(await choice.locator('[data-opening-choice=create]').getAttribute('aria-pressed'), 'true');
        assert.deepEqual((await cardStyles())[1], initialCards[1], 'only the clicked card receives the gold fill');
        await tap(continueButton);
        await choice.waitFor({ state: 'hidden' });
        assert.deepEqual(await state(), initial, 'Create keeps the displayed board and its history');
        assert.equal(await gate.isVisible(), false);
        await tapAt(page.locator('#boardCanvas'));
        assert.notDeepEqual((await state()).pixels, initial.pixels, 'the next tap can draw normally');

        const resetThroughOrigin = async (mode, expectedSize) => {
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
        assert(await eclipse.isHidden() && await eclipse.isDisabled());
        await tap(choice.locator('[data-opening-choice=create]'));
        await resetThroughOrigin('create', initial.size);

        await boot(true);
        await tap(gate);
        await tap(choice.locator('[data-opening-choice=create]'));
        await tap(choice.locator('[data-opening-choice=evolve]'));
        assert(await choice.isVisible());
        assert.equal(await choice.locator('[data-opening-choice=create]').getAttribute('aria-pressed'), 'false');
        assert.equal(await choice.locator('[data-opening-choice=evolve]').getAttribute('aria-pressed'), 'true');
        assert(!(await state()).simulation, 'Evolution waits for Mine or Origin');
        await page.screenshot({ path: '/tmp/fyi-start-selected-' + (mobile ? 'mobile' : 'desktop') + '.png', animations: 'disabled' });
        assert.equal(await choice.locator('[data-opening-choice=evolve]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(215, 179, 110)');
        await resetThroughOrigin('evolve', 249);
        const checkEvolutionBoard = async () => {
            const evolved = await state();
            assert.equal(evolved.selected, 0);
            assert.equal(evolved.brushColor, evolved.firstColor);
            assert.equal(evolved.brushSize, evolved.settings.brushSize);
            assert.equal(evolved.separator, 0);
            assert(evolved.pixels.every(([color, value, gold]) =>
                color >= 0 && color <= evolved.lastColor && color === value && !gold));
            assert(new Set(evolved.pixels.map(([color]) => color)).size > 1);
            const snapshot = await page.evaluate(() => openingTest.initSnapshot());
            assert.equal(snapshot.n, evolved.size);
            assert.equal(snapshot.pal, evolved.paletteIndex);
            assert.equal(snapshot.sort, evolved.sort);
            const recordedColors = snapshot.board.split(',').flatMap(run => {
                const [count, color] = run.split('x').map(Number);
                return Array(count).fill(color);
            });
            assert.deepEqual(recordedColors, evolved.pixels.map(([color]) => color));
        };
        await checkEvolutionBoard();

        await boot(true);
        await page.evaluate(() => openingTest.customiseEvolution());
        const customized = await state();
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
        assert.equal(evolved.size, 35);
        assert.equal(evolved.brushSize, 3);
        assert.equal(evolved.paletteIndex, customized.paletteIndex);
        assert.equal(evolved.sort, 'reversed');
        await checkEvolutionBoard();
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
        const beforeSwitch = await state();
        await tap(control);
        await page.waitForFunction(() => openingTest.state().simulation);
        assert.equal(await choice.isVisible(), false);
        assert.equal((await state()).size, beforeSwitch.size, 'ordinary mode switch still retains the board');
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
        await page.waitForFunction(size => openingTest.state().size === size, beforeSwitch.settings.boardSize);
        const held = await state();
        assert(held.pixels.every(([color, value]) => color === 0 && value === 0),
            'a toolbar hold still prepares a dark board');
        assert.equal(held.selected, held.lastColor);
        assert.equal(held.brushSize, held.settings.brushSize);
        assert.equal(held.separator, 0);

        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ mobile, passed: true }));
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
