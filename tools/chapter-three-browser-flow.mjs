import assert from 'node:assert/strict';
import {CHAPTER_THREE_LESSONS} from '../js/chapter-three-tour.js';
export async function runChapterThree(page,{artifacts='/tmp/chapter-one-check',lang='he',width=1280}={}){
 const frame=page.frameLocator('.chapter-frame'),card=page.locator('.chapter-coach');
 const read=()=>page.evaluate(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read());
 const wait=async()=>page.waitForTimeout(180);
 const gesture=async(id,direction)=>{
  const box=await frame.locator('#'+id).boundingBox();assert(box,id+' is visible');
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();
  if(direction==='hold'||direction==='long')await page.waitForTimeout(direction==='long'?1350:720);
  else await page.mouse.move(x+(direction==='right'?65:direction==='left'?-65:0),y+(direction==='down'?65:direction==='up'?-65:0),{steps:8});
  await page.mouse.up();await wait();
 };
 const canvas=frame.locator('#boardCanvas');
 const clickTile=async index=>{const state=await read(),box=await canvas.boundingBox();await page.mouse.click(box.x+(index%state.n+.5)*box.width/state.n,box.y+(Math.floor(index/state.n)+.5)*box.height/state.n);await wait();};
 const stroke=async()=>{
  const state=await read(),box=await canvas.boundingBox();
  // Find different colors so the native action makes an observable change.
  let from=state.n*3+3,to=state.tiles.findIndex((color,index)=>index>state.n*Math.max(8,Math.floor(state.n/4))&&index<state.tiles.length-state.n&&color!==(state.selectedColorIndex>=0&&state.brushMode!=='copy'?state.selectedColorIndex:state.tiles[from]));
  if(to<0){await frame.locator('#btnColorPicker').click();await wait();return stroke();}
  if(from===to)from+=1;
  const point=index=>({x:box.x+(index%state.n+.5)*box.width/state.n,y:box.y+(Math.floor(index/state.n)+.5)*box.height/state.n});
  const a=point(from),b=point(to);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();await wait();
 };
 const openPicker=async()=>{await gesture('btnColorPicker','up');await frame.locator('#colorPickerModal.modal-visible').waitFor();};
 for(const lesson of CHAPTER_THREE_LESSONS){
  await page.waitForFunction(id=>document.querySelector('.chapter-one-tour')?.dataset.step===id,lesson.id);await wait();
  console.log('STEP',lang,width,lesson.id);
  if(lesson.kind==='draw')await stroke();
  if(lesson.kind==='picker'){
   await openPicker();
   if(lesson.select){await frame.locator('#colorPickerSwatches button[data-color]').nth(5).click();await wait();}
   await frame.locator('#btnColorPickerCloseTop').click();
  }
  if(lesson.kind==='cycle'){await frame.locator('#btnColorPicker').click();await frame.locator('#btnColorPicker').click();}
  if(lesson.kind==='clear')await gesture('btnColorPicker','down');
  if(lesson.kind==='size'){await gesture('btnColorPicker',lesson.direction);assert(await card.locator('[data-next]').isDisabled(),'changing size alone does not count as drawing');await stroke();}
  if(lesson.kind==='hold-draw'){await gesture('btnColorPicker',lesson.rainbow?'long':'hold');assert(await card.locator('[data-next]').isDisabled(),'holding alone does not count as drawing');await stroke();}
  if(lesson.kind==='paint'){
   await frame.locator('#btnColorPicker').click();await wait();
   for(let i=0;i<3;i++){const state=await read();await clickTile(state.tiles.findIndex(color=>color!==state.selectedColorIndex));}
  }
  if(lesson.kind==='copy'){
   for(let count=0;(await read()).brushMode!=='copy'&&count<3;count++)await frame.locator('#btnBrushMode').click();
   await stroke();
  }
  if(lesson.kind==='symmetry'){
   for(let count=0;(await read()).symmetryMode!==lesson.mode&&count<5;count++)await frame.locator('#btnSymmetry').click();
   await frame.locator('#btnColorPicker').click();await wait();await stroke();
  }
  if(lesson.kind==='sym-clear')await gesture('btnSymmetry','up');
  if(lesson.kind==='sym-hold')await gesture('btnSymmetry','hold');
  if(lesson.kind==='separators'){for(let count=0;(await read()).separatorPx!==0&&count<12;count++)await frame.locator('#btnGap').click();}
  if(lesson.kind==='grow'){await frame.locator('#btnResizeUp').click();await page.waitForFunction(()=>document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read().n===27);}
  if(lesson.kind==='resize-dialog'){await gesture('btnResizeUp','up');await frame.locator('#resizeModal.modal-visible').waitFor();await frame.locator('#btnResizeModalClose').click();}
  if(lesson.kind==='resize-direction'){const before=(await read()).n;await gesture('btnResizeUp','down');assert.equal((await read()).n,before,'direction changes leave the board intact');}
  if(lesson.kind==='rich'){
   await gesture('btnPalette','down');await frame.locator('#paletteModal.modal-visible').waitFor();await frame.locator('[data-palette-group="continuous"]').click();
   const state=await read();await frame.locator(`.palette-choice[data-palette-index="${state.richPaletteIndex}"]`).click();await wait();await frame.locator('#palette-apply').click();
  }
  if(lesson.kind==='prepare'){
   const before=await read();await gesture('btnToggleSimMode','hold');
   await page.waitForFunction(()=>{const s=document.querySelector('.chapter-frame').contentWindow.chapterOnePractice.read();return s.n===249&&s.simMode&&s.separatorPx===0;});
   const after=await read();assert.equal(after.paletteIndex,before.paletteIndex);assert.equal(after.symmetryMode,before.symmetryMode);assert(after.tiles.every(color=>color===0),'the fresh board is filled with the opening color');assert(!after.playing&&!after.armedSimulation);assert.equal(after.brushSize,7);
  }
  if(lesson.kind==='free'){
   await openPicker();await frame.locator('[data-brush-size="9"]').click();await wait();await frame.locator('#btnColorPickerCloseTop').click();await stroke();
   const drawn=await read();await frame.locator('#btnUndo').click();await wait();assert.notDeepEqual((await read()).tiles,drawn.tiles);await frame.locator('#btnRedo').click();await wait();assert.deepEqual((await read()).tiles,drawn.tiles,'free drawing keeps native Undo/Redo');
  }
  try{await page.waitForFunction(()=>!document.querySelector('.chapter-coach [data-next]').disabled,{},{timeout:8000});}catch(error){console.log('FAILED STATE',await page.evaluate(()=>{const b=document.querySelector('.chapter-frame').contentWindow.chapterOnePractice,s=b.read();delete s.tiles;delete s.colors;return {state:s,events:b.events(0).slice(-8)};}));await page.screenshot({path:artifacts+'/chapter-three-failed.png'});throw error;}
  if(['load-color','copy-color','sym-kaleidoscope','prepare-large','free-draw'].includes(lesson.id))await page.screenshot({path:`${artifacts}/${lang}-${width}-${lesson.id}-done.png`});
  const fits=await card.evaluate(el=>{const box=el.getBoundingClientRect(),footer=el.querySelector('footer').getBoundingClientRect(),copy=el.querySelector('.chapter-copy');return {footer:footer.bottom<=box.bottom,copy:copy.scrollHeight<=copy.clientHeight+1};});
  const boardFits=await canvas.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;});assert(boardFits,'the full canvas remains visible');
  assert(fits.footer,'navigation fits the coach');assert(fits.copy,'chapter three instruction fits without scrolling');
  await card.locator('[data-next]').click();
 }
 assert.equal(await page.locator('.chapter-one-tour').count(),0);
}
