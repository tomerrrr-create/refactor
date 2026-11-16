import assert from 'node:assert/strict';
export async function runChapterFour(page,{width=1280,lang='he',artifacts='/tmp/chapter-one-check'}={}){
 const card=page.locator('.chapter-coach'),frame=page.frameLocator('.chapter-frame');
 const read=()=>page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());
 const step=async id=>{await page.waitForFunction(id=>document.querySelector('.chapter-one-tour')?.dataset.step===id,id);await page.waitForFunction(()=>document.querySelector('.chapter-coach h2').textContent&&!/…/.test(document.querySelector('.chapter-coach h2').textContent));await page.waitForTimeout(160);};
 const ready=()=>page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
 const advance=async()=>{await ready();await card.locator('[data-next]').click();};
 const snapshot=async name=>{
  await page.screenshot({path:`${artifacts}/${lang}-${width}-${name}.png`});
  assert(await card.evaluate(el=>el.querySelector('.chapter-copy').scrollHeight<=el.querySelector('.chapter-copy').clientHeight+1),'the instruction fits without scrolling');
  assert(await frame.locator('#boardCanvas').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}),'the full board fits');
 };
 await step('evolution-door');await page.waitForFunction(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().simMode);
 const initial=await read();assert.equal(initial.n,249);assert(initial.colors.length>=264);assert(!initial.playing);
 await frame.locator('#btnToggleSimMode').click();await page.waitForFunction(()=>!document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().simMode);
 assert(await card.locator('[data-next]').isDisabled(),'one panel switch is not a round trip');
 assert.deepEqual((await read()).tiles,initial.tiles);await page.waitForTimeout(120);
 await frame.locator('#btnToggleSimMode').click();await ready();assert.deepEqual((await read()).tiles,initial.tiles,'switching tools preserves the drawing');await advance();
 await step('evolution-shuffle');await frame.locator('#btnRandom').click();await ready();const shuffled=await read();assert.notDeepEqual(shuffled.tiles,initial.tiles);assert.equal(shuffled.paletteIndex,initial.paletteIndex);await advance();
 await step('evolution-engine');assert(!(await read()).playing);await frame.locator('#btnGravitationalSort').click();await ready();const engine=await read();assert.equal(engine.armedSimulation,'gravitationalSort');assert(engine.playEnabled&&engine.stepEnabled);assert(!engine.playing);assert.deepEqual(engine.tiles,shuffled.tiles,'selecting an engine does not run it');await snapshot('engine-ready');await advance();
 await step('evolution-step');
 for(let i=0;i<3;i++){
  const before=await read();if(i===1){await frame.locator('#btnStepForward').focus();await frame.locator('#btnStepForward').press('Enter');}else await frame.locator('#btnStepForward').click();
  await page.waitForTimeout(160);const after=await read();assert(!after.playing);assert.notDeepEqual(after.tiles,before.tiles,'a step really advances the engine');
  await page.waitForTimeout(120);assert.deepEqual((await read()).tiles,after.tiles,'single steps stay paused');
  if(i<2)assert(await card.locator('[data-next]').isDisabled(),'three native steps are required');
 }
 const stepped=await read();await advance();await step('evolution-play');assert.deepEqual((await read()).tiles,stepped.tiles,'entering Play does not reset the drawing');
 await frame.locator('#btnPlayPauseLife').click();await ready();const playing=await read();assert(playing.playing&&playing.generation>=3);
 assert.equal(await frame.locator('.chapter-guide-muted').count(),0,'playback clears tutorial dimming');assert(await page.locator('.chapter-board-shade').isHidden(),'the board stays bright during playback');
 await snapshot('evolution-playing');await page.waitForFunction(generation=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().generation>generation,playing.generation);await advance();
 await step('evolution-pause');assert((await read()).playing,'the transition to Pause does not stop playback');assert((await read()).generation>=playing.generation,'the run continues on the same board');assert(await page.locator('.chapter-board-shade').isHidden());
 await frame.locator('#btnPlayPauseLife').click();await ready();const paused=await read();assert(!paused.playing);assert.equal(paused.armedSimulation,'gravitationalSort');await page.waitForTimeout(200);assert.deepEqual((await read()).tiles,paused.tiles,'pause freezes the current drawing');assert.equal((await read()).generation,paused.generation);await snapshot('evolution-paused');await advance();await page.waitForFunction(()=>document.querySelector('.chapter-one-tour')?.dataset.step==='live-play');
}
