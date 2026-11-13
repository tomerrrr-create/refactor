// Removable UI experiment with a browser-local preference, outside profiles.
// Selection uses the existing swatch handlers; artwork/history formats stay untouched.
export function createCompactColorPicker({modal, grid, toggle, onChange}) {
    let enabled = false, pointer = null, candidate = null, frame = null, pending = null;
    const storageKey='colorGridCompactColorPicker';
    try { enabled=localStorage.getItem(storageKey)==='true'; } catch { /* Keep the default when storage is unavailable. */ }
    const preview = document.createElement('div');
    preview.className = 'compact-color-preview';
    preview.hidden = true;
    preview.setAttribute('aria-hidden', 'true');
    document.body.append(preview);
    const buttonAt = (x,y) => {
        const rect=grid.getBoundingClientRect();
        if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return null;
        const buttons=grid.querySelectorAll('button.color-swatch');
        const columns=Number(grid.style.getPropertyValue('--compact-columns'));
        const pitch=(rect.width+2)/columns;
        const relativeX=getComputedStyle(grid).direction==='rtl'?rect.right-x:x-rect.left;
        // Assign each internal gap to its nearest tile, retaining a continuous
        // preview. Empty trailing cells and points outside the grid still cancel.
        const column=Math.min(columns-1,Math.floor((relativeX+1)/pitch));
        const row=Math.floor((y-rect.top+1)/pitch);
        return buttons[row*columns+column]??null;
    };
    function show(button,x,y) {
        if(button!==candidate){
            candidate?.classList.remove('compact-color-candidate');
            candidate=button;
            if(button){
                button.classList.add('compact-color-candidate');
                preview.replaceChildren(button.querySelector('.color-swatch-inner').cloneNode(true));
            }
        }
        preview.hidden=!button;
        if(!button)return;
        const left=Math.max(8,Math.min(innerWidth-72,x-32));
        const top=y>=84?y-80:Math.min(innerHeight-72,y+24);
        preview.style.transform=`translate3d(${left}px,${top}px,0)`;
    }
    function schedule(x,y) {
        pending={x,y};
        if(frame!==null)return;
        frame=requestAnimationFrame(()=>{
            frame=null;const point=pending;pending=null;
            show(buttonAt(point.x,point.y),point.x,point.y);
        });
    }
    function cancel() {
        if(frame!==null)cancelAnimationFrame(frame);
        frame=null;pending=null;
        const id=pointer;pointer=null;
        if(id!==null&&grid.hasPointerCapture(id))grid.releasePointerCapture(id);
        show(null);
    }
    function refresh() {
        cancel();
        modal.classList.toggle('compact-colors',enabled);
        if(!enabled)return;
        const width=grid.getBoundingClientRect().width;
        if(!width)return;
        const panel=modal.querySelector('.brush-picker-panel');
        const tools=modal.querySelector('.brush-picker-tools');
        const budget=Math.max(64,innerHeight*.82-panel.querySelector('header').offsetHeight-tools.offsetHeight-64);
        const count=grid.querySelectorAll('button.color-swatch').length;
        let columns=Math.min(count,Math.max(5,Math.ceil(Math.sqrt(count*width/budget))));
        while(columns<count&&Math.ceil(count/columns)*((width-2*(columns-1))/columns+2)>budget)columns++;
        grid.style.setProperty('--compact-columns',columns);
        grid.toggleAttribute('data-large-swatches',columns<=8);
    }
    toggle.checked=enabled;
    toggle.addEventListener('change',()=>{
        cancel();enabled=toggle.checked;
        try { localStorage.setItem(storageKey,String(enabled)); } catch { /* The current choice still works for this session. */ }
        onChange();
    });
    grid.addEventListener('pointerdown',event=>{
        if(!enabled||event.button!==0)return;
        if(pointer!==null){cancel();return;}
        const button=buttonAt(event.clientX,event.clientY);if(!button)return;
        event.preventDefault();pointer=event.pointerId;grid.setPointerCapture(pointer);
        show(button,event.clientX,event.clientY);
    });
    grid.addEventListener('pointermove',event=>{
        if(!enabled||(pointer!==null&&pointer!==event.pointerId))return;
        if(pointer!==null||event.pointerType==='mouse')schedule(event.clientX,event.clientY);
    });
    grid.addEventListener('pointerup',event=>{
        if(!enabled||pointer!==event.pointerId)return;
        event.preventDefault();const button=buttonAt(event.clientX,event.clientY);cancel();
        button?.click();
    });
    grid.addEventListener('pointercancel',cancel);
    grid.addEventListener('lostpointercapture',cancel);
    grid.addEventListener('pointerleave',()=>{if(pointer===null)cancel();});
    grid.addEventListener('click',event=>{
        if(enabled&&(event.detail>0||event.pointerType)){
            event.preventDefault();event.stopImmediatePropagation();
        }
    },true);
    // The paged picker's touch swipe recognizer must not consume dense drags.
    for(const type of ['touchstart','touchmove','touchend','touchcancel'])grid.addEventListener(type,event=>{
        if(enabled)event.stopImmediatePropagation();
    },{capture:true,passive:true});
    modal.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
    new MutationObserver(()=>{
        if(modal.classList.contains('modal-visible'))refresh();else cancel();
    }).observe(modal,{attributes:true,attributeFilter:['class']});
    new ResizeObserver(refresh).observe(grid);
    return {enabled:()=>enabled,refresh,cancel};
}
