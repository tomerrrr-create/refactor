import { CHI_REACH_PERCENTAGES } from './chi-reach.js';

// Three rule snapshots per evolution. Playback does not persist user preferences.
export function cloneCycleRules(rules) {
    return Object.fromEntries(Object.entries(rules).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
}

export function normalizeEvolutionCycle(value, defaults) {
    if (!Array.isArray(value) || value.length !== 3) return defaults.map(cloneCycleRules);
    return value.map((rules, index) => {
        const fallback = defaults[index];
        if (!rules || typeof rules !== 'object') return cloneCycleRules(fallback);
        const requiredKeys = Object.keys(fallback).filter(key => key !== 'reachOffset' && key !== 'reachPercent' && key !== 'sortGenetics');
        const valid = requiredKeys.every(key => Array.isArray(fallback[key])
            ? Array.isArray(rules[key]) && rules[key].every(n => Number.isInteger(n) && n >= (key === 'awakening' || key === 'flow' ? 1 : 0) && n <= 8)
            : Number.isSafeInteger(rules[key]) && rules[key] >= 0 && rules[key] <= (key === 'reach' ? Number.MAX_SAFE_INTEGER : 10));
        if (!valid) return cloneCycleRules(fallback);
        const normalized = Object.fromEntries(requiredKeys.map(key => [key, Array.isArray(rules[key])
            ? [...new Set(rules[key])].sort((a, b) => a - b) : rules[key]]));
        if ('survival' in fallback && 'sortGenetics' in rules) {
            if (typeof rules.sortGenetics !== 'boolean') return cloneCycleRules(fallback);
            if (rules.sortGenetics) normalized.sortGenetics = true;
        }
        if ('reach' in fallback && 'reachOffset' in rules) {
            if (!Number.isInteger(rules.reachOffset) || rules.reachOffset < -10 || rules.reachOffset > 10) return cloneCycleRules(fallback);
            normalized.reachOffset = rules.reachOffset;
        }
        if ('reach' in fallback && 'reachPercent' in rules) {
            if (!CHI_REACH_PERCENTAGES.includes(rules.reachPercent)) return cloneCycleRules(fallback);
            normalized.reachPercent = rules.reachPercent;
        }
        return normalized;
    });
}

export function loadEvolutionCycle(key, defaults) {
    try { return normalizeEvolutionCycle(JSON.parse(localStorage.getItem(key)), defaults); }
    catch { return defaults.map(cloneCycleRules); }
}

export function persistEvolutionCycle(key, slots) {
    try { localStorage.setItem(key, JSON.stringify(slots)); } catch { /* Session changes still work. */ }
}

// Magnetic Reach can vary without changing a Chi Flow preset's neighbor pattern.
function matchesCyclePreset(preset, rules) {
    if (JSON.stringify(preset) === JSON.stringify(rules)) return true;
    if (preset.survival && rules.survival) return JSON.stringify({survival: preset.survival, birth: preset.birth}) === JSON.stringify({survival: rules.survival, birth: rules.birth});
    if (!preset.awakening || !rules.awakening) return false;
    const pattern = value => ({ awakening: value.awakening, flow: value.flow });
    return JSON.stringify(pattern(preset)) === JSON.stringify(pattern(rules));
}

// Source identity only controls preset/Yours labels; playback still uses rule snapshots.
export function inferCycleSources(slots, presets) {
    return slots.map((rules, index) => index === 0 ? 'yours'
        : Object.entries(presets).find(([, preset]) => matchesCyclePreset(preset, rules))?.[0] || 'custom-' + index);
}

export function normalizeCycleSources(sources, slots, presets) {
    const fallback = inferCycleSources(slots, presets);
    return slots.map((rules, index) => {
        const source = sources?.[index];
        if (source === 'yours' || /^custom-[0-2]$/.test(source)) return source;
        if (presets[source] && matchesCyclePreset(presets[source], rules)) return source;
        return fallback[index];
    });
}

export function loadCycleIdentity(key, slots, presets) {
    let value;
    try { value = JSON.parse(localStorage.getItem(key)); } catch { /* Use snapshots below. */ }
    return { sources: normalizeCycleSources(value?.sources, slots, presets),
        yoursRules: normalizeEvolutionCycle([value?.yoursRules, slots[1], slots[2]], slots)[0] };
}
