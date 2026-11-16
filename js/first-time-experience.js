import {getCurrentLang,onLanguageChange,setCurrentLang} from './i18n.js';
import {FTUE_STEPS,FTUE_CHAPTERS,ftueText} from './first-time-content.js';
export const FTUE_STORAGE_KEY='colorGridFirstTimeExperienceV1';
const UI={
 en:{entry:'Interactive first visit',reset:'Show first-visit tutorial next time',resetDone:'Reset. The tutorial will appear on your next visit.',welcome:'Make something. Learn by doing.',intro:'Make a few marks, bring them to life, and keep a moment you love. Learn by trying on a separate practice canvas.',begin:'Start the guided tour',resume:'Continue the tour',restart:'Start from the beginning',later:'Not now',chapter:'Chapter',navigation:'Chapters',step:'Step',of:'of',back:'Back',next:'Next',finish:'Finish & return',skip:'Skip this step',exit:'Exit lesson',practice:'Practice board',watching:'Watch the live simulation; you can add your own marks.',waiting:'Try the highlighted action to continue.',success:'Done — you can continue.',read:'Explore this explanation, then continue.',helper:'Open options',focus:'Focus the tool',loading:'Preparing your practice board…',error:'The practice board could not load. Close the lesson and try again.',unavailable:'This tool is not visible yet. You can skip this step.',resetNote:'Only tutorial progress was reset.',storage:'Progress cannot be saved in this browser session.',chapters:'Explore at your own pace',saved:'Your original artwork is waiting outside this lesson.'},
 he:{entry:'הדרכה אינטראקטיבית למתחילים',reset:'הצגת הדרכת כניסה ראשונה בביקור הבא',resetDone:'אופס. ההדרכה תופיע בכניסה הבאה.',welcome:'יוצרים משהו. לומדים תוך כדי.',intro:'מציירים כמה נגיעות, נותנים להן חיים, ושומרים רגע שאוהבים. לומדים מתוך התנסות בלוח אימון נפרד.',begin:'מתחילים את ההדרכה',resume:'ממשיכים את ההדרכה',restart:'מתחילים מההתחלה',later:'לא עכשיו',chapter:'פרק',navigation:'פרקים',step:'צעד',of:'מתוך',back:'הקודם',next:'הבא',finish:'סיום וחזרה ליצירה',skip:'דלגו על הצעד',exit:'יציאה מההדרכה',practice:'לוח אימון',watching:'צפו בסימולציה המנגנת; אפשר להוסיף ציור משלכם.',waiting:'בצעו את הפעולה המסומנת כדי להמשיך.',success:'בוצע — אפשר להמשיך.',read:'קראו את ההסבר והמשיכו כשתרצו.',helper:'פתיחת האפשרויות',focus:'מיקוד בכלי',loading:'מכינים את לוח האימון…',error:'לוח האימון לא נטען. סגרו את ההדרכה ונסו שוב.',unavailable:'הכלי עדיין לא מופיע. אפשר לדלג על הצעד.',resetNote:'רק התקדמות ההדרכה אופסה.',storage:'לא ניתן לשמור התקדמות בדפדפן הזה.',chapters:'חוקרים בקצב שלכם',saved:'היצירה המקורית מחכה מחוץ להדרכה.'}
};
export function readFtueProgress(storage){
 try{const value=JSON.parse(storage.getItem(FTUE_STORAGE_KEY));
  if(value?.version!==1||!['active','dismissed','complete'].includes(value.status))return null;
  const ids=new Set(FTUE_STEPS.map(step=>step.id));
  return {version:1,status:value.status,stepId:ids.has(value.stepId)?value.stepId:FTUE_STEPS[0].id,completed:Array.isArray(value.completed)?value.completed.filter(id=>ids.has(id)):[]};
 }catch{return null;}
}
export function initializeFirstTimeExperience({beforeStart=()=>{}}={}){
 const copy=()=>UI[getCurrentLang()]||UI.en;
 let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');},removeItem:()=>{throw Error('Storage unavailable');}};}
 let progress=readFtueProgress(storage),session=null,trigger=null;
 const entries=[...document.querySelectorAll('[data-open-ftue]')],reset=document.querySelector('[data-reset-ftue]'),resetStatus=document.querySelector('[data-ftue-reset-status]');
 function persist(status,stepId,completed=[]){progress={version:1,status,stepId,completed};try{storage.setItem(FTUE_STORAGE_KEY,JSON.stringify(progress));return true;}catch{return false;}}
 function refresh(){entries.forEach(e=>e.textContent=copy().entry);if(reset)reset.textContent=copy().reset;session?.translate?.();}
 function exit(status){
  status??=(session?.bridge||progress?.status==='active')?'active':'dismissed';
  if(!session)return;
  const {root,frame,timer,loadTimer,overflow,index,completed,cleanups}=session;
  persist(status,FTUE_STEPS[index]?.id||FTUE_STEPS[0].id,[...completed]);
  clearInterval(timer);clearTimeout(loadTimer);cleanups.forEach(fn=>fn());
  frame?.remove();root.close();root.remove();document.body.style.overflow=overflow;session=null;
  trigger?.focus({preventScroll:true});
 }
 function welcome(from=null){
  if(session)return;trigger=from||document.activeElement;
  const c=copy(),root=document.createElement('dialog');root.className='ftue-root ftue-welcome';root.dir=getCurrentLang()==='he'?'rtl':'ltr';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','ftueWelcomeTitle');
  root.innerHTML='<div class="ftue-intro"><div class="ftue-intro-heading"><span class="ftue-kicker">FOLLOW YOUR INTUITION</span><select data-ftue-language aria-label="Language / שפה"><option value="en">English</option><option value="he">עברית</option></select></div><h1 id="ftueWelcomeTitle" tabindex="-1"></h1><p data-intro></p><h2 data-chapters-title></h2><ol data-chapters></ol><p class="ftue-safe" data-safe></p><div class="ftue-intro-actions"><button type="button" data-begin></button><button type="button" data-restart></button><button type="button" data-later></button></div></div>';
  root.querySelector('h1').textContent=c.welcome;root.querySelector('[data-intro]').textContent=c.intro;root.querySelector('[data-chapters-title]').textContent=c.chapters;root.querySelector('[data-safe]').textContent=c.saved;
  for(const [,en,he]of FTUE_CHAPTERS){const li=document.createElement('li');li.textContent=getCurrentLang()==='he'?he:en;root.querySelector('ol').append(li);}
  const resume=progress?.status==='active';root.querySelector('[data-begin]').textContent=resume?c.resume:c.begin;
  const restart=root.querySelector('[data-restart]');restart.textContent=c.restart;restart.hidden=!resume;
  root.querySelector('[data-later]').textContent=c.later;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  session={root,overflow,index:progress?.status==='active'?Math.max(0,FTUE_STEPS.findIndex(step=>step.id===progress.stepId)):0,completed:new Set(progress?.completed||[]),cleanups:[]};document.body.append(root);root.showModal();root.addEventListener('cancel',event=>{event.preventDefault();exit();});
  session.translate=()=>{const c=copy();root.dir=getCurrentLang()==='he'?'rtl':'ltr';root.querySelector('h1').textContent=c.welcome;root.querySelector('[data-intro]').textContent=c.intro;root.querySelector('[data-chapters-title]').textContent=c.chapters;root.querySelector('[data-safe]').textContent=c.saved;root.querySelector('[data-begin]').textContent=resume?c.resume:c.begin;root.querySelector('[data-restart]').textContent=c.restart;root.querySelector('[data-later]').textContent=c.later;root.querySelectorAll('ol li').forEach((li,index)=>li.textContent=FTUE_CHAPTERS[index][getCurrentLang()==='he'?2:1]);};
  root.querySelector('[data-ftue-language]').value=getCurrentLang()==='he'?'he':'en';root.querySelector('[data-ftue-language]').addEventListener('change',event=>setCurrentLang(event.target.value));
  root.querySelector('[data-begin]').addEventListener('click',()=>start(resume?FTUE_STEPS.findIndex(step=>step.id===progress.stepId):0,!resume));
  restart.addEventListener('click',()=>start(0,true));root.querySelector('[data-later]').addEventListener('click',()=>exit());
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();exit();}});
  root.querySelector('[data-begin]').focus();
 }
 function start(index,restart=false){
  beforeStart();const c=copy(),s=session;if(restart)s.completed.clear();s.index=Math.max(0,index);
  s.root.className='ftue-root';s.translate=null;s.root.replaceChildren();
  const frame=document.createElement('iframe');s.frame=frame;frame.className='ftue-frame';frame.title=c.practice;
  const url=new URL('./index.html',location.href);url.search='';url.searchParams.set('ftue-practice','1');url.searchParams.set('lang',getCurrentLang());frame.src=url.href;
  const spotlight=document.createElement('div');spotlight.className='ftue-spotlight';spotlight.setAttribute('aria-hidden','true');
  const card=document.createElement('section');card.className='ftue-card';card.setAttribute('aria-labelledby','ftueStepTitle');
  card.innerHTML='<header><span class="ftue-kicker" data-practice></span><p class="ftue-count" data-count></p><button type="button" data-navigation aria-expanded="false" aria-controls="ftueChapterNavigation"></button><button type="button" data-exit>×</button></header><div class="ftue-more" id="ftueChapterNavigation"><label class="ftue-chapter"><span data-chapter-label></span><select data-chapter></select></label><button type="button" data-focus></button></div><div class="ftue-progress"><span></span></div><div class="ftue-copy"><p class="ftue-context" data-context hidden></p><h2 id="ftueStepTitle" tabindex="-1"></h2><p data-body></p></div><p class="ftue-action-status" role="status" aria-live="polite"></p><div class="ftue-assist"><button type="button" data-helper></button></div><footer><button type="button" data-back></button><button type="button" data-skip></button><button type="button" data-next></button></footer>';
  s.card=card;s.spotlight=spotlight;s.root.append(frame,spotlight,card);
  card.querySelector('[data-practice]').textContent=c.practice;card.querySelector('[data-exit]').setAttribute('aria-label',c.exit);card.querySelector('[data-chapter-label]').textContent=c.chapter;
  for(const [id,en,he]of FTUE_CHAPTERS){const option=new Option(getCurrentLang()==='he'?he:en,id);card.querySelector('select').add(option);}
  card.querySelector('[data-exit]').addEventListener('click',()=>exit());card.querySelector('[data-back]').textContent=c.back;card.querySelector('[data-skip]').textContent=c.skip;
  card.querySelector('[data-helper]').textContent=c.helper;card.querySelector('[data-focus]').textContent=c.focus;card.querySelector('[data-navigation]').textContent=c.navigation;
  card.querySelector('[data-navigation]').addEventListener('click',()=>{const open=card.classList.toggle('ftue-navigation-open');card.querySelector('[data-navigation]').setAttribute('aria-expanded',String(open));});
  card.querySelector('[data-back]').addEventListener('click',()=>show(s.index-1));card.querySelector('[data-skip]').addEventListener('click',()=>advance());
  card.querySelector('[data-next]').addEventListener('click',()=>{if(!card.querySelector('[data-next]').disabled)advance();});
  card.querySelector('[data-helper]').addEventListener('click',()=>s.bridge?.open(FTUE_STEPS[s.index].helper));
  card.querySelector('[data-focus]').addEventListener('click',()=>s.bridge?.focus(FTUE_STEPS[s.index].target));
  card.querySelector('select').addEventListener('change',event=>{card.classList.remove('ftue-navigation-open');card.querySelector('[data-navigation]').setAttribute('aria-expanded','false');show(FTUE_STEPS.findIndex(step=>step.chapter===event.target.value));});
  layoutPracticeStage(s);card.querySelector('h2').textContent=c.loading;card.querySelector('[data-next]').disabled=true;card.querySelector('[data-next]').textContent=c.next;
  card.querySelector('[data-chapter]').disabled=true;card.querySelector('[data-back]').disabled=true;
  for(const selector of ['[data-skip]','[data-helper]','[data-focus]'])card.querySelector(selector).hidden=true;
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();exit();}};
  document.addEventListener('keydown',escape,true);s.cleanups.push(()=>document.removeEventListener('keydown',escape,true));
  const bind=()=>{
   if(!session||session!==s)return;
   let bridge;try{bridge=frame.contentWindow.fyiPractice;}catch{return;}
   if(!bridge)return;
   clearTimeout(s.loadTimer);s.bridge=bridge;
   const doc=frame.contentDocument;
   doc.addEventListener('keydown',escape,true);s.cleanups.push(()=>doc.removeEventListener('keydown',escape,true));
   s.timer=setInterval(update,80);show(s.index);
  };
  const waiting=setInterval(()=>{bind();if(s.bridge){clearInterval(waiting);}},80);s.cleanups.push(()=>clearInterval(waiting));
  s.loadTimer=setTimeout(()=>{if(session===s&&!s.bridge){clearInterval(waiting);card.querySelector('h2').textContent=c.error;}},20000);
 }
 function advance(){if(session.index===FTUE_STEPS.length-1)exit('complete');else show(session.index+1);}
 function show(index){
  const s=session;if(!s?.bridge)return;s.index=Math.max(0,Math.min(FTUE_STEPS.length-1,index));const step=FTUE_STEPS[s.index],c=copy(),card=s.card;
  s.bridge.prepare(step);s.bridge.watch(step.taskTarget||step.target);s.cursor=s.bridge.cursor();s.done=!step.task||s.completed.has(step.id);s.lastStatus=null;s.watchStarted=performance.now();
  persist('active',step.id,[...s.completed]);
  const context=card.querySelector('[data-context]');context.hidden=!step.name;context.textContent=step.name?.[getCurrentLang()==='he'?1:0]||'';
  const [title,body]=ftueText(step,getCurrentLang());card.querySelector('h2').textContent=title;card.querySelector('[data-body]').textContent=body;
  card.querySelector('[data-count]').textContent=`${c.step} ${s.index+1} ${c.of} ${FTUE_STEPS.length}`;
  card.querySelector('select').disabled=false;card.querySelector('select').value=step.chapter;card.querySelector('.ftue-progress span').style.width=`${(s.index+1)/FTUE_STEPS.length*100}%`;
  card.querySelector('[data-back]').disabled=s.index===0;card.querySelector('[data-helper]').hidden=!step.helper;card.querySelector('[data-helper]').textContent=step.helper?(getCurrentLang()==='he'?{palette:'פתיחת אוסף הפלטות',color:'פתיחת בורר המברשת',save:'פתיחת שמירה'}[step.helper]:{palette:'Open the palettes',color:'Open the brush picker',save:'Open Save'}[step.helper])||c.helper:c.helper;card.querySelector('[data-focus]').hidden=!step.task;
  card.querySelector('[data-next]').textContent=s.index===FTUE_STEPS.length-1?c.finish:c.next;card.querySelector('[data-skip]').hidden=!step.task;
  s.bridge.reveal(step.target);
  card.scrollTop=0;card.querySelector('.ftue-copy').scrollTop=0;update();card.querySelector('h2').focus({preventScroll:true});
 }
 function layoutPracticeStage(s){
  const width=s.root.clientWidth||innerWidth,height=s.root.clientHeight||innerHeight;
  const layout=width<760&&(height>=width||height>500)?'bottom':'side';
  const resized=s.stageWidth!==width||s.stageHeight!==height;
  s.stageWidth=width;s.stageHeight=height;s.root.dataset.layout=layout;
  if(layout==='bottom'){
   const extra=FTUE_STEPS[s.index]?.helper?44:0;
   const coach=Math.round(Math.min(284,Math.max(240,height*.28)+extra)),stage=height-coach;
   Object.assign(s.frame.style,{left:'0px',top:'0px',width:width+'px',height:stage+'px'});
   Object.assign(s.card.style,{left:'0px',top:stage+'px',width:width+'px',height:coach+'px',maxHeight:coach+'px'});
  }else{
   const coach=Math.round(Math.min(360,Math.max(280,width*.32))),stage=width-coach;
   Object.assign(s.frame.style,{left:'0px',top:'0px',width:stage+'px',height:height+'px'});
   Object.assign(s.card.style,{left:stage+'px',top:'0px',width:coach+'px',height:height+'px',maxHeight:height+'px'});
  }
  if(resized&&s.bridge)requestAnimationFrame(()=>{if(session===s)s.bridge.reveal(FTUE_STEPS[s.index].target);});
  return {layout,width,height};
 }
 function update(){
  const s=session;if(!s?.bridge)return;layoutPracticeStage(s);const step=FTUE_STEPS[s.index],c=copy(),target=s.bridge.visible(step.target),card=s.card;
  if(!s.done&&step.task){
   const [type,...rest]=step.task.split(':'),value=rest.join(':');let done=false;
   if(type==='watch'){const state=s.bridge.read();done=state.playing&&performance.now()-s.watchStarted>=900&&(state.armed==='breathe'||state.generation>=2);}
   else if(type==='visible')done=!!s.bridge.visible(value);
   else if(type==='state'){const state=s.bridge.read();done=value==='playing'?state.playing:value==='paused'?!state.playing:value==='simulation'?state.simulation:state.armed===value.slice(6);done=done&&s.bridge.happened('click',step.target,s.cursor);}
   else done=s.bridge.happened(type,step.taskTarget||step.target,s.cursor);
   if(done){s.done=true;s.completed.add(step.id);persist('active',step.id,[...s.completed]);}
  }
  card.querySelector('[data-next]').disabled=!s.done;card.querySelector('[role=status]').hidden=!step.task||(!s.done&&step.task!=='watch'&&!!target);
  const status=!target&&!s.done?'unavailable':step.task?(s.done?'success':step.task==='watch'?'watching':'waiting'):'read';
  if(status!==s.lastStatus){card.querySelector('[role=status]').textContent=step.task==='watch'&&s.done?(getCurrentLang()==='he'?'אפשר להמשיך לצפות או לעבור הלאה.':'Keep watching, or continue when you like.'):c[status];card.querySelector('[role=status]').classList.toggle('is-done',status==='success');s.lastStatus=status;}
  // The highlight is clipped to the app viewport. It never covers the coach,
  // and never darkens or blocks surrounding controls or modal scrolling.
  const frame=s.frame.getBoundingClientRect(),local=target?.getBoundingClientRect();
  const left=local?Math.max(frame.left+3,local.left+frame.left-5):0;
  const top=local?Math.max(frame.top+3,local.top+frame.top-5):0;
  const right=local?Math.min(frame.right-3,local.right+frame.left+5):0;
  const bottom=local?Math.min(frame.bottom-3,local.bottom+frame.top+5):0;
  s.spotlight.hidden=!target||right<=left||bottom<=top;
  Object.assign(s.spotlight.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
 }

 entries.forEach(button=>button.addEventListener('click',()=>welcome(button)));
 reset?.addEventListener('click',()=>{try{storage.removeItem(FTUE_STORAGE_KEY);progress=null;if(resetStatus)resetStatus.textContent=copy().resetDone;}catch{if(resetStatus)resetStatus.textContent=copy().storage;}});
 onLanguageChange(refresh);refresh();
 if(!progress||new URLSearchParams(location.search).get('tour')==='1')welcome();
 return {open:welcome};
}
