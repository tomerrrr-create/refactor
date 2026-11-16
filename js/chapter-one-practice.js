// Only the disposable lesson iframe gets ephemeral preferences.
export const isChapterOnePractice = typeof window !== 'undefined' && window.parent !== window && new URLSearchParams(location.search).get('chapter-one-practice') === '1';
if (isChapterOnePractice) {
    document.documentElement.dataset.chapterOnePractice = 'true';
    const values = new Map([['userLanguage', new URLSearchParams(location.search).get('lang') || 'en']]);
    Object.defineProperty(window, 'localStorage', {configurable:true, value:{
        get length(){return values.size;}, key:index=>[...values.keys()][index]??null,
        getItem:key=>values.get(String(key))??null, setItem:(key,value)=>values.set(String(key),String(value)),
        removeItem:key=>values.delete(String(key)), clear:()=>values.clear()
    }});
}

export function installChapterOnePractice({read, tileAt, openPalette, layout, prepareOrder}) {
    let sequence=0, down=null;
    let guided=[],muted=[];
    const guide=target=>{
        // Light the actual glyphs, never a rectangular overlay around a group.
        const next=target?.matches('button')?[target]:[...(target?.querySelectorAll('.palette-choice-symbol')||[])];
        guided.filter(node=>!next.includes(node)).forEach(node=>node.classList.remove('chapter-guide-glow'));
        next.filter(node=>!guided.includes(node)).forEach(node=>node.classList.add('chapter-guide-glow'));
        guided=next;
        const toolbar=target?.matches('button')?target.closest('#controlsContainer'):null;
        const palettePanel=target?.id==='palette-apply'?target.closest('.palette-picker-panel'):null;
        const quiet=toolbar?[...toolbar.querySelectorAll('.ctrl')].filter(node=>node!==target):palettePanel?[...palettePanel.querySelectorAll('button')].filter(node=>node!==target):[];
        muted.filter(node=>!quiet.includes(node)).forEach(node=>node.classList.remove('chapter-guide-muted'));
        quiet.filter(node=>!muted.includes(node)).forEach(node=>node.classList.add('chapter-guide-muted'));
        muted=quiet;
        return !!toolbar;
    };
    const events=[];
    const record=(type,detail={})=>{events.push({sequence:++sequence,type,...detail});if(events.length>100)events.shift();};
    document.addEventListener('pointerdown',event=>{
        if(event.button===0)down={x:event.clientX,y:event.clientY,time:performance.now(),sort:!!event.target.closest('#btnCycleSort'),board:!!event.target.closest('#boardCanvas')};
    },true);
    document.addEventListener('pointerup',event=>{
        const start=down;down=null;
        if(start?.sort&&performance.now()-start.time>=600&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8){
            setTimeout(()=>record('sort-hold',{sortMethod:read().sortMethod}),0);
        }
        if(!start?.board||performance.now()-start.time>=550||Math.hypot(event.clientX-start.x,event.clientY-start.y)>=8)return;
        const index=tileAt(event.clientX,event.clientY);
        if(index<0)return;
        // Observe the result after the application's own pointerup handler.
        setTimeout(()=>record('tile',{index,color:read().tiles[index],sortMethod:read().sortMethod}),0);
    },true);
    document.addEventListener('pointercancel',()=>{down=null;},true);
    let pressTime=0;
    document.addEventListener('pointerdown',()=>{pressTime=performance.now();},true);
    document.addEventListener('click',event=>{
        if(!event.isTrusted||event.detail&&performance.now()-pressTime>=550)return;
        if(event.target.closest('#btnPalette'))record('palette',{paletteIndex:read().paletteIndex});
        if(event.target.closest('#btnRandom'))record('random');
        if(event.target.closest('#palette-apply'))record('apply');
    },true);
    const visible=selector=>[...document.querySelectorAll(selector)].find(element=>{
        const r=element.getBoundingClientRect(),s=getComputedStyle(element);
        return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity)!==0;
    });
    const fit=()=>{
        const controls=document.getElementById('controlsContainer');
        const size=Math.max(80,Math.min(720,innerWidth-32,innerHeight-controls.getBoundingClientRect().height-46));
        document.documentElement.style.setProperty('--chapter-board-size',size+'px');
        layout();
    };
    addEventListener('resize',fit);new ResizeObserver(fit).observe(document.getElementById('controlsContainer'));fit();
    window.chapterOnePractice={read,visible,openPalette,guide,prepareOrder,cursor:()=>sequence,events:after=>events.filter(e=>e.sequence>after),
        closePalette:()=>document.querySelector('#btnPaletteModalClose')?.click(),
        fit
    };
}
