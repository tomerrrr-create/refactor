import {PALETTES} from './data/palettes.js';
import {EVOLUTION_CATALOG,DEFAULT_EVOLUTION_SLOTS,validateEvolutionSlots,assignEvolutionSlot} from './evolution-drawer-settings.js';

export function createEvolutionDrawer({controls,getSlots,getActive,isRunning,canEdit,onSave,getText,getLang,onLanguageChange}) {
    const trigger=document.createElement('button');trigger.id='btnEvolutionDrawer';trigger.type='button';
    trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','evolutionDrawerDialog');trigger.innerHTML='<span aria-hidden="true"></span>';controls.append(trigger);
    const dialog=document.createElement('dialog');dialog.id='evolutionDrawerDialog';dialog.className='erosion-settings-dialog evolution-drawer-dialog';dialog.setAttribute('aria-labelledby','evolutionDrawerTitle');
    dialog.innerHTML=`<form><header class="drawer-header"><div class="drawer-title"><span class="drawer-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 9 10 9-10M5 19l9-10 9 10" opacity=".45"/><g fill="currentColor" stroke="none"><circle cx="5" cy="9" r="1.5"/><circle cx="9.5" cy="9" r="1"/><circle cx="14" cy="9" r="1.5"/><circle cx="18.5" cy="9" r="1"/><circle cx="23" cy="9" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="9.5" cy="19" r="1"/><circle cx="14" cy="19" r="1.5"/><circle cx="18.5" cy="19" r="1"/><circle cx="23" cy="19" r="1.5"/></g></svg></span><h2 id="evolutionDrawerTitle"></h2></div><button type="button" data-close>×</button></header><div class="drawer-slots" role="group"></div><h3 id="drawerParkedTitle"></h3><div class="drawer-catalog" data-drawer-group="parked" role="group" aria-labelledby="drawerParkedTitle"></div><h3 id="drawerAssignedTitle"></h3><div class="drawer-catalog" data-drawer-group="assigned" role="group" aria-labelledby="drawerAssignedTitle"></div><footer class="drawer-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>`;
    document.body.append(dialog);
    const tilePalette=PALETTES.find(p=>p.originalName==='Autumn into Winter 264');
    const luminance=hex=>{const channels=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
    const darkInk='#141914',lightInk='#FFF9ED',darkLuminance=luminance(darkInk),lightLuminance=luminance(lightInk);
    let draft=null,selected=0;
    const entry=id=>EVOLUTION_CATALOG.find(e=>e.id===id);
    const label=id=>getText(entry(id).key).split('\n')[0];
    function icon(id){
        const source=document.getElementById(entry(id).button),holder=document.createElement('span');holder.className='drawer-icon';holder.setAttribute('aria-hidden','true');
        const svg=[...source.querySelectorAll('svg')].find(e=>getComputedStyle(e).display!=='none');
        if(svg){const copy=svg.cloneNode(true),original=[svg,...svg.querySelectorAll('*')],cloned=[copy,...copy.querySelectorAll('*')];for(let i=0;i<cloned.length;i++){cloned[i].removeAttribute('id');if(getComputedStyle(original[i]).display==='none')cloned[i].style.display='none';}copy.style.display='block';holder.append(copy);}
        else holder.textContent=source.textContent.trim().slice(0,2);
        return holder;
    }
    function applyLayout(){
        const slots=validateEvolutionSlots(getSlots());
        for(const e of EVOLUTION_CATALOG){const button=document.getElementById(e.button),at=slots.indexOf(e.id);button.dataset.evolutionId=e.id;
            if(at<0){delete button.dataset.evolutionSlot;button.style.removeProperty('--evolution-row');button.style.removeProperty('--evolution-column');}
            else {button.dataset.evolutionSlot=at;button.style.setProperty('--evolution-row',2+Math.floor(at/5));button.style.setProperty('--evolution-column',3+at%5);}
        }
        refresh();
    }
    function refresh(){
        const parked=isRunning()&&getActive()&&!getSlots().includes(getActive());
        trigger.disabled=!canEdit();trigger.dataset.parkedActive=String(Boolean(parked));
        const text=parked?getText('drawer_hidden_active').replace('{name}',label(getActive())):getText('drawer_title');trigger.title=text;trigger.setAttribute('aria-label',text);
        if(dialog.open&&!canEdit())dialog.close();
    }
    function render(){
        dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('drawer_title');
        dialog.querySelector('#drawerParkedTitle').textContent=getText('drawer_parked');dialog.querySelector('#drawerAssignedTitle').textContent=getText('drawer_assigned');dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent=getText('evolution_reset_default');dialog.querySelector('[data-cancel]').textContent=getText('gs_modal_cancel');dialog.querySelector('[type=submit]').textContent=getText('gs_modal_save_close');
        const slots=dialog.querySelector('.drawer-slots'),parked=dialog.querySelector('[data-drawer-group=parked]'),assigned=dialog.querySelector('[data-drawer-group=assigned]');slots.setAttribute('aria-label',getText('drawer_slots'));slots.setAttribute('aria-description',getText('drawer_instructions'));slots.replaceChildren();parked.replaceChildren();assigned.replaceChildren();
        if(!draft)return;
        const colors=tilePalette.originalColors ?? tilePalette.colors;
        draft.forEach((id,index)=>{const button=document.createElement('button');button.type='button';button.dataset.drawerSlot=index;button.setAttribute('aria-pressed',String(index===selected));button.setAttribute('aria-label',getText('drawer_slot').replace('{n}',index+1)+': '+label(id));button.title=button.getAttribute('aria-label');
            const color=colors[Math.round(index*(colors.length-1)/(draft.length-1))],light=luminance(color);
            const ink=(light+.05)/(darkLuminance+.05)>=(lightLuminance+.05)/(light+.05)?darkInk:lightInk;
            button.style.backgroundColor=color;button.style.color=ink;button.style.borderColor=ink+'55';button.append(icon(id));button.addEventListener('click',()=>{selected=index;render();dialog.querySelector('[data-drawer-slot="'+index+'"]').focus();});slots.append(button);
        });
        const addChoice=(e,group)=>{const button=document.createElement('button');button.type='button';button.dataset.drawerEvolution=e.id;button.setAttribute('aria-pressed',String(draft[selected]===e.id));button.setAttribute('aria-label',label(e.id));button.title=label(e.id);button.append(icon(e.id));
            button.addEventListener('click',()=>{draft=assignEvolutionSlot(draft,selected,e.id);render();dialog.querySelector('[data-drawer-evolution="'+e.id+'"]').focus();});group.append(button);
        };
        EVOLUTION_CATALOG.filter(e=>!draft.includes(e.id)).forEach(e=>addChoice(e,parked));
        draft.forEach(id=>addChoice(entry(id),assigned));
    }
    function open(){if(dialog.open||!canEdit())return;draft=validateEvolutionSlots(getSlots());selected=0;render();dialog.showModal();dialog.querySelector('[data-drawer-slot="0"]').focus();}
    trigger.addEventListener('click',open);
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft=[...DEFAULT_EVOLUTION_SLOTS];selected=0;render();});
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(!canEdit())return;if(onSave(validateEvolutionSlots(draft))!==false)dialog.close();});
    dialog.addEventListener('close',()=>{draft=null;trigger.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
    const observer=new MutationObserver(refresh);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-simulation-running']});observer.observe(controls,{attributes:true,subtree:true,attributeFilter:['class']});
    onLanguageChange(()=>{refresh();if(dialog.open)render();});applyLayout();return {applyLayout,refresh,open,dialog,trigger};
}
