import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const toggle = source.slice(source.indexOf('function togglePlayPauseLife('), source.indexOf('function getRandomGridPosition('));
for (const simulation of ['gameOfLife', 'sandpile', 'contour']) {
    test(`${simulation}: macro can install generation-one commands before the first frame`, () => {
        const c = vm.createContext({ armedSimulation: simulation, isLifePlaying: false, isExecutingMacroCommand: true,
            currentSortMethod: 'luminance', currentGenerationCount: 0, dom: { iconPlay: { style: {} }, iconPause: { style: {} }, btnStepForward: {} },
            window: { logArtEvent() {} }, getCurrentState: () => ({}), contourRules: {},
            getGameOfLifeRecordingRules: () => ({}), getChiFlowRecordingRules: () => ({}) });
        let callback, generations = 0;
        c.gameLoop = () => generations++;
        c.requestAnimationFrame = fn => { callback = fn; return 1; };
        vm.runInContext(toggle, c);
        c.togglePlayPauseLife();
        if (simulation === 'contour') assert.equal(generations, 1); // Other evolutions retain their existing timing.
        else { assert.equal(generations, 0); callback(); assert.equal(generations, 1); }
        c.isLifePlaying = false; c.isExecutingMacroCommand = false; generations = 0;
        c.togglePlayPauseLife(); assert.equal(generations, 1); // Manual Play remains immediate.
    });
}
