import { onLanguageChange } from './i18n.js';
import { CRACKS_LINE_COLORS, INITIAL_CRACKS_GROWTH, CRACKS_GROWTH_PRESETS, getCracksPresetId, DEFAULT_CRACKS_MATERIAL, validateCracksMaterial, validateCracksGrowth } from './cracks-settings.js';
const growthControls = [
    {field:'branchChance',id:'cracksBranchChance',key:'cracks_branch_chance',min:0,max:100,step:5,percent:true},
    {field:'branchInterval',id:'cracksBranchInterval',key:'cracks_branch_interval',min:1,max:40,step:1},
    {field:'curvature',id:'cracksCurvature',key:'cracks_curvature',min:0,max:200,step:5,percent:true}
];
export function createCracksSettingsDialog(app) {
    const dialog=document.createElement('dialog');
    dialog.id='cracksSettingsDialog';dialog.className='cracks-settings-dialog';
    dialog.setAttribute('aria-labelledby','cracksSettingsTitle');
    dialog.innerHTML=`<form>
      <header class="cracks-settings-header">
        <div class="cracks-heading"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m14 3-4 6 4 4-3 8M10 9 5 7m9 6 5-4m-7 8-6 2"/></svg><h2 id="cracksSettingsTitle"></h2></div>
        <button type="button" data-close>×</button>
      </header>
      <div class="cracks-settings-body">
        <section class="cracks-settings-panel cracks-presets-panel" aria-labelledby="cracksPresetsTitle">
          <div class="cracks-presets-heading"><h3 id="cracksPresetsTitle"></h3><span id="cracksPresetCustom" role="status"></span></div>
          <div class="cracks-preset-grid" role="group" aria-labelledby="cracksPresetsTitle">${CRACKS_GROWTH_PRESETS.map(p=>`<button type="button" data-cracks-preset="${p.id}" aria-pressed="false"><span class="cracks-preset-name"></span><span class="cracks-preset-values" dir="ltr">${p.values.branchChance}% · ${p.values.branchInterval} · ${p.values.curvature}%</span></button>`).join('')}</div>
        </section>
        <section class="cracks-settings-panel" aria-labelledby="cracksMaterialLabel">
          <label class="cracks-toggle" for="cracksMaterialEnabled"><span id="cracksMaterialLabel"></span><input id="cracksMaterialEnabled" type="checkbox" aria-describedby="cracksMaterialNote"></label>
          <div class="cracks-control"><label for="cracksMaterialStrength"></label><output for="cracksMaterialStrength"></output><input id="cracksMaterialStrength" type="range" min="0" max="100" step="5" aria-describedby="cracksMaterialNote"></div>
          <p id="cracksMaterialNote" class="cracks-settings-note"></p>
        </section>
        <section class="cracks-settings-panel cracks-growth-panel">
          ${growthControls.map(c=>`<div class="cracks-control"><label for="${c.id}"></label><output for="${c.id}"></output><p id="${c.id}Help" class="cracks-control-help"></p><input id="${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" aria-describedby="${c.id}Help"></div>`).join('')}
        </section>
        <section class="cracks-settings-panel cracks-line-color"><h3 id="cracksLineColorLabel"></h3><div id="cracksLineColor" class="cracks-color-grid" role="group" aria-labelledby="cracksLineColorLabel">${CRACKS_LINE_COLORS.map(mode=>`<button type="button" data-cracks-color="${mode}" aria-pressed="false"><span class="cracks-color-swatch" aria-hidden="true"></span><span class="cracks-color-name"></span></button>`).join('')}</div></section>
      </div>
      <footer class="cracks-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></footer>
    </form>`;
    document.body.append(dialog);
    const enabled=dialog.querySelector('#cracksMaterialEnabled'),strength=dialog.querySelector('#cracksMaterialStrength'),color=dialog.querySelector('#cracksLineColor');
    let draft=null;
    function setRange(input,value,text){
        input.value=value;input.setAttribute('aria-valuetext',text);
        input.style.setProperty('--range-fill',((value-Number(input.min))/(Number(input.max)-Number(input.min))*100)+'%');
        dialog.querySelector(`output[for="${input.id}"]`).value=text;
    }
    function render(){
        dialog.dir=app.getCurrentLang()==='he'?'rtl':'ltr';
        dialog.querySelector('h2').textContent=app.getText('cracks_settings_title');
        dialog.querySelector('#cracksMaterialNote').textContent=app.getText('cracks_material_note');
        dialog.querySelector('#cracksMaterialLabel').textContent=app.getText('cracks_material_enabled');
        dialog.querySelector('label[for="cracksMaterialStrength"]').textContent=app.getText('cracks_material_strength');
        dialog.querySelector('#cracksLineColorLabel').textContent=app.getText('contour_color_label');
        for(const button of color.querySelectorAll('[data-cracks-color]')){const mode=button.dataset.cracksColor;button.querySelector('.cracks-color-name').textContent=app.getText(mode==='brush'?'cracks_brush_color':mode==='original-anchor'?'cracks_original_anchor':'contour_color_'+mode);button.setAttribute('aria-pressed',String(draft?.lineColor===mode));}
        dialog.querySelector('[data-close]').setAttribute('aria-label',app.getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent=app.getText('evolution_reset_default');
        dialog.querySelector('[data-cancel]').textContent=app.getText('gs_modal_cancel');
        dialog.querySelector('[type=submit]').textContent=app.getText('gs_modal_save_close');
        for(const c of growthControls){
            dialog.querySelector(`label[for="${c.id}"]`).textContent=app.getText(c.key);
            dialog.querySelector('#'+c.id+'Help').textContent=app.getText(c.key+'_help');
        }
        dialog.querySelector('#cracksPresetsTitle').textContent=app.getText('cracks_presets_title');
        if(!draft)return;
        const selected=getCracksPresetId(Object.fromEntries(growthControls.map(c=>[c.field,draft[c.field]])));
        const custom=dialog.querySelector('#cracksPresetCustom');custom.textContent=app.getText('cracks_preset_custom');custom.hidden=selected!==null;
        for(const p of CRACKS_GROWTH_PRESETS){
            const button=dialog.querySelector('[data-cracks-preset="'+p.id+'"]');
            button.querySelector('.cracks-preset-name').textContent=app.getText(p.key);
            button.setAttribute('aria-pressed',String(selected===p.id));
            button.setAttribute('aria-label',app.getText(p.key)+': '+app.getText('cracks_branch_chance')+' '+p.values.branchChance+'%, '+app.getText('cracks_branch_interval')+' '+p.values.branchInterval+', '+app.getText('cracks_curvature')+' '+p.values.curvature+'%');
        }
        for(const c of growthControls)setRange(dialog.querySelector('#'+c.id),draft[c.field],draft[c.field]+(c.percent?'%':''));
        enabled.checked=draft.enabled;strength.disabled=!draft.enabled;
        setRange(strength,draft.strength,draft.strength+'%');
    }
    for(const p of CRACKS_GROWTH_PRESETS)dialog.querySelector('[data-cracks-preset="'+p.id+'"]').addEventListener('click',()=>{Object.assign(draft,p.values);render();});
    enabled.addEventListener('change',()=>{draft.enabled=enabled.checked;render();});
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);render();});
    for(const c of growthControls)dialog.querySelector('#'+c.id).addEventListener('input',event=>{draft[c.field]=Number(event.target.value);render();});
    for(const button of color.querySelectorAll('[data-cracks-color]'))button.addEventListener('click',()=>{draft.lineColor=button.dataset.cracksColor;render();});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...DEFAULT_CRACKS_MATERIAL,...INITIAL_CRACKS_GROWTH,lineColor:'darkest'};render();});
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const material=validateCracksMaterial({enabled:draft.enabled,strength:draft.strength});const growth=validateCracksGrowth(Object.fromEntries(growthControls.map(c=>[c.field,draft[c.field]])));if(app.saveCracksSettings(material,draft.lineColor,growth)!==false)dialog.close();});
    dialog.addEventListener('close',()=>{draft=null;app.dom.btnContour.focus({preventScroll:true});});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
    let startedOutside=false;dialog.addEventListener('pointerdown',e=>{startedOutside=outside(e);});dialog.addEventListener('click',e=>{if(startedOutside&&outside(e))dialog.close();startedOutside=false;});
    onLanguageChange(render);
    return {dialog,open(){if(dialog.open||!app.canEditCracksSettings())return;draft=app.getCracksSettings();render();dialog.showModal();(dialog.querySelector('[data-cracks-preset][aria-pressed="true"]') ?? enabled).focus();}};
}
