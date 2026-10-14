// Three rule snapshots per evolution. Playback does not persist user preferences.
export function cloneCycleRules(rules) {
    return Object.fromEntries(Object.entries(rules).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
}

export function normalizeEvolutionCycle(value, defaults) {
    if (!Array.isArray(value) || value.length !== 3) return defaults.map(cloneCycleRules);
    return value.map((rules, index) => {
        const fallback = defaults[index];
        if (!rules || typeof rules !== 'object') return cloneCycleRules(fallback);
        const valid = Object.keys(fallback).every(key => Array.isArray(fallback[key])
            ? Array.isArray(rules[key]) && rules[key].every(n => Number.isInteger(n) && n >= (key === 'awakening' || key === 'flow' ? 1 : 0) && n <= 8)
            : Number.isInteger(rules[key]) && rules[key] >= 0 && rules[key] <= 10);
        if (!valid) return cloneCycleRules(fallback);
        return Object.fromEntries(Object.keys(fallback).map(key => [key, Array.isArray(rules[key])
            ? [...new Set(rules[key])].sort((a, b) => a - b) : rules[key]]));
    });
}

export function loadEvolutionCycle(key, defaults) {
    try { return normalizeEvolutionCycle(JSON.parse(localStorage.getItem(key)), defaults); }
    catch { return defaults.map(cloneCycleRules); }
}

export function persistEvolutionCycle(key, slots) {
    try { localStorage.setItem(key, JSON.stringify(slots)); } catch { /* Session changes still work. */ }
}

// Source identity only controls preset/Yours labels; playback still uses rule snapshots.
export function inferCycleSources(slots, presets) {
    return slots.map((rules, index) => index === 0 ? 'yours'
        : Object.entries(presets).find(([, preset]) => JSON.stringify(preset) === JSON.stringify(rules))?.[0] || 'custom-' + index);
}

export function normalizeCycleSources(sources, slots, presets) {
    const fallback = inferCycleSources(slots, presets);
    return slots.map((rules, index) => {
        const source = sources?.[index];
        if (source === 'yours' || /^custom-[0-2]$/.test(source)) return source;
        if (presets[source] && JSON.stringify(presets[source]) === JSON.stringify(rules)) return source;
        return fallback[index];
    });
}

export function loadCycleIdentity(key, slots, presets) {
    let value;
    try { value = JSON.parse(localStorage.getItem(key)); } catch { /* Use snapshots below. */ }
    return { sources: normalizeCycleSources(value?.sources, slots, presets),
        yoursRules: normalizeEvolutionCycle([value?.yoursRules, slots[1], slots[2]], slots)[0] };
}
