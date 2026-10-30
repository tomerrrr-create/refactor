export const CRACKS_LINE_COLORS = Object.freeze(['darkest','lightest','original-anchor','brush']);
export const DEFAULT_CRACKS_MATERIAL = Object.freeze({ enabled: false, strength: 40 });
export function validateCracksMaterial(value = DEFAULT_CRACKS_MATERIAL) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !['enabled','strength'].includes(key)) ||
        typeof value.enabled !== 'boolean' || !Number.isInteger(value.strength) || value.strength<0 || value.strength>100) {
        throw new Error('Invalid cracks material settings');
    }
    return { enabled:value.enabled, strength:value.strength };
}

export const DEFAULT_CRACKS_GROWTH = Object.freeze({ branchChance:65, branchInterval:11, curvature:100 });
export function validateCracksGrowth(value = DEFAULT_CRACKS_GROWTH) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !['branchChance','branchInterval','curvature'].includes(key)) ||
        !Number.isInteger(value.branchChance) || value.branchChance<0 || value.branchChance>100 ||
        !Number.isInteger(value.branchInterval) || value.branchInterval<1 || value.branchInterval>40 ||
        !Number.isInteger(value.curvature) || value.curvature<0 || value.curvature>200) throw new Error('Invalid cracks growth settings');
    return { branchChance:value.branchChance, branchInterval:value.branchInterval, curvature:value.curvature };
}

export const CRACKS_GROWTH_PRESETS = Object.freeze([
    Object.freeze({id:'first-whisper',key:'cracks_preset_first_whisper',values:DEFAULT_CRACKS_GROWTH}),
    Object.freeze({id:'quiet-flow',key:'cracks_preset_quiet_flow',values:Object.freeze({branchChance:40,branchInterval:22,curvature:100})}),
    Object.freeze({id:'crystal-paths',key:'cracks_preset_crystal_paths',values:Object.freeze({branchChance:40,branchInterval:22,curvature:0})}),
    Object.freeze({id:'fibonacci-bloom',key:'cracks_preset_fibonacci_bloom',values:Object.freeze({branchChance:55,branchInterval:8,curvature:130})})
]);
export function getCracksPresetId(value) {
    const growth=validateCracksGrowth(value);
    return CRACKS_GROWTH_PRESETS.find(p=>Object.keys(DEFAULT_CRACKS_GROWTH).every(key=>p.values[key]===growth[key]))?.id ?? null;
}

// Opening default is separate from legacy recipe growth constants.
export const INITIAL_CRACKS_GROWTH = CRACKS_GROWTH_PRESETS.find(p=>p.id==='fibonacci-bloom').values;
export function validateCracksBrush(value = {color:null,rainbow:false}) {
    if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!['color','rainbow'].includes(k)) ||
       typeof value.rainbow!=='boolean' || !(value.color===null || typeof value.color==='string' && /^#[0-9a-f]{6}$/i.test(value.color))) throw new Error('Invalid cracks brush source');
    return {color:value.color,rainbow:value.rainbow};
}
