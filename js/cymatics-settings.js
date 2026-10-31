export const CYMATICS_PATTERNS = Object.freeze({
    petals:Object.freeze([1,2]), star:Object.freeze([2,3]), lattice:Object.freeze([3,5]), bloom:Object.freeze([4,7])
});
export const CURRENT_RESONANCE_VERSION=2;
export const CYMATICS_RESONANCE_MAPS=Object.freeze({diagonal:1,grid:2,circular:3,interference:4});
export const DEFAULT_CYMATICS_RULES = Object.freeze({pattern:'petals',strength:60});
// New application/reset defaults are separate from legacy recording fallbacks.
export const INITIAL_CYMATICS_FREQUENCIES=Object.freeze({diagonal:11831,grid:11831,circular:20000,interference:800});
export const INITIAL_CYMATICS_RULES = Object.freeze({pattern:'petals',strength:60,mode:'resonance',frequency:800,resonanceVersion:4,phaseMotion:true});
export function validateCymaticsRules(value=DEFAULT_CYMATICS_RULES){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['pattern','strength','mode','frequency','resonanceVersion','phaseMotion'].includes(k))||
       !Object.hasOwn(CYMATICS_PATTERNS,value.pattern)||!Number.isInteger(value.strength)||value.strength<10||value.strength>100)throw new Error('Invalid Cymatics settings');
    const result={pattern:value.pattern,strength:value.strength};
    if(value.mode!==undefined&&value.mode!=='patterns'&&value.mode!=='resonance')throw new Error('Invalid Cymatics mode');
    if(value.frequency!==undefined&&(!Number.isInteger(value.frequency)||value.frequency<20||value.frequency>20000))throw new Error('Invalid Cymatics frequency');
    if(value.mode==='resonance'){
        if(value.frequency===undefined)throw new Error('Missing Cymatics frequency');
        result.mode='resonance';result.frequency=value.frequency;
    }else if(value.frequency!==undefined)throw new Error('Unexpected Cymatics frequency');
    if(value.resonanceVersion!==undefined){
        if(value.mode!=='resonance'||!Object.values(CYMATICS_RESONANCE_MAPS).includes(value.resonanceVersion))throw new Error('Invalid resonance version');
        result.resonanceVersion=value.resonanceVersion;
    }
    if(value.phaseMotion!==undefined){
        if(value.mode!=='resonance'||typeof value.phaseMotion!=='boolean')throw new Error('Invalid phase motion');
        result.phaseMotion=value.phaseMotion;
    }
    return result;
}

// Per-map frequencies are user preferences, not engine/runtime recording fields.
export function validateCymaticsFrequencies(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(name=>!Object.hasOwn(CYMATICS_RESONANCE_MAPS,name)||!Number.isInteger(value[name])||value[name]<20||value[name]>20000))throw new Error('Invalid Cymatics map frequencies');
    return Object.fromEntries(Object.keys(CYMATICS_RESONANCE_MAPS).filter(name=>Object.hasOwn(value,name)).map(name=>[name,value[name]]));
}
export function createCymaticsFrequencies(rules,saved={}){
    const values=validateCymaticsFrequencies(saved);
    if(rules===undefined)return {...INITIAL_CYMATICS_FREQUENCIES,...values};
    rules=validateCymaticsRules(rules);
    return Object.fromEntries(Object.keys(CYMATICS_RESONANCE_MAPS).map(name=>[name,values[name]??(rules.mode==='resonance'?rules.frequency:INITIAL_CYMATICS_FREQUENCIES[name])]));
}
export function rememberCymaticsFrequency(frequencies,rules){
    const result=createCymaticsFrequencies(rules,frequencies);
    if(rules.mode==='resonance'){
        const name=Object.keys(CYMATICS_RESONANCE_MAPS).find(name=>CYMATICS_RESONANCE_MAPS[name]===(rules.resonanceVersion??1));
        result[name]=rules.frequency;
    }
    return result;
}
export function selectCymaticsMap(rules,version,frequencies){
    rules=validateCymaticsRules(rules);
    const name=Object.keys(CYMATICS_RESONANCE_MAPS).find(name=>CYMATICS_RESONANCE_MAPS[name]===version);
    if(!name)throw new Error('Invalid Cymatics map');
    const remembered=rememberCymaticsFrequency(frequencies,rules);
    return {rules:validateCymaticsRules({...rules,mode:'resonance',resonanceVersion:version,frequency:remembered[name],
        phaseMotion:rules.mode==='resonance'?Boolean(rules.phaseMotion):INITIAL_CYMATICS_RULES.phaseMotion}),frequencies:remembered};
}
