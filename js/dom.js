// js/dom.js

/**
 * קובץ זה מרכז את כל הגישה והמניפולציה של ה-DOM.
 * הוא מייצא את כל האלמנטים המרכזיים ומספק פונקציות עזר לעדכון הממשק.
 */

// ---- Element Exports ----
// Root and Main Containers
export const root = document.documentElement;
export const appContainer = document.getElementById('appContainer');
export const appShell = document.querySelector('.app-shell');
export const controlsContainer = document.getElementById('controlsContainer');
export const board = document.getElementById('board');
export const boardOverlay = document.getElementById('boardOverlay');

// Control Buttons
export const btnRandom = document.getElementById('btnRandom');
export const btnPalette = document.getElementById('btnPalette');
export const btnGap = document.getElementById('btnGap');
export const btnUndo = document.getElementById('btnUndo');
export const btnRedo = document.getElementById('btnRedo');
export const btnInvert = document.getElementById('btnInvert');
export const btnBrushMode = document.getElementById('btnBrushMode');
export const btnSpecialReset = document.getElementById('btnSpecialReset');
export const btnTutorial = document.getElementById('btnTutorial');
export const btnDark = document.getElementById('btnDark');
export const btnGameOfLife = document.getElementById('btnGameOfLife');
export const btnToggleSimMode = document.getElementById('btnToggleSimMode');
export const btnBrightnessEvo = document.getElementById('btnBrightnessEvo');
export const btnShowBreatheMenu = document.getElementById('btnShowBreatheMenu');
export const btnSymmetry = document.getElementById('btnSymmetry');
export const btnColorPicker = document.getElementById('btnColorPicker');
export const btnExitBreathe = document.getElementById('btnExitBreathe');
export const btnResetBoard = document.getElementById('btnResetBoard');
export const btnResizeUp = document.getElementById('btnResizeUp');
export const btnResizeDown = document.getElementById('btnResizeDown');
export const btnSave = document.getElementById('btnSave');
export const btnPlayPauseLife = document.getElementById('btnPlayPauseLife');
export const iconPlay = document.getElementById('iconPlay');
export const iconPause = document.getElementById('iconPause');

// Modals
export const saveModal = document.getElementById('saveModal');
export const breatheModal = document.getElementById('breatheModal');
export const colorPickerModal = document.getElementById('colorPickerModal');
export const helpModal = document.getElementById('helpModal');
export const resizeModal = document.getElementById('resizeModal');
export const paletteModal = document.getElementById('paletteModal');
export const gameOfLifeSettingsModal = document.getElementById('gameOfLifeSettingsModal');

// Other UI Elements
export const longPressOverlay = document.getElementById('longPressOverlay');
export const longPressDisplay = document.getElementById('longPressDisplay');
export const originalColorPickerIconHTML = btnColorPicker.innerHTML;


// ---- UI Update Functions ----

/**
 * מעדכן את כפתורי ה-Undo/Redo (מפעיל/מכבה אותם)
 * @param {boolean} canUndo - האם ניתן לבצע Undo
 * @param {boolean} canRedo - האם ניתן לבצע Redo
 */
export function updateUndoRedoButtons(canUndo, canRedo) {
    btnUndo.disabled = !canUndo;
    btnRedo.disabled = !canRedo;
}

/**
 * מציג או מסתיר חלון מודאלי
 * @param {HTMLElement} modalElement - אלמנט המודאל להצגה/הסתרה
 * @param {boolean} show - true להצגה, false להסתרה
 */
export function toggleModal(modalElement, show) {
    modalElement.classList.toggle('modal-visible', show);
}

/**
 * מחיל את הגדרת המרווח בין האריחים על ידי עדכון משתני CSS
 * @param {number} separatorPx - גודל המרווח בפיקסלים
 */
export function applySeparator(separatorPx) {
    root.style.setProperty('--gap-px', `${separatorPx}px`);
    root.style.setProperty('--tile-radius', (separatorPx === 0 ? '0px' : '2px'));
}

/**
 * מנקה את כל ההדגשות (highlights) מהאריחים
 */
export function clearAllHighlights() {
    const tiles = Array.from(board.querySelectorAll('.tile'));
    tiles.forEach(el => {
        el.classList.remove('source-highlight', 'target-highlight');
    });
}