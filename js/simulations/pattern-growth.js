import { PALETTE_GROUPS } from '../constants.js';

export const MIN_PATTERN_GROWTH_SPEED = 10;
const originMax = PALETTE_GROUPS.find(group => group.id === 'classic').max;
const expansionMax = PALETTE_GROUPS.find(group => group.id === 'extended').max;

export function resolvePatternGrowthSpeed(settings, colorCount) {
    if (!settings.growthSpeedAuto) return settings.growthSpeed;
    if (colorCount <= originMax) return MIN_PATTERN_GROWTH_SPEED;
    return colorCount <= expansionMax ? 25 : 100;
}

export function validatePatternGrowthMode(settings) {
    if (!Object.hasOwn(settings, 'growthSpeedAuto')) return {};
    if (typeof settings.growthSpeedAuto !== 'boolean') throw new Error('Invalid automatic pattern growth setting');
    return { growthSpeedAuto: settings.growthSpeedAuto };
}

export function restorePatternGrowthPreference(settings, defaults) {
    return { ...settings, growthSpeedAuto: settings.growthSpeedAuto ?? (settings.growthSpeed === defaults.growthSpeed) };
}
