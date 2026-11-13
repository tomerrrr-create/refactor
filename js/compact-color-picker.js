// Disposable, session-only UI experiment. Selection still uses the existing
// swatch click handlers, so artwork/history and profile formats stay untouched.
export function createCompactColorPicker({modal, grid, toggle, onChange}) {
    let enabled = false, pointer = null, candidate = null;
    const preview = document.createElement('div');
    preview.className = 'compact-color-preview';
    preview.hidden = true;
    preview.setAttribute('aria-hidden', 'true');
    document.body.append(preview);
    const buttonAt = (x,y) => {
        const button = document.elementFromPoint(x,y)?.closest('button.color-swatch');
        return button && grid.contains(button) ? button : null;
    };
    function show(button,x,y) {
        candidate?.classList.remove('compact-color-candidate');
        candidate = button;
        preview.hidden = !button;
        if (!button) return;
        button.classList.add('compact-color-candidate');
        preview.replaceChildren(button.querySelector('.color-swatch-inner').cloneNode(true));
        preview.style.left = Math.max(8,Math.min(innerWidth-72,x-32))+'px';
        preview.style.top = (y>=84 ? y-80 : Math.min(innerHeight-72,y+24))+'px';
    }
    function cancel() {
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
    }
    toggle.checked=false;
    toggle.addEventListener('change',()=>{cancel();enabled=toggle.checked;onChange();});
    grid.addEventListener('pointerdown',event=>{
        if(!enabled||event.button!==0)return;
        if(pointer!==null){cancel();return;}
        const button=buttonAt(event.clientX,event.clientY);if(!button)return;
        event.preventDefault();pointer=event.pointerId;grid.setPointerCapture(pointer);
        show(button,event.clientX,event.clientY);
    });
    grid.addEventListener('pointermove',event=>{
        if(!enabled||(pointer!==null&&pointer!==event.pointerId))return;
        if(pointer!==null||event.pointerType==='mouse')show(buttonAt(event.clientX,event.clientY),event.clientX,event.clientY);
    });
    grid.addEventListener('pointerup',event=>{
        if(!enabled||pointer!==event.pointerId)return;
        event.preventDefault();const button=buttonAt(event.clientX,event.clientY);cancel();
        button?.click();
    });
    grid.addEventListener('pointercancel',cancel);
    grid.addEventListener('lostpointercapture',cancel);
    grid.addEventListener('pointerleave',()=>{if(pointer===null)show(null);});
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
