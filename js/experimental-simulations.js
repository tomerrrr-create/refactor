// One registry owns the opt-in exposure of these removable experiments.
// Preferences are device-local, never profile, artwork or replay settings.
export const EXPERIMENTAL_SIMULATIONS = Object.freeze([
    {id:'spiral',button:'btnSpiral',key:'tooltip_spiral'}
].map(Object.freeze));
export const EXPERIMENTAL_SIMULATIONS_KEY='colorGridExperimentalSimulationsV1';
export function createExperimentalSimulationFlags({storage}={}) {
    let preferences={};
    try {
        const value=JSON.parse((storage??globalThis.localStorage)?.getItem(EXPERIMENTAL_SIMULATIONS_KEY));
        if(value&&typeof value==='object'&&!Array.isArray(value))preferences=value;
    } catch { /* Unavailable storage leaves all experiments off. */ }
    const known=id=>EXPERIMENTAL_SIMULATIONS.some(item=>item.id===id);
    return {
        visible:id=>!known(id)||preferences[id]===true,
        set(id,value){
            if(!known(id))throw Error('Unknown experimental simulation');
            preferences=Object.fromEntries(EXPERIMENTAL_SIMULATIONS.map(item=>[item.id,item.id===id?value===true:preferences[item.id]===true]));
            try {(storage??globalThis.localStorage)?.setItem(EXPERIMENTAL_SIMULATIONS_KEY,JSON.stringify(preferences));}catch{}
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
}
