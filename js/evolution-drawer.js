import { focusSettingsHeading } from './dialog-focus.js';
import { bindPickerGestures } from './picker-gestures.js';
import { PALETTES } from './data/palettes.js';
import { EVOLUTION_CATALOG, DEFAULT_EVOLUTION_LAYOUT, INTERNAL_NAV_SLOTS, EVOLUTION_PAGE_SIZE, validateEvolutionSlots, moveEvolutionSlot, evolutionControlId } from './evolution-drawer-settings.js';

export function createEvolutionDrawer({controls,getSlots,getActive,isRunning,canNavigate,canEdit,onSave,getText,getLang,onLanguageChange}) {
    const trigger=document.createElement('button');
    trigger.id='btnEvolutionDrawerInternal';trigger.type='button';trigger.className='evolution-drawer-internal';
    trigger.setAttribute('aria-controls','evolutionDrawerDialog');
    trigger.setAttribute('aria-keyshortcuts','Alt+ArrowUp');
    trigger.innerHTML='<span class="drawer-internal-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path class="drawer-yin-half" data-yin-half="0" d="M15.35 27.98A12 12 0 0 1 15.35 4.02C23.5 4.02 23.5 12.2 17.1 15.3"/><path class="drawer-yin-half" data-yin-half="1" transform="rotate(180 16 16)" d="M15.35 27.98A12 12 0 0 1 15.35 4.02C23.5 4.02 23.5 12.2 17.1 15.3"/></svg><span class="drawer-active-mark"></span></span>';
    controls.append(trigger);
    const dialog=document.createElement('dialog');
    dialog.id='evolutionDrawerDialog';
    dialog.className='erosion-settings-dialog evolution-drawer-dialog';
    dialog.setAttribute('aria-labelledby','evolutionDrawerTitle');
    dialog.setAttribute('aria-describedby','drawerInstructions');
    dialog.innerHTML=`<form><header class="drawer-header"><div class="drawer-title"><span class="drawer-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h20M4 14h20M4 20h20"/><circle cx="9" cy="8" r="2" fill="currentColor"/><circle cx="19" cy="14" r="2" fill="currentColor"/><circle cx="12" cy="20" r="2" fill="currentColor"/></svg></span><h2 id="evolutionDrawerTitle"></h2></div><button type="button" data-close>×</button></header><p id="drawerInstructions"></p><div class="drawer-pages"></div><p class="drawer-selection" role="status" aria-live="polite"></p><div data-drawer-appearance></div><footer class="drawer-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>`;
    const appearance=document.getElementById('evolutionAppearanceControls');
    appearance.hidden=false;
    dialog.querySelector('[data-drawer-appearance]').replaceWith(appearance);
    document.body.append(dialog);
    const tilePalette=PALETTES.find(p=>p.originalName==='Autumn into Winter 264');
    const luminance=hex=>{const channels=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
    const darkInk='#141914',lightInk='#FFF9ED',darkLuminance=luminance(darkInk),lightLuminance=luminance(lightInk);
    let draft=null,selected=null,page=0,pageAnimations=[];
    const slotsNow=()=>validateEvolutionSlots(getSlots());
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
        trigger.disabled=!navigateAllowed();trigger.dataset.parkedActive=String(otherPage);trigger.dataset.page=String(page);
        trigger.title=[text,activeText,getText('drawer_open_hint')].filter(Boolean).join(' — ');
        trigger.setAttribute('aria-label',trigger.title);
        if(dialog.open&&!canEdit())dialog.close();
    }
    function nextPage(){
        if(!navigateAllowed())return;
        page=1-page;applyLayout();
        pageAnimations.forEach(animation=>animation.cancel());pageAnimations=[];
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
            for(const button of controls.querySelectorAll('[data-evolution-slot]:not([data-evolution-page-hidden])')){
                const ink=[...button.children].find(child=>getComputedStyle(child).display!=='none');
                if(ink)pageAnimations.push(ink.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-in-out'}));
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
                if(INTERNAL_NAV_SLOTS.includes(index)){
                    button.className='drawer-reserved-slot';button.disabled=true;button.innerHTML=trigger.querySelector('svg').outerHTML;button.setAttribute('aria-label',getText('drawer_navigation_slot'));grid.append(button);continue;
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
    function open(){
        if(dialog.open||!canEdit())return;
        draft=slotsNow();selected=null;render();dialog.showModal();focusSettingsHeading(dialog);
    }
    bindPickerGestures(trigger,{onTap:nextPage,onOpen:open,canInteract:navigateAllowed,canOpen:canEdit});
    trigger.addEventListener('keydown',event=>{
        if(event.altKey&&event.key==='ArrowUp'&&canEdit()){event.preventDefault();open();}
    });
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft=[...DEFAULT_EVOLUTION_LAYOUT];selected=null;render();});
    dialog.querySelector('form').addEventListener('submit',event=>{
        event.preventDefault();if(!canEdit())return;
        if(onSave(validateEvolutionSlots(draft))!==false)dialog.close();
    });
    dialog.addEventListener('close',()=>{draft=null;selected=null;trigger.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
    const observer=new MutationObserver(refresh);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-simulation-running']});
    observer.observe(controls,{attributes:true,subtree:true,attributeFilter:['class']});
    onLanguageChange(()=>{refresh();if(dialog.open)render();});
    applyLayout();return {applyLayout,refresh,open,dialog,trigger};
}
