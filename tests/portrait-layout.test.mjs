import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculatePortraitLayout,PORTRAIT_CREATION_CONTROLS,PORTRAIT_SIMULATION_CONTROLS} from '../js/portrait-layout.js';

for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,1366]]){
 for(const ids of [PORTRAIT_CREATION_CONTROLS,PORTRAIT_SIMULATION_CONTROLS]){
  test(`portrait ${width}x${height} fits ${ids.length} reachable controls and maximizes the remaining square`,()=>{
   const w=width-16,h=height-16,layout=calculatePortraitLayout(w,h,ids.length);
   assert.equal(layout.button,44);assert(layout.rows*44+(layout.rows-1)*layout.gap<=h);
   assert(layout.columns*layout.rows>=ids.length);
   assert(layout.boardSize>0);assert.equal(layout.boardSize,Math.min(h,w-layout.railWidth-8));
   if(layout.columns>1)assert(Math.ceil(ids.length/(layout.columns-1))*48-4>h,'a narrower rail would clip buttons');
  });
 }
}
test('portrait lists reuse every existing control once and keep all evolutions available',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const ids of [PORTRAIT_CREATION_CONTROLS,PORTRAIT_SIMULATION_CONTROLS]){
  assert.equal(new Set(ids).size,ids.length);for(const id of ids)assert(html.includes(`id="${id}"`));
 }
 for(const id of ['btnGameOfLife','btnSandpile','btnErosion','btnDla','btnIslands','btnTuring','btnSpiral','btnMagnetModes','btnGravitationalSort','btnContour','btnBrightnessEvo','btnNudgeBrighter','btnNudgeDarker','btnShowBreatheMenu','btnPlayPauseLife','btnStepForward'])assert(PORTRAIT_SIMULATION_CONTROLS.includes(id));
});
