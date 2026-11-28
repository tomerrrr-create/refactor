// One registry owns the visibility preferences of these removable experiments.
import { isPatternEvolution } from './evolution-drawer-settings.js';

// Browser storage preserves the legacy preference and defaults for older profiles.
export const DEFAULT_EXPERIMENT_VISIBILITY = Object.freeze({ spiral:true, breathe:false, fibonacci:true });
export const EXPERIMENTAL_SIMULATIONS = Object.freeze([
    {id:'spiral',button:'btnSpiral',key:'tooltip_spiral',defaultVisible:DEFAULT_EXPERIMENT_VISIBILITY.spiral},
    {id:'breathe',button:'btnShowBreatheMenu',key:'tooltip_breathe',defaultVisible:DEFAULT_EXPERIMENT_VISIBILITY.breathe},
    {id:'fibonacci',button:'btnFibonacci',key:'help_fibonacci',defaultVisible:DEFAULT_EXPERIMENT_VISIBILITY.fibonacci},
    {id:'patterns',key:'drawer_patterns',defaultVisible:true,sessionOnly:true}
].map(Object.freeze));
export const EXPERIMENTAL_SIMULATIONS_KEY='colorGridExperimentalSimulationsV1';
export function createExperimentalSimulationFlags({storage}={}) {
    let preferences={};
    try {
        const value=JSON.parse((storage??globalThis.localStorage)?.getItem(EXPERIMENTAL_SIMULATIONS_KEY));
        if(value&&typeof value==='object'&&!Array.isArray(value)){
            preferences=value;
            delete preferences.patterns;
        }
    } catch { /* Use the feature defaults when storage is unavailable. */ }
    const visible=({id,defaultVisible})=>typeof preferences[id]==='boolean'?preferences[id]:defaultVisible;
    return {
        visible(id){
            const entry=EXPERIMENTAL_SIMULATIONS.find(item=>item.id===(isPatternEvolution(id)?'patterns':id));
            return entry?visible(entry):true;
        },
        set(id,value){
            const entry=EXPERIMENTAL_SIMULATIONS.find(item=>item.id===id);
            if(!entry)throw Error('Unknown experimental simulation');
            preferences[id]=value===true;
            if(entry.sessionOnly)return;
            const saved=Object.fromEntries(EXPERIMENTAL_SIMULATIONS.filter(item=>!item.sessionOnly).map(item=>[item.id,visible(item)]));
            try {(storage??globalThis.localStorage)?.setItem(EXPERIMENTAL_SIMULATIONS_KEY,JSON.stringify(saved));}catch{}
        }
    };
}
export function initializeExperimentalSimulationControls({flags,getText,onLanguageChange,canChange,onChange}) {
    const host=document.getElementById('experimentalSimulationControls'),labels=[];
    for(const entry of EXPERIMENTAL_SIMULATIONS){
        const row=document.createElement('label');row.className='technician-option technician-switch-option';
        const label=document.createElement('span');label.className='technician-effect-heading';
        const input=document.createElement('input');input.id=entry.id+'ExperimentToggle';input.type='checkbox';input.className='technician-switch';input.setAttribute('role','switch');
        input.addEventListener('change',()=>{
            if(canChange()){flags.set(entry.id,input.checked);onChange(entry.id,input.checked);}
            refresh();
        });
        row.append(label,input);host.append(row);labels.push({entry,label,input});
    }
    function refresh(){for(const {entry,label,input}of labels){label.textContent=getText(entry.key);input.checked=flags.visible(entry.id);input.disabled=!canChange();}}
    document.getElementById('technicianDialog').addEventListener('toggle',refresh);
    onLanguageChange(refresh);refresh();
    return refresh;
}
