import {t,language} from './i18n.js';
import {actionGroups,freshStartIndices,randomStartIndices,simulationOf,exportRange} from './macro-edit-model.js';
const text=(en,he)=>language==='he'?he:en;
const names={INIT_STATE:['Starting board','לוח התחלתי'],DRAW_STROKE:['Brush stroke','ציור במברשת'],PLAY:['Start simulation','הפעלת סימולציה'],
 PAUSE:['Pause simulation','עצירת סימולציה'],'STEP FORWARD':['One simulation step','צעד סימולציה אחד'],HISTORY_SETTINGS:['Restore settings','שחזור הגדרות'],
 WIND_WAVE:['Paint with Wind','ציור ברוח'],WIND_END:['Stop Wind','סיום רוח'],GO_DARK:['Darken board','הכהיית הלוח'],
 'Palette Change':['Change palette','החלפת פלטה'],'Sort by':['Change color order','שינוי סדר הצבעים'],GRID_RESIZE:['Resize board','שינוי גודל הלוח'],
 SEPARATOR_CHANGE:['Change separators','שינוי מפרידים'],SHUFFLE_COLORS:['Shuffle existing colors','ערבוב צבעים קיימים'],'Invert Colors':['Invert colors','היפוך צבעים'],
 CONTOUR_APPLY:['Draw contours','יצירת קווי מתאר'],ADAPT_COLORS:['Adapt colors','התאמת צבעים'],NUDGE:['Shift colors','הזזת צבעים'],
 BRUSH_CHECKPOINT:['Finish live brush stroke','סיום משיכת מברשת בזמן ניגון'],BRUSH_CONTINUE:['Continue simulation','המשך סימולציה'],
 SIMULATION_RULES:['Change simulation settings','שינוי הגדרות סימולציה'],EVOLUTION_TUNING:['Change evolution settings','שינוי הגדרות אבולוציה'],
 ISLANDS_INIT:['Prepare Islands','הכנת איילנדס'],NUDGE_SPEED:['Change Nudge speed','שינוי מהירות נאג׳']};
const simulations={gameOfLife:'Game of Life',sandpile:'Chi Flow',contour:'Cracks',cymatics:'Resonance',brightnessEvo:'Brightness Evolution',
 islands:'Islands',breathe:'Breathe',dla:'DLA',turing:'Turing',magnet:'Magnet',gravitationalSort:'Gravity',spiral:'Spiral',erosion:'Erosion',nudgeBrighter:'Nudge +',nudgeDarker:'Nudge −'};
