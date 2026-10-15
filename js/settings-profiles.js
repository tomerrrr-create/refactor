import { deserializeWorkspaceSettings, serializeWorkspaceSettings } from './workspace-settings.js';

export const PROFILES_STORAGE_KEY = 'colorGridSettingsProfiles';
export const PROFILE_COUNT = 3;
export const PROFILE_NAME_LIMIT = 48;
const emptyProfiles = () => Array.from({ length: PROFILE_COUNT }, () => ({ name: '', settingsText: null }));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function checkIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= PROFILE_COUNT) throw new Error('Invalid profile slot');
}

export function readSettingsProfiles(storage = localStorage) {
    const text = storage.getItem(PROFILES_STORAGE_KEY);
    if (text === null) return emptyProfiles();
    if (text.length > 4 * 1024 * 1024) throw new Error('Profiles storage is too large');
    const payload = JSON.parse(text);
    if (!object(payload) || payload.version !== 1 || !Array.isArray(payload.profiles) || payload.profiles.length !== PROFILE_COUNT) {
        throw new Error('Invalid profiles storage');
    }
    return payload.profiles.map(profile => {
        if (!object(profile) || typeof profile.name !== 'string' || profile.name.length > PROFILE_NAME_LIMIT ||
            !(profile.settingsText === null || typeof profile.settingsText === 'string')) throw new Error('Invalid profile');
        if (profile.settingsText !== null) deserializeWorkspaceSettings(profile.settingsText);
        return { name: profile.name, settingsText: profile.settingsText };
    });
}

function updateProfile(index, change, storage) {
    checkIndex(index);
    // Read the latest slots and write once. Failed validation/storage never replaces a saved profile.
    const profiles = readSettingsProfiles(storage);
    profiles[index] = { ...profiles[index], ...change };
    storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify({ version: 1, profiles }));
    return profiles;
}

export function saveProfileSettings(index, text, storage = localStorage) {
    const settingsText = serializeWorkspaceSettings(deserializeWorkspaceSettings(text));
    return updateProfile(index, { settingsText }, storage);
}

export function renameSettingsProfile(index, name, storage = localStorage) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > PROFILE_NAME_LIMIT) throw new Error('Invalid profile name');
    return updateProfile(index, { name: name.trim() }, storage);
}
