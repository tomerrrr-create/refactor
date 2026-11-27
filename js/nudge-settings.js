import { PALETTE_GROUPS } from './constants.js';

export const DEFAULT_NUDGE_INTERVAL = 35;
const originMax = PALETTE_GROUPS.find(group => group.id === 'classic').max;
const expansionMax = PALETTE_GROUPS.find(group => group.id === 'extended').max;

export function automaticNudgeInterval(colorCount) {
    if (colorCount <= originMax) return 200;
    return colorCount <= expansionMax ? 100 : 30;
}

export function isNudgeInterval(value) {
    return Number.isInteger(value) && value >= 0 && value <= 200;
}

export function loadNudgeSettings(storage) {
    try {
        const saved = JSON.parse((storage ?? localStorage).getItem('colorGridNudge'));
        if (!isNudgeInterval(saved?.intervalMs) || (saved.auto !== undefined && typeof saved.auto !== 'boolean')) return null;
        return { intervalMs: saved.intervalMs, auto: saved.auto ?? (saved.intervalMs === DEFAULT_NUDGE_INTERVAL) };
    } catch {
        return null;
    }
}
