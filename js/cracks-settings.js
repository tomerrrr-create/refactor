export const DEFAULT_CRACKS_MATERIAL = Object.freeze({ enabled: true, strength: 40 });
export function validateCracksMaterial(value = DEFAULT_CRACKS_MATERIAL) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !['enabled','strength'].includes(key)) ||
        typeof value.enabled !== 'boolean' || !Number.isInteger(value.strength) || value.strength<0 || value.strength>100) {
        throw new Error('Invalid cracks material settings');
    }
    return { enabled:value.enabled, strength:value.strength };
}
