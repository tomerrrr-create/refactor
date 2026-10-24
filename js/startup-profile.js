// App-wide opening preference, independent of the last profile used in a session.
export const STARTUP_PROFILE_KEY = 'colorGridStartupProfile';
export function loadStartupProfile(storage = globalThis.localStorage) {
    try {
        const value = storage.getItem(STARTUP_PROFILE_KEY);
        return ['0', '1', '2'].includes(value) ? Number(value) : 0;
    } catch { return 0; }
}
export function saveStartupProfile(index, storage = globalThis.localStorage) {
    if (!Number.isInteger(index) || index < 0 || index > 2) throw new RangeError('Invalid startup profile');
    try { storage.setItem(STARTUP_PROFILE_KEY, String(index)); return true; }
    catch { return false; }
}
