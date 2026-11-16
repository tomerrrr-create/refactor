// Chapter four observes the app's real engine and playback controls.
export const CHAPTER_FOUR_STEPS=['evolution-door','evolution-shuffle','evolution-engine','evolution-step','evolution-play','evolution-pause'];
const COPY={
 he:{chapter:'פרק 4 · מנוע, דור אחד וריצה',next:'לפרק 4 · מנוע, דור אחד וריצה',replay:'הדרכת כניסה ראשונה · פרקים 1–4',door:'דלת בין יצירה לאבולוציה',doorOut:'לחיצה קצרה עוברת בין יצירה לאבולוציה; ההחזקה שכבר ניסיתם מכינה את הלוח מחדש. לחצו פעם אחת כדי לחזור ליצירה.',doorBack:'הציור נשאר כאן. לחצו שוב על אותו כפתור כדי לחזור לאבולוציה.',doorDone:'החלפנו את הכלים. הציור נשאר כפי שהיה.',shuffle:'מתחילים מתערובת צבעים',shuffleBody:'לחצו על אקראי, כמו שכבר ניסיתם. ערבוב חדש יאפשר לראות איך החוקים פועלים על כל הלוח.',engine:'נותנים ללוח חוק',engineBody:'בחרו בגרביטציה. במקום לשנות משבצת אחת ביד, ניתן עכשיו חוק ללוח כולו.',engineDone:'גרביטציה נבחרה. עכשיו זמינים ניגון ודור אחד (I). הלוח עדיין מושהה — נתחיל מדור אחד.',step:'שינוי אחד בכל לחיצה',stepBody:'לחצו על דור אחד (I) וראו שינוי קטן. לחצו שוב, ועוד פעם — כל לחיצה מקדמת את הלוח בדור נוסף.',stepDone:'שלושה דורות, בשלוש לחיצות. הלוח נשאר מושהה ביניהן. אפשר להמשיך ללחוץ ולהתבונן.',play:'הציור ממשיך בעצמו',playBody:'ניגון ממשיך מדור לדור בלי לעצור. הפעילו אותו וראו מה מצטבר.',playing:'אותו לוח, עוד ועוד דורות. אפשר להתבונן, וכשתרצו להמשיך — לחצו על המשך.',pause:'עוצרים כשבוחרים',pauseBody:'אפשר לעצור בכל רגע. לחצו על השהיה כדי להשאיר את הלוח במצב הנוכחי.',playFirst:'הפעילו ניגון, ואז השהו אותו כדי להתנסות בעצירה.',pauseDone:'אתם בוחרים את הקצב: דור אחד, ניגון רציף או השהיה.',open:'לחצו על כפתור המעבר כדי לפתוח את מצב האבולוציה.',done:'הערבוב מוכן. עכשיו נבחר מנוע.'},
 en:{chapter:'Chapter 4 · An engine, one generation and playback',next:'Chapter 4 · An engine, one generation and playback',replay:'First visit · Chapters 1–4',door:'A door between creation and evolution',doorOut:'A short click switches between creation and evolution; the hold you tried prepares a fresh board. Click once to return to creation.',doorBack:'Your drawing is still here. Click the same button again to return to evolution.',doorDone:'The tools changed. Your drawing stayed in place.',shuffle:'Begin with a mix of colors',shuffleBody:'Click Random, just as you did earlier. A fresh mix lets you see how the rules act across the whole board.',engine:'Give the board a rule',engineBody:'Choose Gravity. Instead of changing one square by hand, we’ll give the whole board a rule.',engineDone:'Gravity is selected. Play and One generation (I) are now available. The board is still paused — let’s begin with one generation.',step:'One change with each click',stepBody:'Click One generation (I) and notice a small change. Click again, and once more — each click advances the board by another generation.',stepDone:'Three generations, in three clicks. The board stayed paused between them. Keep clicking and watching if you like.',play:'The drawing keeps going',playBody:'Play advances from generation to generation without stopping. Start it and watch the changes build.',playing:'The same board, generation after generation. Watch for a while, then click Continue when you’re ready.',pause:'Stop when you choose',pauseBody:'You can stop at any time. Click Pause to leave the board in its current state.',playFirst:'Start playback, then pause it to try stopping the board.',pauseDone:'You choose the pace: one generation, continuous playback, or a pause.',open:'Click the panel switch to open Evolution.',done:'Your mix is ready. Now choose an engine.'}
};
export const chapterFourCopy=language=>COPY[language]||COPY.en;
export function chapterFourView({id,state,events,context,language}){
 const c=chapterFourCopy(language),actions=events.filter(e=>e.type==='evolution-action');
 const used=button=>actions.filter(e=>e.id===button);
 let title='',body='',status='',target='#boardCanvas',done=false;
 if(id==='evolution-door'){
  context.sawCreation=context.sawCreation||!state.simMode&&used('btnToggleSimMode').length>0;
  done=!!context.sawCreation&&state.simMode&&used('btnToggleSimMode').length>=2;
  title=c.door;body=context.sawCreation?c.doorBack:c.doorOut;status=done?c.doorDone:'';target='#btnToggleSimMode';
 }else if(!state.simMode){
  return {title:c.door,body:c.open,target:'#btnToggleSimMode',done:false,status:''};
 }else if(id==='evolution-shuffle'){
  title=c.shuffle;body=c.shuffleBody;target='#btnRandom';done=used('btnRandom').some(e=>e.changed&&!e.after.playing);status=done?c.done:'';
 }else if(id==='evolution-engine'){
  title=c.engine;body=c.engineBody;target='#btnGravitationalSort';
  done=state.armedSimulation==='gravitationalSort'&&!state.playing&&state.playEnabled&&state.stepEnabled;
  status=done?c.engineDone:'';
 }else if(state.armedSimulation!=='gravitationalSort'){
  return {title:c.engine,body:c.engineBody,target:'#btnGravitationalSort',done:false,status:''};
 }else if(id==='evolution-step'){
  title=c.step;body=c.stepBody;target='#btnStepForward';
  const steps=used('btnStepForward').filter(e=>e.before.armedSimulation==='gravitationalSort'&&!e.before.playing&&!e.after.playing);
  done=steps.length>=3&&!state.playing;status=done?c.stepDone:'';
  if(state.playing){target='#btnPlayPauseLife';body=c.pauseBody;}
 }else if(id==='evolution-play'){
  title=c.play;body=state.playing?c.playing:c.playBody;target=state.playing?'#boardCanvas':'#btnPlayPauseLife';
  context.started=context.started||used('btnPlayPauseLife').some(e=>!e.before.playing&&e.after.playing);
  done=!!context.started&&state.playing&&state.generation>=3;
 }else if(id==='evolution-pause'){
  title=c.pause;target='#btnPlayPauseLife';
  context.sawPlaying=context.sawPlaying||state.playing||used('btnPlayPauseLife').some(e=>e.before.playing);
  body=context.sawPlaying?c.pauseBody:c.playFirst;
  done=!!context.sawPlaying&&!state.playing&&used('btnPlayPauseLife').some(e=>e.before.playing&&!e.after.playing);status=done?c.pauseDone:'';
 }
 if(done)target='#boardCanvas';
 return {title,body,status,target,done};
}
