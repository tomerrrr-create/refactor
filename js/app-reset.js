const LAST_MODE_KEY = 'colorGridLastOpeningMode';
const RESET_KEY = 'colorGridEclipseResume';
const isOpeningMode = mode => mode === 'create' || mode === 'evolve';

export function readLastOpeningMode() {
    try {
        const mode = localStorage.getItem(LAST_MODE_KEY);
        return isOpeningMode(mode) ? mode : null;
    } catch {
        return null;
    }
}

export function rememberOpeningMode(mode) {
    try { localStorage.setItem(LAST_MODE_KEY, mode); } catch {}
}

export function queueAppReset(mode) {
    sessionStorage.setItem(RESET_KEY, mode);
}

function resetOnLaunch() {
    try {
        const mode = sessionStorage.getItem(RESET_KEY);
        if (!isOpeningMode(mode)) return null;
        sessionStorage.removeItem(RESET_KEY);
        // Clear on the new page before any app modules load saved settings.
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith('colorGrid') || key === 'userLanguage') localStorage.removeItem(key);
        }
        rememberOpeningMode(mode);
        return mode;
    } catch {
        return null;
    }
}

export const resetOpeningMode = resetOnLaunch();
