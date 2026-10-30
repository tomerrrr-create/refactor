import { onLanguageChange } from './i18n.js';
import { DEFAULT_CRACKS_MATERIAL, validateCracksMaterial, DEFAULT_CRACKS_GROWTH, validateCracksGrowth } from './cracks-settings.js';
const growthControls = [
    {field:'branchChance',id:'cracksBranchChance',key:'cracks_branch_chance',min:0,max:100,step:5,percent:true},
    {field:'branchInterval',id:'cracksBranchInterval',key:'cracks_branch_interval',min:1,max:40,step:1},
    {field:'curvature',id:'cracksCurvature',key:'cracks_curvature',min:0,max:200,step:5,percent:true}
];
export function createCracksSettingsDialog(app) {
    const dialog=document.createElement('dialog');
    dialog.id='cracksSettingsDialog';dialog.className='erosion-settings-dialog evolution-tuning-dialog';
    dialog.setAttribute('aria-labelledby','cracksSettingsTitle');
    dialog.innerHTML=`<form>
      <button type="button" class="modal-dismiss" data-close>×</button>
      <h2 id="cracksSettingsTitle"></h2><p id="cracksMaterialNote"></p>
      <label class="cracks-toggle" for="cracksMaterialEnabled"><span></span><input id="cracksMaterialEnabled" type="checkbox" aria-describedby="cracksMaterialNote"></label>
      <div class="cracks-strength"><label for="cracksMaterialStrength"></label><output for="cracksMaterialStrength"></output><input id="cracksMaterialStrength" type="range" min="0" max="100" step="5" aria-describedby="cracksMaterialNote"></div>
      ${growthControls.map(c=>`<div class="cracks-strength cracks-growth-control"><label for="${c.id}"></label><output for="${c.id}"></output><input id="${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}"></div>`).join('')}
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
        for(const c of growthControls)dialog.querySelector(`label[for="${c.id}"]`).textContent=app.getText(c.key);
        if(!draft)return;
        for(const c of growthControls){
            const input=dialog.querySelector('#'+c.id),text=draft[c.field]+(c.percent?'%':'');
            input.value=draft[c.field];input.setAttribute('aria-valuetext',text);dialog.querySelector(`output[for="${c.id}"]`).value=text;
        }
        enabled.checked=draft.enabled;strength.value=draft.strength;strength.disabled=!draft.enabled;
        const text=draft.strength+'%';dialog.querySelector('output').value=text;strength.setAttribute('aria-valuetext',text);color.value=draft.lineColor;
    }
    enabled.addEventListener('change',()=>{draft.enabled=enabled.checked;render();});
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);render();});
    for(const c of growthControls)dialog.querySelector('#'+c.id).addEventListener('input',event=>{draft[c.field]=Number(event.target.value);render();});
    color.addEventListener('change',()=>{draft.lineColor=color.value;});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...DEFAULT_CRACKS_MATERIAL,...DEFAULT_CRACKS_GROWTH,lineColor:'darkest'};render();});
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const material=validateCracksMaterial({enabled:draft.enabled,strength:draft.strength});const growth=validateCracksGrowth(Object.fromEntries(growthControls.map(c=>[c.field,draft[c.field]])));if(app.saveCracksSettings(material,draft.lineColor,growth)!==false)dialog.close();});
    dialog.addEventListener('close',()=>{draft=null;app.dom.btnContour.focus({preventScroll:true});});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
    let startedOutside=false;dialog.addEventListener('pointerdown',e=>{startedOutside=outside(e);});dialog.addEventListener('click',e=>{if(startedOutside&&outside(e))dialog.close();startedOutside=false;});
    onLanguageChange(render);
    return {dialog,open(){if(dialog.open||!app.canEditCracksSettings())return;draft=app.getCracksSettings();render();dialog.showModal();enabled.focus();}};
}
