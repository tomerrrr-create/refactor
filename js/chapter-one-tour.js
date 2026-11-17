import {GALLERY_DEMOS,GALLERY_STEPS,galleryLesson,galleryCopy,galleryView} from './evolution-gallery.js';
import {CHAPTER_FIVE_MAIN_STEPS,CHAPTER_FIVE_STEPS,chapterFiveView,chapterFiveCopy} from './chapter-five-tour.js';
import {CHAPTER_FOUR_STEPS,chapterFourView,chapterFourCopy} from './chapter-four-tour.js';
import {CHAPTER_THREE_STEPS,chapterThreeView,chapterThreeCopy} from './chapter-three-tour.js';
import {CHAPTER_TWO_STEPS,CHAPTER_TWO_ORDERS,chapterTwoCopy,renderOrderStrip,orderPracticeProgress} from './chapter-two-tour.js';
import {getCurrentLang,onLanguageChange,setCurrentLang} from './i18n.js';

export const CHAPTER_ONE_KEY='colorGridChapterOneV1';
export const CHAPTER_ONE_STEPS=['intro','palette','picker','random','tile'];
const TOUR_STEPS=[...CHAPTER_ONE_STEPS,...CHAPTER_TWO_STEPS,...CHAPTER_THREE_STEPS,...CHAPTER_FOUR_STEPS,...CHAPTER_FIVE_STEPS,...GALLERY_STEPS];
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
        if(value?.version===1&&['order-center-out','order-temperature','order-outside-in'].includes(value.step))value.step=value.status==='complete'?'sort-manage':'sort-reset';
        return value?.version===1&&['active','complete','dismissed'].includes(value.status)&&TOUR_STEPS.includes(value.step)?value:null;
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
    const refresh=()=>{entries.forEach(e=>{e.textContent=chapterFiveCopy(getCurrentLang()).replay;e.hidden=!desktop();});if(reset){reset.textContent=chapterTwoCopy(getCurrentLang()).reset;reset.hidden=!desktop();}};
    function close(status){
        const s=session;if(!s)return;persist(status||(s.index===0?'dismissed':'active'),TOUR_STEPS[s.index]);
        clearInterval(s.timer);clearTimeout(s.timeout);s.bridge?.pausePractice();s.root.close();s.root.remove();session=null;
        s.trigger?.focus({preventScroll:true});
    }
    function show(index,{resume=false}={}){
        const s=session;if(!s?.bridge)return;
        const previousStep=TOUR_STEPS[s.index];
        const previous=sameSquareRun(s.bridge.events(s.cursor||0));if(previous.index!==null)s.focusTile=previous.index;
        if(index===5)s.bridge.prepareOrder();
        s.index=index;s.cursor=s.bridge.cursor();s.done=index===0;s.paletteChanges=0;s.lastPalette=s.bridge.read().paletteIndex;s.startTiles=s.bridge.read().tiles.join(',');s.pickerApplied=false;s.sortManagerOpened=false;s.three={};s.four={};s.fourReady=false;s.five={};s.fiveReady=false;s.galleryReady=false;
        if(index!==2)s.bridge.closePalette();
        s.bridge.closePracticeModals();
        if(CHAPTER_THREE_STEPS.includes(TOUR_STEPS[index]))s.bridge.prepareChapterThree(TOUR_STEPS[index],{resume});
        if(CHAPTER_FOUR_STEPS.includes(TOUR_STEPS[index])){
            Promise.resolve(s.bridge.prepareChapterFour(TOUR_STEPS[index],{resume})).then(()=>{
                if(session!==s||s.index!==index)return;
                s.fourReady=true;s.cursor=s.bridge.cursor();update();
            });
        }
        if(CHAPTER_FIVE_STEPS.includes(TOUR_STEPS[index])){
            Promise.resolve(s.bridge.prepareChapterFive(TOUR_STEPS[index],{resume})).then(()=>{
                if(session!==s||s.index!==index)return;
                s.fiveReady=true;s.cursor=s.bridge.cursor();update();
            });
        }
        const gallery=galleryLesson(TOUR_STEPS[index]);
        if(gallery){
            Promise.resolve(s.bridge.prepareGallery(gallery.demo.id,gallery.task,{force:resume||galleryLesson(previousStep)?.task==='intro'})).then(()=>{
                if(session!==s||s.index!==index)return;
                s.galleryReady=true;s.cursor=s.bridge.cursor();update();
            });
        }
        persist('active',TOUR_STEPS[index]);s.root.dataset.step=TOUR_STEPS[index];
        update();s.card.querySelector('h2').focus({preventScroll:true});
    }
    function open(trigger){
        if(session||!desktop())return;
        beforeStart();const c=copy(),root=document.createElement('dialog');root.className='chapter-one-tour';root.dir=getCurrentLang()==='he'?'rtl':'ltr';root.setAttribute('aria-labelledby','chapterOneTitle');
        root.innerHTML='<div class="chapter-stage"><iframe class="chapter-frame"></iframe><div class="chapter-board-shade" hidden></div></div><section class="chapter-coach"><header><span class="chapter-gallery-icon" data-gallery-icon hidden aria-hidden="true"></span><span data-chapter></span><button data-exit type="button">×</button></header><progress max="5" value="1"></progress><p class="chapter-count"></p><div class="chapter-copy"><h2 id="chapterOneTitle" tabindex="-1"></h2><p data-body></p><button data-open type="button" hidden></button><button data-gallery type="button" hidden></button><p class="chapter-gallery-anchor" data-gallery-anchor hidden></p></div><aside class="chapter-order" data-order hidden></aside><aside class="chapter-palette-tip" data-palette-tip hidden></aside><p class="chapter-status" role="status" aria-live="polite"></p><footer><button data-back type="button"></button><button data-skip type="button"></button><button data-next type="button" disabled></button></footer></section>';
        const frame=root.querySelector('iframe'),card=root.querySelector('section');frame.title=c.practice;
        const url=new URL('./index.html',location.href);url.search='';url.searchParams.set('chapter-one-practice','1');url.searchParams.set('lang',getCurrentLang());frame.src=url.href;
        const index=progress?.status==='active'?TOUR_STEPS.indexOf(progress.step):0;
        session={root,frame,card,trigger:trigger||document.activeElement,index,done:false};const s=session;
        document.body.append(root);root.showModal();
        card.querySelector('h2').textContent=c.loading;card.querySelector('[data-next]').textContent=c.next;
        card.querySelector('[data-exit]').setAttribute('aria-label',c.exit);
        card.querySelector('[data-exit]').onclick=()=>close();root.addEventListener('cancel',e=>{e.preventDefault();close();});
        card.querySelector('[data-next]').onclick=()=>{if(s.done){if(s.index===TOUR_STEPS.length-1||['live-pause','live-explore'].includes(TOUR_STEPS[s.index]))close('complete');else show(s.index+1);}};
        card.querySelector('[data-back]').onclick=()=>{if(s.bridge&&s.index>0)show(s.index-1);};
        card.querySelector('[data-skip]').onclick=()=>{if(s.bridge){
            const current=galleryLesson(TOUR_STEPS[s.index]);
            if(current?.task==='intro'){
                const next=TOUR_STEPS.findIndex((id,index)=>index>s.index&&galleryLesson(id)?.task==='intro');
                if(next<0)close('complete');else show(next);
            }else if(s.index===TOUR_STEPS.length-1||['live-pause','live-explore'].includes(TOUR_STEPS[s.index]))close('complete');else show(s.index+1);
        }};
        card.querySelector('[data-open]').onclick=()=>{if(TOUR_STEPS[s.index]==='live-pause')show(TOUR_STEPS.indexOf('live-explore'));else s.bridge?.openPalette();};
        card.querySelector('[data-gallery]').onclick=()=>{if(galleryLesson(TOUR_STEPS[s.index]))close('complete');else show(TOUR_STEPS.indexOf(GALLERY_STEPS[0]));};
        s.timer=setInterval(()=>{
            if(session!==s)return;
            if(!s.bridge){const bridge=frame.contentWindow?.chapterOnePractice;if(!bridge)return;s.bridge=bridge;clearTimeout(s.timeout);
                frame.contentDocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&!bridge.visible('.modal-visible,dialog[open]')){event.preventDefault();close();}},true);
                show(index,{resume:true});}
            update();
        },80);
        s.timeout=setTimeout(()=>{if(session===s&&!s.bridge)card.querySelector('h2').textContent=c.error;},20000);
    }
    function update(){
        const s=session;if(!s?.bridge)return;const c=copy(),b=s.bridge,state=b.read(),events=b.events(s.cursor),id=TOUR_STEPS[s.index];
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
        const orderIndex=s.index-5,thirdIndex=CHAPTER_THREE_STEPS.indexOf(id),thirdStep=thirdIndex>=0,fourthIndex=CHAPTER_FOUR_STEPS.indexOf(id),fourthStep=fourthIndex>=0,fifthIndex=CHAPTER_FIVE_STEPS.indexOf(id),fifthStep=fifthIndex>=0,gallery=galleryLesson(id),galleryIndex=GALLERY_STEPS.indexOf(id),orderStep=orderIndex>=0&&!thirdStep&&!fourthStep&&!fifthStep&&!gallery,two=chapterTwoCopy(getCurrentLang()),three=chapterThreeCopy(getCurrentLang()),four=chapterFourCopy(getCurrentLang()),five=chapterFiveCopy(getCurrentLang()),g=galleryCopy(getCurrentLang());
        const orderHost=s.card.querySelector('[data-order]');orderHost.hidden=!orderStep;
        if(orderStep&&orderIndex<CHAPTER_TWO_ORDERS.length){
            const method=CHAPTER_TWO_ORDERS[orderIndex],ready=state.sortMethod===method;
            const interaction=orderPracticeProgress(events,method);
            if(interaction.index!==null)s.focusTile=interaction.index;
            s.done=s.done||ready&&interaction.count>=3;
            title=orderIndex===0?two.title:two.change;
            body=orderIndex===0?two.first:!ready?`${two.switch} ${two.names[orderIndex]}.`:`${two.descriptions[orderIndex]} ${two.tap}`;
            status=s.done?two.done:'';
            target=b.visible(ready?'#boardCanvas':'#btnCycleSort');
            renderOrderStrip(orderHost,state,s.focusTile,getCurrentLang());
        }else if(id==='sort-reset'){
            s.done=s.done||state.sortMethod==='luminance'&&events.some(event=>event.type==='sort-hold'&&event.sortMethod==='luminance');
            title=two.resetTitle;body=two.resetBody;status=s.done?two.resetDone:'';
            target=b.visible(s.done?'#boardCanvas':'#btnCycleSort');
            renderOrderStrip(orderHost,state,s.focusTile,getCurrentLang());
        }else if(id==='sort-manage'){
            const modal=b.visible('#sortCycleDialog[open]');
            s.sortManagerOpened=s.sortManagerOpened||!!modal;s.done=s.done||s.sortManagerOpened&&!modal;
            title=two.manageTitle;body=modal?two.manageOpen:two.manageBody;status=s.done?two.manageDone:'';
            orderHost.hidden=true;
            target=b.visible(s.done?'#boardCanvas':modal?'#btnSortCycleCloseTop':'#btnCycleSort');
        }
        if(thirdStep){
            const view=chapterThreeView({id,state,events,context:s.three,b,language:getCurrentLang()});
            title=view.title;body=view.body;status=view.status;s.done=s.done||view.done;target=b.visible(view.target);
        }
        if(fourthStep){
            const view=s.fourReady?chapterFourView({id,state,events,context:s.four,language:getCurrentLang()}):{title:c.loading,body:'',status:'',done:false,target:'#boardCanvas'};
            title=view.title;body=view.body;status=view.status;s.done=s.done||view.done;target=b.visible(view.target);
        }
        if(fifthStep){
            const view=s.fiveReady?chapterFiveView({id,state,events,context:s.five,b,language:getCurrentLang()}):{title:c.loading,body:'',status:'',done:false,target:'#boardCanvas'};
            title=view.title;body=view.body;status=view.status;s.done=s.done||view.done;target=b.visible(view.target);
            helper=id==='live-pause'&&s.done;
        }
        if(gallery){
            const view=s.galleryReady?galleryView({id,state,events,language:getCurrentLang()}):{title:c.loading,body:'',status:'',done:false,target:'#boardCanvas'};
            title=view.title;body=view.body;status=view.status;s.done=s.done||view.done;target=b.visible(view.target);
        }
        const card=s.card;
        const galleryButton=card.querySelector('[data-gallery]');galleryButton.hidden=id!=='live-explore'&&(!gallery||galleryIndex===GALLERY_STEPS.length-1);galleryButton.textContent=gallery?g.finish:g.start;
        const icon=card.querySelector('[data-gallery-icon]');icon.hidden=!gallery;
        if(gallery){const key=gallery.demo.id+state.gallerySerial+state.galleryIconClass;if(s.iconKey!==key){icon.innerHTML=b.galleryIcon(gallery.demo.id);s.iconKey=key;}}
        const anchor=card.querySelector('[data-gallery-anchor]');anchor.hidden=!gallery||gallery.demo.id!=='magnet'||gallery.task==='intro';
        if(!anchor.hidden){anchor.textContent=g.anchorName;anchor.style.setProperty('--anchor-color',state.colors[state.galleryAnchor]||'#000');}
        card.querySelector('[data-chapter]').textContent=gallery?g.chapter:fifthStep?five.chapter:fourthStep?four.chapter:thirdStep?three.chapter:orderStep?two.chapter:c.chapter;
        card.querySelector('.chapter-count').textContent=`${c.step} ${gallery?gallery.demo.tasks.indexOf(gallery.task)+2:fifthStep?Math.min(fifthIndex+1,CHAPTER_FIVE_MAIN_STEPS.length):fourthStep?fourthIndex+1:thirdStep?thirdIndex+1:orderStep?orderIndex+1:s.index+1} ${getCurrentLang()==='he'?'מתוך':'of'} ${gallery?gallery.demo.tasks.length+1:fifthStep?CHAPTER_FIVE_MAIN_STEPS.length:fourthStep?CHAPTER_FOUR_STEPS.length:thirdStep?CHAPTER_THREE_STEPS.length:orderStep?CHAPTER_TWO_STEPS.length:5}`;
        card.querySelector('progress').max=gallery?gallery.demo.tasks.length+1:fifthStep?CHAPTER_FIVE_MAIN_STEPS.length:fourthStep?CHAPTER_FOUR_STEPS.length:thirdStep?CHAPTER_THREE_STEPS.length:orderStep?CHAPTER_TWO_STEPS.length:5;
        card.querySelector('progress').value=gallery?gallery.demo.tasks.indexOf(gallery.task)+2:fifthStep?Math.min(fifthIndex+1,CHAPTER_FIVE_MAIN_STEPS.length):fourthStep?fourthIndex+1:thirdStep?thirdIndex+1:orderStep?orderIndex+1:s.index+1;card.querySelector('progress').setAttribute('aria-label',gallery?g.chapter:fifthStep?five.chapter:fourthStep?four.chapter:thirdStep?three.chapter:orderStep?two.chapter:c.chapter);
        if(gallery)card.querySelector('.chapter-count').textContent=`${getCurrentLang()==='he'?'דוגמה':'Example'} ${GALLERY_DEMOS.indexOf(gallery.demo)+1} / ${GALLERY_DEMOS.length} · ${card.querySelector('.chapter-count').textContent}`;
        card.querySelector('h2').textContent=title;card.querySelector('[data-body]').textContent=body;
        card.querySelector('[data-open]').hidden=!helper;card.querySelector('[data-open]').textContent=fifthStep?five.explore:c.open;
        card.querySelector('[data-back]').textContent=c.back;card.querySelector('[data-back]').disabled=s.index===0||(fourthStep&&!s.fourReady||fifthStep&&!s.fiveReady||gallery&&!s.galleryReady);
        card.querySelector('[data-skip]').textContent=c.skip;card.querySelector('[data-skip]').hidden=s.index===0;card.querySelector('[data-skip]').disabled=(fourthStep&&!s.fourReady||fifthStep&&!s.fiveReady||gallery&&!s.galleryReady);
        const next=card.querySelector('[data-next]');next.textContent=gallery?.task==='intro'?g.load:galleryIndex===GALLERY_STEPS.length-1?g.finish:s.index===0?c.start:s.index===4?two.continue:id==='sort-manage'?three.next:id==='free-draw'?four.next:id==='evolution-pause'?five.next:id==='live-pause'||id==='live-explore'?five.finish:s.index===TOUR_STEPS.length-1?c.finish:c.next;next.disabled=!s.done;
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
        const toolbarFocused=b.guide(target,{dim:!state.playing});
        const place=(el,r)=>Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:Math.max(0,r.right-r.left)+'px',height:Math.max(0,r.bottom-r.top)+'px'});
        const board=b.visible('#boardCanvas')?.getBoundingClientRect(),shade=s.root.querySelector('.chapter-board-shade');shade.hidden=!toolbarFocused||!board;
        if(!shade.hidden)place(shade,board);
    }
    entries.forEach(e=>e.onclick=()=>{if(progress?.status!=='active')progress=null;open(e);});
    if(reset)reset.onclick=()=>{try{storage.removeItem(CHAPTER_ONE_KEY);progress=null;document.querySelector('[data-chapter-one-reset-status]').textContent=copy().resetDone;}catch{/* Keep existing artwork untouched. */}};
    onLanguageChange(refresh);addEventListener('resize',refresh);refresh();
    const requestedTour=new URLSearchParams(location.search).get('tour');
    const forced=['1','2','3','4','5','gallery'].includes(requestedTour);
    if(forced)progress=requestedTour==='gallery'?{version:1,status:'active',step:GALLERY_STEPS[0]}:requestedTour==='5'?{version:1,status:'active',step:CHAPTER_FIVE_STEPS[0]}:requestedTour==='4'?{version:1,status:'active',step:CHAPTER_FOUR_STEPS[0]}:requestedTour==='3'?{version:1,status:'active',step:CHAPTER_THREE_STEPS[0]}:requestedTour==='2'?{version:1,status:'active',step:CHAPTER_TWO_STEPS[0]}:null;
    if(desktop()&&(!progress||progress.status==='active'||forced))open();
    return {open};
}
