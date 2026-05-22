
import { getText, translations } from './i18n.js';
import { PALETTES as allPalettes } from './data/palettes.js';

export const PALETTES = allPalettes;

// --- מחולל קבוצות פלטות דינמי ---
export const PALETTE_GROUPS = [
    { id: 'classic', title: 'Origin ◈ ', min: 0, max: 25, indexes: [] },
    { id: 'extended', title: 'Expansion ✦  ', min: 26, max: 80, indexes: [] },
    { id: 'continuous', title: 'Resonance ♾️ ', min: 81, max: Infinity, indexes: [] },
    { id: 'archive', title: 'Basement ▽', min: 0, max: Infinity, indexes: [] } 
];

// שיוך אוטומטי של אינדקסים לקבוצות
PALETTES.forEach((palette, index) => {
    if (palette.isArchived) {
        const archiveGroup = PALETTE_GROUPS.find(g => g.id === 'archive');
        if (archiveGroup) archiveGroup.indexes.push(index);
        return;
    }

    const count = palette.colors.length;
    const group = PALETTE_GROUPS.find(g => g.id !== 'archive' && count >= g.min && count <= g.max);
    if (group) {
        group.indexes.push(index);
    }
});

// מיון פנימי של הפלטות בתוך כל קבוצה לפי גודל (מהקטן לגדול)
PALETTE_GROUPS.forEach(group => {
    group.indexes.sort((a, b) => {
        return PALETTES[a].colors.length - PALETTES[b].colors.length;
    });
});

// --- App Settings & Magic Numbers ---
export const GOLD = '#FFD700';
export const ONBOARDING_STORAGE_KEY = 'colorGridOnboardingComplete';
export const HISTORY_LIMIT = 20;
export const COLORS_PER_PAGE = 24;
export const LONG_PRESS_SHOW_MS = 600;

// --- Grid Configuration ---
export const SYMMETRY_MODES = ['off', 'vertical', 'horizontal', 'mandala', 'kaleidoscope'];
export const SEPARATORS = [6, 5, 3, 2, 0];
export const SIZES = [299, 249, 199, 149, 101, 75, 65, 55, 49, 35, 27, 21, 15, 11, 9, 7, 5, 3];

// --- Default Simulation Rules ---
export const defaultGameOfLifeRules = {
    survival: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    birth: [1, 2, 3, 4, 5, 6, 7, 8]
};

export const defaultGravitationalSortRules = {
    direction: 'up',
    strength: 0.6
};

export const defaultSpiralRules = {
    method: 'b'
};

export const defaultMagnetRules = {
    method: 'magnet',
    anchorColorIndex: -1   // 1- מייצג את הכהה ביותר (DARKEST) תמיד
};

export const defaultErosionRules = {
    erosionStrength: 0.1
};

export const defaultDlaRules = {
    colorGenetics: true,
    injectFromEdges: false,
    fastMode: false
};

export const defaultContourRules = {
    sensitivity: 75,
    lineColor: 'darkest'
};

export const defaultChiFlowRules = {
    awakening: [3, 4, 5, 6, 7, 8],
    flow: [1, 2],
    reach: 0
};

export const defaultTuringRules = {
    feed: 0.034,
    kill: 0.056, 
    dA: 1.0,     
    dB: 0.5,     
    timeStep: 1.0
};
