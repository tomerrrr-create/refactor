import {INITIAL_CYMATICS_RULES,CYMATICS_RESONANCE_MAPS,validateCymaticsRules,createCymaticsFrequencies,rememberCymaticsFrequency,createCymaticsStrengths,rememberCymaticsStrength,selectCymaticsMap} from './cymatics-settings.js';
export function createCymaticsSettingsDialog({getRules,getFrequencies=()=>({}),getStrengths=()=>({}),saveRules,canEdit,getText,getLang,onLanguageChange}){
    const dialog=document.createElement('dialog');dialog.id='cymaticsSettingsDialog';dialog.className='erosion-settings-dialog evolution-tuning-dialog';dialog.setAttribute('aria-labelledby','cymaticsSettingsTitle');
    dialog.innerHTML='<form><button type="button" class="modal-dismiss" data-close>×</button><h2 id="cymaticsSettingsTitle"></h2><div class="cymatics-maps"><p id="cymaticsMapLabel"></p><div class="tuning-modes" role="group" aria-labelledby="cymaticsMapLabel"></div></div><div class="tuning-field cymatics-frequency"><label for="cymaticsFrequency"></label><output for="cymaticsFrequency"></output><input id="cymaticsFrequency" type="range" min="0" max="1000" step="1"></div><div class="cymatics-phase"><label for="cymaticsPhaseMotion"><input id="cymaticsPhaseMotion" type="checkbox"><span></span></label></div><div class="tuning-field"><label for="cymaticsStrength"></label><output for="cymaticsStrength"></output><input id="cymaticsStrength" type="range" min="10" max="100" step="5"></div><div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div></form>';
    document.body.append(dialog);let draft=null,draftFrequencies=null,draftStrengths=null;const strength=dialog.querySelector('#cymaticsStrength');
    const frequency=dialog.querySelector('#cymaticsFrequency');
    const maps=dialog.querySelector('.cymatics-maps .tuning-modes');
    for(const [name,version] of Object.entries(CYMATICS_RESONANCE_MAPS)){
        const b=document.createElement('button');b.type='button';b.dataset.cymaticsMap=name;
        const paths={clouds:'<path d="M5 17a4 4 0 0 1-1-7 5 5 0 0 1 9-3 4 4 0 0 1 6 4 3 3 0 0 1-1 6Z"/>',cosmic:'<circle cx="5" cy="8" r="2"/><circle cx="18" cy="6" r="1.5"/><circle cx="15" cy="18" r="2"/><path d="M7 8c5 0 3 8 6 9M7 7l9-1M18 8c-3 3-5 5-3 8"/>',diagonal:'<path d="M5 19L19 5"/>',grid:'<path d="M8 4l4 4-4 4-4-4ZM16 4l4 4-4 4-4-4ZM8 12l4 4-4 4-4-4ZM16 12l4 4-4 4-4-4Z"/>',interference:'<circle cx="6" cy="9" r="2"/><circle cx="18" cy="15" r="2"/><path d="M3 3c12 0 12 18 18 18M3 15c6 0 6-12 18-12M3 21c12 0 6-18 18-12"/>',circular:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'};
        b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'+paths[name]+'</svg><span></span>';
        b.addEventListener('click',()=>{const selected=selectCymaticsMap(draft,version,draftFrequencies,draftStrengths);draft=selected.rules;draftFrequencies=selected.frequencies;draftStrengths=selected.strengths;render();});maps.append(b);
    }
    frequency.addEventListener('input',()=>{draft.frequency=Math.round(20*Math.pow(1000,Number(frequency.value)/1000));draftFrequencies=rememberCymaticsFrequency(draftFrequencies,draft);render();});
    const motion=dialog.querySelector('#cymaticsPhaseMotion');
    motion.addEventListener('change',()=>{draft.phaseMotion=motion.checked;});
    function render(){
        dialog.querySelector('.cymatics-phase span').textContent=getText('cymatics_phase_motion');
        motion.checked=Boolean(draft?.phaseMotion);
        dialog.querySelector('#cymaticsMapLabel').textContent=getText('cymatics_map');
        for(const b of maps.children){b.querySelector('span').textContent=getText('cymatics_map_'+b.dataset.cymaticsMap);b.setAttribute('aria-pressed',String((draft?.resonanceVersion??1)===CYMATICS_RESONANCE_MAPS[b.dataset.cymaticsMap]));}
        dialog.querySelector('label[for=cymaticsFrequency]').textContent=getText('cymatics_frequency');
        {frequency.value=Math.round(1000*Math.log(draft.frequency/20)/Math.log(1000));frequency.setAttribute('aria-valuetext',draft.frequency+' Hz');dialog.querySelector('output[for=cymaticsFrequency]').value=draft.frequency+' Hz';}

        dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('cymatics_title');
        dialog.querySelector('label[for=cymaticsStrength]').textContent=getText('cymatics_strength');
        for(const [s,key] of [['[data-reset]','evolution_reset_default'],['[data-cancel]','gs_modal_cancel'],['[type=submit]','gs_modal_save_close']])dialog.querySelector(s).textContent=getText(key);
        dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        if(draft){strength.value=draft.strength;strength.setAttribute('aria-valuetext',draft.strength+'%');dialog.querySelector('output[for=cymaticsStrength]').value=draft.strength+'%';}
    }
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);draftStrengths=rememberCymaticsStrength(draftStrengths,draft);render();});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...INITIAL_CYMATICS_RULES};draftFrequencies=createCymaticsFrequencies();draftStrengths=createCymaticsStrengths();render();});
    dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(canEdit()&&saveRules(validateCymaticsRules(draft),draftFrequencies,draftStrengths)!==false)dialog.close();});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};let beganOutside=false;
    dialog.addEventListener('pointerdown',e=>{beganOutside=outside(e);});dialog.addEventListener('click',e=>{if(beganOutside&&outside(e))dialog.close();beganOutside=false;});
    dialog.addEventListener('close',()=>{draft=null;draftFrequencies=null;draftStrengths=null;document.getElementById('btnCymatics').focus({preventScroll:true});});onLanguageChange(()=>{if(dialog.open)render();});
    return {dialog,open(){if(!canEdit()||dialog.open)return;const rules=getRules();draft={...rules};delete draft.pattern;draftFrequencies=rememberCymaticsFrequency(getFrequencies(),draft);draftStrengths=rememberCymaticsStrength(getStrengths(),draft);render();dialog.showModal();dialog.querySelector('[aria-pressed="true"]').focus();}};
}
