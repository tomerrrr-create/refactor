import { BRUSH_SIZES } from './brush-footprint.js';
import { SIZES, SYMMETRY_MODES } from './constants.js';

export const SIM_INIT_STORAGE_KEY = 'colorGridSimulationInit';
export const DEFAULT_SIM_INIT = Object.freeze({ boardSize: 249, brushSize: 7 });

export function validateSimInit(settings) {
    return settings && SIZES.includes(settings.boardSize) &&
        BRUSH_SIZES.includes(settings.brushSize) &&
        (!Object.hasOwn(settings, 'symmetry') || SYMMETRY_MODES.includes(settings.symmetry)) &&
        (!Object.hasOwn(settings, 'brushColor') || ['first', 'last', 'lightest', 'rainbow'].includes(settings.brushColor));
}

export function loadSimInit(storage) {
    try {
        const settings = JSON.parse((storage || localStorage).getItem(SIM_INIT_STORAGE_KEY));
        if (validateSimInit(settings)) {
            return { boardSize: settings.boardSize, brushSize: settings.brushSize,
                ...(Object.hasOwn(settings, 'symmetry') ? { symmetry: settings.symmetry } : {}),
                ...(Object.hasOwn(settings, 'brushColor') ? { brushColor: settings.brushColor } : {}) };
        }
    } catch { /* Unavailable storage or invalid data uses the existing defaults. */ }
    return { ...DEFAULT_SIM_INIT };
}

export function persistSimInit(settings, storage) {
    if (!validateSimInit(settings)) throw new RangeError('Invalid simulation init settings');
    try {
        (storage || localStorage).setItem(SIM_INIT_STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch {
        return false;
    }
}
