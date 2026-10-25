import test from 'node:test';
import assert from 'node:assert/strict';
import {BRUSH_SIZES, BRUSH_SHAPES, getBrushTiles, getBrushOffsets} from '../js/brush-footprint.js';
import {defaultWorkspaceSettings, validateWorkspaceSettings, serializeWorkspaceSettings, deserializeWorkspaceSettings} from '../js/workspace-settings.js';
import {normalizeStartup} from '../js/startup-settings.js';
import {validateSimInit, loadSimInit, persistSimInit, SIM_INIT_STORAGE_KEY} from '../js/sim-init-settings.js';
import {validateProfileSnapshot} from '../js/profile-state.js';

test('nine supported sizes include XL and no accidental intermediate sizes', () => {
    assert.deepEqual(BRUSH_SIZES,[1,3,5,7,9,11,13,15,23]);
    for (const size of [0,2,17,19,22,'21',NaN]) {
        assert.throws(() => getBrushOffsets(size),RangeError);
        assert(!validateSimInit({boardSize:249,brushSize:size}));
    }
});
test('default circle exactly preserves old footprints, order and edge clipping', () => {
    for (const n of [1,5,21,249]) for (const size of BRUSH_SIZES) for (const center of [0,Math.floor(n*n/2),n*n-1]) {
        const old=[];const r=Math.floor(size/2),cx=center%n,cy=Math.floor(center/n);
        for(let y=-r;y<=r;y++) for(let x=-r;x<=r;x++) if(Math.sqrt(x*x+y*y)<=r && cx+x>=0 && cx+x<n && cy+y>=0 && cy+y<n) old.push((cy+y)*n+cx+x);
        assert.deepEqual(getBrushTiles(center,n,size),old);
    }
});
test('shape areas and XL footprints are correct before clipping', () => {
    for (const size of BRUSH_SIZES) {
        const r=(size-1)/2;
        assert.equal(getBrushOffsets(size,'square').length,size*size);
        assert.equal(getBrushOffsets(size,'diamond').length,1+2*r*(r+1));
    }
    assert.equal(getBrushOffsets(23,'circle').length,377);
    for (const shape of BRUSH_SHAPES) assert.deepEqual(getBrushOffsets(1,shape),[[0,0]]);
    assert.throws(() => getBrushOffsets(3,'triangle'));
});
test('all shapes clip safely on small boards and remain reflection symmetric', () => {
    for (const shape of BRUSH_SHAPES) for (const size of BRUSH_SIZES) {
        const offsets=getBrushOffsets(size,shape),set=new Set(offsets.map(String));
        for (const [x,y] of offsets) { assert(set.has(String([-x,y])));assert(set.has(String([x,-y]))); }
        for(const n of [1,5,21]) for(const center of [0,Math.floor(n*n/2),n*n-1]) {
            const tiles=getBrushTiles(center,n,size,shape);
            assert.equal(new Set(tiles).size,tiles.length);
            assert(tiles.every(i=>i>=0&&i<n*n));
        }
    }
    assert.equal(getBrushTiles(12,5,23,'square').length,25);
    assert.deepEqual(getBrushTiles(-1,5,23,'circle'),[]);
});
test('new brush choices round trip through settings, profiles and Startup without changing old defaults', () => {
    const legacy=defaultWorkspaceSettings();
    assert.deepEqual(validateWorkspaceSettings(legacy),legacy);
    for (const size of BRUSH_SIZES) for (const shape of BRUSH_SHAPES) {
        const settings=defaultWorkspaceSettings();
        settings.brush={...settings.brush,size,...(shape==='circle'?{}:{shape})};
        settings.startup.brushSize=size;settings.simulationInit.brushSize=size;
        assert.deepEqual(deserializeWorkspaceSettings(serializeWorkspaceSettings(settings)),settings);
        assert.deepEqual(validateProfileSnapshot({settings}).settings.brush,settings.brush);
        assert.equal(normalizeStartup(settings.startup).brushSize,size);
        assert(validateSimInit(settings.simulationInit));
    }
    for(const size of [17,19]) assert.throws(()=>validateWorkspaceSettings({...legacy,brush:{...legacy.brush,size}}));
    assert.throws(()=>validateWorkspaceSettings({...legacy,brush:{...legacy.brush,shape:'triangle'}}));
});

test('legacy XL settings migrate to 23 without losing other preferences', () => {
    const legacy=defaultWorkspaceSettings();
    legacy.brush.size=21;legacy.brush.shape='diamond';
    legacy.startup.brushSize=21;legacy.simulationInit.brushSize=21;
    const migrated=validateWorkspaceSettings(legacy);
    assert.equal(migrated.brush.size,23);
    assert.equal(migrated.brush.shape,'diamond');
    assert.equal(migrated.startup.brushSize,23);
    assert.equal(migrated.simulationInit.brushSize,23);
    assert.equal(legacy.brush.size,21,'input remains untouched');
    assert.equal(normalizeStartup(legacy.startup).brushSize,23);
    const data=new Map([[SIM_INIT_STORAGE_KEY,JSON.stringify(legacy.simulationInit)]]);
    const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
    assert.equal(loadSimInit(storage).brushSize,23);
    assert(persistSimInit(legacy.simulationInit,storage));
    assert.equal(JSON.parse(data.get(SIM_INIT_STORAGE_KEY)).brushSize,23);
    assert.equal(validateProfileSnapshot({settings:legacy}).settings.brush.size,23);
});
