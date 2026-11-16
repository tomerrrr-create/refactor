// This bridge exists only inside the disposable practice frame, never in the user's app.
export function installFtuePractice({prepare, open, read, layout}) {
    let sequence = 0, down = null, watched = null;
    const events = [];
    const record = (type, target) => {
        events.push({sequence:++sequence, type, selector:watched, matched:!!watched&&!!target.closest(watched)});
        if (events.length > 200) events.shift();
    };
    document.addEventListener('click', event => record('click', event.target), true);
    document.addEventListener('change', event => record('change', event.target), true);
    document.addEventListener('input', event => record('input', event.target), true);
    document.addEventListener('pointerdown', event => {
        if (event.target.closest('#boardCanvas')) down = {x:event.clientX,y:event.clientY};
    }, true);
    document.addEventListener('pointerup', event => {
        if (!down) return;
        const dragged = Math.hypot(event.clientX-down.x,event.clientY-down.y)>8;
        down = null; record(dragged?'drag':'paint',document.getElementById('boardCanvas'));
    }, true);
    document.addEventListener('pointercancel', () => {down=null;}, true);
    const visible = selector => [...document.querySelectorAll(selector)].find(element => {
        const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
        return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&Number(style.opacity)!==0;
    });
    const fit = () => {
        const controls=document.getElementById('controlsContainer');
        const available=innerHeight-controls.getBoundingClientRect().height-38;
        document.documentElement.style.setProperty('--ftue-board-size',Math.max(64,Math.min(720,innerWidth-32,available))+'px');
        layout?.();
    };
    addEventListener('resize',fit);
    new ResizeObserver(fit).observe(document.getElementById('controlsContainer'));
    fit();
    window.fyiPractice = {
        prepare: step => {document.documentElement.dataset.ftueFocus=step.target==='#boardCanvas'?'canvas':'tools';if(step.mode)document.documentElement.dataset.ftueMode=step.mode;prepare(step);fit();}, open, read, visible,
        reveal: selector => {
            const target=visible(selector);if(!target)return;
            // Scroll only inside the containing modal; scrolling the outer
            // document can move the entire canvas out of its reserved viewport.
            let parent=target.parentElement;
            while(parent&&parent!==document.body){
                const style=getComputedStyle(parent);
                if(/auto|scroll/.test(style.overflowY)&&parent.scrollHeight>parent.clientHeight){
                    const rect=target.getBoundingClientRect(),bounds=parent.getBoundingClientRect();
                    if(rect.top<bounds.top)parent.scrollTop+=rect.top-bounds.top-8;
                    else if(rect.bottom>bounds.bottom)parent.scrollTop+=Math.min(rect.top-bounds.top-8,rect.bottom-bounds.bottom+8);
                }
                parent=parent.parentElement;
            }
        },
        cursor: () => sequence,
        watch: selector => {watched=selector;},
        happened: (type, selector, after) => events.some(event => event.sequence>after&&event.type===type&&event.selector===selector&&event.matched),
        focus: selector => visible(selector)?.focus({preventScroll:true})
    };
}
