import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { File } from 'node:buffer';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness(failDownload = false) {
    const original = ['INIT_STATE -> {"pal":0}', 'STEP -> erosion', 'GEN -> 12'];
    const downloads = [];
    const h = vm.createContext({ File, navigator: {}, artRecipeLog: [...original], historyRecipeCursor: 3,
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
