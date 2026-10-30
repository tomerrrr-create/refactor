import {DEFAULT_CYMATICS_RULES,CYMATICS_PATTERNS,validateCymaticsRules} from './cymatics-settings.js';
export function createCymaticsSettingsDialog({getRules,saveRules,canEdit,getText,getLang,onLanguageChange}){
    const dialog=document.createElement('dialog');dialog.id='cymaticsSettingsDialog';dialog.className='erosion-settings-dialog evolution-tuning-dialog';dialog.setAttribute('aria-labelledby','cymaticsSettingsTitle');
    dialog.innerHTML='<form><button type="button" class="modal-dismiss" data-close>×</button><h2 id="cymaticsSettingsTitle"></h2><p class="cymatics-note"></p><div class="tuning-modes" role="group"></div><div class="tuning-field"><label for="cymaticsStrength"></label><output for="cymaticsStrength"></output><input id="cymaticsStrength" type="range" min="10" max="100" step="5" aria-describedby="cymaticsStrengthNote"><p id="cymaticsStrengthNote"></p></div><div class="init-settings-actions"><button type="button" data-reset></button><button type="button" data-cancel></button><button type="submit" class="save-btn"></button></div></form>';
    document.body.append(dialog);let draft=null;const modes=dialog.querySelector('.tuning-modes'),strength=dialog.querySelector('input');
    for(const pattern of Object.keys(CYMATICS_PATTERNS)){const b=document.createElement('button');b.type='button';b.dataset.cymaticsPattern=pattern;b.addEventListener('click',()=>{draft.pattern=pattern;render();});modes.append(b);}
    function render(){
        dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('cymatics_title');dialog.querySelector('.cymatics-note').textContent=getText('cymatics_note');modes.setAttribute('aria-label',getText('cymatics_pattern'));
        for(const b of modes.children){b.textContent=getText('cymatics_'+b.dataset.cymaticsPattern);b.setAttribute('aria-pressed',String(draft?.pattern===b.dataset.cymaticsPattern));}
        dialog.querySelector('label').textContent=getText('cymatics_strength');dialog.querySelector('#cymaticsStrengthNote').textContent=getText('cymatics_strength_note');
        for(const [s,key] of [['[data-reset]','evolution_reset_default'],['[data-cancel]','gs_modal_cancel'],['[type=submit]','gs_modal_save_close']])dialog.querySelector(s).textContent=getText(key);
        dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        if(draft){strength.value=draft.strength;strength.setAttribute('aria-valuetext',draft.strength+'%');dialog.querySelector('output').value=draft.strength+'%';}
    }
    strength.addEventListener('input',()=>{draft.strength=Number(strength.value);render();});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{draft={...DEFAULT_CYMATICS_RULES};render();});
    dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(canEdit()&&saveRules(validateCymaticsRules(draft))!==false)dialog.close();});
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};let beganOutside=false;
    dialog.addEventListener('pointerdown',e=>{beganOutside=outside(e);});dialog.addEventListener('click',e=>{if(beganOutside&&outside(e))dialog.close();beganOutside=false;});
    dialog.addEventListener('close',()=>{draft=null;document.getElementById('btnCymatics').focus({preventScroll:true});});onLanguageChange(()=>{if(dialog.open)render();});
    return {dialog,open(){if(!canEdit()||dialog.open)return;draft={...getRules()};render();dialog.showModal();dialog.querySelector('[aria-pressed="true"]').focus();}};
}
