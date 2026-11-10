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
 panel.innerHTML=`<label class="file-title" for="editorFile">${text('Choose a macro to edit','בחר מקרו לעריכה')}</label>
 <input id="editorFile" class="file-input" type="file" accept=".txt,text/plain"><p id="editorFileName" class="muted"></p>
 <p class="editor-note">${text('Play, pause, then choose your start and end. The original stays unchanged.','נגן, עצור ובחר התחלה וסיום. המקור נשאר ללא שינוי.')}</p>
 <p id="editorStatus" class="muted" role="status" aria-live="polite"></p><p id="editorError" role="alert"></p>
 <canvas id="editorCanvas" width="520" height="520" aria-label="${text('Macro preview','תצוגת מקרו')}" hidden></canvas>
 <div class="editor-controls">
 <button id="editorPreviousRun" class="secondary" disabled>${text('Previous run start','לתחילת הריצה הקודמת')}</button>
 <button id="editorPlay" disabled>${text('Play original','ניגון המקור')}</button>
 <button id="editorNextRun" class="secondary" disabled>${text('Next run start','לתחילת הריצה הבאה')}</button>
 </div>
 <p id="editorPosition" class="editor-position" dir="ltr"></p>
 <div class="editor-controls"><button id="editorStart" class="secondary" disabled>${text('Start here','התחל מכאן')}</button><button id="editorEnd" class="secondary" disabled>${text('End here','סיים כאן')}</button></div>
 <p id="editorPlayerHint" class="editor-note" role="status"></p>
 <div id="editorRange" class="editor-range" role="status"></div>
 <div id="editorPreparation" hidden><p id="editorPreparationText" role="status" aria-live="polite"></p>
 <progress id="editorPreparationProgress" max="100" value="0" aria-label="${text('Preparing selected range','הכנת הטווח הנבחר')}"></progress>
 <button id="editorCancel" type="button" class="secondary">${text('Cancel','ביטול')}</button></div>
 <div class="editor-controls"><button id="editorPreview" class="secondary" disabled>${text('Preview selection','תצוגה מקדימה')}</button>
 <button id="editorSave" disabled>${text('Save new macro','שמירת מקרו חדש')}</button><button id="editorReset" class="secondary" disabled>${text('Clear marks','ניקוי סימונים')}</button></div>
 <details class="editor-action-details"><summary>${text('Recorded actions · optional details','הפעולות שהוקלטו · פרטים נוספים')}</summary>
 <div class="editor-paging"><button id="editorPrev" class="secondary" disabled>${text('Previous','הקודם')}</button><span id="editorPage" class="muted"></span><button id="editorNext" class="secondary" disabled>${text('Next','הבא')}</button></div>
 <ol id="editorActions" class="editor-list"></ol></details>`;
 let frame,engine,engineLoad,inFlight,raf,url;
 let source='',filename='macro.txt',actions=[],groups=[],starts=[],page=0;
 let start=null,end=null,startLabel=text('Original beginning','ההתחלה המקורית'),endLabel=text('Original end','הסוף המקורי');
 let busy=false,playing=false,mode='source',lastTime=0,version=0,job=0;
 const ctx=$('editorCanvas').getContext('2d',{alpha:false}),nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const current=()=>engine?.state(),clearError=()=>{$('editorError').textContent='';},fail=e=>{$('editorError').textContent=e?.message==='UNSUPPORTED_PROTOTYPE_INIT'?text('This file was saved by an older editor experiment with extra state fields. Open the original app recording instead.','הקובץ נשמר בניסוי הקודם של העורך עם שדות מצב נוספים. טען במקומו את ההקלטה המקורית מהאפליקציה.'):e?.message??String(e);};
 const cursor=s=>s?.boundary??s?.rejected?.index??s?.lastIndex??-1;
 const nextRun=s=>starts.find(index=>index>cursor(s));
 const previousRun=s=>[0,...starts].filter(index=>index<cursor(s)||(s?.boundary===null&&index===cursor(s))).at(-1);
 function update(){
  const s=current(),ready=Boolean(source)&&!busy&&!inFlight;
  panel.dataset.editorPhase=busy?'preparing':!source?'empty':playing?'playing':s?.finished?'complete':'paused';panel.dataset.editorMode=mode;
  $('editorFile').disabled=busy;$('editorPlay').disabled=!source||busy;
  $('editorPlay').textContent=playing?text('Pause','עצירה'):text('Play original','ניגון המקור');
  $('editorPreviousRun').disabled=!ready||playing||mode!=='source'||previousRun(s)===undefined;
  $('editorNextRun').disabled=!ready||playing||mode!=='source'||nextRun(s)===undefined;
  const direct=(s?.lastIndex??-1)<0||s?.boundary!==null&&s?.boundary!==undefined;
  $('editorStart').textContent=direct?text('Start here','התחל מכאן'):text('Start at the next run','התחל מהריצה הבאה');
  $('editorStart').disabled=!ready||playing||mode!=='source'||(!direct&&nextRun(s)===undefined);
  $('editorEnd').textContent=s?.simulation==='breathe'?text('End after Breathe','סיים אחרי הנשימה'):text('End here','סיים כאן');
  $('editorEnd').disabled=!ready||playing||mode!=='source'||(s?.lastIndex??-1)<0;
  for(const id of ['editorPreview','editorSave'])$(id).disabled=!ready||playing;
  $('editorReset').disabled=!ready||playing||(!start&&!end);
  $('editorRange').textContent=text('From ','מ־')+startLabel+text(' to ',' עד ')+endLabel;
  $('editorPreparation').hidden=!busy;
  $('editorPlayerHint').textContent=mode==='selection'?text('Viewing your selection. Play original to choose different boundaries.','מוצג הטווח שנבחר. נגן את המקור לשינוי גבולות החיתוך.'):
   direct?text('You can mark the current point as the beginning.','אפשר לסמן את הנקודה הנוכחית כהתחלה.'):
   nextRun(s)!==undefined?(s?.rejected?.reason==='working-values'?text('This point needs internal working values that the app logger does not store. Start at the next supported run, or keep the original beginning.','הנקודה הזאת דורשת נתונים פנימיים שהלוגר הקיים לא שומר. אפשר להתקדם להתחלה נתמכת הבאה, או להשאיר את ההתחלה המקורית.'):
    text('Start at the next run advances automatically and marks its beginning. You do not need the action list.','„התחל מהריצה הבאה” מתקדם אוטומטית ומסמן את תחילתה. אין צורך לחפש ברשימת הפעולות.')):
   text('No new run follows this point. Go to a previous run start, or keep the original beginning and shorten the end.','אין ריצה חדשה אחרי הנקודה הזאת. חזור לתחילת ריצה קודמת, או השאר את ההתחלה המקורית וקצר את הסיום.');
  if(s){
   $('editorPosition').textContent=(mode==='selection'?text('Selection · ','הטווח · '):text('Original · ','המקור · '))+stamp(s.delta)+(s.simulation?` · ${simulations[s.simulation]??s.simulation} · ${text('generation','דור')} ${s.generation}`:'');
   for(const li of $('editorActions').children)li.toggleAttribute('data-active',mode==='source'&&s.lastIndex>=+li.dataset.from&&s.lastIndex<=+li.dataset.to);
  }
 }
 async function pause(){playing=false;engine?.pause();cancelAnimationFrame(raf);update();await inFlight?.catch(()=>{});update();}
 function draw(){const output=engine?.draw();if(output){ctx.drawImage(output,0,0,520,520);$('editorCanvas').hidden=false;}}
 function loadEngine(){if(engine)return Promise.resolve();if(!engineLoad)engineLoad=bootEngine().finally(()=>{engineLoad=null;});return engineLoad;}
 async function bootEngine(){
  $('editorStatus').textContent=text('Loading editor…','טוען את העורך…');frame?.remove();frame=document.createElement('iframe');frame.title=text('Isolated macro editor engine','מנוע עריכת מקרו מבודד');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  const ready=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error(text('Could not load the editor.','טעינת העורך נכשלה.')));});
  frame.src='engine/index.html?computed=1&editor=1';panel.append(frame);await ready;const until=performance.now()+60000;
  while(performance.now()<until){const win=frame.contentWindow;if(win.macroVideoError)throw Error(win.macroVideoError);if(win.macroVideoEngine?.ready&&win.macroEditorEngine){engine=win.macroEditorEngine;return;}if(win.exportClock)await win.exportClock.tickAsync(100);await new Promise(r=>setTimeout(r,20));}
  throw Error(text('The editor did not load. Reload Studio.','העורך לא נטען. טען מחדש את הסטודיו.'));
 }
 function renderList(){
  const list=$('editorActions');list.replaceChildren();const pages=Math.max(1,Math.ceil(groups.length/100));page=Math.min(page,pages-1);
  groups.slice(page*100,(page+1)*100).forEach((g,offset)=>{
   const li=document.createElement('li');li.dataset.from=g.from;li.dataset.to=g.to;const d=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${page*100+offset+1}. ${label({...g.actions[0],eventName:g.eventName})}`;
   const when=document.createElement('small');when.dir='ltr';when.textContent=stamp(g.actions[0].delta);d.append(summary,when);
   d.addEventListener('toggle',()=>{if(d.open&&!d.querySelector('pre')){const pre=document.createElement('pre');pre.textContent=describe(g);pre.dir=language==='he'?'rtl':'ltr';pre.style.direction=pre.dir;d.append(pre);}});li.append(d);list.append(li);
  });
  $('editorPage').textContent=`${page+1} / ${pages}`;$('editorPrev').disabled=page===0;$('editorNext').disabled=page===pages-1;update();
 }
 async function openFile(file){
  if(!file)return;const request=++version;job++;busy=true;await pause();source='';start=end=null;mode='source';startLabel=text('Original beginning','ההתחלה המקורית');endLabel=text('Original end','הסוף המקורי');$('editorCanvas').hidden=true;$('editorFileName').textContent='';clearError();update();
  try{if(file.size>32*1024*1024)throw Error(t('לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.'));const contents=await file.text();await loadEngine();if(request!==version)return;
   actions=engine.load(contents);source=contents;filename=file.name;groups=actionGroups(actions);starts=freshStartIndices(actions);page=0;$('editorFileName').textContent=filename;$('editorStatus').textContent=text('Play and pause to choose a range, or use the run navigation.','נגן ועצור לבחירת טווח, או עבור בין תחילות הריצות.');renderList();draw();
  }catch(e){if(request!==version)return;engine?.stop();actions=[];groups=[];$('editorActions').replaceChildren();fail(e);}finally{if(request===version){busy=false;update();}}
 }
 async function tick(time){
  if(!playing)return;try{inFlight=engine.advance(Math.min(32,lastTime?time-lastTime:16));await inFlight;inFlight=null;lastTime=time;draw();playing=engine.state().running;update();if(playing)raf=requestAnimationFrame(tick);else $('editorStatus').textContent=text('Playback stopped. Choose your start or end.','הניגון נעצר. בחר התחלה או סיום.');}catch(e){inFlight=null;await pause();fail(e);}
 }
 function beginPlayback(){engine.play();playing=true;lastTime=0;update();raf=requestAnimationFrame(tick);}
 function markStart(point){
  if(point&&end&&point.index>end.index)throw Error(text('Start is after the marked end. Clear marks or choose an earlier start.','ההתחלה אחרי הסיום שסומן. נקה סימונים או בחר התחלה מוקדמת יותר.'));
  start=point;startLabel=point?label(actions[point.index])+` · ${stamp(actions[point.index].delta)}`:text('Original beginning','ההתחלה המקורית');
  $('editorStatus').textContent=text('New beginning marked. Preview or save the range.','נקודת ההתחלה סומנה. אפשר להציג או לשמור את הטווח.');
 }
 async function travel(index,token,select){
  mode='source';if(index===0){engine.load(source);draw();if(select)markStart(null);return;}
  let s=engine.state();if(s.boundary===index){if(select)markStart(engine.startPoint());return;}
  if(s.finished||index<=s.lastIndex||s.rejected?.index===index)engine.load(source);
  let target=index;engine.hold(target);engine.play();
  while(token===job){
   inFlight=engine.advance(32);await inFlight;inFlight=null;if(token!==job)return;s=engine.state();draw();
   $('editorPreparationProgress').value=Math.min(99,Math.max(0,(s.lastIndex+1)/Math.max(1,target)*100));
   $('editorPreparationText').textContent=text('Moving to run start… ','מתקדם לתחילת ריצה… ')+stamp(s.delta);
   if(s.boundary===target){if(select)markStart(engine.startPoint());return;}
   if(!s.running){
    if(select&&s.rejected){const following=starts.find(i=>i>target);if(following!==undefined){target=following;engine.hold(target);engine.play();continue;}}
    throw Error(s.rejected?.reason==='working-values'?text('This start needs internal data absent from the existing logger. Keep the original beginning or use a later supported run.','ההתחלה הזאת דורשת נתונים פנימיים שאינם בלוגר הקיים. השאר את ההתחלה המקורית או עבור לריצה נתמכת בהמשך.'):text('No supported run start remains. Go to a previous run start.','לא נותרה התחלת ריצה נתמכת. חזור לתחילת ריצה קודמת.'));
   }
   await nextFrame();
  }
 }
 async function background(action){
  if(busy||playing||!source)return;const token=++job;busy=true;clearError();$('editorPreparationProgress').value=0;$('editorPreparationText').textContent=text('Preparing…','מכין…');await pause();
  try{await action(token);}catch(e){if(token===job)fail(e);}finally{if(token===job){busy=false;update();}}
 }
 async function cancel(){const token=++job;await pause();if(token!==job)return;engine.load(source);mode='source';busy=false;draw();$('editorStatus').textContent=text('Canceled. Your marks and original file are unchanged.','בוטל. הסימונים והקובץ המקורי נשארו ללא שינוי.');update();}
 function file(){return new File([exportRange(actions,{start,end})],filename.replace(/\.txt$/i,'')+'_edited.txt',{type:'text/plain'});}
 $('editorFile').addEventListener('change',()=>openFile($('editorFile').files[0]));
 $('editorPlay').addEventListener('click',async()=>{clearError();if(playing){await pause();return;}if(mode!=='source'||engine.state().finished){engine.load(source);mode='source';draw();}beginPlayback();});
 $('editorPreviousRun').addEventListener('click',()=>background(token=>travel(previousRun(current()),token,false)));
 $('editorNextRun').addEventListener('click',()=>background(token=>travel(nextRun(current()),token,false)));
 $('editorStart').addEventListener('click',()=>{const s=current();if(s.lastIndex<0){markStart(null);update();}else if(s.boundary!==null){try{markStart(engine.startPoint());clearError();update();}catch(e){fail(e);}}else background(token=>travel(nextRun(s),token,true));});
 function markEnd(){const point=engine.endPoint();if(start&&point.index<start.index)throw Error(text('End must follow the selected start.','הסיום צריך להיות אחרי ההתחלה שנבחרה.'));end=point;endLabel=text('marked end at ','הסיום שסומן ב־')+stamp(point.delta);update();}
 $('editorEnd').addEventListener('click',()=>{
  if(current().simulation==='breathe')background(async token=>{
   const target=actions.findIndex((a,i)=>i>current().lastIndex&&a.eventName==='PAUSE');
   if(target<0)throw Error(text('No Breathe stop is recorded. Keep the original end or return to a previous run.','לא הוקלטה עצירת נשימה. השאר את הסוף המקורי או חזור לריצה קודמת.'));
   engine.holdEnd(target);engine.play();while(token===job){inFlight=engine.advance(32);await inFlight;inFlight=null;if(token!==job)return;draw();if(engine.state().endedAt===target){markEnd();return;}if(!engine.state().running)throw Error(text('The recording ended before the Breathe stop.','ההקלטה הסתיימה לפני עצירת הנשימה.'));await nextFrame();}
  });else try{markEnd();clearError();}catch(e){fail(e);}
 });
 $('editorPreview').addEventListener('click',()=>background(async token=>{const copy=file();engine.load(await copy.text());if(token!==job)return;mode='selection';busy=false;beginPlayback();}));
 $('editorSave').addEventListener('click',()=>{try{const copy=file();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(copy);const link=document.createElement('a');link.href=url;link.download=copy.name;link.click();$('editorStatus').textContent=text('New macro downloaded. Original unchanged.','המקרו החדש הורד. המקור לא השתנה.');}catch(e){fail(e);}});
 $('editorReset').addEventListener('click',()=>{start=end=null;startLabel=text('Original beginning','ההתחלה המקורית');endLabel=text('Original end','הסוף המקורי');clearError();update();});
 $('editorCancel').addEventListener('click',cancel);$('editorPrev').addEventListener('click',()=>{page--;renderList();});$('editorNext').addEventListener('click',()=>{page++;renderList();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!busy)pause();});window.addEventListener('beforeunload',event=>{if(busy||playing){event.preventDefault();event.returnValue='';}if(url)URL.revokeObjectURL(url);});
 if(initialFile)await openFile(initialFile);else{$('editorStatus').textContent=text('Choose a macro to begin.','בחר מקרו כדי להתחיל.');update();}
 return {pause:()=>busy?cancel():pause(),openFile};
}
