import {EVOLUTION_CATALOG,DEFAULT_EVOLUTION_SLOTS,validateEvolutionSlots,assignEvolutionSlot} from './evolution-drawer-settings.js';

export function createEvolutionDrawer({controls,getSlots,getActive,isRunning,canEdit,onSave,getText,getLang,onLanguageChange}) {
    const trigger=document.createElement('button');trigger.id='btnEvolutionDrawer';trigger.type='button';
    trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','evolutionDrawerDialog');trigger.innerHTML='<span aria-hidden="true"></span>';controls.append(trigger);
    const dialog=document.createElement('dialog');dialog.id='evolutionDrawerDialog';dialog.className='erosion-settings-dialog evolution-drawer-dialog';dialog.setAttribute('aria-labelledby','evolutionDrawerTitle');
    dialog.innerHTML=`<form><header class="drawer-header"><h2 id="evolutionDrawerTitle"></h2><button type="button" data-close>×</button></header><p class="drawer-instructions"></p><div class="drawer-slots" role="group"></div><h3 class="drawer-catalog-title"></h3><div class="drawer-catalog" role="group"></div><footer class="drawer-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>`;
    document.body.append(dialog);
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
        dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('drawer_title');dialog.querySelector('.drawer-instructions').textContent=getText('drawer_instructions');
        dialog.querySelector('.drawer-catalog-title').textContent=getText('drawer_all');dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent=getText('evolution_reset_default');dialog.querySelector('[data-cancel]').textContent=getText('gs_modal_cancel');dialog.querySelector('[type=submit]').textContent=getText('gs_modal_save_close');
        const slots=dialog.querySelector('.drawer-slots'),catalog=dialog.querySelector('.drawer-catalog');slots.setAttribute('aria-label',getText('drawer_slots'));catalog.setAttribute('aria-label',getText('drawer_all'));slots.replaceChildren();catalog.replaceChildren();
        if(!draft)return;
        draft.forEach((id,index)=>{const button=document.createElement('button');button.type='button';button.dataset.drawerSlot=index;button.setAttribute('aria-pressed',String(index===selected));button.setAttribute('aria-label',getText('drawer_slot').replace('{n}',index+1)+': '+label(id));button.title=button.getAttribute('aria-label');
            const number=document.createElement('small');number.textContent=index+1;const name=document.createElement('span');name.className='drawer-slot-label';name.textContent=label(id);button.append(number,icon(id),name);button.addEventListener('click',()=>{selected=index;render();dialog.querySelector('[data-drawer-slot="'+index+'"]').focus();});slots.append(button);
        });
        EVOLUTION_CATALOG.forEach(e=>{const button=document.createElement('button');button.type='button';button.dataset.drawerEvolution=e.id;button.setAttribute('aria-pressed',String(draft[selected]===e.id));button.append(icon(e.id));
            const name=document.createElement('span');name.textContent=label(e.id);const badge=document.createElement('small'),index=draft.indexOf(e.id);badge.textContent=index<0?'':String(index+1);button.append(name,badge);
            button.addEventListener('click',()=>{draft=assignEvolutionSlot(draft,selected,e.id);render();dialog.querySelector('[data-drawer-evolution="'+e.id+'"]').focus();});catalog.append(button);
        });
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
