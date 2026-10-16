import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { File } from 'node:buffer';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness(failDownload = false) {
    const original = ['INIT_STATE -> {"pal":0}', 'STEP -> erosion', 'GEN -> 12'];
    const downloads = [];
    const h = vm.createContext({ File, armedSimulation: null, isLifePlaying: false, currentGenerationCount: 0, navigator: {}, artRecipeLog: [...original], historyRecipeCursor: 3,
        C: { PALETTES: [{ name: 'Test Palette' }] }, console,
        triggerDownload(file) { if (failDownload) throw Error('Download failed'); downloads.push(file); },
        logCurrentStateAsInit() { h.artRecipeLog.push('INIT_STATE -> current board'); },
        modals: { closeModalSlowly() { h.closed = true; } }
    });
    vm.runInContext(source.slice(source.indexOf('async function resetArtRecipeLog()'), source.indexOf('async function exportArtRecipeLog()')), h);
    return { h, downloads, original };
}
test('reset downloads the entire old recipe before capturing a fresh board snapshot', async () => {
    const { h, downloads, original } = harness();
    await h.resetArtRecipeLog();
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].name, 'backup_Intuition_Path_Test_Palette_3.txt');
    assert.equal(await downloads[0].text(), original.join('\n'));
    assert.deepEqual(Array.from(h.artRecipeLog), ['INIT_STATE -> current board']);
    assert.equal(h.historyRecipeCursor, 0);
    assert.equal(h.closed, true);
});
test('a failed download attempt leaves the old recipe intact', async () => {
    const { h, original } = harness(true);
    await assert.rejects(() => h.resetArtRecipeLog(), /Download failed/);
    assert.deepEqual(Array.from(h.artRecipeLog), original);
    assert.equal(h.historyRecipeCursor, 3);
    assert.equal(h.closed, undefined);
});
test('manual export retains its existing filename and readable macro content', async () => {
    const { h, original } = harness();
    const file = h.createArtRecipeFile();
    assert.equal(file.name, 'Intuition_Path_Test_Palette_3.txt');
    assert.equal(await file.text(), original.join('\n'));
});

test('canceling the native share preserves the recipe; successful share resets it', async () => {
    const { h, downloads, original } = harness();
    h.navigator.canShare = () => true;
    h.navigator.share = async () => { const error = Error('Canceled'); error.name = 'AbortError'; throw error; };
    await h.resetArtRecipeLog();
    assert.deepEqual(Array.from(h.artRecipeLog), original);
    assert.equal(h.closed, undefined);
    h.navigator.share = async data => { assert(data.files[0].name.startsWith('backup_')); };
    await h.resetArtRecipeLog();
    assert.equal(h.closed, true);
    assert.equal(downloads.length, 0);
});


test('running Islands export adds a generation boundary without stopping or mutating live log', async () => {
    const { h, original } = harness();
    h.armedSimulation = 'islands'; h.isLifePlaying = true; h.currentGenerationCount = 42;
    const text = await h.createArtRecipeFile().text();
    assert.match(text, /\[GEN:42\] PAUSE -> ---$/);
    assert.deepEqual(Array.from(h.artRecipeLog), original);
    assert.equal(h.isLifePlaying, true);
    h.armedSimulation = 'gravitationalSort';
    assert.equal(await h.createArtRecipeFile().text(), original.join('\n'));
});

test('resetting a running Islands recipe captures a new start and continues only after successful backup',async()=>{
    const {h,original}=harness();
    h.armedSimulation='islands';h.isLifePlaying=true;h.currentGenerationCount=42;
    h.pauseLife=()=>{h.isLifePlaying=false;};
    h.togglePlayPauseLife=()=>{h.isLifePlaying=true;h.artRecipeLog.push('PLAY -> fresh cursor');};
    h.logIslandsSessionStart=()=>h.artRecipeLog.push('ISLANDS_INIT -> current board and cursor');
    h.navigator.canShare=()=>true;
    h.navigator.share=async()=>{const e=Error('cancel');e.name='AbortError';throw e;};
    await h.resetArtRecipeLog();assert.deepEqual(Array.from(h.artRecipeLog),original);assert.equal(h.isLifePlaying,true);
    h.navigator.share=async()=>{};await h.resetArtRecipeLog();
    assert.deepEqual(Array.from(h.artRecipeLog),['INIT_STATE -> current board','ISLANDS_INIT -> current board and cursor','PLAY -> fresh cursor']);assert.equal(h.isLifePlaying,true);
});
