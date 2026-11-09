import {t,language} from './i18n.js';
import {actionGroups,freshStartIndices,simulationOf,exportRange} from './macro-edit-model.js';
const text=(en,he)=>language==='he'?he:en;
const names={INIT_STATE:['Starting board','לוח התחלתי'],DRAW_STROKE:['Brush stroke','ציור במברשת'],PLAY:['Start simulation','הפעלת סימולציה'],
 PAUSE:['Pause simulation','עצירת סימולציה'],'STEP FORWARD':['One simulation step','צעד סימולציה אחד'],HISTORY_SETTINGS:['Restore settings','שחזור הגדרות'],
 WIND_WAVE:['Paint with Wind','ציור ברוח'],WIND_END:['Stop Wind','סיום רוח'],GO_DARK:['Darken board','הכהיית הלוח'],
 'Palette Change':['Change palette','החלפת פלטה'],'Sort by':['Change color order','שינוי סדר הצבעים'],GRID_RESIZE:['Resize board','שינוי גודל הלוח'],
 SEPARATOR_CHANGE:['Change separators','שינוי מפרידים'],SHUFFLE_COLORS:['Shuffle colors','ערבוב צבעים'],'Invert Colors':['Invert colors','היפוך צבעים'],
 CONTOUR_APPLY:['Draw contours','יצירת קווי מתאר'],ADAPT_COLORS:['Adapt colors','התאמת צבעים'],NUDGE:['Shift colors','הזזת צבעים'],
 BRUSH_CHECKPOINT:['Finish live brush stroke','סיום משיכת מברשת בזמן ניגון'],BRUSH_CONTINUE:['Continue simulation','המשך סימולציה'],
 SIMULATION_RULES:['Change simulation settings','שינוי הגדרות סימולציה'],EVOLUTION_TUNING:['Change evolution settings','שינוי הגדרות אבולוציה'],
 ISLANDS_INIT:['Prepare Islands','הכנת איילנדס'],NUDGE_SPEED:['Change Nudge speed','שינוי מהירות נאג׳']};
const simulations={gameOfLife:'Game of Life',sandpile:'Chi Flow',contour:'Cracks',cymatics:'Resonance',brightnessEvo:'Brightness Evolution',
 islands:'Islands',breathe:'Breathe',dla:'DLA',turing:'Turing',magnet:'Magnet',gravitationalSort:'Gravity',spiral:'Spiral',erosion:'Erosion',nudgeBrighter:'Nudge +',nudgeDarker:'Nudge −'};
