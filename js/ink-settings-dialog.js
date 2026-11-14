import {INITIAL_INK_RULES,validateInkRules} from './simulations/ink.js';
export function createInkSettingsDialog({getRules,saveRules,getText,getLang,onLanguageChange}){
 const dialog=document.createElement('dialog');dialog.id='inkSettingsDialog';dialog.className='erosion-settings-dialog ink-settings-dialog';dialog.setAttribute('aria-labelledby','inkSettingsTitle');
 dialog.innerHTML='<form><header><h2 id="inkSettingsTitle"></h2><button type="button" data-close>×</button></header><p data-description></p><div data-ink-controls></div><footer><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>';
 document.body.append(dialog);let draft;
 function render(){
  dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('help_ink');dialog.querySelector('[data-description]').textContent=getText('ink_description');dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
  dialog.querySelector('[data-reset]').textContent=getText('evolution_reset_default');dialog.querySelector('[data-cancel]').textContent=getText('gs_modal_cancel');dialog.querySelector('[type=submit]').textContent=getText('gs_modal_save_close');
  const controls=dialog.querySelector('[data-ink-controls]');controls.replaceChildren();
  for(const key of ['flow','swirl','viscosity']){
   const row=document.createElement('label');row.className='ink-setting-row';row.htmlFor='ink-'+key;const title=document.createElement('span');title.textContent=getText('ink_'+key);const output=document.createElement('output');output.htmlFor=row.htmlFor;output.textContent=draft[key]+'%';const input=document.createElement('input');input.id=row.htmlFor;input.type='range';input.min='0';input.max='100';input.step='1';input.value=draft[key];input.addEventListener('input',()=>{draft[key]=Number(input.value);output.textContent=draft[key]+'%';});row.append(title,output,input);controls.append(row);
  }
 }
 const close=()=>dialog.close();dialog.querySelector('[data-close]').onclick=close;dialog.querySelector('[data-cancel]').onclick=close;dialog.querySelector('[data-reset]').onclick=()=>{draft={...INITIAL_INK_RULES};render();};dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(saveRules(validateInkRules(draft))!==false)close();});onLanguageChange(()=>{if(dialog.open)render();});
 return {open(){draft=validateInkRules(getRules());render();dialog.showModal();dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus();}};
}
