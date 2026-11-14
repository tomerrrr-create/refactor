import {INITIAL_NETWORK_RULES,NETWORK_BACKGROUND_MODES,validateNetworkRules} from './simulations/network.js';
export function createNetworkSettingsDialog({getRules,saveRules,getText,getLang,onLanguageChange}){
 const dialog=document.createElement('dialog');dialog.id='networkSettingsDialog';dialog.className='erosion-settings-dialog ink-settings-dialog network-settings-dialog';dialog.setAttribute('aria-labelledby','networkSettingsTitle');
 dialog.innerHTML='<form><header><h2 id="networkSettingsTitle"></h2><button type="button" data-close>×</button></header><p data-description></p><div data-network-controls></div><footer><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>';
 document.body.append(dialog);let draft;
 function render(){
  dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('help_network');dialog.querySelector('[data-description]').textContent=getText('network_description');dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
  dialog.querySelector('[data-reset]').textContent=getText('evolution_reset_default');dialog.querySelector('[data-cancel]').textContent=getText('gs_modal_cancel');dialog.querySelector('[type=submit]').textContent=getText('gs_modal_save_close');
  const controls=dialog.querySelector('[data-network-controls]');controls.replaceChildren();
  const group=document.createElement('fieldset');group.className='network-background-options';
  const legend=document.createElement('legend');legend.textContent=getText('network_background');group.append(legend);
  for(const mode of NETWORK_BACKGROUND_MODES){
   const button=document.createElement('button');button.type='button';button.dataset.networkBackground=mode;button.setAttribute('aria-pressed',String(mode===(draft.backgroundMode??'auto')));
   const title=document.createElement('strong'),description=document.createElement('span');title.textContent=getText('network_background_'+mode);description.textContent=getText('network_background_'+mode+'_description');button.append(title,description);
   button.addEventListener('click',()=>{
    if(mode==='auto')delete draft.backgroundMode;else draft.backgroundMode=mode;
    for(const item of group.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item.dataset.networkBackground===mode));
   });group.append(button);
  }controls.append(group);
  for(const key of ['growth','branching','persistence']){
   const row=document.createElement('label');row.className='ink-setting-row network-setting-row';row.htmlFor='network-'+key;const title=document.createElement('span');title.textContent=getText('network_'+key);const output=document.createElement('output');output.htmlFor=row.htmlFor;output.textContent=draft[key]+'%';const input=document.createElement('input');input.id=row.htmlFor;input.type='range';input.min='0';input.max='100';input.step='1';input.value=draft[key];input.addEventListener('input',()=>{draft[key]=Number(input.value);output.textContent=draft[key]+'%';});row.append(title,output,input);controls.append(row);
  }
 }
 const close=()=>dialog.close();dialog.querySelector('[data-close]').onclick=close;dialog.querySelector('[data-cancel]').onclick=close;dialog.querySelector('[data-reset]').onclick=()=>{draft={...INITIAL_NETWORK_RULES};render();};dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(saveRules(validateNetworkRules(draft))!==false)close();});onLanguageChange(()=>{if(dialog.open)render();});
 return {open(){draft=validateNetworkRules(getRules());render();dialog.showModal();dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus();}};
}
