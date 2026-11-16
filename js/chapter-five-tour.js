// Live creation uses the same native board and engines throughout the chapter.
export const CHAPTER_FIVE_MAIN_STEPS=['live-play','live-sort-one','live-sort-two','live-brush','live-draw','live-islands','live-gravity','live-variation','live-wind','live-wave','live-brush-return','live-pause'];
export const CHAPTER_FIVE_STEPS=[...CHAPTER_FIVE_MAIN_STEPS,'live-explore'];
export const CHAPTER_FIVE_ENGINES=['gameOfLife','sandpile','magnet','brightnessEvo','erosion','nudgeBrighter','contour','network','gravitationalSort','islands'];
const COPY={
 he:{chapter:'פרק 5 · יוצרים תוך כדי ריצה',next:'לפרק 5 · יוצרים תוך כדי ריצה',replay:'הדרכת כניסה ראשונה · פרקים 1–5',play:'התנועה פתוחה לשינוי',playBody:'לחצו על ניגון. הפעם לא רק נצפה — ניצור בתוך התנועה.',restart:'לחצו על ניגון כדי להמשיך לעבוד בתוך התנועה.',sort:'אותם צבעים, סדר אחר',sortOne:'החליפו את שיטת המיון בזמן שהגרביטציה פועלת. התבוננו בדרך שבה הצבעים מגיבים.',sortTwo:'נסו עוד שיטת מיון והשוו. המנוע ממשיך לפעול על אותו לוח.',currentSort:'הסדר הפעיל:',sortDone:'הסדר השתנה. התבוננו עוד רגע בתנועה לפני שממשיכים.',brush:'צבע לתוך התנועה',brushBody:'החליקו את עיגול המברשת למעלה ובחרו צבע. האבולוציה ממשיכה לפעול גם כשהבורר פתוח.',choose:'בחרו צבע יחיד מתוך הפלטה.',close:'הצבע נטען. סגרו את הבורר כדי לחזור לתנועה.',draw:'מציירים כשהלוח זז',drawBody:'גררו קו על הלוח. הצבע שבחרתם משתלב ביצירה שממשיכה להתפתח.',islands:'דרך אחרת לנוע',islandsBody:'בחרו איים. אותם צבעים יקבלו דרך אחרת לנוע, בלי להתחיל ציור חדש.',gravity:'חוזרים לגרביטציה',gravityBody:'בחרו שוב גרביטציה. אחר כך נכיר תנועה נוספת של אותו מנוע.',variation:'אותו מנוע, תנועה נוספת',variationBody:'לחצו שוב על גרביטציה. האייקון משתנה, ואיתו דרך התנועה.',wind:'שולחים גל',windBody:'הפעילו את כפתור הגלים. כלי הגלים יחליף זמנית את המברשת, והאבולוציה תמשיך לפעול.',wave:'נגיעה שמניעה גל',waveBody:'געו בלוח וצפו בגל שעובר דרך הצבעים. אפשר לנסות גם גרירה.',return:'חוזרים למברשת',returnBody:'החליקו את כפתור הגלים למטה. הגלים ייפסקו, המברשת תחזור והאבולוציה תמשיך.',pause:'בוחרים את הרגע',pauseBody:'השהו ברגע שאוהבים. אחר כך תוכלו לסיים את ההדרכה או להמשיך לחקור אבולוציות נוספות.',pauseFirst:'הפעילו ניגון, ואז השהו ברגע שתבחרו.',pauseDone:'הרגע נעצר. אפשר להמשיך ליצור לבד או להכיר עוד דרכים שבהן הלוח מתפתח.',explore:'עוד אבולוציות',exploreBody:'בחרו מנוע מהכפתורים, נגנו, ציירו והתבוננו. כל מנוע נותן לצבעים דרך אחרת להתפתח על אותו לוח. אפשר לסיים מתי שתרצו.',engine:'המנוע הפעיל:',finish:'סיום ההדרכה',done:'השינוי השתלב. אפשר להתבונן עוד רגע, או להמשיך.',gravityNeeded:'בחרו גרביטציה כדי לנסות את ההשפעה של סדר הצבעים.',open:'לחצו על כפתור המעבר כדי לחזור לאבולוציה.'},
 en:{chapter:'Chapter 5 · Create while it runs',next:'Chapter 5 · Create while it runs',replay:'First visit · Chapters 1–5',play:'Movement you can shape',playBody:'Press Play. This time, we’ll do more than watch — we’ll create within the movement.',restart:'Press Play to keep creating within the movement.',sort:'The same colors, another order',sortOne:'Change the color order while Gravity runs. Watch how the colors respond.',sortTwo:'Try another order and compare. The engine keeps working on the same board.',currentSort:'Current order:',sortDone:'The order changed. Watch the movement for a moment before continuing.',brush:'Color into movement',brushBody:'Drag the brush circle upward and choose a color. Evolution keeps running while the picker is open.',choose:'Choose a single palette color.',close:'Your color is loaded. Close the picker to return to the movement.',draw:'Draw while the board moves',drawBody:'Drag a line on the board. Your chosen color joins the drawing as it continues to evolve.',islands:'Another way to move',islandsBody:'Choose Islands. The same colors will move another way, without starting a new drawing.',gravity:'Back to Gravity',gravityBody:'Choose Gravity again. Next, we’ll try another variation of that engine.',variation:'One engine, another movement',variationBody:'Click Gravity again. Its icon changes, along with the way the colors move.',wind:'Send a wave',windBody:'Switch on Waves. The wave tool temporarily takes the brush’s place while evolution keeps running.',wave:'A touch sets a wave in motion',waveBody:'Touch the board and watch a wave travel through the colors. You can also try dragging.',return:'Back to the brush',returnBody:'Drag Waves downward. The waves stop, the brush returns, and evolution keeps going.',pause:'Choose your moment',pauseBody:'Pause when you like what you see. Then finish the tutorial or explore more evolutions.',pauseFirst:'Press Play, then pause at a moment you choose.',pauseDone:'Your moment is held. Continue creating on your own, or discover more ways for the board to evolve.',explore:'More evolutions',exploreBody:'Choose an engine, play, draw and watch. Discover different movements on this same board. Finish whenever you like.',engine:'Current engine:',finish:'Finish tutorial',done:'Your change joined the movement. Watch a little longer, or continue.',gravityNeeded:'Choose Gravity to explore how color order affects it.',open:'Click the panel switch to return to Evolution.'}
};
export const chapterFiveCopy=lang=>COPY[lang]||COPY.en;
export function chapterFiveView({id,state,events,context,b,language}){
 const c=chapterFiveCopy(language),actions=events.filter(e=>e.type==='evolution-action');
 let title='',body='',status='',target='#boardCanvas',done=false;
 const live=button=>actions.filter(e=>e.id===button&&e.before.playing&&e.after.playing);
 const picker=b.visible('#colorPickerModal.modal-visible');
 if(id==='live-explore')return {title:c.explore,body:`${c.exploreBody}${state.engineName?' '+c.engine+' '+state.engineName:''}`,status:'',target:'#boardCanvas',done:true};
 if(id==='live-pause'){
  done=!state.playing&&actions.some(e=>e.id==='btnPlayPauseLife'&&e.before.playing&&!e.after.playing);
  return {title:c.pause,body:done?c.pauseDone:state.playing?c.pauseBody:c.pauseFirst,status:'',target:done?'#boardCanvas':'#btnPlayPauseLife',done};
 }
 if(!state.simMode)return {title:c.play,body:c.open,status:'',target:'#btnToggleSimMode',done:false};
 if(!state.armedSimulation)return {title:c.gravity,body:c.gravityNeeded,status:'',target:'#btnGravitationalSort',done:false};
 if(!state.playing)return {title:c.play,body:id==='live-play'?c.playBody:c.restart,status:'',target:'#btnPlayPauseLife',done:false};
 if(id==='live-play'){
  title=c.play;body=c.playBody;done=state.generation>0&&actions.some(e=>e.id==='btnPlayPauseLife'&&!e.before.playing&&e.after.playing);
 }else if(id==='live-sort-one'||id==='live-sort-two'){
  title=c.sort;body=`${id==='live-sort-one'?c.sortOne:c.sortTwo} ${c.currentSort} ${state.sortName}.`;target='#btnCycleSort';
  if(state.armedSimulation!=='gravitationalSort'){body=c.gravityNeeded;target='#btnGravitationalSort';}
  else done=live('btnCycleSort').some(e=>e.before.sortMethod!==e.after.sortMethod);status=done?c.sortDone:'';
 }else if(id==='live-brush'||id==='live-draw'){
  title=id==='live-brush'?c.brush:c.draw;body=id==='live-brush'?c.brushBody:c.drawBody;
  context.opened=context.opened||!!picker;context.selected=context.selected||events.some(e=>e.type==='color-select');
  const single=state.selectedColorIndex>=0&&!state.rainbow;
  if(picker){target=single&&context.selected?'#btnColorPickerCloseTop':'#colorPickerSwatches';body=single&&context.selected?c.close:c.choose;}
  else if(id==='live-brush'){target='#btnColorPicker';done=!!context.opened&&!!context.selected&&single;}
  else if(!single){target='#btnColorPicker';body=c.brushBody;}
  else {
   const applied=events.some(e=>e.type==='brush-applied'&&e.playing&&e.selectedColorIndex>=0&&!e.windMode);
   done=applied&&events.some(e=>e.type==='stroke'&&e.playing&&!e.windMode&&e.selectedColorIndex>=0);
  }
 }else if(id==='live-islands'){
  title=c.islands;body=c.islandsBody;target='#btnIslands';done=state.armedSimulation==='islands'&&live('btnIslands').some(e=>e.after.armedSimulation==='islands');
 }else if(id==='live-gravity'){
  title=c.gravity;body=c.gravityBody;target='#btnGravitationalSort';done=state.armedSimulation==='gravitationalSort'&&live('btnGravitationalSort').some(e=>e.before.armedSimulation==='islands'&&e.after.armedSimulation==='gravitationalSort');
 }else if(id==='live-variation'){
  title=c.variation;body=c.variationBody;target='#btnGravitationalSort';done=state.armedSimulation==='gravitationalSort'&&live('btnGravitationalSort').some(e=>e.before.armedSimulation==='gravitationalSort'&&e.after.armedSimulation==='gravitationalSort'&&e.before.gravityMode!==e.after.gravityMode);
 }else if(id==='live-wind'){
  title=c.wind;body=c.windBody;target='#btnWind';done=state.windMode&&state.windEffect==='ripple'&&live('btnWind').length>0;
 }else if(id==='live-wave'){
  title=c.wave;body=c.waveBody;
  if(!state.windMode||state.windEffect!=='ripple'){target='#btnWind';body=c.windBody;}
  else done=events.some(e=>e.type==='wave-created'&&e.playing&&e.windEffect==='ripple');
 }else if(id==='live-brush-return'){
  title=c.return;body=c.returnBody;target='#btnWind';done=!state.windMode&&events.some(e=>e.type==='control-gesture'&&e.id==='btnWind'&&e.direction==='down'&&e.state.playing);
 }
 if(done){target='#boardCanvas';status=status||c.done;}
 return {title,body,status,target,done};
}
