export const CYMATICS_PATTERNS = Object.freeze({
    petals:Object.freeze([1,2]), star:Object.freeze([2,3]), lattice:Object.freeze([3,5]), bloom:Object.freeze([4,7])
});
export const CURRENT_RESONANCE_VERSION=2;
export const CYMATICS_RESONANCE_MAPS=Object.freeze({diagonal:1,grid:2,circular:3,interference:4});
export const DEFAULT_CYMATICS_RULES = Object.freeze({pattern:'petals',strength:60});
// New application/reset defaults are separate from legacy recording fallbacks.
export const INITIAL_CYMATICS_RULES = Object.freeze({pattern:'petals',strength:60,mode:'resonance',frequency:2731,resonanceVersion:4,phaseMotion:true});
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
