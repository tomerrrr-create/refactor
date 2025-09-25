// js/palette.js
import { state } from './state.js';
import { PALETTES, translations } from './config.js';
import { btnPalette } from './dom.js';

/**
 * מודול זה אחראי על כל הלוגיקה הקשורה לפלטות הצבעים.
 */

// --- Private Helper Functions ---

/**
 * מחזיר את התרגום המתאים למפתח ולשפה הנוכחית.
 * @param {string} key - המפתח של התרגום באובייקט התרגומים.
 * @returns {string} הטקסט המתורגם.
 */
function getText(key) {
    const lang = state.currentLang;
    if (!translations[key] || !translations[key][lang]) {
        console.warn(`Translation key not found for lang '${lang}': ${key}`);
        return translations[key] ? translations[key]['en'] : key;
    }
    return translations[key][lang];
}

// --- Exported Functions ---

/**
 * מעדכן את שמות הפלטות במערך הראשי בהתאם לשפה שנבחרה.
 */
export function updatePaletteNameTranslations() {
    PALETTES.forEach(p => {
        const key = Object.keys(translations).find(k => translations[k].en === p.originalName);
        if (key) {
            p.name = getText(key);
        } else {
            p.name = p.originalName;
        }
    });
}

/**
 * מחזיר את מערך הצבעים של הפלטה הפעילה כרגע.
 * @returns {string[]} מערך של צבעים (hex strings).
 */
export function getCurrentPalette() {
    return PALETTES[state.activePaletteIndex].colors;
}

/**
 * מקבל אינדקס ומחזיר את הצבע המתאים מהפלטה הנוכחית,
 * תוך כדי טיפול בחריגה מהגבולות (looping).
 * @param {number} k - אינדקס הצבע.
 * @returns {string} צבע בפורמט hex.
 */
export function getPaletteColor(k) {
    const currentPalette = getCurrentPalette();
    const len = currentPalette.length;
    // הנוסחה מבטיחה שהאינדקס תמיד יהיה בטווח חוקי
    const normalizedIndex = ((k % len) + len) % len;
    return currentPalette[normalizedIndex];
}

/**
 * מעדכן את התצוגה של כפתור הפלטה (אמוג'י/אייקון ושם).
 */
export function updatePaletteButtonUI() {
    const palette = PALETTES[state.activePaletteIndex];
    if (palette.iconHTML) {
        btnPalette.innerHTML = palette.iconHTML;
    } else {
        btnPalette.innerHTML = '';
        btnPalette.textContent = palette.emoji;
    }
    const label = `${getText('tooltip_palette')}: ${palette.name} (${state.activePaletteIndex + 1}/${PALETTES.length})`;
    btnPalette.setAttribute('aria-label', label);
}