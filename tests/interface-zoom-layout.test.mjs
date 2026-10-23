import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const layout = app.slice(app.indexOf('function updateLayout()'), app.indexOf('  function createRainbowIconSVG('));
function run(zoom, { legacy = false, fullscreen = false, width = 1280, height = 800, controlHeight = 224 } = {}) {
    const element = () => ({dataset: {}, style: {setProperty() {}, removeProperty() {}}, removeAttribute() {}});
    const body = element(), container = element(), shell = element();
    shell.parentElement = container; container.clientWidth = width;
    const controls = {offsetHeight: controlHeight, getBoundingClientRect: () => ({height: legacy ? controlHeight : controlHeight * zoom / 100})};
    const context = vm.createContext({interfaceZoom: zoom, isMacroFullscreen: fullscreen, canvas: null,
        document: {body}, dom: {appShell: shell, controlsContainer: controls},
        window: {innerWidth: width, innerHeight: height, getComputedStyle: target => target === container
            ? {paddingTop: String(48 * zoom / 100), paddingLeft: String(24 * zoom / 100), paddingRight: String(24 * zoom / 100)}
            : {marginTop: '44px'}}});
    vm.runInContext(layout, context);context.updateLayout();
    return shell.style.width;
}
for (const legacy of [false, true]) {
    test(`desktop board gets the freed control space with ${legacy ? 'legacy' : 'modern'} rectangles`, () => {
        assert.equal(run(100, {legacy}), '480px');
        assert.equal(run(85, {legacy}), '528px');
        assert.equal(run(80, {legacy}), '544px');
        assert.equal(run(70, {legacy}), '576px');
    });
}
test('interface zoom never changes the existing macro fullscreen size', () => {
    for (const zoom of [70, 80, 85, 100]) assert.equal(run(zoom, {fullscreen: true}), '520px');
});

test('mobile board widths keep the existing zoom behavior', () => {
    const mobile = {width: 390, height: 844, controlHeight: 200};
    assert.equal(run(100, mobile), ''); // Keep the original responsive width at 100%.
    assert.equal(run(85, mobile), '349.2px');
    assert.equal(run(80, mobile), '351.6px');
    assert.equal(run(70, mobile), '356.4px');
});