const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms)%1000).padStart(3,'0')}`;
const label=a=>{const pair=names[a.eventName];const name=pair?pair[language==='he'?1:0]:a.eventName.endsWith('Mode Changed')?text('Select simulation mode','בחירת מצב סימולציה'):a.eventName==='--'?text('Shuffle colors','ערבוב צבעים'):text('Change settings','שינוי הגדרות');const sim=simulationOf(a);return name+(sim?` · ${simulations[sim]??sim}`:'');};

function describe(group){
 const a=group.actions[0];let value;try{value=JSON.parse(a.details);}catch{}
 if(a.eventName==='INIT_STATE'&&value)return `${text('Board','לוח')}: ${value.n} × ${value.n}\n${text('Palette number','מספר פלטה')}: ${value.pal+1}\n${text('Color order','סדר צבעים')}: ${value.sort}\n${text('Separators','מפרידים')}: ${value.sep??0}\n${text('Protected cells','תאים מוגנים')}: ${value.gold?.length??0}`;
 if(group.eventName==='DRAW_STROKE'){
  const packets=group.actions.filter(e=>e.eventName==='DRAW_STROKE').map(e=>JSON.parse(e.details));
  const changes=packets.flat();return `${text('Brush samples','דגימות מברשת')}: ${packets.length}\n${text('Cell updates','עדכוני תאים')}: ${changes.length}\n`+changes.slice(0,30).map(c=>`${text('Cell','תא')} ${c.i+1} → ${text('Color','צבע')} ${c.k+1}${c.isGold?' ★':''}`).join('\n')+(changes.length>30?'\n…':'');
 }
 const labels={version:text('Version','גרסה'),mode:text('Mode','מצב'),intervalMs:text('Interval (ms)','מרווח (מילישניות)'),
  nudgeTimingVersion:text('Timing version','גרסת תזמון'),tuning:text('Evolution settings','הגדרות אבולוציה'),cycleMode:text('Cycle','מצב סייקל'),
  direction:text('Direction','כיוון'),frequency:text('Frequency','תדר'),strength:text('Strength','עוצמה'),method:text('Method','שיטה'),
  growth:text('Growth','צמיחה'),sensitivity:text('Sensitivity','רגישות'),awakening:text('Awakening','התעוררות'),flow:text('Flow','זרימה'),reach:text('Reach','טווח')};
 if(simulationOf(a)){try{value=JSON.parse(a.details.split(' | Rules: ')[1]);}catch{} }
 if(value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).slice(0,30).map(([key,val])=>`${labels[key]??key.replace(/([A-Z])/g,' $1')}: ${typeof val==='object'?JSON.stringify(val):val}`).join('\n').slice(0,5000);
 return a.details.slice(0,4000);
}

export async function mountEditor(panel,{file:initialFile=null}={}) {
 const $=id=>panel.querySelector('#'+id);
 panel.innerHTML=`
 <label class="file-title" for="editorFile">${text('Choose a macro to edit','בחר מקרו לעריכה')}</label>
 <input id="editorFile" class="file-input" type="file" accept=".txt,text/plain">
 <p id="editorFileName" class="muted"></p>
 <p class="editor-note">${text('Choose a start in the action list. To set the end, play the original, pause, then select “End here”. Your original file stays unchanged.','בחר התחלה ברשימת הפעולות. לסימון סיום, נגן את המקור, עצור ולחץ „סיים כאן”. הקובץ המקורי נשאר ללא שינוי.')}</p>
 <p id="editorStatus" class="muted" role="status" aria-live="polite"></p>
 <p id="editorError" role="alert"></p>
 <canvas id="editorCanvas" width="520" height="520" aria-label="${text('Macro preview','תצוגת מקרו')}" hidden></canvas>
 <div class="editor-controls">
  <button id="editorPlay" disabled>${text('Play original','ניגון המקור')}</button>
  <button id="editorRestart" class="secondary" disabled>${text('Restart','מההתחלה')}</button>
  <button id="editorEnd" class="secondary" disabled>${text('End here','סיים כאן')}</button>
 </div>
 <p id="editorSourceHint" class="editor-note" hidden></p>
 <p id="editorPosition" class="editor-position" dir="ltr"></p>
 <div id="editorRange" class="editor-range" role="status"></div>
 <div id="editorPreparation" hidden>
  <p id="editorPreparationText" role="status" aria-live="polite"></p>
  <progress id="editorPreparationProgress" max="100" value="0" aria-label="${text('Preparing selected range','הכנת הטווח הנבחר')}"></progress>
  <button id="editorCancel" type="button" class="secondary">${text('Cancel preparation','ביטול ההכנה')}</button>
 </div>
 <div class="editor-controls">
  <button id="editorPreview" class="secondary" disabled>${text('Preview selection','תצוגה מקדימה')}</button>
  <button id="editorSave" disabled>${text('Save new macro','שמירת מקרו חדש')}</button>
  <button id="editorReset" class="secondary" disabled>${text('Clear marks','ניקוי סימונים')}</button>
 </div>
 <h2 style="font-size:15px;font-weight:400;color:var(--gold)">${text('Recorded actions','הפעולות שהוקלטו')}</h2>
 <p id="editorStartHint" class="editor-note"></p>
 <div class="editor-paging">
  <button id="editorPrev" class="secondary" disabled>${text('Previous','הקודם')}</button>
  <span id="editorPage" class="muted"></span>
  <button id="editorNext" class="secondary" disabled>${text('Next','הבא')}</button>
 </div>
 <ol id="editorActions" class="editor-list"></ol>`;
 let frame,engine,engineLoad,inFlight,raf,url;
 let source='',filename='macro.txt',actions=[],groups=[],safe=new Set(),page=0;
 let selectedStart=null,startCheckpoint=null,end=null;
 let startLabel=text('Original beginning','ההתחלה המקורית'),endLabel=text('Original end','הסוף המקורי');
 let busy=false,playing=false,mode='source',lastTime=0,version=0,job=0;
 const ctx=$('editorCanvas').getContext('2d',{alpha:false});
 const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const fail=error=>{$('editorError').textContent=error?.message??String(error);};
 const clearError=()=>{$('editorError').textContent='';};
 const current=()=>engine?.state();
 function update(){
  const state=current(),ready=Boolean(source)&&!busy;
  panel.dataset.editorPhase=busy?'preparing':!source?'empty':playing?'playing':state?.finished?'complete':'paused';
  panel.dataset.editorMode=mode;
  $('editorFile').disabled=busy;
  $('editorPlay').disabled=!ready||(mode==='source'&&Boolean(state?.finished));
  $('editorPlay').textContent=playing?text('Pause','עצירה'):text('Play original','ניגון המקור');
  $('editorSourceHint').hidden=mode!=='selection';$('editorSourceHint').textContent=text('You are viewing the selection. To change the end, select Play original.','מוצג הטווח שנבחר. לשינוי הסיום לחץ „ניגון המקור”.');
  $('editorRestart').disabled=!ready;
  $('editorEnd').disabled=!ready||playing||Boolean(inFlight)||mode!=='source'||(state?.lastIndex??-1)<0;
  for(const id of ['editorPreview','editorSave'])$(id).disabled=!ready||playing||Boolean(inFlight);
  $('editorReset').disabled=!ready||playing||Boolean(inFlight)||(selectedStart===null&&!end);
  $('editorRange').textContent=text('From ','מ־')+startLabel+text(' to ',' עד ')+endLabel;
  $('editorPreparation').hidden=!busy||mode!=='preparing';
  if(state){
   $('editorPosition').textContent=(mode==='selection'?text('Selection · ','הטווח · '):text('Original · ','המקור · '))+stamp(state.delta);
   for(const li of $('editorActions').children){
    li.toggleAttribute('data-active',mode==='source'&&state.lastIndex>=Number(li.dataset.from)&&state.lastIndex<=Number(li.dataset.to));
   }
  }
  for(const button of panel.querySelectorAll('[data-start]')){
   const choice=button.dataset.start==='original'?null:Number(button.dataset.start);
   button.disabled=busy||playing||Boolean(inFlight);
   button.setAttribute('aria-pressed',String(choice===selectedStart));
   button.closest('li').toggleAttribute('data-start-selected',choice===selectedStart);
  }
 }
 async function pause(){
  playing=false;engine?.pause();cancelAnimationFrame(raf);update();
  await inFlight?.catch(()=>{});
  update();
 }
 function draw(){const output=engine?.draw();if(output){ctx.drawImage(output,0,0,520,520);$('editorCanvas').hidden=false;}}
 function loadEngine(){
  if(engine)return Promise.resolve();
  if(!engineLoad)engineLoad=bootEngine().finally(()=>{engineLoad=null;});
  return engineLoad;
 }
 async function bootEngine(){
  $('editorStatus').textContent=text('Loading editor…','טוען את העורך…');
  frame?.remove();frame=document.createElement('iframe');frame.title=text('Isolated macro editor engine','מנוע עריכת מקרו מבודד');
  frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  const ready=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error(text('Could not load the editor.','טעינת העורך נכשלה.')));});
  frame.src='engine/index.html?computed=1&editor=1';panel.append(frame);await ready;
  const until=performance.now()+60000;
  while(performance.now()<until){
   const win=frame.contentWindow;if(win.macroVideoError)throw Error(win.macroVideoError);
   if(win.macroVideoEngine?.ready&&win.macroEditorEngine){engine=win.macroEditorEngine;return;}
   if(win.exportClock)await win.exportClock.tickAsync(100);
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  throw Error(text('The editor did not load. Reload Studio.','העורך לא נטען. טען מחדש את הסטודיו.'));
 }
 function renderList(){
  const list=$('editorActions');list.replaceChildren();
  const pages=Math.max(1,Math.ceil(groups.length/100));page=Math.min(page,pages-1);
  groups.slice(page*100,(page+1)*100).forEach((group,offset)=>{
   const li=document.createElement('li');li.dataset.from=group.from;li.dataset.to=group.to;
   const details=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent=`${page*100+offset+1}. ${label({...group.actions[0],eventName:group.eventName})}`;
   const when=document.createElement('small');when.dir='ltr';when.textContent=stamp(group.actions[0].delta)+(group.actions[0].isGenBased?` · ${text('Generation','דור')} ${group.actions[0].targetGen}`:'');
   details.append(summary,when);
   details.addEventListener('toggle',()=>{if(details.open&&!details.querySelector('pre')){
    const pre=document.createElement('pre');pre.textContent=describe(group);pre.dir=language==='he'?'rtl':'ltr';pre.style.direction=pre.dir;details.append(pre);
   }});
   li.append(details);
   const original=group.eventName==='INIT_STATE';
   if(original||safe.has(group.from)){
    const button=document.createElement('button');button.type='button';button.dataset.start=original?'original':group.from;
    button.textContent=original?text('Start at the beginning','מההתחלה המקורית'):text('Start here','התחל מכאן');
    button.addEventListener('click',()=>{
     const index=original?null:group.from;
     if(index!==null&&end&&index>end.index){fail(text('This start is after the marked end. Clear the marks or choose an earlier start.','ההתחלה הזאת אחרי הסיום שסימנת. נקה סימונים או בחר התחלה מוקדמת יותר.'));return;}
     selectedStart=index;startCheckpoint=null;startLabel=original?text('Original beginning','ההתחלה המקורית'):label(actions[index])+` (${page*100+offset+1})`;
     clearError();$('editorStatus').textContent=text('Start selected. Preview or save whenever you are ready.','ההתחלה נבחרה. אפשר להציג תצוגה מקדימה או לשמור.');update();
    });li.append(button);
   }
   list.append(li);
  });
  $('editorPage').textContent=`${page+1} / ${pages}`;$('editorPrev').disabled=page===0;$('editorNext').disabled=page===pages-1;update();
 }
 async function openFile(file){
  if(!file)return;const request=++version;job++;busy=true;await pause();source='';selectedStart=startCheckpoint=end=null;mode='source';
  startLabel=text('Original beginning','ההתחלה המקורית');endLabel=text('Original end','הסוף המקורי');clearError();update();
  try{
   if(file.size>32*1024*1024)throw Error(t('לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.'));
   const contents=await file.text();await loadEngine();if(request!==version)return;
   actions=engine.load(contents);source=contents;filename=file.name;groups=actionGroups(actions);safe=new Set(freshStartIndices(actions));page=0;
   $('editorFileName').textContent=filename;
   $('editorStartHint').textContent=safe.size?text('“Start here” is available beside fresh simulation starts. Choose one now; Studio prepares the board automatically when you preview or save.','„התחל מכאן” מופיע ליד תחילת ריצות חדשות. אפשר לבחור מיד; הסטודיו יכין את הלוח אוטומטית בתצוגה מקדימה או בשמירה.'):text('This file has no fresh simulation start. You can keep its original beginning and shorten the end.','בקובץ הזה אין תחילת ריצת סימולציה חדשה. אפשר להשאיר את ההתחלה המקורית ולקצר את הסיום.');
   $('editorStatus').textContent=text('Choose your start in the list below.','בחר התחלה ברשימה למטה.');renderList();draw();
  }catch(error){if(request!==version)return;engine?.stop();actions=[];groups=[];$('editorActions').replaceChildren();fail(error);}
  finally{if(request===version){busy=false;update();}}
 }
 async function tick(time){
  if(!playing)return;
  try{
   inFlight=engine.advance(Math.min(32,lastTime?time-lastTime:16));await inFlight;inFlight=null;lastTime=time;draw();playing=engine.state().running;update();
   if(playing)raf=requestAnimationFrame(tick);
   else $('editorStatus').textContent=mode==='selection'?text('Selection preview complete. To change the end, select Play original.','תצוגת הטווח הסתיימה. לשינוי הסיום לחץ „ניגון המקור”.'):text('Playback stopped. You can mark “End here”.','הניגון נעצר. אפשר לסמן „סיים כאן”.');
  }catch(error){inFlight=null;await pause();fail(error);}
 }
 function beginPlayback(){engine.play();playing=true;lastTime=0;update();raf=requestAnimationFrame(tick);}
 async function prepareStart(token){
  if(selectedStart===null||startCheckpoint)return;
  mode='preparing';$('editorPreparationText').textContent=text('Preparing the selected start…','מכין את נקודת ההתחלה שנבחרה…');$('editorPreparationProgress').value=0;update();
  engine.load(source);engine.hold(selectedStart);engine.play();
  while(token===job){
   inFlight=engine.advance(32);await inFlight;inFlight=null;
   if(token!==job)return;
   const state=engine.state();draw();
   $('editorPreparationProgress').value=Math.min(99,Math.max(0,(state.lastIndex+1)/Math.max(1,selectedStart)*100));
   $('editorPreparationText').textContent=text('Preparing the selected start… ','מכין את נקודת ההתחלה שנבחרה… ')+stamp(state.delta);
   if(state.boundary===selectedStart){startCheckpoint=engine.startPoint();$('editorPreparationProgress').value=100;mode='source';return;}
   if(!state.running)throw Error(text('This recording cannot start at this point. Choose another start.','לא ניתן להתחיל בנקודה הזאת בהקלטה. בחר התחלה אחרת.'));
   await nextFrame();
  }
 }
 async function selectionFile(token){await prepareStart(token);if(token!==job)return null;return new File([exportRange(actions,{start:startCheckpoint,end})],filename.replace(/\.txt$/i,'')+'_edited.txt',{type:'text/plain'});}
 async function runJob(kind){
  if(busy||playing||!source)return;const token=++job;busy=true;clearError();await pause();
  try{
   const file=await selectionFile(token);if(!file||token!==job)return;
   if(kind==='preview'){
    engine.load(await file.text());mode='selection';busy=false;beginPlayback();
    $('editorStatus').textContent=text('Previewing the selected range. To change the end, play the original.','מציג את הטווח שנבחר. לשינוי הסיום, נגן את המקור.');
   }else{
    if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();
    $('editorStatus').textContent=text('New macro downloaded. Original unchanged.','המקרו החדש הורד. המקור לא השתנה.');
   }
  }catch(error){if(token===job)fail(error);}
  finally{if(token===job){busy=false;if(mode==='preparing')mode='source';update();}}
 }
 $('editorFile').addEventListener('change',()=>openFile($('editorFile').files[0]));
 $('editorPlay').addEventListener('click',async()=>{
  clearError();if(playing){await pause();return;}
  if(mode!=='source'){engine.load(source);mode='source';draw();}
  beginPlayback();
 });
 $('editorRestart').addEventListener('click',async()=>{busy=true;await pause();try{engine.load(source);mode='source';draw();clearError();$('editorStatus').textContent=text('Original restarted. Your marks are unchanged.','המקור חזר להתחלה. הסימונים נשמרו.');}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorEnd').addEventListener('click',()=>{
  try{const point=engine.endPoint();if(selectedStart!==null&&point.index<selectedStart)throw Error(text('The end must follow your selected start.','הסיום צריך להיות אחרי ההתחלה שבחרת.'));
   end=point;endLabel=text('marked end at ','הסיום שסומן ב־')+stamp(point.delta);clearError();update();
  }catch(error){fail(error);}
 });
 $('editorReset').addEventListener('click',()=>{selectedStart=startCheckpoint=end=null;startLabel=text('Original beginning','ההתחלה המקורית');endLabel=text('Original end','הסוף המקורי');clearError();update();});
 $('editorPreview').addEventListener('click',()=>runJob('preview'));
 $('editorSave').addEventListener('click',()=>runJob('save'));
 async function cancelPreparation(){
  const token=++job;await pause();if(token!==job)return;
  engine.load(source);mode='source';busy=false;draw();$('editorStatus').textContent=text('Preparation canceled. Your marks and original file are unchanged.','ההכנה בוטלה. הסימונים והקובץ המקורי נשארו ללא שינוי.');update();
 }
 $('editorCancel').addEventListener('click',cancelPreparation);
 $('editorPrev').addEventListener('click',()=>{page--;renderList();});$('editorNext').addEventListener('click',()=>{page++;renderList();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!busy)pause();});
 window.addEventListener('beforeunload',event=>{if(busy||playing){event.preventDefault();event.returnValue='';}if(url)URL.revokeObjectURL(url);});
 if(initialFile)await openFile(initialFile);else{$('editorStatus').textContent=text('Choose a macro to begin.','בחר מקרו כדי להתחיל.');update();}
 return {pause:()=>busy&&mode==='preparing'?cancelPreparation():pause(),openFile};
}
