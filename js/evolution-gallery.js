// Optional guided examples. All ranks come from the active palette, never invented colors.
export const GALLERY_DEMOS=[
 {id:'life',engine:'gameOfLife',button:'btnGameOfLife',he:'משחק החיים',en:'Game of Life',heBody:'כל משבצת מושפעת מהשכנים שלה. נפתח דוגמה חדשה עם קבוצות קטנות, ונראה איך צבעים נוספים מצטרפים.',enBody:'Each square responds to its neighbors. We’ll open a new example with small groups and watch more colors join.',tasks:['step','play','draw','pause']},
 {id:'chi',engine:'sandpile',button:'btnSandpile',he:'צ׳י פלו',en:'Chi Flow',heBody:'נפתח דוגמה חדשה של זרימה מקומית. נוסיף צבע, נחליף סדר ופלטה ונשווה את התנועה.',enBody:'We’ll open a new example of local flow. Add color, change the order and palette, and compare the movement.',tasks:['play','draw','sort','palette','pause']},
 {id:'magnet',engine:'magnet',button:'btnMagnetModes',he:'מגנט',en:'Magnet',heBody:'נפתח דוגמה חדשה עם עוגן כהה וצבעים סביבו. המברשת תיטען בצבע העוגן המדויק.',enBody:'We’ll open a new example with a dark anchor and colors around it. The brush will hold the exact anchor color.',tasks:['play','anchor','pause']},
 {id:'light',engine:'brightnessEvo',button:'btnBrightnessEvo',he:'בהירות וניגודיות',en:'Brightness and contrast',heBody:'נפתח דוגמה חדשה של אור וצל. הבדלים קטנים יכולים להפוך לצורות בולטות, גם בלי להזיז את הציור.',enBody:'We’ll open a new example of light and shadow. Small differences can reveal shapes, even without moving the drawing.',tasks:['play','contrast','pause']},
 {id:'erosion',engine:'erosion',button:'btnErosion',he:'שחיקה',en:'Erosion',heBody:'נפתח דוגמה חדשה של שכבות צבע. ערוצים נוצרים ביניהן, כאילו מים מחפשים דרך.',enBody:'We’ll open a new example of color layers. Channels form between them, as though water is finding a path.',tasks:['play','draw','pause']},
 {id:'nudge',engine:'nudgeBrighter',button:'btnNudgeBrighter',he:'נאג׳',en:'Nudge',heBody:'נפתח דוגמה חדשה שקל לזהות. כל פעימה מעבירה את הציור לצבעים הבאים בסדר הפלטה.',enBody:'We’ll open a recognizable new drawing. Each pulse moves it to the next colors in the palette’s order.',tasks:['play','sort','pause']},
 {id:'cracks',engine:'contour',button:'btnContour',he:'סדקים',en:'Cracks',heBody:'נפתח דוגמה חדשה עם מקום לענפים לצמוח. זהו מנוע מתפתח, ולא כלי קווי המתאר החד־פעמי.',enBody:'We’ll open a new example with room for branches to grow. This is a growing engine, rather than the one-off contour tool.',tasks:['play','draw','pause']},
 {id:'network',engine:'network',button:'btnNetwork',he:'קווי רשת',en:'Network',heBody:'נפתח דוגמה חדשה של איי צבע נפרדים. ענפים נשלחים ביניהם; כתם שתוסיפו יהפוך ליעד נוסף.',enBody:'We’ll open a new example of separated color islands. Branches reach between them; a new mark becomes another destination.',tasks:['play','draw','pause']},
 {id:'islands',engine:'islands',button:'btnIslands',he:'איים',en:'Islands',heBody:'נפתח דוגמה חדשה של כתמי צבע רחבים. הצבעים מתפשטים לשכנים ומשנים את הגבולות.',enBody:'We’ll open a new example of broad color patches. Colors spread to neighbors and reshape the boundaries.',tasks:['play','draw','pause']},
 {id:'gravity',engine:'gravitationalSort',button:'btnGravitationalSort',he:'גרביטציה',en:'Gravity',heBody:'נפתח דוגמה חדשה ונערבב אותה בעצמנו. נשווה בין דורות יחידים, ניגון וסדר צבעים אחר.',enBody:'We’ll open a new example and mix it ourselves. Compare single generations, playback and a different color order.',tasks:['random','step','play','sort','pause']}
];
export const GALLERY_LESSONS=GALLERY_DEMOS.flatMap(demo=>['intro',...demo.tasks].map(task=>({id:`gallery-${demo.id}-${task}`,demo,task})));
export const GALLERY_STEPS=GALLERY_LESSONS.map(lesson=>lesson.id);
export const galleryLesson=id=>GALLERY_LESSONS.find(lesson=>lesson.id===id);
export const galleryCopy=lang=>lang==='he'?{chapter:'פרק 5 · מגלים אבולוציות',start:'סיור מודרך באבולוציות',load:'פתיחת דוגמה חדשה',finish:'סיום הסיור',newExample:'נפתח דוגמה חדשה',play:'הפעילו ניגון והתבוננו בצבעים המתפתחים.',step:'לחצו על דור אחד (I) שלוש פעמים. כל לחיצה מאפשרת לזהות עוד מעט מהחוקיות.',draw:'הוסיפו קו או כתם בזמן הנגינה, והתבוננו בדרך שבה הוא משתלב.',lifeDraw:'ציירו קבוצה קטנה בזמן הנגינה וראו איך היא גורמת לצבעים נוספים להצטרף.',anchor:'המברשת טעונה בצבע העוגן. גררו קו ארוך בצבע הזה והתבוננו איך הצבעים מגיבים אליו.',anchorName:'צבע העוגן שבמברשת',anchorRestore:'החזירו את צבע העוגן למברשת דרך בורר הצבעים, ואז ציירו קו.',sort:'החליפו שיטת מיון בזמן הניגון והשוו את התנועה.',palette:'עכשיו החליפו פלטה בזמן הניגון והשוו. אותו לוח ממשיך להתפתח.',contrast:'לחצו שוב על כפתור הבהירות כדי לעבור לניגודיות. התבוננו ביחסים בין האור לצל.',random:'לחצו על אקראי כדי ליצור בעצמכם את פיזור הצבעים.',pause:'התבוננו ככל שתרצו, ואז השהו את הלוח. אפשר לצייר עוד לפני שממשיכים.',done:'הפעולה השתלבה בדוגמה. אפשר להתבונן עוד, או להמשיך.',paused:'הרגע נעצר. כשתרצו, נמשיך לדוגמה הבאה.',end:'אפשר להמשיך ליצור ולחקור בקצב שלכם.',resume:'הפעילו ניגון כדי להמשיך להתנסות.',choose:'בחרו שוב את המנוע של הדוגמה.',current:'הסדר הפעיל:'}:{chapter:'Chapter 5 · Discover evolutions',start:'Guided evolution tour',load:'Open a new example',finish:'Finish tour',newExample:'We’ll open a new example',play:'Press Play and watch the colors develop.',step:'Click One generation (I) three times. Each click reveals a little more of the rule.',draw:'Add a line or mark while it runs, and watch how it joins the movement.',lifeDraw:'Draw a small group while it runs and watch more colors join.',anchor:'The brush holds the anchor color. Draw a long line with it and watch the colors respond.',anchorName:'The anchor color in your brush',anchorRestore:'Select the anchor color again in the brush picker, then draw a line.',sort:'Change the color order while it runs and compare the movement.',palette:'Now switch palettes while it runs and compare. The same board keeps evolving.',contrast:'Click Brightness again to switch to Contrast. Watch the relationship between light and shadow.',random:'Click Random to create the color field yourself.',pause:'Watch as long as you like, then pause the board. You can draw more before continuing.',done:'Your change joined the example. Watch a little longer, or continue.',paused:'The moment is held. Continue to the next example when you’re ready.',end:'Keep creating and exploring at your own pace.',resume:'Press Play to continue exploring.',choose:'Select this example’s engine again.',current:'Current order:'};
export function createGalleryRanks(id,n=249,count=264){
 if(!GALLERY_DEMOS.some(d=>d.id===id)||!Number.isInteger(n)||n<21||count<2)throw Error('Invalid gallery example');
 const ranks=new Uint16Array(n*n),hi=count-1,clamp=value=>Math.max(0,Math.min(hi,Math.round(value)));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,dx=u-.5,dy=v-.5,r=Math.hypot(dx,dy);let k=0;
  if(id==='life'){
   for(const [cx,cy]of [[.25,.28],[.52,.48],[.73,.7]]){const a=Math.round(cx*n),b=Math.round(cy*n);if((x===a||x===a+1)&&y>=b&&y<=b+1||x===a+2&&y===b+1)k=clamp(hi*.8);}
  }else if(id==='chi')k=clamp(hi*(.5+.24*Math.sin(u*18+Math.cos(v*13))+.2*Math.cos(v*24)));
  else if(id==='magnet')k=Math.abs(dx)<.012&&Math.abs(dy)<.3?0:clamp(hi*(.16+.7*((Math.sin(u*21)*Math.cos(v*17)+1)/2)));
  else if(id==='light')k=clamp(hi*(.5+.28*Math.sin(u*22)*Math.cos(v*18)+.06*Math.sin((u+v)*90)));
  else if(id==='erosion')k=clamp(hi*((Math.floor((v+.035*Math.sin(u*24)+.018*Math.sin(u*63))*18)%18+18)%18)/18);
  else if(id==='nudge')k=clamp(hi*(r<.35?(.3+.7*((Math.floor(r*28)%4)/3)):.05));
  else if(id==='cracks'){if(r<.045)k=clamp(hi*.7);}
  else if(id==='network'){
   for(const [cx,cy,c]of [[.23,.25,.3],[.72,.24,.55],[.48,.6,.8],[.78,.77,.98]])if(Math.hypot(u-cx,v-cy)<.03)k=clamp(hi*c);
  }else if(id==='islands')k=clamp(hi*(.2+.17*((Math.floor(u*5)+Math.floor(v*5)*2)%5)));
  else if(id==='gravity')k=clamp(hi*(.5+.45*Math.sin(u*33)*Math.cos(v*29)));
  ranks[y*n+x]=k;
 }
 return ranks;
}
export function galleryView({id,state,events,language}){
 const lesson=galleryLesson(id),{demo,task}=lesson,c=galleryCopy(language),he=language==='he';
 const title=he?demo.he:demo.en,actions=events.filter(e=>e.type==='evolution-action');
 let body=task==='intro'?(he?demo.heBody:demo.enBody):c[task],target='#boardCanvas',done=false,status='';
 if(task==='intro')return {title,body,target,done:true,status:'',lesson};
 if(task==='pause'){
  done=!state.playing&&actions.some(e=>e.id==='btnPlayPauseLife'&&e.before.playing&&!e.after.playing);
  return {title,body:done?(demo.id===GALLERY_DEMOS.at(-1).id?c.end:c.paused):state.playing?c.pause:c.resume,target:done?'#boardCanvas':'#btnPlayPauseLife',done,status:'',lesson};
 }
 const matches=state.armedSimulation===demo.engine||(demo.engine==='nudgeBrighter'&&state.armedSimulation==='nudgeDarker');
 if(!matches)return {title,body:c.choose,target:'#'+demo.button,done:false,status:'',lesson};
 if(task==='random'){target='#btnRandom';done=actions.some(e=>e.id==='btnRandom'&&e.changed);}
 else if(task==='step'){target='#btnStepForward';done=!state.playing&&actions.filter(e=>e.id==='btnStepForward'&&!e.before.playing&&!e.after.playing).length>=3;}
 else if(!state.playing)return {title,body:c.resume,target:'#btnPlayPauseLife',done:false,status:'',lesson};
 else if(task==='play'){done=state.generation>=2;}
 else if(task==='draw'||task==='anchor'){
  body=task==='anchor'?c.anchor:demo.id==='life'?c.lifeDraw:c.draw;
  if(task==='anchor'&&state.selectedColorIndex!==state.galleryAnchor){target='#btnColorPicker';body=c.anchorRestore;}
  else done=events.some(e=>e.type==='brush-applied'&&e.playing&&(!state.windMode)&&(task!=='anchor'||e.selectedColorIndex===state.galleryAnchor))&&events.some(e=>(e.type==='stroke'||task!=='anchor'&&e.type==='tile')&&e.playing&&!e.windMode);
 }else if(task==='sort'){target='#btnCycleSort';body=`${c.sort} ${c.current} ${state.sortName}.`;done=actions.some(e=>e.id==='btnCycleSort'&&e.before.playing&&e.after.playing&&e.before.sortMethod!==e.after.sortMethod);}
 else if(task==='palette'){target='#btnPalette';done=actions.some(e=>e.id==='btnPalette'&&e.before.playing&&e.after.playing&&e.before.paletteIndex!==e.after.paletteIndex);}
 else if(task==='contrast'){target='#btnBrightnessEvo';done=state.brightnessMode==='contrast'&&actions.some(e=>e.id==='btnBrightnessEvo'&&e.before.playing&&e.after.playing);}
 if(done){target='#boardCanvas';status=c.done;}
 return {title,body,target,done,status,lesson};
}
