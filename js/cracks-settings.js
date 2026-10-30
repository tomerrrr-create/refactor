export const CRACKS_LINE_COLORS = Object.freeze(['darkest','lightest','original-anchor']);
export const DEFAULT_CRACKS_MATERIAL = Object.freeze({ enabled: true, strength: 40 });
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
