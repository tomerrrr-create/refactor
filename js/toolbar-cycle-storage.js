export function orderToolbarCycle(modes, available) {
    return Array.isArray(modes) ? available.filter(mode => modes.includes(mode)) : [];
}

export function loadToolbarCycle(key, available, defaults, storage) {
    try {
        const modes = orderToolbarCycle(JSON.parse((storage ?? globalThis.localStorage)?.getItem(key)), available);
        if (modes.length) return modes;
    } catch { /* Use the default cycle. */ }
    return [...defaults];
}

export function persistToolbarCycle(key, modes, storage) {
    try { (storage ?? globalThis.localStorage)?.setItem(key, JSON.stringify(modes)); }
    catch { /* Use the selection for this session. */ }
}
