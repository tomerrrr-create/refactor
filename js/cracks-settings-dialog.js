import { onLanguageChange } from './i18n.js';
import { DEFAULT_CRACKS_MATERIAL, validateCracksMaterial } from './cracks-settings.js';
export function createCracksSettingsDialog(app) {
    const dialog=document.createElement('dialog');
    dialog.id='cracksSettingsDialog';dialog.className='erosion-settings-dialog evolution-tuning-dialog';
    dialog.setAttribute('aria-labelledby','cracksSettingsTitle');
    dialog.innerHTML=`<form>
      <button type="button" class="modal-dismiss" data-close>×</button>
      <h2 id="cracksSettingsTitle"></h2><p id="cracksMaterialNote"></p>
      <label class="cracks-toggle" for="cracksMaterialEnabled"><span></span><input id="cracksMaterialEnabled" type="checkbox" aria-describedby="cracksMaterialNote"></label>
      <div class="cracks-strength"><label for="cracksMaterialStrength"></label><output for="cracksMaterialStrength"></output><input id="cracksMaterialStrength" type="range" min="0" max="100" step="5" aria-describedby="cracksMaterialNote"></div>
      <label class="cracks-line-color" for="cracksLineColor"><span></span><select id="cracksLineColor"><option value="darkest"></option><option value="lightest"></option></select></label>
      <div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div>
    </form>`;
    document.body.append(dialog);
    const enabled=dialog.querySelector('#cracksMaterialEnabled'),strength=dialog.querySelector('#cracksMaterialStrength'),color=dialog.querySelector('#cracksLineColor');
    let draft=null;
    function render(){
        dialog.dir=app.getCurrentLang()==='he'?'rtl':'ltr';
        dialog.querySelector('h2').textContent=app.getText('cracks_settings_title');
        dialog.querySelector('#cracksMaterialNote').textContent=app.getText('cracks_material_note');
        dialog.querySelector('.cracks-toggle span').textContent=app.getText('cracks_material_enabled');
        dialog.querySelector('.cracks-strength label').textContent=app.getText('cracks_material_strength');
        dialog.querySelector('.cracks-line-color span').textContent=app.getText('contour_color_label');
        for(const option of color.options)option.textContent=app.getText('contour_color_'+option.value);
        dialog.querySelector('[data-close]').setAttribute('aria-label',app.getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent=app.getText('evolution_reset_default');
        dialog.querySelector('[data-cancel]').textContent=app.getText('gs_modal_cancel');
        dialog.querySelector('[type=submit]').textContent=app.getText('gs_modal_save_close');
        if(!draft)return;
        enabled.checked=draft.enabled;strength.value=draft.strength;strength.disabled=!draft.enabled;
        const text=draft.strength+'%';dialog.querySelector('output').value=text;strength.setAttribute('aria-valuetext',text);color.value=draft.lineColor;
    }
    enabled.addEventListener('change',()=>{draft.enabled=enabled.checked;render();});
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);render();});
    color.addEventListener('change',()=>{draft.lineColor=color.value;});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...DEFAULT_CRACKS_MATERIAL,lineColor:'darkest'};render();});
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const material=validateCracksMaterial({enabled:draft.enabled,strength:draft.strength});if(app.saveCracksSettings(material,draft.lineColor)!==false)dialog.close();});
    dialog.addEventListener('close',()=>{draft=null;app.dom.btnContour.focus({preventScroll:true});});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
    let startedOutside=false;dialog.addEventListener('pointerdown',e=>{startedOutside=outside(e);});dialog.addEventListener('click',e=>{if(startedOutside&&outside(e))dialog.close();startedOutside=false;});
    onLanguageChange(render);
    return {dialog,open(){if(dialog.open||!app.canEditCracksSettings())return;draft=app.getCracksSettings();render();dialog.showModal();enabled.focus();}};
}
