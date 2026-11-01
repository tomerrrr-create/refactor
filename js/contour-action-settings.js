export const DEFAULT_CONTOUR_ACTION_RULES = Object.freeze({ sensitivity: 75, lineColor: 'darkest' });

export function validateContourActionRules(value = DEFAULT_CONTOUR_ACTION_RULES) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !['sensitivity', 'lineColor'].includes(key)) ||
        !Number.isFinite(value.sensitivity) || value.sensitivity < 0 || value.sensitivity > 100 ||
        !['darkest', 'lightest'].includes(value.lineColor)) throw new Error('Invalid Contours action rules');
    return { sensitivity: value.sensitivity, lineColor: value.lineColor };
}
