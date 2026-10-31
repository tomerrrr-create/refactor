import {INITIAL_CYMATICS_RULES,CYMATICS_PATTERNS,CYMATICS_RESONANCE_MAPS,validateCymaticsRules,createCymaticsFrequencies,rememberCymaticsFrequency,selectCymaticsMap} from './cymatics-settings.js';
export function createCymaticsSettingsDialog({getRules,getFrequencies=()=>({}),saveRules,canEdit,getText,getLang,onLanguageChange}){
    const dialog=document.createElement('dialog');dialog.id='cymaticsSettingsDialog';dialog.className='erosion-settings-dialog evolution-tuning-dialog';dialog.setAttribute('aria-labelledby','cymaticsSettingsTitle');
    dialog.innerHTML='<form><button type="button" class="modal-dismiss" data-close>×</button><h2 id="cymaticsSettingsTitle"></h2><p class="cymatics-note"></p><div class="tuning-modes cymatics-source" role="group"><button type="button" data-source="patterns"></button><button type="button" data-source="resonance"></button></div><div class="tuning-modes cymatics-patterns" role="group"></div><div class="cymatics-maps" hidden><p id="cymaticsMapLabel"></p><div class="tuning-modes" role="group" aria-labelledby="cymaticsMapLabel"></div></div><div class="tuning-field cymatics-frequency" hidden><label for="cymaticsFrequency"></label><output for="cymaticsFrequency"></output><input id="cymaticsFrequency" type="range" min="0" max="1000" step="1" aria-describedby="cymaticsFrequencyNote"><p id="cymaticsFrequencyNote"></p></div><div class="cymatics-phase" hidden><label for="cymaticsPhaseMotion"><input id="cymaticsPhaseMotion" type="checkbox" aria-describedby="cymaticsPhaseNote"><span></span></label><p id="cymaticsPhaseNote"></p></div><div class="tuning-field"><label for="cymaticsStrength"></label><output for="cymaticsStrength"></output><input id="cymaticsStrength" type="range" min="10" max="100" step="5" aria-describedby="cymaticsStrengthNote"><p id="cymaticsStrengthNote"></p></div><div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div></form>';
    document.body.append(dialog);let draft=null,draftFrequencies=null;const modes=dialog.querySelector('.cymatics-patterns'),strength=dialog.querySelector('#cymaticsStrength');
    for(const pattern of Object.keys(CYMATICS_PATTERNS)){const b=document.createElement('button');b.type='button';b.dataset.cymaticsPattern=pattern;b.addEventListener('click',()=>{draft.pattern=pattern;render();});modes.append(b);}
    const frequency=dialog.querySelector('#cymaticsFrequency');let lastMap=INITIAL_CYMATICS_RULES.resonanceVersion,lastMotion=INITIAL_CYMATICS_RULES.phaseMotion;
    const maps=dialog.querySelector('.cymatics-maps .tuning-modes');
    for(const [name,version] of Object.entries(CYMATICS_RESONANCE_MAPS)){
        const b=document.createElement('button');b.type='button';b.dataset.cymaticsMap=name;
        const paths={diagonal:'<path d="M4 4l16 16M4 20L20 4"/>',grid:'<path d="M8 3v18M16 3v18M3 8h18M3 16h18"/>',interference:'<circle cx="6" cy="9" r="2"/><circle cx="18" cy="15" r="2"/><path d="M3 3c12 0 12 18 18 18M3 15c6 0 6-12 18-12M3 21c12 0 6-18 18-12"/>',circular:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'};
        b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'+paths[name]+'</svg><span></span>';
        b.addEventListener('click',()=>{const selected=selectCymaticsMap(draft,version,draftFrequencies);draft=selected.rules;draftFrequencies=selected.frequencies;lastMap=version;render();});maps.append(b);
    }
    for(const b of dialog.querySelectorAll('[data-source]'))b.addEventListener('click',()=>{
        if(b.dataset.source==='resonance'){const selected=selectCymaticsMap(draft,lastMap,draftFrequencies);draft={...selected.rules,phaseMotion:lastMotion};draftFrequencies=selected.frequencies;}
        else {if(draft.mode==='resonance'){draftFrequencies=rememberCymaticsFrequency(draftFrequencies,draft);lastMap=draft.resonanceVersion??1;}delete draft.mode;delete draft.frequency;delete draft.resonanceVersion;delete draft.phaseMotion;}render();
    });
    frequency.addEventListener('input',()=>{draft.frequency=Math.round(20*Math.pow(1000,Number(frequency.value)/1000));draftFrequencies=rememberCymaticsFrequency(draftFrequencies,draft);render();});
    const motion=dialog.querySelector('#cymaticsPhaseMotion');
    motion.addEventListener('change',()=>{draft.phaseMotion=motion.checked;lastMotion=motion.checked;});
    function render(){
        dialog.querySelector('.cymatics-phase').hidden=draft?.mode!=='resonance';
        dialog.querySelector('.cymatics-phase span').textContent=getText('cymatics_phase_motion');
        dialog.querySelector('#cymaticsPhaseNote').textContent=getText('cymatics_phase_note');motion.checked=Boolean(draft?.phaseMotion);
        const resonance=draft?.mode==='resonance';
        modes.hidden=resonance;dialog.querySelector('.cymatics-maps').hidden=!resonance;
        dialog.querySelector('#cymaticsMapLabel').textContent=getText('cymatics_map');
        for(const b of maps.children){b.querySelector('span').textContent=getText('cymatics_map_'+b.dataset.cymaticsMap);b.setAttribute('aria-pressed',String((draft?.resonanceVersion??1)===CYMATICS_RESONANCE_MAPS[b.dataset.cymaticsMap]));}dialog.querySelector('.cymatics-frequency').hidden=!resonance;
        dialog.querySelector('.cymatics-source').setAttribute('aria-label',getText('cymatics_source'));
        for(const b of dialog.querySelectorAll('[data-source]')){b.textContent=getText('cymatics_'+b.dataset.source);b.setAttribute('aria-pressed',String(b.dataset.source===(resonance?'resonance':'patterns')));}
        dialog.querySelector('label[for=cymaticsFrequency]').textContent=getText('cymatics_frequency');dialog.querySelector('#cymaticsFrequencyNote').textContent=getText(draft?.resonanceVersion===4?'cymatics_interference_note':'cymatics_frequency_note');
        if(resonance){frequency.value=Math.round(1000*Math.log(draft.frequency/20)/Math.log(1000));frequency.setAttribute('aria-valuetext',draft.frequency+' Hz');dialog.querySelector('output[for=cymaticsFrequency]').value=draft.frequency+' Hz';}

        dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('cymatics_title');dialog.querySelector('.cymatics-note').textContent=getText('cymatics_note');modes.setAttribute('aria-label',getText('cymatics_pattern'));
        for(const b of modes.children){b.textContent=getText('cymatics_'+b.dataset.cymaticsPattern);b.setAttribute('aria-pressed',String(draft?.pattern===b.dataset.cymaticsPattern));}
        dialog.querySelector('label[for=cymaticsStrength]').textContent=getText('cymatics_strength');dialog.querySelector('#cymaticsStrengthNote').textContent=getText('cymatics_strength_note');
        for(const [s,key] of [['[data-reset]','evolution_reset_default'],['[data-cancel]','gs_modal_cancel'],['[type=submit]','gs_modal_save_close']])dialog.querySelector(s).textContent=getText(key);
        dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        if(draft){strength.value=draft.strength;strength.setAttribute('aria-valuetext',draft.strength+'%');dialog.querySelector('output[for=cymaticsStrength]').value=draft.strength+'%';}
    }
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);render();});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...INITIAL_CYMATICS_RULES};draftFrequencies=createCymaticsFrequencies(draft);lastMap=INITIAL_CYMATICS_RULES.resonanceVersion;lastMotion=INITIAL_CYMATICS_RULES.phaseMotion;render();});
    dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(canEdit()&&saveRules(validateCymaticsRules(draft),draftFrequencies)!==false)dialog.close();});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};let beganOutside=false;
    dialog.addEventListener('pointerdown',e=>{beganOutside=outside(e);});dialog.addEventListener('click',e=>{if(beganOutside&&outside(e))dialog.close();beganOutside=false;});
    dialog.addEventListener('close',()=>{draft=null;draftFrequencies=null;document.getElementById('btnCymatics').focus({preventScroll:true});});onLanguageChange(()=>{if(dialog.open)render();});
    return {dialog,open(){if(!canEdit()||dialog.open)return;draft={...getRules()};draftFrequencies=rememberCymaticsFrequency(getFrequencies(),draft);lastMotion=draft.phaseMotion??INITIAL_CYMATICS_RULES.phaseMotion;lastMap=draft.mode==='resonance'?(draft.resonanceVersion??1):INITIAL_CYMATICS_RULES.resonanceVersion;render();dialog.showModal();dialog.querySelector('[aria-pressed="true"]').focus();}};
}
