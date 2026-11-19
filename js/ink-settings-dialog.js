import {setFluidExperimentTitle} from './fluid-experiment-icons.js';
import {createFluidPresetPicker} from './fluid-presets.js';
import {DEFAULT_INK_PREFERENCES,validateInkRules} from './simulations/ink.js';
export function createInkSettingsDialog({getRules,saveRules,getText,getLang,onLanguageChange}){
 const dialog=document.createElement('dialog');dialog.id='inkSettingsDialog';dialog.className='erosion-settings-dialog ink-settings-dialog';dialog.setAttribute('aria-labelledby','inkSettingsTitle');
 dialog.innerHTML='<form><header><h2 id="inkSettingsTitle"></h2><button type="button" data-close>×</button></header><p data-description></p><div data-ink-controls></div><footer><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer></form>';
 document.body.append(dialog);let draft;
 const presets=createFluidPresetPicker({kind:'ink',getDraft:()=>draft,getLang,getText,onSelect:rules=>{
  draft=rules;
  for(const [key,value] of Object.entries(draft)){
   const input=dialog.querySelector('#ink-'+key);input.value=value;input.closest('label').querySelector('output').textContent=value+'%';
  }
 }});
 dialog.querySelector('[data-ink-controls]').before(presets.element);
 function render(){
  dialog.dir=getLang()==='he'?'rtl':'ltr';setFluidExperimentTitle(dialog.querySelector('h2'),'ink',getText('help_ink'));dialog.querySelector('[data-description]').textContent=getText('ink_description');dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
  dialog.querySelector('[data-reset]').textContent=getText('evolution_reset_default');dialog.querySelector('[data-cancel]').textContent=getText('gs_modal_cancel');dialog.querySelector('[type=submit]').textContent=getText('gs_modal_save_close');
  presets.render();
  const controls=dialog.querySelector('[data-ink-controls]');controls.replaceChildren();
  for(const key of ['flow','swirl','viscosity']){
   const row=document.createElement('label');row.className='ink-setting-row';row.htmlFor='ink-'+key;const title=document.createElement('span');title.textContent=getText('ink_'+key);const output=document.createElement('output');output.htmlFor=row.htmlFor;output.textContent=draft[key]+'%';const input=document.createElement('input');input.id=row.htmlFor;input.type='range';input.min='0';input.max='100';input.step='1';input.value=draft[key];input.addEventListener('input',()=>{draft[key]=Number(input.value);output.textContent=draft[key]+'%';presets.sync();});row.append(title,output,input);controls.append(row);
  }
 }
 const close=()=>dialog.close();dialog.querySelector('[data-close]').onclick=close;dialog.querySelector('[data-cancel]').onclick=close;dialog.querySelector('[data-reset]').onclick=()=>{draft={...DEFAULT_INK_PREFERENCES};render();};dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(saveRules(validateInkRules(draft))!==false)close();});onLanguageChange(()=>{if(dialog.open)render();});
 return {open(){draft=validateInkRules(getRules() ?? DEFAULT_INK_PREFERENCES);render();dialog.showModal();dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus();}};
}
