import { deserializeWorkspaceSettings, serializeWorkspaceSettings } from './workspace-settings.js';

export const PROFILES_STORAGE_KEY = 'colorGridSettingsProfiles';
export const PROFILE_COUNT = 3;
export const PROFILE_NAME_LIMIT = 48;
export const SELECTED_PROFILE_KEY = 'colorGridSelectedProfile';
const emptyProfiles = () => Array.from({ length: PROFILE_COUNT }, () => ({ name: '', settingsText: null }));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function checkIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= 1000) throw new Error('Invalid profile slot');
}

export function readSettingsProfiles(storage = localStorage) {
    const text = storage.getItem(PROFILES_STORAGE_KEY);
    if (text === null) return emptyProfiles();
    if (text.length > 4 * 1024 * 1024) throw new Error('Profiles storage is too large');
    const payload = JSON.parse(text);
    if (!object(payload) || payload.version !== 1 || !Array.isArray(payload.profiles) || payload.profiles.length < PROFILE_COUNT || payload.profiles.length > 1000) {
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
    if (!profiles[index]) throw new Error('Invalid profile slot');
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

export function readSelectedProfile(storage = localStorage) {
    try {
        const value = storage.getItem(SELECTED_PROFILE_KEY);
        if (value === null) return null;
        const index = Number(value);
        return Number.isInteger(index) && index >= 0 && readSettingsProfiles(storage)[index]?.settingsText ? index : null;
    } catch { return null; }
}

export function selectSettingsProfile(index, storage = localStorage) {
    try {
        if (index === null) storage.removeItem(SELECTED_PROFILE_KEY);
        else {
            if (!readSettingsProfiles(storage)[index]?.settingsText) throw new Error('Empty profile');
            storage.setItem(SELECTED_PROFILE_KEY, String(index));
        }
        return true;
    } catch { return false; }
}

export function createSettingsProfile(name, text, storage = localStorage) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > PROFILE_NAME_LIMIT) throw new Error('Invalid profile name');
    const settingsText = serializeWorkspaceSettings(deserializeWorkspaceSettings(text));
    const profiles = readSettingsProfiles(storage);
    let index = profiles.findIndex(profile => !profile.settingsText);
    if (index < 0) index = profiles.length;
    if (index >= 1000) throw new Error('Too many profiles');
    profiles[index] = { name: name.trim(), settingsText };
    storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify({ version: 1, profiles }));
    return index;
}
