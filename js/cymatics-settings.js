export const CYMATICS_PATTERNS = Object.freeze({
    petals:Object.freeze([1,2]), star:Object.freeze([2,3]), lattice:Object.freeze([3,5]), bloom:Object.freeze([4,7])
});
export const DEFAULT_CYMATICS_RULES = Object.freeze({pattern:'petals',strength:60});
export function validateCymaticsRules(value=DEFAULT_CYMATICS_RULES){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['pattern','strength'].includes(k))||
       !Object.hasOwn(CYMATICS_PATTERNS,value.pattern)||!Number.isInteger(value.strength)||value.strength<10||value.strength>100)throw new Error('Invalid Cymatics settings');
    return {pattern:value.pattern,strength:value.strength};
}
