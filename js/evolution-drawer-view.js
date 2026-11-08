// Session-only presentation experiment. No profile, storage or engine state.
// Remove this module and the alternate CSS when a single view is chosen.
import { DEFAULT_EVOLUTION_LAYOUT, validateEvolutionSlots } from './evolution-drawer-settings.js';
export const INTERNAL_NAV_SLOTS = Object.freeze([7,17]);
export function projectInternalDrawer(value) {
    const source=validateEvolutionSlots(value),slots=[...source];
    slots[5]=source[6];slots[6]=source[7];slots[7]=null;slots[17]=null;
    for(const [id,preferred] of [[source[5],10],[source[17],18]]){
        if(id===null)continue;
        let at=slots[preferred]===null?preferred:slots.findIndex((v,i)=>i>=10&&v===null&&!INTERNAL_NAV_SLOTS.includes(i));
        if(at<0)at=slots.findIndex((v,i)=>v===null&&!INTERNAL_NAV_SLOTS.includes(i));
        slots[at]=id;
    }
    return validateEvolutionSlots(slots);
}
export function createDrawerView({controls,getText,onChange,onSave}) {
    let mode='internal',baseKey=null,internalSlots=null;
    const option=document.createElement('div');option.className='technician-option drawer-view-option';
    option.innerHTML='<span id="drawerViewLabel" class="technician-effect-heading"></span><div role="group" aria-labelledby="drawerViewLabel"><button type="button" data-drawer-view="internal"></button><button type="button" data-drawer-view="handles"></button></div>';
    document.querySelector('.technician-display-settings').append(option);
    function refresh(){
        controls.dataset.drawerView=mode;
        option.querySelector('#drawerViewLabel').textContent=getText('drawer_view_title');
        for(const button of option.querySelectorAll('button')){
            button.textContent=getText('drawer_view_'+button.dataset.drawerView);
            button.setAttribute('aria-pressed',String(button.dataset.drawerView===mode));
        }
    }
    for(const button of option.querySelectorAll('button'))button.addEventListener('click',()=>{
        mode=button.dataset.drawerView;refresh();onChange();
    });
    refresh();
    return {
        get mode(){return mode;},refresh,
        slots(raw){
            const key=JSON.stringify(raw);
            if(key!==baseKey){baseKey=key;internalSlots=projectInternalDrawer(raw);}
            return mode==='internal'?[...internalSlots]:validateEvolutionSlots(raw);
        },
        defaults(){return mode==='internal'?projectInternalDrawer(DEFAULT_EVOLUTION_LAYOUT):[...DEFAULT_EVOLUTION_LAYOUT];},
        save(draft){
            if(mode==='handles')return onSave(draft);
            if(INTERNAL_NAV_SLOTS.some(i=>draft[i]!==null))throw new Error('Reserved drawer navigation slot');
            internalSlots=validateEvolutionSlots(draft);onChange();return true;
        }
    };
}
