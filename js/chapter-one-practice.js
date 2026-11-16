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

export function installChapterOnePractice({read, tileAt, openPalette, layout, prepareOrder, prepareChapterThree, prepareChapterFour, pausePractice}) {
    let sequence=0, down=null;
    let guided=[],muted=[];
    const guide=(target,{dim=true}={})=>{
        // Light the actual glyphs, never a rectangular overlay around a group.
        const next=target?.matches('button')?[target]:[...(target?.querySelectorAll('.palette-choice-symbol')||[])];
        guided.filter(node=>!next.includes(node)).forEach(node=>node.classList.remove('chapter-guide-glow'));
        next.filter(node=>!guided.includes(node)).forEach(node=>node.classList.add('chapter-guide-glow'));
        guided=next;
        const toolbar=target?.matches('button')?target.closest('#controlsContainer'):null;
        const palettePanel=target?.id==='palette-apply'?target.closest('.palette-picker-panel'):null;
        const quiet=!dim?[]:toolbar?[...toolbar.querySelectorAll('.ctrl')].filter(node=>node!==target):palettePanel?[...palettePanel.querySelectorAll('button')].filter(node=>node!==target):[];
        muted.filter(node=>!quiet.includes(node)).forEach(node=>node.classList.remove('chapter-guide-muted'));
        quiet.filter(node=>!muted.includes(node)).forEach(node=>node.classList.add('chapter-guide-muted'));
        muted=quiet;
        return !!toolbar&&dim;
    };
    const events=[];
    const record=(type,detail={})=>{events.push({sequence:++sequence,type,...detail});if(events.length>100)events.shift();};
    document.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        const board=!!event.target.closest('#boardCanvas'),control=event.target.closest('.ctrl');
        down={swatch:event.target.closest('#colorPickerSwatches [data-color]')?.dataset.color,x:event.clientX,y:event.clientY,time:performance.now(),board,id:control?.id,before:board?read():null,index:board?tileAt(event.clientX,event.clientY):-1};
    },true);
    document.addEventListener('pointermove',event=>{if(down?.board)down.travel=Math.max(down.travel||0,Math.hypot(event.clientX-down.x,event.clientY-down.y));},true);
    document.addEventListener('pointerup',event=>{
        const start=down;down=null;if(!start)return;
        const dx=event.clientX-start.x,dy=event.clientY-start.y,distance=Math.hypot(dx,dy),duration=performance.now()-start.time;
        if(start.swatch)setTimeout(()=>{const state=read();if(!state.rainbow&&state.colors[state.selectedColorIndex]===start.swatch)record('color-select');},0);
        if(start.id){
            const direction=Math.abs(dy)>=24&&Math.abs(dy)>=Math.abs(dx)*1.25?(dy<0?'up':'down'):Math.abs(dx)>=24&&Math.abs(dx)>=Math.abs(dy)*2?(dx<0?'left':'right'):distance<8?(duration>=600?'hold':'tap'):null;
            if(direction)setTimeout(()=>{
                const state=read();
                const summary={selectedColorIndex:state.selectedColorIndex,rainbow:state.rainbow,brushSize:state.brushSize,symmetryMode:state.symmetryMode};
                record('control-gesture',{id:start.id,direction,duration,state:summary});
                if(start.id==='btnCycleSort'&&direction==='hold')record('sort-hold',{sortMethod:state.sortMethod});
            },0);
        }
        if(!start.board)return;
        const index=tileAt(event.clientX,event.clientY);if(index<0)return;
        setTimeout(()=>{
            const state=read(),before=start.before;
            const detail={index,color:state.tiles[index],sortMethod:state.sortMethod,selectedColorIndex:before.selectedColorIndex,rainbow:before.rainbow,brushMode:before.brushMode,symmetryMode:before.symmetryMode,n:before.n,changed:state.tiles.some((color,i)=>color!==before.tiles[i])};
            if(Math.max(distance,start.travel||0)>=8&&start.index>=0){
                record('stroke',{...detail,from:start.index,sourceColor:before.tiles[start.index],sourceAfter:state.tiles[start.index]});
            }else if(duration<550&&distance<8)record('tile',detail);
        },0);
    },true);
    document.addEventListener('pointercancel',()=>{down=null;},true);
    let pressTime=0;
    document.addEventListener('pointerdown',()=>{pressTime=performance.now();},true);
    document.addEventListener('click',event=>{
        if(!event.isTrusted||event.detail&&performance.now()-pressTime>=550)return;
        const button=event.target.closest('#btnToggleSimMode,#btnRandom,#btnGravitationalSort,#btnStepForward,#btnPlayPauseLife');
        if(button&&!button.disabled){
            const before=read();
            setTimeout(()=>{
                const after=read(),summary=state=>({playing:state.playing,armedSimulation:state.armedSimulation,simMode:state.simMode});
                record('evolution-action',{id:button.id,before:summary(before),after:summary(after),changed:before.tiles.some((color,i)=>after.tiles[i]!==color)});
            },0);
        }
        if(event.target.closest('#btnPalette'))record('palette',{paletteIndex:read().paletteIndex});
        if(event.target.closest('#btnRandom'))record('random');
        if(event.target.closest('#palette-apply'))record('apply');
        if(event.target.closest('#colorPickerSwatches .color-swatch'))record('color-select');
        if(event.target.closest('#brushSizeOptions button'))record('brush-size-select');
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
    window.chapterOnePractice={read,visible,openPalette,guide,prepareOrder,prepareChapterThree,prepareChapterFour,pausePractice,cursor:()=>sequence,events:after=>events.filter(e=>e.sequence>after),
        closePalette:()=>document.querySelector('#btnPaletteModalClose')?.click(),
        closePracticeModals:()=>{for(const selector of ['#colorPickerModal.modal-visible #btnColorPickerCloseTop','#resizeModal.modal-visible #btnResizeModalClose','#sortCycleDialog[open] #btnSortCycleCloseTop'])document.querySelector(selector)?.click();},
        fit
    };
}
