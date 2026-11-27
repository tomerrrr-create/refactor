const RESET_KEY = 'colorGridEclipseResume';
const isOpeningMode = mode => mode === 'create' || mode === 'evolve';

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
        return mode;
    } catch {
        return null;
    }
}

export const resetOpeningMode = resetOnLaunch();
