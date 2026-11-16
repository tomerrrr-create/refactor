import {getCurrentLang,onLanguageChange,setCurrentLang} from './i18n.js';

export const CHAPTER_ONE_KEY='colorGridChapterOneV1';
export const CHAPTER_ONE_STEPS=['intro','palette','picker','random','tile'];
const TEXT={
 he:{chapter:'פרק 1 · הלוח והפלטה',intro:'לוח של ריבועים',introBody:'זה הלוח שלכם. כל ריבוע מחזיק צבע. בואו נראה מה אפשר לעשות איתו.',palette:'הצבעים מגיעים מפלטה',paletteBody:'לחצו על כפתור הפלטה כדי לנסות צבעים אחרים.',picker:'בוחרים מתוך האוסף',pickerOpen:'החליקו את כפתור הפלטה למטה כדי לפתוח את האוסף.',pickerChoose:'בחרו פלטה אחרת מתוך האוסף.',pickerApply:'לחצו על החלה כדי לראות את הבחירה על הלוח.',pickerDone:'אותו לוח, בצבעים שבחרתם.',random:'ערבוב חדש',randomBody:'לחצו על אקראי כדי לקבל ערבוב חדש של צבעי הפלטה על הלוח.',tile:'לחיצה משנה צבע',tileBody:'לחצו על ריבוע וראו איך הצבע שלו משתנה. לחצו עליו עוד כמה פעמים.',tileDone:'כל לחיצה מקדמת את המשבצת לצבע הבא.',paletteMore:'הצבעים השתנו. לחצו שוב על כפתור הפלטה.',paletteDone:'אותו לוח, פלטה אחרת.',randomDone:'הצבעים התערבבו מחדש.',sameTile:'המשיכו ללחוץ על אותה משבצת.',start:'מתחילים',next:'המשך',finish:'סיום הפרק',back:'הקודם',skip:'דלגו',exit:'יציאה מההדרכה',open:'פתיחת אוסף הפלטות',loading:'מכינים את הלוח…',error:'הלוח לא נטען. אפשר לסגור ולנסות שוב.',replay:'הדרכת כניסה ראשונה · פרק 1',reset:'הצגת פרק 1 בכניסה הבאה',resetDone:'ההדרכה תוצג בכניסה הבאה.',practice:'לוח ההדרכה',step:'חלק'},
 en:{chapter:'Chapter 1 · The board and palette',intro:'A board of squares',introBody:'This is your board. Every square holds a color. Let’s see what you can do with it.',palette:'Colors come from a palette',paletteBody:'Click the palette button to try different colors.',picker:'Choose from the collection',pickerOpen:'Drag the palette button downward to open the collection.',pickerChoose:'Choose a different palette from the collection.',pickerApply:'Click Apply to see your choice on the board.',pickerDone:'The same board, in your chosen colors.',random:'A fresh mix',randomBody:'Click Random to fill the board with a fresh mix of palette colors.',tile:'A click changes color',tileBody:'Click a square and watch its color change. Click the same square a few more times.',tileDone:'Every click advances the square to the next color.',paletteMore:'The colors changed. Click the palette button again.',paletteDone:'The same board, a different palette.',randomDone:'The colors have been mixed again.',sameTile:'Keep clicking the same square.',start:'Let’s begin',next:'Continue',finish:'Finish chapter',back:'Back',skip:'Skip',exit:'Exit lesson',open:'Open the palette collection',loading:'Preparing your board…',error:'The board could not load. Close the lesson and try again.',replay:'First visit · Chapter 1',reset:'Show chapter 1 on the next visit',resetDone:'The lesson will appear on your next visit.',practice:'Lesson board',step:'Part'}
};
const PALETTE_TIP={
 he:{title:'טיפ · קבוצות צבעים',intro:'הקבוצות מאגדות פלטות לפי כמות הצבעים.',rows:[['23','פלטות מצומצמות — פיקסל־ארט וצורות מובחנות.'],['64','יותר גוונים — איור, פרטים והצללות.'],['264','פלטות עשירות — מעברים רכים וציור זורם.'],['•','הארכיון — עוד פלטות לגלות.']],note:'כמות הצבעים משתנה בין הפלטות. כל קבוצה פתוחה לכל סגנון.'},
 en:{title:'Tip · Color families',intro:'The groups collect palettes by their number of colors.',rows:[['23','Smaller palettes — pixel art and distinct shapes.'],['64','More shades — illustration, detail and shading.'],['264','Rich palettes — soft transitions and flowing paintings.'],['•','The archive — more palettes to discover.']],note:'Exact color counts vary between palettes. Every group is open to every style.'}
};
export function readChapterOneProgress(storage){
    try{const value=JSON.parse(storage.getItem(CHAPTER_ONE_KEY));
        return value?.version===1&&['active','complete','dismissed'].includes(value.status)&&CHAPTER_ONE_STEPS.includes(value.step)?value:null;
    }catch{return null;}
}
export function sameSquareRun(events){
    let count=0,last=null,lastColor=null;
    for(const e of events.filter(e=>e.type==='tile')){
        count=e.index===last&&e.color!==lastColor?count+1:1;last=e.index;lastColor=e.color;
    }
    return {count,index:last};
}
export function initializeChapterOne({beforeStart}){
    const requestedLanguage=new URLSearchParams(location.search).get('lang');
    if(['he','en'].includes(requestedLanguage))setCurrentLang(requestedLanguage);
    const desktop=()=>innerWidth>=900&&innerHeight>=600&&matchMedia('(pointer:fine)').matches;
    const copy=()=>TEXT[getCurrentLang()]||TEXT.en;
    let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}
    let progress=readChapterOneProgress(storage),session=null;
    const entries=[...document.querySelectorAll('[data-chapter-one-open]')],reset=document.querySelector('[data-chapter-one-reset]');
    const persist=(status,step)=>{progress={version:1,status,step};try{storage.setItem(CHAPTER_ONE_KEY,JSON.stringify(progress));}catch{/* Lesson remains usable without persistence. */}};
    const refresh=()=>{entries.forEach(e=>{e.textContent=copy().replay;e.hidden=!desktop();});if(reset){reset.textContent=copy().reset;reset.hidden=!desktop();}};
    function close(status){
        const s=session;if(!s)return;persist(status||(s.index===0?'dismissed':'active'),CHAPTER_ONE_STEPS[s.index]);
        clearInterval(s.timer);clearTimeout(s.timeout);s.root.close();s.root.remove();session=null;
        s.trigger?.focus({preventScroll:true});
    }
    function show(index){
        const s=session;if(!s?.bridge)return;s.index=index;s.cursor=s.bridge.cursor();s.done=index===0;s.paletteChanges=0;s.lastPalette=s.bridge.read().paletteIndex;s.startTiles=s.bridge.read().tiles.join(',');s.pickerApplied=false;
        if(index!==2)s.bridge.closePalette();
        persist('active',CHAPTER_ONE_STEPS[index]);s.root.dataset.step=CHAPTER_ONE_STEPS[index];
        update();s.card.querySelector('h2').focus({preventScroll:true});
    }
    function open(trigger){
        if(session||!desktop())return;
        beforeStart();const c=copy(),root=document.createElement('dialog');root.className='chapter-one-tour';root.dir=getCurrentLang()==='he'?'rtl':'ltr';root.setAttribute('aria-labelledby','chapterOneTitle');
        root.innerHTML='<div class="chapter-stage"><iframe class="chapter-frame"></iframe><div class="chapter-board-shade" hidden></div></div><section class="chapter-coach"><header><span data-chapter></span><button data-exit type="button">×</button></header><progress max="5" value="1"></progress><p class="chapter-count"></p><div class="chapter-copy"><h2 id="chapterOneTitle" tabindex="-1"></h2><p data-body></p><button data-open type="button" hidden></button></div><aside class="chapter-palette-tip" data-palette-tip hidden></aside><p class="chapter-status" role="status" aria-live="polite"></p><footer><button data-back type="button"></button><button data-skip type="button"></button><button data-next type="button" disabled></button></footer></section>';
        const frame=root.querySelector('iframe'),card=root.querySelector('section');frame.title=c.practice;
        const url=new URL('./index.html',location.href);url.search='';url.searchParams.set('chapter-one-practice','1');url.searchParams.set('lang',getCurrentLang());frame.src=url.href;
        const index=progress?.status==='active'?CHAPTER_ONE_STEPS.indexOf(progress.step):0;
        session={root,frame,card,trigger:trigger||document.activeElement,index,done:false};const s=session;
        document.body.append(root);root.showModal();
        card.querySelector('h2').textContent=c.loading;card.querySelector('[data-next]').textContent=c.next;
        card.querySelector('[data-exit]').setAttribute('aria-label',c.exit);
        card.querySelector('[data-exit]').onclick=()=>close();root.addEventListener('cancel',e=>{e.preventDefault();close();});
        card.querySelector('[data-next]').onclick=()=>{if(s.done){if(s.index===4)close('complete');else show(s.index+1);}};
        card.querySelector('[data-back]').onclick=()=>{if(s.bridge&&s.index>0)show(s.index-1);};
        card.querySelector('[data-skip]').onclick=()=>{if(s.bridge){if(s.index===4)close('complete');else show(s.index+1);}};
        card.querySelector('[data-open]').onclick=()=>s.bridge?.openPalette();
        s.timer=setInterval(()=>{
            if(session!==s)return;
            if(!s.bridge){const bridge=frame.contentWindow?.chapterOnePractice;if(!bridge)return;s.bridge=bridge;clearTimeout(s.timeout);
                frame.contentDocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&!bridge.visible('.modal-visible,dialog[open]')){event.preventDefault();close();}},true);
                show(index);}
            update();
        },80);
        s.timeout=setTimeout(()=>{if(session===s&&!s.bridge)card.querySelector('h2').textContent=c.error;},20000);
    }
    function update(){
        const s=session;if(!s?.bridge)return;const c=copy(),b=s.bridge,state=b.read(),events=b.events(s.cursor),id=CHAPTER_ONE_STEPS[s.index];
        let target=null,body=c[id+'Body']||'',status='',title=c[id],helper=false,showPaletteTip=false;
        if(id==='palette'){
            const taps=events.filter(e=>e.type==='palette');let last=s.lastPalette,changes=0;
            for(const tap of taps){if(tap.paletteIndex!==last){changes++;last=tap.paletteIndex;}}
            // Keyboard click handlers may run after capture; include their result.
            if(last!==state.paletteIndex&&taps.length>changes)changes++;
            s.paletteChanges=changes;s.done=s.done||changes>=2;target=b.visible('#btnPalette');
            status=s.done?c.paletteDone:s.paletteChanges?c.paletteMore:'';
        }else if(id==='picker'){
            const modal=b.visible('#paletteModal.modal-visible'),pending=b.visible('#palette-apply:not(:disabled)');
            showPaletteTip=!!modal;
            s.pickerApplied=s.pickerApplied||events.some(e=>e.type==='apply');
            s.done=s.done||s.pickerApplied&&!modal&&state.paletteIndex!==s.lastPalette;
            title=c.picker;body=s.done?c.pickerDone:!modal?c.pickerOpen:pending?c.pickerApply:c.pickerChoose;
            helper=!modal&&!s.done;target=b.visible(s.done?'#boardCanvas':!modal?'#btnPalette':pending?'#palette-apply':'#palette-choice-panel');
        }else if(id==='random'){
            s.done=s.done||events.some(e=>e.type==='random')&&state.tiles.join(',')!==s.startTiles;target=b.visible('#btnRandom');status=s.done?c.randomDone:'';
        }else if(id==='tile'){
            const run=sameSquareRun(events);s.done=s.done||run.count>=3;target=b.visible('#boardCanvas');status=s.done?c.tileDone:run.count?c.sameTile:'';
        }
        const card=s.card;card.querySelector('[data-chapter]').textContent=c.chapter;card.querySelector('.chapter-count').textContent=`${c.step} ${s.index+1} ${getCurrentLang()==='he'?'מתוך':'of'} 5`;
        card.querySelector('progress').value=s.index+1;card.querySelector('progress').setAttribute('aria-label',c.chapter);
        card.querySelector('h2').textContent=title;card.querySelector('[data-body]').textContent=body;
        card.querySelector('[data-open]').hidden=!helper;card.querySelector('[data-open]').textContent=c.open;
        card.querySelector('[data-back]').textContent=c.back;card.querySelector('[data-back]').disabled=s.index===0;
        card.querySelector('[data-skip]').textContent=c.skip;card.querySelector('[data-skip]').hidden=s.index===0;
        const next=card.querySelector('[data-next]');next.textContent=s.index===0?c.start:s.index===4?c.finish:c.next;next.disabled=!s.done;
        const feedback=card.querySelector('[role=status]');if(feedback.textContent!==status)feedback.textContent=status;feedback.hidden=!status;
        const tip=card.querySelector('[data-palette-tip]');tip.hidden=!showPaletteTip;
        if(showPaletteTip&&s.tipLanguage!==getCurrentLang()){
            const content=PALETTE_TIP[getCurrentLang()]||PALETTE_TIP.en;tip.replaceChildren();
            const heading=document.createElement('h3');heading.textContent=content.title;tip.append(heading);
            const intro=document.createElement('p');intro.textContent=content.intro;tip.append(intro);
            const list=document.createElement('dl');
            for(const [group,description]of content.rows){const row=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=group;detail.textContent=description;row.append(term,detail);list.append(row);}
            tip.append(list);const note=document.createElement('p');note.className='chapter-tip-note';note.textContent=content.note;tip.append(note);s.tipLanguage=getCurrentLang();
        }
        const toolbarFocused=b.guide(target);
        const place=(el,r)=>Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:Math.max(0,r.right-r.left)+'px',height:Math.max(0,r.bottom-r.top)+'px'});
        const board=b.visible('#boardCanvas')?.getBoundingClientRect(),shade=s.root.querySelector('.chapter-board-shade');shade.hidden=!toolbarFocused||!board;
        if(!shade.hidden)place(shade,board);
    }
    entries.forEach(e=>e.onclick=()=>{if(progress?.status!=='active')progress=null;open(e);});
    if(reset)reset.onclick=()=>{try{storage.removeItem(CHAPTER_ONE_KEY);progress=null;document.querySelector('[data-chapter-one-reset-status]').textContent=copy().resetDone;}catch{/* Keep existing artwork untouched. */}};
    onLanguageChange(refresh);addEventListener('resize',refresh);refresh();
    const forced=new URLSearchParams(location.search).get('tour')==='1';
    if(forced)progress=null;
    if(desktop()&&(!progress||progress.status==='active'||forced))open();
    return {open};
}
