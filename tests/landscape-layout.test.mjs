import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateLandscapeLayout,LANDSCAPE_CREATION_CONTROLS,LANDSCAPE_SIMULATION_CONTROLS} from '../js/landscape-layout.js';

for(const [width,height] of [[568,320],[640,360],[844,390],[932,430],[1024,768],[1366,1024]]){
 for(const ids of [LANDSCAPE_CREATION_CONTROLS,LANDSCAPE_SIMULATION_CONTROLS]){
  test(`landscape ${width}x${height} fits ${ids.length} reachable controls and maximizes the remaining square`,()=>{
   const w=width-16,h=height-16,layout=calculateLandscapeLayout(w,h,ids.length);
   assert.equal(layout.button,44);assert(layout.rows*44+(layout.rows-1)*layout.gap<=h);
   assert(layout.columns*layout.rows>=ids.length);
   assert(layout.boardSize>0);assert.equal(layout.boardSize,Math.min(h,w-layout.railWidth-8));
   if(layout.columns>1)assert(Math.ceil(ids.length/(layout.columns-1))*48-4>h,'a narrower rail would clip buttons');
  });
 }
}
test('landscape lists reuse every existing control once and keep all evolutions available',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const ids of [LANDSCAPE_CREATION_CONTROLS,LANDSCAPE_SIMULATION_CONTROLS]){
  assert.equal(new Set(ids).size,ids.length);for(const id of ids)assert(html.includes(`id="${id}"`));
 }
 for(const id of ['btnGameOfLife','btnSandpile','btnErosion','btnDla','btnIslands','btnTuring','btnSpiral','btnMagnetModes','btnGravitationalSort','btnContour','btnBrightnessEvo','btnNudgeBrighter','btnNudgeDarker','btnShowBreatheMenu','btnPlayPauseLife','btnStepForward'])assert(LANDSCAPE_SIMULATION_CONTROLS.includes(id));
});
