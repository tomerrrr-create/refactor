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

export async function mountEditor(panel,{file:initialFile=null,onVideo}={}) {
 const $=id=>panel.querySelector('#'+id);
 panel.innerHTML=`<label class="file-title" for="editorFile">${text('Choose a macro to edit','בחר מקרו לעריכה')}</label><input id="editorFile" class="file-input" type="file" accept=".txt,text/plain">
 <p class="editor-note">${text('Your original stays unchanged. Start points are available only before fresh simulation runs, never in the middle of a run.','המקור נשאר ללא שינוי. נקודות התחלה זמינות רק לפני ריצת סימולציה חדשה, ולא באמצע ריצה.')}</p>
 <p id="editorFileName" class="muted"></p><p id="editorStatus" class="muted" role="status" aria-live="polite"></p><p id="editorError" role="alert"></p>
 <canvas id="editorCanvas" width="520" height="520" aria-label="${text('Macro preview','תצוגת מקרו')}" hidden></canvas>
 <div class="editor-controls"><button id="editorPlay" disabled>${text('Play','ניגון')}</button><button id="editorRestart" class="secondary" disabled>${text('Restart','מההתחלה')}</button>
 <button id="editorStart" class="secondary" disabled>${text('Start here','התחל כאן')}</button><button id="editorEnd" class="secondary" disabled>${text('End here','סיים כאן')}</button></div>
 <p id="editorPosition" class="editor-position" dir="ltr"></p><div id="editorRange" class="editor-range" role="status"></div>
 <div class="editor-controls"><button id="editorReset" class="secondary" disabled>${text('Clear marks','ניקוי סימונים')}</button><button id="editorPreview" class="secondary" disabled>${text('Preview selection','ניגון הטווח')}</button>
 <button id="editorSave" disabled>${text('Save new macro','שמירת מקרו חדש')}</button><button id="editorVideo" class="secondary" disabled>${text('Use for video','יצירת וידאו מהטווח')}</button></div>
 <h2 style="font-size:15px;font-weight:400;color:var(--gold)">${text('Recorded actions','הפעולות שהוקלטו')}</h2>
 <p class="editor-note">${text('Open an action for details. At a marked fresh start, choose “Pause before start”, then Play. You can mark the start once playback reaches it.','פתח פעולה לפרטים. בנקודת התחלה חדשה בחר „עצור לפני ההתחלה” ואז ניגון. כשהניגון יגיע אליה תוכל לסמן התחלה.')}</p>
 <div class="editor-paging"><button id="editorPrev" class="secondary" disabled>${text('Previous','הקודם')}</button><span id="editorPage" class="muted"></span><button id="editorNext" class="secondary" disabled>${text('Next','הבא')}</button></div>
 <ol id="editorActions" class="editor-list"></ol>`;
 let frame=null,engine=null,source='',filename='macro.txt',actions=[],groups=[],safe=new Set(),page=0,start=null,end=null,
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
  frame?.remove();frame=document.createElement('iframe');frame.title=text('Isolated macro editor engine','מנוע עריכת מקרו מבודד');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
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
  $('editorRestart').disabled=!ready;$('editorStart').disabled=!ready||playing||Boolean(inFlight)||previewing||state?.boundary===null||state?.boundary===undefined;
  $('editorEnd').disabled=!ready||playing||Boolean(inFlight)||previewing||(state?.lastIndex??-1)<0;
  for(const id of ['editorReset','editorPreview','editorSave','editorVideo'])$(id).disabled=!ready||playing||Boolean(inFlight);
  $('editorReset').disabled=busy||playing||Boolean(inFlight)||(!start&&!end);
  $('editorRange').textContent=text('Start: ','התחלה: ')+(start?stamp(actions[start.index].delta):text('Original beginning','ההתחלה המקורית'))+' · '+text('End: ','סיום: ')+(end?stamp(end.delta):text('Original end','הסוף המקורי'));
  if(state){$('editorPosition').textContent=`${stamp(state.delta)} · ${Math.max(0,state.lastIndex+1)} / ${previewing?previewTotal:actions.length}`;
   for(const li of $('editorActions').children){const active=!previewing&&state.lastIndex>=Number(li.dataset.from)&&state.lastIndex<=Number(li.dataset.to);li.toggleAttribute('data-active',active);}
   for(const button of panel.querySelectorAll('[data-hold]')){button.disabled=busy||previewing||Number(button.dataset.hold)<=state.lastIndex;button.setAttribute('aria-pressed',String(state.holdAt===Number(button.dataset.hold)));}
  }
 }
 function draw(){const output=engine?.draw();if(output){ctx.drawImage(output,0,0,520,520);$('editorCanvas').hidden=false;}}
 async function tick(time){
  if(!playing)return;
  try{inFlight=engine.advance(Math.min(32,lastTime?time-lastTime:16));await inFlight;inFlight=null;lastTime=time;draw();playing=engine.state().running;update();
   if(playing)raf=requestAnimationFrame(tick);else if(engine.state().rejected!==null)$('editorStatus').textContent=text('This point retains an active session. Continue playback or choose another start.','בנקודה הזאת נשאר מצב ריצה פעיל. המשך לנגן או בחר נקודת התחלה אחרת.');else $('editorStatus').textContent=engine.state().boundary!==null?text('Paused before a fresh run. You can mark “Start here”.','נעצר לפני ריצה חדשה. אפשר לסמן „התחל כאן”.'):text('Playback paused or complete.','הניגון נעצר או הסתיים.');
  }catch(error){inFlight=null;pause();fail(error);}
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
    const pre=document.createElement('pre');
    pre.textContent=describe(group);pre.dir=language==='he'?'rtl':'ltr';pre.style.direction=pre.dir;
    details.append(pre);
   }});
   li.append(details);
   if(safe.has(group.from)){
    const hold=document.createElement('button');hold.type='button';hold.dataset.hold=group.from;hold.textContent=text('Pause before start','עצור לפני ההתחלה');
    hold.addEventListener('click',()=>{try{engine.hold(group.from);$('editorStatus').textContent=text('Will pause here. Press Play to reach this start.','הניגון ייעצר כאן. לחץ ניגון כדי להגיע לנקודה.');update();}catch(error){fail(error);}});li.append(hold);
   }
   list.append(li);
  });
  $('editorPage').textContent=`${page+1} / ${pages}`;$('editorPrev').disabled=page===0;$('editorNext').disabled=page===pages-1;update();
 }
 async function openFile(file){
  if(!file)return;const request=++version;busy=true;await pause();source='';start=end=null;previewing=false;clearError();update();
  try{
   if(file.size>32*1024*1024)throw Error(t('לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.'));
   const contents=await file.text();await loadEngine();if(request!==version)return;
   actions=engine.load(contents);source=contents;filename=file.name;groups=actionGroups(actions);safe=new Set(freshStartIndices(actions));page=0;
   $('editorFileName').textContent=filename;$('editorStatus').textContent=text('Ready. Play the macro or choose a fresh start in the list.','מוכן. נגן את המקרו או בחר נקודת התחלה חדשה ברשימה.');renderList();
  }catch(error){if(request!==version)return;engine?.stop();actions=[];groups=[];$('editorActions').replaceChildren();fail(error);}
  finally{if(request===version){busy=false;update();}}
 }
 function editedFile(){return new File([exportRange(actions,{start,end})],filename.replace(/\.txt$/i,'')+'_edited.txt',{type:'text/plain'});}
 $('editorFile').addEventListener('change',()=>openFile($('editorFile').files[0]));
 $('editorPlay').addEventListener('click',()=>{clearError();if(playing){pause();return;}engine.play();playing=true;lastTime=0;update();raf=requestAnimationFrame(tick);});
 $('editorRestart').addEventListener('click',async()=>{busy=true;await pause();try{previewing=false;engine.load(source);$('editorStatus').textContent=text('Restarted. Marks are preserved.','חזר להתחלה. הסימונים נשמרו.');draw();}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorStart').addEventListener('click',()=>{try{const point=engine.startPoint();if(end&&point.index>end.index)throw Error(text('Choose an end after the start.','בחר סיום אחרי ההתחלה.'));start=point;clearError();update();}catch(error){fail(error);}});
 $('editorEnd').addEventListener('click',()=>{try{const point=engine.endPoint();if(start&&point.index<start.index)throw Error(text('Choose an end after the start.','בחר סיום אחרי ההתחלה.'));end=point;clearError();update();}catch(error){fail(error);}});
 $('editorReset').addEventListener('click',async()=>{busy=true;await pause();try{start=end=null;previewing=false;engine.load(source);clearError();draw();}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorPreview').addEventListener('click',async()=>{busy=true;try{const file=editedFile();await pause();previewTotal=engine.load(await file.text()).length;previewing=true;engine.play();playing=true;lastTime=0;raf=requestAnimationFrame(tick);}catch(error){fail(error);}finally{busy=false;update();}});
 $('editorSave').addEventListener('click',()=>{try{const file=editedFile();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();$('editorStatus').textContent=text('New macro downloaded. Original unchanged.','המקרו החדש הורד. המקור לא השתנה.');}catch(error){fail(error);}});
 $('editorVideo').addEventListener('click',()=>{try{onVideo?.(editedFile());}catch(error){fail(error);}});
 $('editorPrev').addEventListener('click',()=>{page--;renderList();});$('editorNext').addEventListener('click',()=>{page++;renderList();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 window.addEventListener('beforeunload',()=>{if(url)URL.revokeObjectURL(url);});
 if(initialFile)await openFile(initialFile);else {$('editorStatus').textContent=text('Choose a macro to begin.','בחר מקרו כדי להתחיל.');update();}
 return {pause,openFile};
}
