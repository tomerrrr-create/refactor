import { focusSettingsHeading } from './dialog-focus.js';
import { onLanguageChange } from './i18n.js';
import { INITIAL_CRACKS_GROWTH, CRACKS_GROWTH_PRESETS, getCracksPresetId, DEFAULT_CRACKS_MATERIAL, validateCracksMaterial, validateCracksGrowth, validateCracksArea } from './cracks-settings.js';
const growthControls = [
    {field:'branchChance',id:'cracksBranchChance',key:'cracks_branch_chance',min:0,max:100,step:5,percent:true},
    {field:'branchInterval',id:'cracksBranchInterval',key:'cracks_branch_interval',min:1,max:40,step:1},
    {field:'curvature',id:'cracksCurvature',key:'cracks_curvature',min:0,max:200,step:5,percent:true}
];
// Symbol colors sampled from New-York Autumn and Autumn into Winter.
const presetArt = {
    'first-whisper': { ink:'#CD853F', path:'M20 36C18 27 20 17 25 9M20 27C12 26 10 21 9 17M21 21C29 21 33 17 35 12' },
    'quiet-flow': { ink:'#607D8B', path:'M7 18C15 7 25 29 37 16M7 29C15 18 25 40 37 27' },
    'crystal-paths': { ink:'#91A0A6', path:'M22 37V8M22 20 12 10M22 28 34 16M22 33 11 26M22 12 29 6' },
    'fibonacci-bloom': { ink:'#6B8E23', path:'M22 23C22 19 28 19 28 24C28 31 17 32 14 25C9 14 25 6 34 15C47 28 28 46 12 34C-2 23 9 6 20 5' }
};
export function createCracksSettingsDialog(app) {
    const dialog=document.createElement('dialog');
    dialog.id='cracksSettingsDialog';dialog.className='cracks-settings-dialog';
    dialog.setAttribute('aria-labelledby','cracksSettingsTitle');
    dialog.innerHTML=`<form>
      <header class="cracks-settings-header">
        <h2 id="cracksSettingsTitle"></h2>
        <button type="button" data-close>×</button>
      </header>
      <div class="cracks-settings-body">

        <section class="cracks-settings-panel cracks-area-panel" aria-labelledby="cracksAreaLabel">
          <h3 id="cracksAreaLabel"></h3>
          <div class="cracks-area-options" role="group" aria-labelledby="cracksAreaLabel"><button type="button" data-cracks-area="all"></button><button type="button" data-cracks-area="dead"></button></div>
        </section>
        <section class="cracks-settings-panel cracks-growth-panel">
          ${growthControls.map(c=>`<div class="cracks-control"><label for="${c.id}"></label><output for="${c.id}"></output><input id="${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}"></div>`).join('')}
        </section>
        <section class="cracks-settings-panel" aria-labelledby="cracksMaterialStrengthLabel">
          <div class="cracks-control"><label id="cracksMaterialStrengthLabel" for="cracksMaterialStrength"></label><output for="cracksMaterialStrength"></output><input id="cracksMaterialStrength" type="range" min="0" max="100" step="5"></div>
        </section>


        <section class="cracks-settings-panel cracks-presets-panel" aria-labelledby="cracksPresetsTitle">
          <div class="cracks-presets-heading"><h3 id="cracksPresetsTitle"></h3><span id="cracksPresetCustom" role="status"></span></div>
          <div class="cracks-preset-grid" role="group" aria-labelledby="cracksPresetsTitle">${CRACKS_GROWTH_PRESETS.map(p=>`<button type="button" data-cracks-preset="${p.id}" aria-pressed="false" style="--preset-ink:${presetArt[p.id].ink}"><svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${presetArt[p.id].path}"/></svg><span class="cracks-preset-name sr-only"></span></button>`).join('')}</div>
        </section>
      </div>
      <footer class="cracks-settings-actions"><button type="button" data-cancel></button><button type="submit" class="save-btn"></button><button type="button" data-reset></button></footer>
    </form>`;
    document.body.append(dialog);
    const strength=dialog.querySelector('#cracksMaterialStrength');
    let draft=null;
    function setRange(input,value,text){
        input.value=value;input.setAttribute('aria-valuetext',text);
        input.style.setProperty('--range-fill',((value-Number(input.min))/(Number(input.max)-Number(input.min))*100)+'%');
        dialog.querySelector(`output[for="${input.id}"]`).value=text;
    }
    function render(){
        dialog.dir=app.getCurrentLang()==='he'?'rtl':'ltr';
        dialog.querySelector('h2').textContent=app.getText('cracks_settings_title');
        dialog.querySelector('label[for="cracksMaterialStrength"]').textContent=app.getText('cracks_material_strength');
        dialog.querySelector('[data-close]').setAttribute('aria-label',app.getText('saveModal_close'));
        dialog.querySelector('[data-reset]').textContent=app.getText('evolution_reset_default');
        dialog.querySelector('[data-cancel]').textContent=app.getText('gs_modal_cancel');
        dialog.querySelector('[type=submit]').textContent=app.getText('gs_modal_save_close');
        for(const c of growthControls){
            dialog.querySelector(`label[for="${c.id}"]`).textContent=app.getText(c.key);
        }
        dialog.querySelector('#cracksPresetsTitle').textContent=app.getText('cracks_presets_title');
        dialog.querySelector('#cracksAreaLabel').textContent=app.getText('cracks_area');
        if(!draft)return;
        const area=validateCracksArea(draft.area);
        for(const button of dialog.querySelectorAll('[data-cracks-area]')){
            button.textContent=app.getText('cracks_area_'+button.dataset.cracksArea);
            button.setAttribute('aria-pressed',String(button.dataset.cracksArea===area));
        }
        strength.closest('section').hidden=area==='dead';
        const selected=getCracksPresetId(Object.fromEntries(growthControls.map(c=>[c.field,draft[c.field]])));
        const custom=dialog.querySelector('#cracksPresetCustom');custom.textContent=app.getText('cracks_preset_custom');custom.hidden=selected!==null;
        for(const p of CRACKS_GROWTH_PRESETS){
            const button=dialog.querySelector('[data-cracks-preset="'+p.id+'"]');
            button.querySelector('.cracks-preset-name').textContent=app.getText(p.key);
            button.setAttribute('aria-pressed',String(selected===p.id));
            button.title=app.getText(p.key);
            button.setAttribute('aria-label',app.getText(p.key)+': '+app.getText('cracks_branch_chance')+' '+p.values.branchChance+'%, '+app.getText('cracks_branch_interval')+' '+p.values.branchInterval+', '+app.getText('cracks_curvature')+' '+p.values.curvature+'%');
        }
        for(const c of growthControls)setRange(dialog.querySelector('#'+c.id),draft[c.field],draft[c.field]+(c.percent?'%':''));
        setRange(strength,draft.strength,draft.strength+'%');
    }
    for(const p of CRACKS_GROWTH_PRESETS)dialog.querySelector('[data-cracks-preset="'+p.id+'"]').addEventListener('click',()=>{Object.assign(draft,p.values);render();});
    for(const button of dialog.querySelectorAll('[data-cracks-area]'))button.addEventListener('click',()=>{draft.area=button.dataset.cracksArea;render();});
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);draft.enabled=draft.strength>0;render();});
    for(const c of growthControls)dialog.querySelector('#'+c.id).addEventListener('input',event=>{draft[c.field]=Number(event.target.value);render();});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...DEFAULT_CRACKS_MATERIAL,...INITIAL_CRACKS_GROWTH};render();});
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const material=validateCracksMaterial({enabled:draft.strength>0,strength:draft.strength});const growth=validateCracksGrowth({...Object.fromEntries(growthControls.map(c=>[c.field,draft[c.field]])),area:validateCracksArea(draft.area)});if(app.saveCracksSettings(material,growth)!==false)dialog.close();});
    dialog.addEventListener('close',()=>{draft=null;app.dom.btnContour.focus({preventScroll:true});});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
    let startedOutside=false;dialog.addEventListener('pointerdown',e=>{startedOutside=outside(e);});dialog.addEventListener('click',e=>{if(startedOutside&&outside(e))dialog.close();startedOutside=false;});
    onLanguageChange(render);
    return {dialog,open(){if(dialog.open||!app.canEditCracksSettings())return;draft=app.getCracksSettings();if(!draft.enabled)draft.strength=0;render();dialog.showModal();focusSettingsHeading(dialog);}};
}
