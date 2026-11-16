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
        const small=innerWidth<=600||innerHeight<=500;
        if(small){
            const available=innerHeight-controls.getBoundingClientRect().height-38;
            document.documentElement.style.setProperty('--ftue-board-size',Math.max(64,Math.min(innerWidth-32,available))+'px');
        }
        layout?.();
    };
    addEventListener('resize',fit);
    new ResizeObserver(fit).observe(document.getElementById('controlsContainer'));
    fit();
    window.fyiPractice = {
        prepare: step => {document.documentElement.dataset.ftueFocus=step.target==='#boardCanvas'?'canvas':'tools';prepare(step);fit();}, open, read, visible,
        cursor: () => sequence,
        watch: selector => {watched=selector;},
        happened: (type, selector, after) => events.some(event => event.sequence>after&&event.type===type&&event.selector===selector&&event.matched),
        focus: selector => visible(selector)?.focus({preventScroll:true})
    };
}
