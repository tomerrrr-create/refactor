import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { File } from 'node:buffer';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function harness(failDownload = false) {
    const original = ['INIT_STATE -> {"pal":0}', 'STEP -> erosion', 'GEN -> 12'];
    const downloads = [];
    const h = vm.createContext({ File, windBatch: null, armedSimulation: null, isLifePlaying: false, currentGenerationCount: 0, navigator: {}, artRecipeLog: [...original], historyRecipeCursor: 3,
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


test('export names the first INIT_STATE palette even when startup settings precede it, without changing the recipe', async () => {
    const { h } = harness();
    h.C.PALETTES.push({ name: 'Later Palette' });
    const lines = [
        '[21:28:44.971] Game of Life Mode Changed -> {}',
        '[21:28:44.971] Chi Flow Mode Changed -> {}',
        '[21:28:44.982] INIT_STATE -> {"pal":0}',
        '[21:30:00.000] INIT_STATE -> {"pal":1}'
    ];
    h.artRecipeLog = [...lines];
    for (const prefix of ['', 'backup_']) {
        const file = h.createArtRecipeFile(prefix);
        assert.equal(file.name, prefix + 'Intuition_Path_Test_Palette_4.txt');
        assert.equal(await file.text(), lines.join('\n'));
        assert.deepEqual(Array.from(h.artRecipeLog), lines);
    }
});

test('exporting an in-flight Wind batch closes only the export copy at the current elapsed time',async()=>{
 const {h,original}=harness();h.windBatch={id:'live-wind',time:100};h.performance={now:()=>650};
 const exported=await h.createArtRecipeFile().text();const line=exported.split('\n').at(-1);
 assert(line.includes(' WIND_END -> '));assert.deepEqual(JSON.parse(line.split(' -> ')[1]),{windVersion:1,batch:'live-wind',elapsed:550,reason:'stop'});
 assert.deepEqual(Array.from(h.artRecipeLog),original);assert.equal(h.windBatch.id,'live-wind');
});
