// js/main.js

/**
 * הקובץ הראשי של האפליקציה.
 * תפקידו לייבא את כל המודולים, לאתחל את האפליקציה
 * ולחבר את כל האירועים (event listeners) לפונקציות המתאימות.
 */

// --- Imports from all modules ---

import { state } from './state.js';
import { undo, redo, performAction } from './history.js';
import { runGameOfLifeGeneration, runBrightnessEvolution } from './simulations.js';
import {
    invertGrid,
    randomizeBoard,
    fillWithDarkest,
    cycleSeparator,
    resizeGrid,
    toggleBrushMode,
    specialReset,
    resetBoardToDefault
} from './actions.js';
import {
    updatePaletteNameTranslations,
    updatePaletteButtonUI
} from './palette.js';
import { buildBoard } from './board.js';
import * as dom from './dom.js'; // נייבא את כל האלמנטים תחת השם 'dom'

// --- Main Application Logic ---

/**
 * פונקציית האתחול הראשית של האפליקציה.
 */
function initializeApp() {
    // 1. אתחול ראשוני של נתונים
    updatePaletteNameTranslations();
    buildBoard(state.n);
    resetBoardToDefault(); // יצירת הלוח ההתחלתי
    
    // 2. עדכון ראשוני של הממשק
    updatePaletteButtonUI();
    dom.updateUndoRedoButtons(false, false);

    // 3. חיבור כל מאזיני האירועים (Event Listeners)
    attachEventListeners();

    console.log("Color Grid App initialized successfully!");
}

/**
 * מחבר את כל הפונקציות לכפתורים המתאימים.
 */
function attachEventListeners() {
    // כפתורי השראה וגילוי
    dom.btnInvert.addEventListener('click', invertGrid);
    dom.btnRandom.addEventListener('click', randomizeBoard);
    dom.btnDark.addEventListener('click', fillWithDarkest);
    dom.btnSpecialReset.addEventListener('click', specialReset);
    dom.btnPalette.addEventListener('click', () => {
        // Here we need the logic for switching palette
        // This is a more complex action that involves state change and UI updates
        performAction(() => {
            const newIndex = (state.activePaletteIndex + 1) % 18; // Assuming 18 palettes
            state.activePaletteIndex = newIndex;
            // We need a function to re-color the board based on the new palette
        });
        updatePaletteButtonUI();
    });

    // כפתורי סדר וארגון
    dom.btnResizeUp.addEventListener('click', () => resizeGrid(true));
    dom.btnResizeDown.addEventListener('click', () => resizeGrid(false));
    dom.btnGap.addEventListener('click', cycleSeparator);
    dom.btnResetBoard.addEventListener('click', resetBoardToDefault);

    // כפתורי מגע אישי
    dom.btnBrushMode.addEventListener('click', toggleBrushMode);
    // dom.btnSymmetry.addEventListener('click', cycleSymmetryMode);
    // dom.btnColorPicker.addEventListener('click', handleColorPickerClick);

    // כלים שימושיים
    dom.btnUndo.addEventListener('click', undo);
    dom.btnRedo.addEventListener('click', redo);

    // סימולציות
    dom.btnGameOfLife.addEventListener('click', () => performAction(runGameOfLifeGeneration));
    dom.btnBrightnessEvo.addEventListener('click', () => performAction(runBrightnessEvolution));
    
    // TODO: Add listeners for saving, tutorials, breathing, etc.
}


// --- Run the App ---
initializeApp();