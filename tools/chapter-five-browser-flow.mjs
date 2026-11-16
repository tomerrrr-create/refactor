import assert from 'node:assert/strict';
import {CHAPTER_FIVE_ENGINES} from '../js/chapter-five-tour.js';
export async function runChapterFive(page,{width=1280,lang='he',artifacts='/tmp/chapter-one-check',explore=false}={}){
 const card=page.locator('.chapter-coach'),frame=page.frameLocator('.chapter-frame');
 const read=()=>page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());
 const step=async id=>{await page.waitForFunction(id=>document.querySelector('.chapter-one-tour')?.dataset.step===id,id);await page.waitForFunction(()=>{const h=document.querySelector('.chapter-coach h2');return h&&!h.textContent.includes('…');});await page.waitForTimeout(150);console.log('STEP',lang,width,id);};
 const ready=()=>page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
 const advance=async()=>{await ready();await card.locator('[data-next]').click();};
 const gesture=async(id,direction)=>{const r=await frame.locator('#'+id).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+(direction==='up'?-65:65),{steps:8});await page.mouse.up();await page.waitForTimeout(180);};
 const bright=async()=>{assert(await page.locator('.chapter-board-shade').isHidden());assert.equal(await frame.locator('.chapter-guide-muted').count(),0,'a running board has no tutorial dimming');};
 const snapshot=async id=>{await page.screenshot({path:`${artifacts}/${lang}-${width}-${id}.png`});assert(await card.evaluate(el=>{const copy=el.querySelector('.chapter-copy');return copy.scrollHeight<=copy.clientHeight+1;}),'instructions fit without scrolling');};
 await step('live-play');const initial=await read();assert.equal(initial.n,249);assert(initial.colors.length>=264);assert(!initial.playing,'chapter five never starts playback automatically');
 await frame.locator('#btnPlayPauseLife').click();await ready();await bright();await advance();
 for(const id of ['live-sort-one','live-sort-two']){
  await step(id);const before=await read();await frame.locator('#btnCycleSort').click();await ready();const after=await read();assert.notEqual(after.sortMethod,before.sortMethod);assert(after.playing);assert.equal(after.armedSimulation,'gravitationalSort');assert((await card.locator('[data-body]').textContent()).includes(after.sortName));await bright();await snapshot(id);await advance();
 }
 await step('live-brush');await gesture('btnColorPicker','up');await frame.locator('#colorPickerModal.modal-visible').waitFor();assert((await read()).playing,'opening the picker keeps evolution running');
 await frame.locator('#colorPickerSwatches button[data-color]').nth(120).click();await page.waitForTimeout(180);await frame.locator('#btnColorPickerCloseTop').click();await ready();assert((await read()).selectedColorIndex>=0);assert((await read()).playing);await advance();
 await step('live-draw');const box=await frame.locator('#boardCanvas').boundingBox();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.35);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.62,{steps:12});await page.mouse.up();await ready();
 assert(await page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.events(0).some(e=>e.type==='brush-applied'&&e.playing)),'the real brush applied targets during evolution');await snapshot('live-draw');await advance();
 await step('live-islands');await frame.locator('#btnIslands').click();await ready();assert((await read()).playing);assert.equal((await read()).islandsMode,'classic');await advance();
 await step('live-gravity');await frame.locator('#btnGravitationalSort').click();await ready();assert((await read()).playing);await advance();
 await step('live-variation');const old=(await read()).gravityMode;await frame.locator('#btnGravitationalSort').click();await ready();assert.notEqual((await read()).gravityMode,old);assert((await read()).playing);await advance();
 await step('live-wind');await frame.locator('#btnWind').click();await ready();assert.equal((await read()).windEffect,'ripple');await advance();
 await step('live-wave');assert((await read()).windMode,'moving focus to the coach must not turn Waves off');assert(await card.locator('[data-next]').isDisabled(),'enabling Waves is not the same as creating one');
 const waveBoard=await frame.locator('#boardCanvas').boundingBox();await page.mouse.click(waveBoard.x+waveBoard.width*.45,waveBoard.y+waveBoard.height*.45);await ready();assert((await read()).playing);await bright();await snapshot('live-wave');await advance();
 await step('live-brush-return');assert((await read()).windMode);await gesture('btnWind','down');await ready();assert(!(await read()).windMode);assert((await read()).playing);assert(!(await frame.locator('#btnColorPicker').isDisabled()));await advance();
 await step('live-pause');await frame.locator('#btnPlayPauseLife').click();await ready();assert(!(await read()).playing);const paused=await read();assert.equal(paused.n,initial.n);assert.equal(paused.paletteIndex,initial.paletteIndex);assert.equal(paused.initializations,initial.initializations,'the whole live chapter keeps the same board rather than loading examples');
 assert(await card.locator('[data-open]').isVisible());await snapshot('live-pause');
 if(explore){
  await card.locator('[data-open]').click();await step('live-explore');await ready();
  const visible=await frame.locator('#controlsContainer [data-evolution-id]').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width&&getComputedStyle(n).display!=='none').map(n=>n.dataset.evolutionId));
  assert(visible.length>3&&visible.every(id=>CHAPTER_FIVE_ENGINES.includes(id)),'only phase-one engines appear in optional exploration');
  assert(visible.includes('network'),'the lesson enables Network only in its isolated practice preferences');
  await frame.locator('#btnGameOfLife').click();assert.equal((await read()).armedSimulation,'gameOfLife');await frame.locator('#btnPlayPauseLife').click();await page.waitForFunction(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().playing);await bright();await snapshot('live-explore');
 }
 await advance();assert.equal(await page.locator('.chapter-one-tour').count(),0);
}
