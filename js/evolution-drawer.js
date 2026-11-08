import { createDrawerView, INTERNAL_NAV_SLOTS } from './evolution-drawer-view.js';
import { focusSettingsHeading } from './dialog-focus.js';
import { bindPickerGestures } from './picker-gestures.js';
import { PALETTES } from './data/palettes.js';
import { EVOLUTION_CATALOG, EVOLUTION_PAGE_SIZE, validateEvolutionSlots, moveEvolutionSlot, evolutionControlId } from './evolution-drawer-settings.js';

export function createEvolutionDrawer({controls,getSlots,getActive,isRunning,canNavigate,canEdit,onSave,getText,getLang,onLanguageChange}) {
    const trigger=document.createElement('button');
    trigger.id='btnEvolutionDrawer';trigger.type='button';trigger.className='evolution-drawer-trigger';
    trigger.setAttribute('aria-controls','evolutionDrawerDialog');
    trigger.setAttribute('aria-keyshortcuts','Alt+ArrowUp');
    trigger.innerHTML='<span class="drawer-handle" aria-hidden="true"><svg viewBox="0 0 16 28" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5-4 4 4 4m-2 2 4 4-4 4"/></svg><span class="drawer-active-mark"></span></span>';
    const rightTrigger=trigger.cloneNode(true);rightTrigger.id='btnEvolutionDrawerRight';
    rightTrigger.dataset.side='right';
    const internalTrigger=trigger.cloneNode(true);internalTrigger.id='btnEvolutionDrawerInternal';internalTrigger.className='evolution-drawer-internal';
    internalTrigger.innerHTML='<span class="drawer-internal-symbol" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="3"/><path d="M18 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2M13 15h6m-2-2 2 2-2 2"/></svg><span class="drawer-active-mark"></span></span>';
    const triggers=[trigger,rightTrigger,internalTrigger];
    controls.append(...triggers);
    const dialog=document.createElement('dialog');
    dialog.id='evolutionDrawerDialog';
    dialog.className='erosion-settings-dialog evolution-drawer-dialog';
    dialog.setAttribute('aria-labelledby','evolutionDrawerTitle');
    dialog.setAttribute('aria-describedby','drawerInstructions');
    dialog.innerHTML=`<form><header class="drawer-header"><div class="drawer-title"><span class="drawer-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h20M4 14h20M4 20h20"/><circle cx="9" cy="8" r="2" fill="currentColor"/><circle cx="19" cy="14" r="2" fill="currentColor"/><circle cx="12" cy="20" r="2" fill="currentColor"/></svg></span><h2 id="evolutionDrawerTitle"></h2></div><button type="button" data-close>×</button></header><p id="drawerInstructions"></p><div class="drawer-pages"></div><p class="drawer-selection" role="status" aria-live="polite"></p><footer class="drawer-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>`;
    document.body.append(dialog);
    const tilePalette=PALETTES.find(p=>p.originalName==='Autumn into Winter 264');
    const luminance=hex=>{const channels=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
    const darkInk='#141914',lightInk='#FFF9ED',darkLuminance=luminance(darkInk),lightLuminance=luminance(lightInk);
    let draft=null,selected=null,page=0,pageAnimations=[],opener=internalTrigger;
    const view=createDrawerView({controls,getText,onSave,onChange:()=>{pageAnimations.forEach(a=>a.cancel());pageAnimations=[];applyLayout();if(dialog.open)dialog.close();}});
    const slotsNow=()=>view.slots(getSlots());
    const entry=id=>EVOLUTION_CATALOG.find(e=>e.id===evolutionControlId(id));
    const label=id=>getText(entry(id).key).split('\n')[0];
    const pageLabel=index=>getText('drawer_page').replace('{n}',index+1);
    const navigateAllowed=()=>canNavigate();
    function icon(id){
        const source=document.getElementById(entry(id).button),holder=document.createElement('span');
        holder.className='drawer-icon';holder.setAttribute('aria-hidden','true');
        const svgs=[...source.querySelectorAll(':scope > svg')];
        const svg=svgs.find(e=>getComputedStyle(e).display!=='none')||svgs[0];
        if(svg){
            const copy=svg.cloneNode(true),original=[svg,...svg.querySelectorAll('*')],cloned=[copy,...copy.querySelectorAll('*')];
            for(let i=0;i<cloned.length;i++){
                cloned[i].removeAttribute('id');
                if(getComputedStyle(original[i]).display==='none')cloned[i].style.display='none';
            }
            copy.style.display='block';holder.append(copy);
        } else holder.textContent=source.textContent.trim().slice(0,2);
        return holder;
    }
    function applyLayout(){
        const slots=slotsNow();
        for(const e of EVOLUTION_CATALOG){
            const button=document.getElementById(e.button),at=slots.indexOf(e.id),local=at%EVOLUTION_PAGE_SIZE;
            button.dataset.evolutionId=e.id;
            button.dataset.evolutionSlot=String(at);
            button.dataset.evolutionPage=String(Math.floor(at/EVOLUTION_PAGE_SIZE));
            button.toggleAttribute('data-evolution-page-hidden',Math.floor(at/EVOLUTION_PAGE_SIZE)!==page);
            button.style.setProperty('--evolution-row',2+Math.floor(local/5));
            button.style.setProperty('--evolution-column',3+local%5);
        }
        controls.dataset.evolutionPage=String(page);
        refresh();
    }
    function refresh(){
        const active=getActive(),slots=slotsNow();
        const at=active?slots.indexOf(evolutionControlId(active)):-1;
        const otherPage=at>=0&&Math.floor(at/EVOLUTION_PAGE_SIZE)!==page;
        const text=getText('drawer_navigation').replace('{n}',page+1);
        const activeText=otherPage?getText(isRunning()?'drawer_running_elsewhere':'drawer_selected_elsewhere').replace('{name}',label(active)).replace('{n}',Math.floor(at/EVOLUTION_PAGE_SIZE)+1):'';
        for(const button of triggers){
            button.disabled=!navigateAllowed();button.dataset.parkedActive=String(otherPage);button.dataset.page=String(page);
            button.title=[text,activeText,getText('drawer_open_hint')].filter(Boolean).join(' — ');
            button.setAttribute('aria-label',button.title);
        }
        if(dialog.open&&!canEdit())dialog.close();
    }
    function nextPage(){
        if(!navigateAllowed())return;
        page=1-page;applyLayout();
        pageAnimations.forEach(animation=>animation.cancel());pageAnimations=[];
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
            for(const button of controls.querySelectorAll('[data-evolution-slot]:not([data-evolution-page-hidden])')){
                const ink=[...button.children].find(child=>getComputedStyle(child).display!=='none');
                if(ink)pageAnimations.push(ink.animate(view.mode==='internal'?[{opacity:0},{opacity:1}]:[{opacity:0,translate:page===1?'12px 0':'-12px 0'},{opacity:1,translate:'0 0'}],{duration:260,easing:'ease-in-out'}));
            }
        }
    }
    function render(){
        dialog.dir=['he','ar'].includes(getLang())?'rtl':'ltr';
        dialog.querySelector('h2').textContent=getText('drawer_title');
        dialog.querySelector('#drawerInstructions').textContent=getText('drawer_instructions');
        dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent=getText('evolution_reset_default');
        dialog.querySelector('[data-cancel]').textContent=getText('gs_modal_cancel');
        dialog.querySelector('[type=submit]').textContent=getText('gs_modal_save_close');
        const pages=dialog.querySelector('.drawer-pages');pages.replaceChildren();
        if(!draft)return;
        dialog.querySelector('.drawer-selection').textContent=selected===null?'':getText('drawer_destination').replace('{name}',label(draft[selected]));
        const colors=tilePalette.originalColors??tilePalette.colors;
        for(let drawer=0;drawer<2;drawer++){
            const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');
            heading.id=`drawerPageTitle${drawer}`;heading.textContent=pageLabel(drawer);section.append(heading);
            grid.className='drawer-slots';grid.setAttribute('role','group');grid.setAttribute('aria-labelledby',heading.id);
            for(let local=0;local<EVOLUTION_PAGE_SIZE;local++){
                const index=drawer*EVOLUTION_PAGE_SIZE+local,id=draft[index],button=document.createElement('button');
                button.type='button';button.dataset.drawerSlot=String(index);
                if(view.mode==='internal'&&INTERNAL_NAV_SLOTS.includes(index)){
                    button.className='drawer-reserved-slot';button.disabled=true;button.innerHTML=internalTrigger.querySelector('svg').outerHTML;button.setAttribute('aria-label',getText('drawer_view_internal'));grid.append(button);continue;
                }button.setAttribute('aria-pressed',String(index===selected));
                button.setAttribute('aria-label',`${pageLabel(drawer)}, ${getText('drawer_slot').replace('{n}',local+1)}: ${id?label(id):getText('drawer_empty')}`);
                button.title=button.getAttribute('aria-label');
                if(id){
                    button.dataset.drawerEvolution=id;
                    const color=colors[Math.round(EVOLUTION_CATALOG.findIndex(e=>e.id===id)*(colors.length-1)/(EVOLUTION_CATALOG.length-1))],light=luminance(color);
                    const ink=(light+.05)/(darkLuminance+.05)>=(lightLuminance+.05)/(light+.05)?darkInk:lightInk;
                    button.style.backgroundColor=color;button.style.color=ink;button.style.borderColor=ink+'55';button.append(icon(id));
                }else{
                    button.className='drawer-empty';button.innerHTML='<span aria-hidden="true">+</span>';
                }
                button.addEventListener('click',()=>{
                    if(selected===null){if(id===null)return;selected=index;}
                    else if(selected===index)selected=null;
                    else{draft=moveEvolutionSlot(draft,selected,index);selected=null;}
                    render();dialog.querySelector(`[data-drawer-slot="${index}"]`).focus();
                });
                grid.append(button);
            }
            section.append(grid);pages.append(section);
        }
    }
    function open(source=view.mode==='internal'?internalTrigger:trigger){
        if(dialog.open||!canEdit())return;
        opener=source;
        draft=slotsNow();selected=null;render();dialog.showModal();focusSettingsHeading(dialog);
    }
    for(const button of triggers){
        bindPickerGestures(button,{onTap:nextPage,onOpen:()=>open(button),canInteract:navigateAllowed,canOpen:canEdit});
        button.addEventListener('keydown',event=>{
            if(event.altKey&&event.key==='ArrowUp'&&canEdit()){event.preventDefault();open(button);}
        });
    }
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft=view.defaults();selected=null;render();});
    dialog.querySelector('form').addEventListener('submit',event=>{
        event.preventDefault();if(!canEdit())return;
        if(view.save(validateEvolutionSlots(draft))!==false)dialog.close();
    });
    dialog.addEventListener('close',()=>{draft=null;selected=null;opener.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
    const observer=new MutationObserver(refresh);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-simulation-running']});
    observer.observe(controls,{attributes:true,subtree:true,attributeFilter:['class']});
    onLanguageChange(()=>{view.refresh();refresh();if(dialog.open)render();});
    applyLayout();return {applyLayout,refresh,open,dialog,trigger};
}