const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms)%1000).padStart(3,'0')}`;
const label=a=>{const pair=names[a.eventName];const name=pair?pair[language==='he'?1:0]:a.eventName.endsWith('Mode Changed')?text('Select simulation mode','בחירת מצב סימולציה'):a.eventName==='--'?text('Random fill','מילוי אקראי'):text('Change settings','שינוי הגדרות');const sim=simulationOf(a);return name+(sim?` · ${simulations[sim]??sim}`:'');};

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

export async function mountEditor(panel,{file:initialFile=null,onVideo}={}) {
 const $=id=>panel.querySelector('#'+id);
 panel.innerHTML=`<label class="file-title" for="editorFile">${text('Choose a macro to edit','בחר מאקרו לעריכה')}</label><input id="editorFile" class="file-input" type="file" accept=".txt,text/plain">
 <p class="editor-note">${text('1. Load a macro → 2. Reach a safe start → 3. Preview and save a new copy. The original stays unchanged.','1. טען מאקרו ← 2. בחר נקודת התחלה בטוחה ← 3. בדוק ושמור עותק חדש. המקור נשאר ללא שינוי.')}</p>
 <p id="editorFileName" class="muted"></p><p id="editorStatus" class="muted" role="status" aria-live="polite"></p><p id="editorError" role="alert"></p>
 <canvas id="editorCanvas" width="520" height="520" aria-label="${text('Macro preview','תצוגת מאקרו')}" hidden></canvas>
 <div class="editor-controls"><button id="editorPlay" disabled>${text('Play','ניגון')}</button><button id="editorRestart" class="secondary" disabled>${text('Restart','מההתחלה')}</button>
 <button id="editorNextSafe" class="secondary" disabled>${text('Play to next safe start','נגן עד לנקודת חיתוך בטוחה')}</button><button id="editorStart" disabled>${text('Choose as new beginning','בחר כהתחלה חדשה')}</button></div>
 <section id="editorSelection" hidden><h2 id="editorSelectionTitle" class="editor-heading">${text('The new macro will start from this board','המאקרו החדש יתחיל מהלוח הזה')}</h2><canvas id="editorStartCanvas" width="520" height="520" aria-label="${text('Chosen starting board','לוח ההתחלה שנבחר')}"></canvas><p id="editorSelectionNote" class="editor-note" hidden></p></section><p id="editorPosition" class="editor-position" dir="ltr"></p><div id="editorRange" class="editor-range" role="status"></div>
 <div class="editor-controls"><button id="editorReset" class="secondary" disabled>${text('Change starting point','שנה נקודת התחלה')}</button><button id="editorPreview" class="secondary" disabled>${text('Play from new beginning','נגן מההתחלה החדשה')}</button>
 <button id="editorSave" disabled>${text('Save as new macro','שמור כמאקרו חדש')}</button></div>
 <h2 style="font-size:15px;font-weight:400;color:var(--gold)">${text('Recorded actions','הפעולות שהוקלטו')}</h2>
 <p class="editor-note">${text('Choose a gold start marker, or play to the next safe point. Playback stops before that action; the point is checked again on arrival. Simulations with randomness may vary between playbacks.','בחר סימון התחלה זהוב, או נגן עד לנקודה הבטוחה הבאה. הניגון ייעצר לפני הפעולה והנקודה תיבדק שוב בהגעה. סימולציות אקראיות עשויות להשתנות בין ניגונים.')}</p>
 <div class="editor-controls" role="group" aria-label="${text('Filter actions','סינון פעולות')}">
 <button id="editorAllFilter" class="secondary" type="button" aria-pressed="true" aria-controls="editorActions" disabled>${text('All actions','כל הפעולות')}</button>
 <button id="editorSafeFilter" class="secondary" type="button" aria-pressed="false" aria-controls="editorActions" disabled>${text('All starting points','כל נקודות ההתחלה')}</button>
 <button id="editorRandomFilter" class="secondary" type="button" aria-pressed="false" aria-controls="editorActions" disabled>${text('Random · instant jump','Random · קפיצה מיידית')}</button>
 <button id="editorReplayFilter" class="secondary" type="button" aria-pressed="false" aria-controls="editorActions" disabled>${text('Requires playback','נקודות הדורשות ניגון')}</button>
 <span id="editorActionCount" class="muted" role="status" dir="ltr"></span></div>
 <div class="editor-paging"><button id="editorPrev" class="secondary" disabled>${text('Previous','הקודם')}</button><span id="editorPage" class="muted"></span><button id="editorNext" class="secondary" disabled>${text('Next','הבא')}</button></div>
 <ol id="editorActions" class="editor-list"></ol><p id="editorActionsEmpty" class="editor-note" role="status" hidden>${text('No safe starting points in this macro.','אין במאקרו הזה נקודות התחלה בטוחות.')}</p>`;
 let frame=null,engine=null,source='',filename='macro.txt',actions=[],groups=[],safe=new Set(),random=new Set(),page=0,filter='all',start=null,
  previewing=false,previewTotal=0,busy=false,playing=false,raf=null,lastTime=0,version=0,url=null,inFlight=null,engineLoad=null;
 const ctx=$('editorCanvas').getContext('2d',{alpha:false});
 function fail(error){$('editorError').textContent=error?.message??String(error);}
 function clearError(){$('editorError').textContent='';}
 function pause(){playing=false;engine?.pause();cancelAnimationFrame(raf);raf=null;update();return inFlight?.catch(()=>{});}
 function loadEngine(){
  if(engine)return Promise.resolve();
  if(!engineLoad)engineLoad=bootEngine().finally(()=>{engineLoad=null;});
  return engineLoad;
 }
 async function bootEngine(){
  $('editorStatus').textContent=text('Loading editor…','טוען את העורך…');
  frame?.remove();frame=document.createElement('iframe');frame.title=text('Isolated macro editor engine','מנוע עריכת מאקרו מבודד');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  const ready=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error(text('Could not load the editor.','טעינת העורך נכשלה.')));});
  frame.src='engine/index.html?computed=1&editor=1';panel.append(frame);await ready;
  const until=performance.now()+60000;
  while(performance.now()<until){
   const win=frame.contentWindow;if(win.macroVideoError)throw Error(win.macroVideoError);
   if(win.macroVideoEngine?.ready&&win.macroEditorEngine){engine=win.macroEditorEngine;return;}
   if(win.exportClock)await win.exportClock.tickAsync(100);
   await new Promise(r=>setTimeout(r,20));
  }
  throw Error(text('The editor did not load. Reload Studio.','העורך לא נטען. טען מחדש את הסטודיו.'));
 }
 function current(){return engine?.state();}
 function update(){
  const state=current();const ready=Boolean(source)&&!busy;panel.dataset.editorPhase=busy?'loading':!source?'empty':playing?'playing':state?.finished?'complete':'paused';
  $('editorPlay').disabled=!ready||Boolean(state?.finished);$('editorPlay').textContent=playing?text('Pause','עצירה'):text('Play','ניגון');
  for(const id of ['editorAllFilter','editorSafeFilter','editorRandomFilter','editorReplayFilter'])$(id).disabled=!ready;
  $('editorRestart').disabled=!ready;$('editorStart').disabled=!ready||playing||Boolean(inFlight)||previewing||state?.boundary===null||state?.boundary===undefined;
  $('editorNextSafe').disabled=!ready||previewing||!actions.some((_,i)=>safe.has(i)&&i>Math.max(state?.lastIndex??-1,state?.boundary??-1));
  for(const id of ['editorReset','editorPreview','editorSave'])$(id).disabled=!ready||playing||Boolean(inFlight);
  $('editorReset').disabled=busy||playing||Boolean(inFlight)||!start;
  $('editorSelection').hidden=!start;
  $('editorSelectionTitle').textContent=start?.random?text('Start with a new Random board','התחלה מהגרלה חדשה'):text('The new macro will start from this board','המאקרו החדש יתחיל מהלוח הזה');
  $('editorSelectionNote').hidden=!start?.random;
  $('editorSelectionNote').textContent=text('This is an example. Each playback generates a new board using these palette, order and size settings.','זהו לוח לדוגמה. כל ניגון יגריל לוח חדש לפי הפלטה, המיון והגודל שבנקודה הזו.');
  $('editorSave').disabled=$('editorPreview').disabled=!ready||playing||Boolean(inFlight)||!start;
  $('editorRange').textContent=start?text('New beginning: ','התחלה חדשה: ')+stamp(actions[start.index].delta)+' · '+label(actions[start.index]):text('No starting point chosen. Pause at a marked safe point or play to the next one.','טרם נבחרה התחלה. עצור בנקודה מסומנת או נגן עד לנקודה הבטוחה הבאה.');
  if(state){$('editorPosition').textContent=`${stamp(state.delta)} · ${Math.max(0,state.lastIndex+1)} / ${previewing?previewTotal:actions.length} · ${simulations[state.simulation]??text('Paused','בהשהיה')}`;
   for(const li of $('editorActions').children){const active=!previewing&&state.lastIndex>=Number(li.dataset.from)&&state.lastIndex<=Number(li.dataset.to);li.toggleAttribute('data-active',active);}
   for(const button of panel.querySelectorAll('[data-hold]')){button.disabled=busy||previewing;button.setAttribute('aria-pressed',String(state.holdAt===Number(button.dataset.hold)));}
  }
 }
 function draw(){const output=engine?.draw();if(output){ctx.drawImage(output,0,0,520,520);$('editorCanvas').hidden=false;}}
 async function tick(time){
  if(!playing)return;
  try{inFlight=engine.advance(Math.min(32,lastTime?time-lastTime:16));await inFlight;inFlight=null;lastTime=time;draw();playing=engine.state().running;update();
   if(playing)raf=requestAnimationFrame(tick);else if(engine.state().rejected!==null)$('editorStatus').textContent=text('No compatible safe start was reached. Choose another marked point or restart.','לא נמצאה נקודת התחלה מתאימה. בחר נקודה מסומנת אחרת או חזור להתחלה.');else $('editorStatus').textContent=engine.state().finished?text('End reached. There are no further safe starting points.','הגענו לסוף. אין נקודות התחלה בטוחות נוספות.'):engine.state().boundary!==null?text('Safe start reached. Choose this board as the new beginning.','הגענו לנקודה בטוחה. אפשר לבחור את הלוח הזה כהתחלה חדשה.'):text('Paused. Choose a safe marker or play to the next safe start.','בהשהיה. בחר סימון בטוח או נגן עד לנקודת החיתוך הבאה.');
  }catch(error){inFlight=null;pause();fail(error);}
 }
 function renderList(){
  const list=$('editorActions');list.replaceChildren();
  const visible=groups.map((group,index)=>({group,index})).filter(({group})=>filter==='all'||filter==='safe'&&safe.has(group.from)||filter==='random'&&random.has(group.from)||filter==='replay'&&safe.has(group.from)&&!random.has(group.from));
  const pages=Math.max(1,Math.ceil(visible.length/100));page=Math.min(page,pages-1);
  for(const [id,value]of [['editorAllFilter','all'],['editorSafeFilter','safe'],['editorRandomFilter','random'],['editorReplayFilter','replay']])$(id).setAttribute('aria-pressed',String(filter===value));
  $('editorActionsEmpty').hidden=!source||visible.length>0;
  $('editorActionsEmpty').textContent=filter==='random'?text('No independent Random starts in this macro.','אין במאקרו נקודות Random עצמאיות.'):filter==='replay'?text('No starting points requiring playback.','אין נקודות התחלה הדורשות ניגון.'):text('No matching starting points.','אין נקודות התחלה התואמות לסינון.');
  $('editorActionCount').textContent=source?`${visible.length} / ${groups.length}`:'';
  visible.slice(page*100,(page+1)*100).forEach(({group,index})=>{
   const li=document.createElement('li');li.dataset.from=group.from;li.dataset.to=group.to;
   const details=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent=`${index+1}. ${label({...group.actions[0],eventName:group.eventName})}`;
   const when=document.createElement('small');when.dir='ltr';when.textContent=stamp(group.actions[0].delta)+(group.actions[0].isGenBased?` · ${text('Generation','דור')} ${group.actions[0].targetGen}`:'');
   summary.append(when);details.append(summary);
   details.addEventListener('toggle',()=>{if(details.open&&!details.querySelector('pre')){
    const pre=document.createElement('pre');
    pre.textContent=describe(group);pre.dir=language==='he'?'rtl':'ltr';pre.style.direction=pre.dir;
    details.append(pre);
   }});
   li.append(details);
   if(safe.has(group.from)){
    const hold=document.createElement('button');hold.type='button';hold.dataset.hold=group.from;hold.textContent=random.has(group.from)?'⚡ '+text('New Random start · jump now','התחלה חדשה מ־Random · קפיצה מיידית'):'◆ '+text('Safe start · play to here','התחלה בטוחה · נגן עד לכאן');li.dataset.safe='true';li.dataset.startKind=random.has(group.from)?'random':'replay';
    hold.addEventListener('click',()=>goToSafe(group.from));li.append(hold);
   }
   list.append(li);
  });
  $('editorPage').textContent=`${page+1} / ${pages}`;$('editorPrev').disabled=page===0;$('editorNext').disabled=page===pages-1;update();
 }
 async function openFile(file){
  if(!file)return;const request=++version;busy=true;await pause();source='';start=null;previewing=false;clearError();update();
  try{
   if(file.size>32*1024*1024)throw Error(t('לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.'));
   const contents=await file.text();await loadEngine();if(request!==version)return;
   actions=engine.load(contents);source=contents;filename=file.name;groups=actionGroups(actions);safe=new Set(freshStartIndices(actions));random=new Set(randomStartIndices(actions));page=0;
   $('editorFileName').textContent=filename;$('editorStatus').textContent=safe.size===0?text('This macro has no safe new starting points. The source stays unchanged.','לא נמצאו במאקרו נקודות התחלה עצמאיות. המקור נשאר ללא שינוי.'):text('Ready. Play the macro or choose a fresh start in the list.','מוכן. נגן את המאקרו או בחר נקודת התחלה חדשה ברשימה.');renderList();draw();
  }catch(error){if(request!==version)return;engine?.stop();actions=[];groups=[];$('editorActions').replaceChildren();fail(error);}
  finally{if(request===version){busy=false;update();}}
 }
 function editedFile(){const file=new File([exportRange(actions,{start})],filename.replace(/\.txt$/i,'')+'_edited.txt',{type:'text/plain'});if(file.size>32*1024*1024)throw Error(t('לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.'));return file;}
 async function goToSafe(index='next'){
  if(busy||previewing)return;busy=true;await pause();clearError();
  try{
   const at=engine.state();const target=index==='next'?[...safe].find(i=>i>Math.max(at.lastIndex,at.boundary??-1)):index;
   if(target===undefined){$('editorStatus').textContent=text('No safe starting points remain.','אין נקודות התחלה בטוחות נוספות.');return;}
   if(random.has(target)){
    $('editorStatus').textContent=text('Preparing a new Random board…','מכין לוח Random חדש…');
    await engine.jumpRandom(target);draw();playing=false;
    $('editorStatus').textContent=text('New Random start ready. No earlier simulation was played.','התחלה חדשה מ־Random מוכנה. הסימולציות שקדמו לנקודה לא נוגנו.');return;
   }
   index=target;
   if(index!=='next'&&index<=engine.state().lastIndex){engine.load(source);draw();}
   engine.hold(index);engine.play();playing=true;lastTime=0;
   $('editorStatus').textContent=text('Playing to a safe starting point…','מנגן עד לנקודת התחלה בטוחה…');raf=requestAnimationFrame(tick);
  }catch(error){fail(error);}finally{busy=false;update();}
 }
 $('editorNextSafe').addEventListener('click',()=>goToSafe());
 $('editorFile').addEventListener('change',()=>openFile($('editorFile').files[0]));
 $('editorPlay').addEventListener('click',()=>{clearError();if(playing){pause();return;}engine.play();playing=true;lastTime=0;update();raf=requestAnimationFrame(tick);});
 $('editorRestart').addEventListener('click',async()=>{busy=true;await pause();try{previewing=false;engine.load(source);$('editorStatus').textContent=text('Restarted. Marks are preserved.','חזר להתחלה. הסימונים נשמרו.');draw();}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorStart').addEventListener('click',()=>{try{const point=engine.startPoint();start=point;draw();$('editorStartCanvas').getContext('2d').drawImage($('editorCanvas'),0,0);clearError();update();}catch(error){fail(error);}});
 $('editorReset').addEventListener('click',async()=>{busy=true;await pause();try{start=null;previewing=false;engine.load(source);clearError();draw();}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorPreview').addEventListener('click',async()=>{busy=true;try{const file=editedFile();await pause();previewTotal=engine.load(await file.text()).length;previewing=true;engine.play();playing=true;lastTime=0;raf=requestAnimationFrame(tick);}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorSave').addEventListener('click',()=>{try{const file=editedFile();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();$('editorStatus').textContent=text('New macro downloaded. Original unchanged.','המאקרו החדש הורד. המקור לא השתנה.');}catch(error){fail(error);}});
 for(const [id,value]of [['editorAllFilter','all'],['editorSafeFilter','safe'],['editorRandomFilter','random'],['editorReplayFilter','replay']])$(id).addEventListener('click',()=>{filter=filter===value?'all':value;page=0;renderList();});
 $('editorPrev').addEventListener('click',()=>{page--;renderList();});$('editorNext').addEventListener('click',()=>{page++;renderList();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 window.addEventListener('beforeunload',()=>{if(url)URL.revokeObjectURL(url);});
 if(initialFile)await openFile(initialFile);else {$('editorStatus').textContent=text('Choose a macro to begin.','בחר מאקרו כדי להתחיל.');update();}
 return {pause,openFile};
}
