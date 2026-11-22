import { focusSettingsHeading } from './dialog-focus.js';
import {INITIAL_CYMATICS_RULES,CYMATICS_RESONANCE_MAPS,validateCymaticsRules,createCymaticsFrequencies,rememberCymaticsFrequency,createCymaticsStrengths,rememberCymaticsStrength,selectCymaticsMap} from './cymatics-settings.js';
export function createCymaticsSettingsDialog({getRules,getFrequencies=()=>({}),getStrengths=()=>({}),saveRules,canEdit,getCycle=()=>null,saveCycle,getMaps=()=>Object.keys(CYMATICS_RESONANCE_MAPS),getTrigger=()=>document.getElementById('btnCymatics'),getText,getLang,onLanguageChange}){
    const dialog=document.createElement('dialog');dialog.id='cymaticsSettingsDialog';dialog.className='resonance-settings-dialog';dialog.setAttribute('aria-labelledby','cymaticsSettingsTitle');
    dialog.innerHTML=`<form>
      <header class="cracks-settings-header"><h2 id="cymaticsSettingsTitle"></h2><button type="button" data-close>×</button></header>
      <div class="cracks-settings-body">
        <section class="cracks-settings-panel cracks-growth-panel">
          <div class="cracks-control cymatics-frequency"><label for="cymaticsFrequency"></label><output for="cymaticsFrequency"></output><input id="cymaticsFrequency" type="range" min="0" max="1000" step="1"></div>
          <div class="cracks-control"><label for="cymaticsStrength"></label><output for="cymaticsStrength"></output><input id="cymaticsStrength" type="range" min="10" max="100" step="5"></div>
        </section>
        <div class="cymatics-phase"><label for="cymaticsPhaseMotion"><input id="cymaticsPhaseMotion" type="checkbox"><span></span></label></div>
        <section class="cracks-settings-panel cracks-presets-panel cymatics-maps"><p id="cymaticsMapLabel"></p><div class="cracks-preset-grid resonance-map-grid" role="group" aria-labelledby="cymaticsMapLabel"></div></section>
      </div>
      <footer class="cracks-settings-actions"><button type="button" data-cancel></button><button type="submit" class="save-btn"></button><button type="button" data-reset></button></footer>
    </form>`;
    document.body.append(dialog);let draft=null,draftFrequencies=null,draftStrengths=null,allowedMaps=[],trigger=null;
    let cycleDraft=null,rulesChanged=false;
    const strength=dialog.querySelector('#cymaticsStrength');
    const frequency=dialog.querySelector('#cymaticsFrequency');
    const maps=dialog.querySelector('.resonance-map-grid');
    const mapOptions=[];
    for(const [name,version] of Object.entries(CYMATICS_RESONANCE_MAPS)){
        const card=document.createElement('div');card.className='resonance-map-option';
        const b=document.createElement('button');b.type='button';b.dataset.cymaticsMap=name;
        const icon=document.querySelector(`#btnCymatics > [data-cymatics-map-icon="${name}"], #btnInk > [data-vortices-icon="${name}"]`);
        const accents={heart:'#D97794',diagonal:'#CD853F',grid:'#C2A14A',circular:'#6B8E23',interference:'#607D8B',clouds:'#91A0A6',cosmic:'#FF7F50'};
        b.style.setProperty('--preset-ink',accents[name]);
        const label=document.createElement('span');label.className='resonance-map-name';
        b.append(label,icon.cloneNode(true));
        b.addEventListener('click',()=>{if(!draft||!allowedMaps.includes(name))return;rulesChanged=true;const selected=selectCymaticsMap(draft,version,draftFrequencies,draftStrengths);draft=selected.rules;draftFrequencies=selected.frequencies;draftStrengths=selected.strengths;render();});
        const toggle=document.createElement('label');toggle.className='toolbar-cycle-toggle resonance-cycle-toggle';
        const input=document.createElement('input');input.type='checkbox';input.value=String(version);input.dataset.resonanceCycle=name;
        const check=document.createElement('span');check.textContent='✓';check.setAttribute('aria-hidden','true');
        toggle.append(input,check);card.append(b,toggle);maps.append(card);
        mapOptions.push({name,version,card,b,label,toggle,input});
        input.addEventListener('change',()=>{
            if(!cycleDraft)return;
            if(input.checked)cycleDraft.add(version);else cycleDraft.delete(version);
            render();
        });
    }
    frequency.addEventListener('input',()=>{rulesChanged=true;draft.frequency=Math.round(20*Math.pow(1000,Number(frequency.value)/1000));draftFrequencies=rememberCymaticsFrequency(draftFrequencies,draft);render();});
    const motion=dialog.querySelector('#cymaticsPhaseMotion');
    motion.addEventListener('change',()=>{rulesChanged=true;draft.phaseMotion=motion.checked;});
    function render(){
        dialog.querySelector('.cymatics-phase span').textContent=getText('cymatics_phase_motion');
        motion.checked=Boolean(draft?.phaseMotion);
        dialog.querySelector('#cymaticsMapLabel').textContent=getText('cymatics_map');
        for(const {name,version,card,b,label,toggle,input} of mapOptions){
            card.hidden=b.hidden=!allowedMaps.includes(name);
            toggle.hidden=cycleDraft===null;
            const text=getText('cymatics_map_'+name);
            label.textContent=b.title=text;
            b.setAttribute('aria-label',text);
            b.setAttribute('aria-pressed',String(draft.resonanceVersion===version));
            input.setAttribute('aria-label',getText('geometric_flow_cycle_title')+' · '+text);
            input.checked=cycleDraft?.has(version)??false;
            input.disabled=name==='heart';
        }
        dialog.querySelector('label[for=cymaticsFrequency]').textContent=getText('cymatics_frequency');
        {frequency.value=Math.round(1000*Math.log(draft.frequency/20)/Math.log(1000));frequency.setAttribute('aria-valuetext',draft.frequency+' Hz');frequency.style.setProperty('--range-fill',Number(frequency.value)/10+'%');dialog.querySelector('output[for=cymaticsFrequency]').value=draft.frequency+' Hz';}

        dialog.dir=getLang()==='he'?'rtl':'ltr';dialog.querySelector('h2').textContent=getText('cymatics_title');
        dialog.querySelector('label[for=cymaticsStrength]').textContent=getText('cymatics_strength');
        for(const [s,key] of [['[data-reset]','evolution_reset_default'],['[data-cancel]','gs_modal_cancel'],['[type=submit]','gs_modal_save_close']])dialog.querySelector(s).textContent=getText(key);
        dialog.querySelector('[data-close]').setAttribute('aria-label',getText('saveModal_close'));
        if(draft){strength.value=draft.strength;strength.setAttribute('aria-valuetext',draft.strength+'%');strength.style.setProperty('--range-fill',(draft.strength-10)/90*100+'%');dialog.querySelector('output[for=cymaticsStrength]').value=draft.strength+'%';}
    }
    strength.addEventListener('input',()=>{rulesChanged=true;draft.strength=Number(strength.value);draftStrengths=rememberCymaticsStrength(draftStrengths,draft);render();});
    for(const selector of ['[data-close]','[data-cancel]'])dialog.querySelector(selector).addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{
        rulesChanged=true;
        const frequencies=createCymaticsFrequencies(), strengths=createCymaticsStrengths();
        for (const name of allowedMaps) {
            draftFrequencies[name]=frequencies[name];
            draftStrengths[name]=strengths[name];
        }
        const version=allowedMaps.includes('heart') ? CYMATICS_RESONANCE_MAPS.heart : draft.resonanceVersion;
        const reset=selectCymaticsMap({...INITIAL_CYMATICS_RULES,resonanceVersion:version,
            frequency:frequencies[allowedMaps.find(name=>CYMATICS_RESONANCE_MAPS[name]===version)],
            strength:INITIAL_CYMATICS_RULES.strength},version,draftFrequencies,draftStrengths);
        draft=reset.rules;draftFrequencies=reset.frequencies;draftStrengths=reset.strengths;render();
    });
    dialog.querySelector('form').addEventListener('submit',e=>{
        e.preventDefault();
        if(!canEdit()||cycleDraft?.size===0)return;
        if(rulesChanged&&saveRules(validateCymaticsRules(draft),draftFrequencies,draftStrengths)===false)return;
        if(cycleDraft&&saveCycle([...cycleDraft])===false)return;
        dialog.close();
    });
    const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};let beganOutside=false;
    dialog.addEventListener('pointerdown',e=>{beganOutside=outside(e);});dialog.addEventListener('click',e=>{if(beganOutside&&outside(e))dialog.close();beganOutside=false;});
    dialog.addEventListener('close',()=>{draft=null;draftFrequencies=null;draftStrengths=null;trigger?.focus({preventScroll:true});trigger=null;});onLanguageChange(()=>{if(dialog.open)render();});
    return {dialog,open(){if(!canEdit()||dialog.open)return;allowedMaps=getMaps();trigger=getTrigger();const rules=getRules(),enabled=getCycle();cycleDraft=enabled===null?null:new Set(enabled);rulesChanged=false;draft={...rules};delete draft.pattern;draftFrequencies=rememberCymaticsFrequency(getFrequencies(),draft);draftStrengths=rememberCymaticsStrength(getStrengths(),draft);render();dialog.showModal();focusSettingsHeading(dialog);}};
}
