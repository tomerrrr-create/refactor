// Chapter three observes native actions; it never simulates a learner's click.
const step=(id,kind,he,en,bodyHe,bodyEn,extra={})=>({id,kind,he,en,bodyHe,bodyEn,...extra});
export const CHAPTER_THREE_LESSONS=[
 step('source-drag','draw','הצבע כבר על הלוח','The color is already here','העיגול הריק אומר שלא בחרתם צבע. גררו מתוך משבצת צבעונית: הקו ייקח את הצבע שממנו התחלתם.','An empty circle means no color is selected. Drag from a colored square: your line takes its starting color.',{empty:true}),
 step('load-color','picker','צבע משלכם','Choose your color','החליקו את עיגול המברשת למעלה, בחרו צבע וסגרו את הבורר.','Drag the brush circle upward, choose a color, then close the picker.',{select:true}),
 step('cycle-color','cycle','מחליפים צבע בנגיעה','A touch of another color','לחצו על עיגול המברשת כמה פעמים. בכל לחיצה נטען הצבע הבא בפלטה.','Click the brush circle a few times. Each click loads the next palette color.'),
 step('paint-try','draw','הצבע שבחרתם הולך איתכם','Take your color with you','גררו קו על הלוח. הפעם הוא נצבע בצבע הקבוע שבחרתם.','Drag a line on the board. This time it uses the color you selected.',{single:true}),
 step('clear-color','clear','חוזרים לצבעי הלוח','Back to the board’s colors','החליקו את העיגול למטה כדי לרוקן את המברשת. הציור נשאר כפי שהוא.','Drag the circle downward to clear its color. Your drawing stays in place.'),
 step('brush-up','picker','מעלה — פותחים','Up opens the picker','ננסה שוב: החליקו את העיגול למעלה ופתחו את הבורר. אחר כך סגרו אותו.','Try it again: drag the circle upward to open the picker, then close it.'),
 step('brush-down','clear','מטה — מרוקנים','Down clears the color','החליקו את העיגול למטה. המחווה מבטלת צבע נבחר וגם את מצב כל הצבעים.','Drag the circle downward. This clears a selected color and the all-colors mode.'),
 step('brush-right','size','ימינה — משנים גודל','Right changes the size','החליקו את העיגול ימינה כדי לשנות את גודל המברשת.','Drag the circle to the right to change the brush size.',{direction:'right'}),
 step('brush-left','size','שמאלה — בכיוון ההפוך','Left goes the other way','החליקו את העיגול שמאלה כדי לשנות את גודל המברשת בכיוון ההפוך.','Drag the circle to the left to change the brush size in the other direction.',{direction:'left'}),
 step('brush-first','hold-draw','צבע הפתיחה','The first color','החזיקו את העיגול עד שנטען הצבע הראשון, ואז שחררו. זהו צבע הפתיחה לפי הסדר הפעיל.','Hold the circle until the first color is loaded, then release. This is the opening color in the current order.'),
 step('brush-rainbow','hold-draw','כל הצבעים במברשת אחת','All colors in one brush','הפעם החזיקו את העיגול זמן ארוך יותר, עד שמופיעה קשת.','This time hold the circle longer, until a rainbow appears.',{rainbow:true}),
 step('single-color','paint','צבע אחד, בכמה מקומות','One color, many places','בחרו שוב צבע יחיד בעיגול או בבורר, ואז לחצו על כמה משבצות. כולן יקבלו את הצבע שבחרתם.','Choose one color again using the circle or picker, then click a few squares. They take your selected color.'),
 step('copy-color','copy','לוקחים צבע ממקום אחר','Borrow a color','לחצו על משולש מצבי המברשת עד למצב העתקה.','Click the brush-mode triangle until you reach Copy.'),
 step('sym-off','symmetry','קו אחד','One line','חזרנו לציור רציף, ללא סימטריה. ציירו קו קצר: רק התנועה שלכם מופיעה.','Back to continuous drawing with symmetry off. Draw a short line: only your own stroke appears.',{mode:'off'}),
 step('sym-vertical','symmetry','שיקוף מעל ומתחת','Above and below','לחצו על כפתור הסימטריה למצב אנכית.','Click Symmetry to choose Vertical.',{mode:'vertical',drawHe:'ציירו קו קצר. הוא משתקף מעל ומתחת לאמצע הלוח.',drawEn:'Draw a short line. It mirrors above and below the board’s center.'}),
 step('sym-horizontal','symmetry','שיקוף מימין ומשמאל','Left and right','לחצו שוב על סימטריה, למצב אופקית.','Click Symmetry again for Horizontal.',{mode:'horizontal',drawHe:'ציירו קו קצר. הפעם השיקוף הוא בין ימין לשמאל.',drawEn:'Draw a short line. This time it mirrors from left to right.'}),
 step('sym-mandala','symmetry','התנועה מתרבה','Your movement multiplies','לחצו שוב על סימטריה, למצב מנדלה.','Click Symmetry again for Mandala.',{mode:'mandala',drawHe:'ציירו קו. שני השיקופים יחד יוצרים עד ארבעה עותקים.',drawEn:'Draw a line. Both mirrors together create up to four copies.'}),
 step('sym-kaleidoscope','symmetry','עוד ממד של שיקוף','Another dimension of reflection','לחצו שוב על סימטריה, למצב קליידוסקופ.','Click Symmetry again for Kaleidoscope.',{mode:'kaleidoscope',drawHe:'ציירו קו. שיקופים אלכסוניים יוצרים עד שמונה עותקים.',drawEn:'Draw a line. Diagonal reflections create up to eight copies.'}),
 step('sym-clear','sym-clear','חוזרים לקו יחיד','Back to a single line','החליקו את כפתור הסימטריה למעלה כדי לכבות את השיקופים.','Drag Symmetry upward to switch the reflections off.'),
 step('sym-hold','sym-hold','ישר לקליידוסקופ','Straight to Kaleidoscope','החזיקו את כפתור הסימטריה כדי לבחור קליידוסקופ ישירות. תוכלו לבחור אחר כך כל מצב שתרצו.','Hold Symmetry to go straight to Kaleidoscope. You can choose any mode afterward.'),
 step('separators','separators','נותנים לצבעים להתחבר','Let the colors meet','לחצו על מפרידים עד שהמרווחים נעלמים. בלוח גדול נצייר בלי מפרידים כלל.','Click Separators until the gaps disappear. On a large board, we’ll draw without separators.'),
 step('resize-grow','grow','מקום לעוד ריבועים','Room for more squares','לחצו על + כדי להוסיף ריבועים. הציור נשמר ואינו נמתח.','Click + to add squares. Your drawing is kept, without stretching.'),
 step('resize-dialog','resize-dialog','בדיוק בגודל שלכם','Your exact size','החליקו את + למעלה כדי לפתוח בחירת גודל מדויק. רק הציצו וסגרו את החלון.','Drag + upward to open the exact-size window. Take a look, then close it.'),
 step('resize-minus','resize-direction','מהגדלה להקטנה','From larger to smaller','החליקו את כפתור הגודל למטה. + הופך ל־−, בלי לשנות את הלוח.','Drag the size button downward. + becomes − without changing the board.',{increasing:false}),
 step('resize-plus','resize-direction','מחזירים את הפלוס','Bring back the plus','החליקו שוב למטה כדי להחזיר את +. אין צורך להקטין את הלוח.','Drag downward again to bring back +. There’s no need to shrink the board.',{increasing:true}),
 step('palette-rich','rich','יותר גוונים לציור','More shades to paint with','פתחו את אוסף הפלטות בהחלקת כפתור הפלטה למטה. נבחר פלטה עשירה לקראת הלוח הגדול.','Drag Palette downward to open the collection. Let’s choose a richer palette for the large board.'),
 step('prepare-large','prepare','מפנים מקום ליצירה','Make room to create','כעת נכין מחדש את הלוח. החזיקו את כפתור המעבר לאבולוציה: ייפתח לוח גדול וכהה, בלי מפרידים ועם מברשת מוכנה. הפלטה והסימטריה שבחרתם יישארו.','Now we’ll prepare a fresh board. Hold the Evolution switch for a large, dark board with no separators and a ready brush. Your palette and symmetry are kept.'),
 step('free-draw','free','עכשיו, משהו משלכם','Now make it yours','זה המקום לנסות. החליקו את העיגול למעלה, בחרו גודל למברשת, סגרו וציירו משהו משלכם. אפשר לבטל ולהחזיר עם החצים.','This is your space to explore. Drag the circle upward, choose a brush size, close the picker, and draw something of your own. Use the arrows to undo and redo.')
];
export const CHAPTER_THREE_STEPS=CHAPTER_THREE_LESSONS.map(step=>step.id);
const COPY={he:{chapter:'פרק 3 · צבע, גרירה וציור',next:'לפרק 3 · צבע, גרירה וציור',replay:'הדרכת כניסה ראשונה · פרקים 1–3',draw:'עכשיו ציירו קו קצר על הלוח וראו את התוצאה.',close:'הבחירה מוכנה. סגרו את הבורר כדי לחזור ללוח.',choose:'בחרו צבע מתוך הפלטה. הוא ייטען למברשת.',copy:'גררו ממשבצת אחת לאחרת. צבע המקור מועתק ליעד, והמקור נשאר במקומו.',richGroup:'בחרו בקבוצת 264 שבחלק העליון של החלון.',richChoose:'בחרו ״צעיף הזוהר״ (Northern Lights HD), או פלטה אחרת מקבוצת 264.',richApply:'לחצו על החלה כדי לעבור לפלטה שבחרתם.',done:'יפה. אפשר להמשיך, או להתנסות עוד רגע.',ready:'הלוח הגדול מוכן. 249×249 ריבועים, ללא מפרידים.',finished:'הציור שלכם מוכן להמשיך מכאן. בפרק הבא נכיר את האבולוציה של הלוח.'},en:{chapter:'Chapter 3 · Color, dragging and drawing',next:'Chapter 3 · Color, dragging and drawing',replay:'First visit · Chapters 1–3',draw:'Now draw a short line on the board and see what happens.',close:'Your choice is ready. Close the picker to return to the board.',choose:'Choose a palette color to load it into the brush.',copy:'Drag from one square to another. Its color is copied to the destination; the source stays in place.',richGroup:'Choose the 264 group at the top of the window.',richChoose:'Choose Aurora Veil (Northern Lights HD), or another palette from the 264 group.',richApply:'Click Apply to use your chosen palette.',done:'That’s it. Continue, or explore a little longer.',ready:'The large board is ready: 249×249 squares, without separators.',finished:'Your drawing is ready to continue from here. In the next chapter, we’ll explore the board’s evolution.'}};
export const chapterThreeCopy=lang=>COPY[lang]||COPY.en;
export function chapterThreeView({id,state,events,context,b,language}){
 const lesson=CHAPTER_THREE_LESSONS.find(step=>step.id===id),he=language==='he',c=chapterThreeCopy(language);
 let title=he?lesson.he:lesson.en,body=he?lesson.bodyHe:lesson.bodyEn,target='#boardCanvas',done=false;
 const gestures=events.filter(e=>e.type==='control-gesture'),strokes=events.filter(e=>e.type==='stroke'&&e.changed);
 const gesture=(button,direction)=>gestures.find(e=>e.id===button&&e.direction===direction);
 const held=button=>gestures.findLast(e=>e.id===button&&e.direction==='hold');
 const picker=b.visible('#colorPickerModal.modal-visible');
 const drawAfter=sequence=>strokes.some(e=>e.sequence>sequence);
 if(lesson.kind==='draw'){
  done=strokes.some(e=>e.brushMode==='continuous'&&(lesson.empty?e.selectedColorIndex===-1&&!e.rainbow:e.selectedColorIndex>=0&&!e.rainbow));
  if(lesson.empty&&(state.selectedColorIndex>=0||state.rainbow)){target='#btnColorPicker';body=he?'החליקו את העיגול למטה כדי לחזור למברשת ריקה, ואז גררו צבע מהלוח.':'Drag the circle downward to clear its color, then drag a color from the board.';}
  if(lesson.single&&(state.selectedColorIndex<0||state.rainbow)){target=picker?'#colorPickerSwatches':'#btnColorPicker';body=he?'בחרו צבע יחיד בלחיצה על העיגול, או פתחו את הבורר בהחלקה למעלה.':'Choose one color by clicking the circle, or open the picker by dragging upward.';}
  if(picker&&state.selectedColorIndex>=0&&!state.rainbow)target='#btnColorPickerCloseTop';
 }

 if(lesson.kind==='picker'){
  context.opened=context.opened||!!picker;context.selected=context.selected||events.some(e=>e.type==='color-select');
  const selected=context.selected&&state.selectedColorIndex>=0&&!state.rainbow;
  done=context.opened&&!picker&&(!lesson.select||selected);
  target=picker?(lesson.select&&!selected?'#colorPickerSwatches':'#btnColorPickerCloseTop'):'#btnColorPicker';
  if(picker)body=lesson.select&&!selected?c.choose:c.close;
 }
 if(lesson.kind==='cycle'){target='#btnColorPicker';done=gestures.filter(e=>e.id==='btnColorPicker'&&e.direction==='tap').length>=2&&state.selectedColorIndex>=0&&!state.rainbow;}
 if(lesson.kind==='clear'){target='#btnColorPicker';done=!!gesture('btnColorPicker','down')&&state.selectedColorIndex===-1&&!state.rainbow;}
 if(lesson.kind==='size'||lesson.kind==='hold-draw'){
  const action=lesson.kind==='size'?gesture('btnColorPicker',lesson.direction):held('btnColorPicker');
  const ready=!!action&&(lesson.kind==='size'||(lesson.rainbow?action.state.rainbow:action.state.selectedColorIndex===0&&!action.state.rainbow));
  target=ready?'#boardCanvas':'#btnColorPicker';if(ready)body=c.draw;
  done=ready&&drawAfter(action.sequence);
 }
 if(lesson.kind==='paint'){
  const ready=state.selectedColorIndex>=0&&!state.rainbow;target=ready?'#boardCanvas':picker?'#colorPickerSwatches':'#btnColorPicker';
  done=events.filter(e=>e.type==='tile'&&e.selectedColorIndex>=0&&!e.rainbow&&e.changed).length>=3;
  if(picker)target=ready?'#btnColorPickerCloseTop':'#colorPickerSwatches';
  done=done&&!picker;
 }
 if(lesson.kind==='copy'){
  const ready=state.brushMode==='copy';target=ready?'#boardCanvas':'#btnBrushMode';if(ready)body=c.copy;
  done=strokes.some(e=>e.brushMode==='copy'&&e.color===e.sourceColor&&e.sourceAfter===e.sourceColor);
 }
 if(lesson.kind==='symmetry'){
  const ready=state.symmetryMode===lesson.mode;target=ready?'#boardCanvas':'#btnSymmetry';
  if(ready&&lesson.mode!=='off')body=he?lesson.drawHe:lesson.drawEn;
  done=strokes.some(e=>e.symmetryMode===lesson.mode&&e.brushMode==='continuous');
 }
 if(lesson.kind==='sym-clear'){target='#btnSymmetry';done=!!gesture('btnSymmetry','up')&&state.symmetryMode==='off';}
 if(lesson.kind==='sym-hold'){target='#btnSymmetry';done=!!held('btnSymmetry')&&state.symmetryMode==='kaleidoscope';}
 if(lesson.kind==='separators'){target='#btnGap';done=state.separatorPx===0;}
 if(lesson.kind==='grow'){target='#btnResizeUp';done=state.n>=27&&!!gesture('btnResizeUp','tap');}
 if(lesson.kind==='resize-dialog'){
  const modal=b.visible('#resizeModal.modal-visible');context.opened=context.opened||!!modal;
  target=modal?'#btnResizeModalClose':'#btnResizeUp';done=context.opened&&!modal;
 }
 if(lesson.kind==='resize-direction'){target='#btnResizeUp';done=!!gesture('btnResizeUp','down')&&state.resizeIncreasing===lesson.increasing;}
 if(lesson.kind==='rich'){
  const modal=b.visible('#paletteModal.modal-visible'),group=b.visible('#palette-choice-panel[data-active-group="continuous"]'),pending=b.visible('#palette-apply:not(:disabled)');
  context.applied=context.applied||events.some(e=>e.type==='apply');
  done=context.applied&&!modal&&state.colors.length>=264;
  target=!modal?'#btnPalette':!group?'[data-palette-group="continuous"]':pending?'#palette-apply':'#palette-choice-panel';
  if(modal)body=!group?c.richGroup:pending?c.richApply:c.richChoose;
 }
 if(lesson.kind==='prepare'){
  target='#btnToggleSimMode';done=!!held('btnToggleSimMode')&&state.n===249&&state.simMode&&!state.playing&&state.separatorPx===0;
  if(done)body=c.ready;
 }
 if(lesson.kind==='free'){
  if(state.n!==249||!state.simMode){context.sizeChosen=false;return {title,body:he?'נכין קודם לוח גדול לציור. החזיקו את כפתור המעבר לאבולוציה.':'First, prepare a large drawing board. Hold the Evolution switch.',target:'#btnToggleSimMode',done:false,status:''};}
  context.sizeChosen=context.sizeChosen||events.some(e=>e.type==='brush-size-select')||!!gesture('btnColorPicker','right')||!!gesture('btnColorPicker','left');
  const ready=context.sizeChosen&&!picker;
  target=picker?(context.sizeChosen?'#btnColorPickerCloseTop':'#brushSizeOptions'):ready?'#boardCanvas':'#btnColorPicker';
  if(ready)body=c.draw;
  done=ready&&strokes.some(e=>e.n===249);
 }
 if(done)target='#boardCanvas';
 return {title,body,target,done,status:done?(lesson.kind==='free'?c.finished:c.done):''};
}
