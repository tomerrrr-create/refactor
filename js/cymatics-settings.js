export const CURRENT_RESONANCE_VERSION=2;
export const CYMATICS_RESONANCE_MAPS=Object.freeze({heart:7,diagonal:1,grid:2,circular:3,interference:4,clouds:5,cosmic:6});
export const CENTERED_HEART_FIELD_VERSION = 3;
// New application/reset defaults are separate from legacy recording fallbacks.
export const INITIAL_CYMATICS_FREQUENCIES=Object.freeze({heart:123,diagonal:11831,grid:20000,circular:20000,interference:20000,clouds:20000,cosmic:800});
export const INITIAL_CYMATICS_RULES = Object.freeze({strength:35,mode:'resonance',frequency:INITIAL_CYMATICS_FREQUENCIES.heart,resonanceVersion:CYMATICS_RESONANCE_MAPS.heart,phaseMotion:true});
export const DEFAULT_CYMATICS_RULES=INITIAL_CYMATICS_RULES;
const isEmpathyMap = version => version === CYMATICS_RESONANCE_MAPS.circular || version === CYMATICS_RESONANCE_MAPS.cosmic;

export function validateCymaticsRules(value=DEFAULT_CYMATICS_RULES){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['pattern','strength','mode','frequency','resonanceVersion','phaseMotion','cosmicFieldVersion','heartFieldVersion','reversePaletteOrder'].includes(k))||
       !Number.isInteger(value.strength)||value.strength<10||value.strength>100||
       (value.pattern!==undefined&&(typeof value.pattern!=='string'||!value.pattern.length||value.pattern.length>64)))throw new Error('Invalid Resonance settings');
    if(value.mode!=='resonance')throw new Error('The experimental Patterns mode is no longer supported');
    if(!Number.isInteger(value.frequency)||value.frequency<20||value.frequency>20000)throw new Error('Invalid Resonance frequency');
    // The obsolete pattern field is retained only in old resonance recordings;
    // it never affects their field or particle movement.
    const result={...(value.pattern===undefined?{}:{pattern:value.pattern}),strength:value.strength,mode:'resonance',frequency:value.frequency};
    if(value.resonanceVersion!==undefined){
        if(!Object.values(CYMATICS_RESONANCE_MAPS).includes(value.resonanceVersion))throw new Error('Invalid resonance version');
        result.resonanceVersion=value.resonanceVersion;
    }
    if(value.phaseMotion!==undefined){
        if(typeof value.phaseMotion!=='boolean')throw new Error('Invalid phase motion');
        result.phaseMotion=value.phaseMotion;
    }
    if(value.cosmicFieldVersion!==undefined){
        if(![1,2,3].includes(value.cosmicFieldVersion))throw new Error('Invalid cosmic field version');
        result.cosmicFieldVersion=value.cosmicFieldVersion;
    }
    if (value.heartFieldVersion !== undefined) {
        if (result.resonanceVersion !== CYMATICS_RESONANCE_MAPS.heart || value.heartFieldVersion !== CENTERED_HEART_FIELD_VERSION) {
            throw new Error('Invalid Heart field version');
        }
        result.heartFieldVersion = value.heartFieldVersion;
    }
    if(value.reversePaletteOrder!==undefined){
        if(value.reversePaletteOrder!==true||!isEmpathyMap(result.resonanceVersion))throw new Error('Invalid Resonance palette order');
        result.reversePaletteOrder=true;
    }
    return result;
}
// Preference migration only. Retired recordings must fail rather than silently
// replaying a different experiment. Other workspace/profile fields stay intact.
export function migrateCymaticsPreferences(value){
    if(value&&typeof value==='object'&&!Array.isArray(value)&&
       (value.mode===undefined||value.mode==='patterns')&&typeof value.pattern==='string'&&value.pattern.length>0&&value.pattern.length<=64&&
       Number.isInteger(value.strength)&&value.strength>=10&&value.strength<=100&&
       Object.keys(value).every(k=>['pattern','strength','mode'].includes(k))){
        return {...INITIAL_CYMATICS_RULES,strength:value.strength};
    }
    // Discard the retired field-version preference from the previous build.
    if(value&&value.resonanceVersion===6&&[1,2].includes(value.cosmicVersion)){
        const {cosmicVersion,...rules}=value;
        value=rules;
    }
    // Replace the retired Heart experiment in saved preferences.
    if(value?.resonanceVersion===CYMATICS_RESONANCE_MAPS.heart&&value.heartFieldVersion===2){
        const {heartFieldVersion,...rules}=value;
        value=rules;
    }
    const rules=validateCymaticsRules(value);
    if(rules.resonanceVersion===6)rules.cosmicFieldVersion=3;
    if(isEmpathyMap(rules.resonanceVersion))rules.reversePaletteOrder=true;
    return rules;
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
    const usesHeart=rules.resonanceVersion===CYMATICS_RESONANCE_MAPS.heart;
    // Add Heart at its own frequency when reopening a legacy shared-frequency profile.
    return Object.fromEntries(Object.keys(CYMATICS_RESONANCE_MAPS).map(name=>[
        name,values[name]??(name==='heart' ? (usesHeart?rules.frequency:INITIAL_CYMATICS_FREQUENCIES.heart)
            : (usesHeart?INITIAL_CYMATICS_FREQUENCIES[name]:rules.frequency))
    ]));
}
export function rememberCymaticsFrequency(frequencies,rules){
    const result=createCymaticsFrequencies(rules,frequencies);
    if(rules.mode==='resonance'){
        const name=Object.keys(CYMATICS_RESONANCE_MAPS).find(name=>CYMATICS_RESONANCE_MAPS[name]===(rules.resonanceVersion??1));
        result[name]=rules.frequency;
    }
    return result;
}
// Like frequencies, map strengths belong to preferences, not runtime snapshots.
export function validateCymaticsStrengths(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(name=>!Object.hasOwn(CYMATICS_RESONANCE_MAPS,name)||!Number.isInteger(value[name])||value[name]<10||value[name]>100))throw new Error('Invalid Resonance map strengths');
    return Object.fromEntries(Object.keys(CYMATICS_RESONANCE_MAPS).filter(name=>Object.hasOwn(value,name)).map(name=>[name,value[name]]));
}
export function createCymaticsStrengths(rules,saved={}){
    const values=validateCymaticsStrengths(saved),fallback=rules===undefined?INITIAL_CYMATICS_RULES.strength:validateCymaticsRules(rules).strength;
    return Object.fromEntries(Object.keys(CYMATICS_RESONANCE_MAPS).map(name=>[name,values[name]??fallback]));
}
export function rememberCymaticsStrength(strengths,rules){
    const result=createCymaticsStrengths(rules,strengths);
    const name=Object.keys(CYMATICS_RESONANCE_MAPS).find(name=>CYMATICS_RESONANCE_MAPS[name]===(rules.resonanceVersion??1));
    result[name]=rules.strength;return result;
}
export function selectCymaticsMap(rules,version,frequencies,strengths){
    rules=validateCymaticsRules(rules);
    const name=Object.keys(CYMATICS_RESONANCE_MAPS).find(name=>CYMATICS_RESONANCE_MAPS[name]===version);
    if(!name)throw new Error('Invalid Cymatics map');
    const remembered=rememberCymaticsFrequency(frequencies,rules),rememberedStrengths=rememberCymaticsStrength(strengths,rules);
    const {cosmicFieldVersion,heartFieldVersion,reversePaletteOrder,...otherRules}=rules;
    return {rules:validateCymaticsRules({...otherRules,...(version===6?{cosmicFieldVersion:3}:{}),...(version===CYMATICS_RESONANCE_MAPS.heart?{heartFieldVersion:CENTERED_HEART_FIELD_VERSION}:{}),...(isEmpathyMap(version)?{reversePaletteOrder:true}:{}),mode:'resonance',resonanceVersion:version,frequency:remembered[name],strength:rememberedStrengths[name],
        phaseMotion:rules.mode==='resonance'?Boolean(rules.phaseMotion):INITIAL_CYMATICS_RULES.phaseMotion}),frequencies:remembered,strengths:rememberedStrengths};
}
