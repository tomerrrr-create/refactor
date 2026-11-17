import assert from 'node:assert/strict';
import {GALLERY_DEMOS} from '../js/evolution-gallery.js';
export async function runGallery(page,{width=900,lang='he',artifacts='/tmp/chapter-one-check',ids=GALLERY_DEMOS.map(d=>d.id)}={}){
 const card=page.locator('.chapter-coach'),frame=page.frameLocator('.chapter-frame');
 const read=()=>page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());
 const step=async id=>{await page.waitForFunction(id=>document.querySelector('.chapter-one-tour')?.dataset.step===id,id);await page.waitForFunction(()=>{const h=document.querySelector('.chapter-coach h2');return h&&!h.textContent.includes('…');});await page.waitForTimeout(150);};
 const ready=()=>page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled);
 const advance=async()=>{await ready();await card.locator('[data-next]').click();};
 for(const demo of GALLERY_DEMOS){
  if(!ids.includes(demo.id)){await step(`gallery-${demo.id}-intro`);await card.locator('[data-skip]').click();continue;}
  await step(`gallery-${demo.id}-intro`);console.log('GALLERY',lang,width,demo.id);
  const old=await read();assert(!(old.playing));await page.waitForTimeout(120);assert.equal((await read()).gallerySerial,old.gallerySerial,'an introduction never replaces the board before consent');
  await advance();let serial;
  for(const task of demo.tasks){
   await step(`gallery-${demo.id}-${task}`);const state=await read();
   assert.equal(state.n,249);assert.equal(state.colors.length,264);assert.equal(state.galleryId,demo.id);
   if(serial===undefined){serial=state.gallerySerial;assert(serial>old.gallerySerial);assert(!state.playing);}
   assert.equal(state.gallerySerial,serial,'an action within a demo never loads a new board');
   assert(await card.locator('[data-gallery-icon] svg').count()>0,'the native engine icon is displayed');
   if(task==='random'){await frame.locator('#btnRandom').click();}
   if(task==='step'){
    if(demo.id==='life'){assert.deepEqual(state.lifeRules.survival,[0,1,2,3,4,5,6,7,8]);assert.deepEqual(state.lifeRules.birth,[3]);}
    for(let i=0;i<3;i++){await frame.locator('#btnStepForward').click();await page.waitForTimeout(120);assert(!(await read()).playing);}
   }
   if(task==='play'){
    const before=await read();await frame.locator('#btnPlayPauseLife').click();await ready();const after=await read();assert(after.playing);assert(after.generation>=2);
    // A demo must actually produce changes, not merely count empty frames.
    if(demo.id!=='cracks'&&demo.id!=='network')assert.notDeepEqual(after.tiles,before.tiles,'the prepared example is active');
    assert(await page.locator('.chapter-board-shade').isHidden());assert.equal(await frame.locator('.chapter-guide-muted').count(),0);
   }
   if(task==='draw'||task==='anchor'){
    if(task==='anchor'){assert.equal(state.selectedColorIndex,state.galleryAnchor);assert.equal(state.selectedColorIndex,0);assert(await card.locator('[data-gallery-anchor]').isVisible());}
    const box=await frame.locator('#boardCanvas').boundingBox();if(demo.id==='life')await page.mouse.click(box.x+box.width*.32,box.y+box.height*.33);else {await page.mouse.move(box.x+box.width*.22,box.y+box.height*.25);await page.mouse.down();await page.mouse.move(box.x+box.width*.68,box.y+box.height*.62,{steps:15});await page.mouse.up();}
   }
   if(task==='sort'){await frame.locator('#btnCycleSort').click();assert((await read()).playing);}
   if(task==='palette'){const before=await read();await frame.locator('#btnPalette').click();await ready();const after=await read();assert.notEqual(after.paletteIndex,before.paletteIndex);assert(after.playing);assert.equal(after.colors.length,264);}
   if(task==='contrast'){await frame.locator('#btnBrightnessEvo').click();}
   if(task==='pause'){await frame.locator('#btnPlayPauseLife').click();assert(!(await read()).playing);}
   await ready();
   assert(await card.locator('.chapter-copy').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'the instruction is fully visible');
   assert(await frame.locator('#boardCanvas').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=-1&&r.left>=-1&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;}),'the example fits its own viewport');
   if(task==='draw'||task==='anchor'||task==='contrast'||task==='sort')await page.screenshot({path:`${artifacts}/${lang}-${width}-gallery-${demo.id}-${task}.png`});
   await advance();
  }
 }
 assert.equal(await page.locator('.chapter-one-tour').count(),0);
}
