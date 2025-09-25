// js/history.js
import { state } from './state.js';
import { HISTORY_LIMIT } from './constants.js';
import { PALETTES } from './config.js';
import { updateUndoRedoButtons, clearAllHighlights } from './dom.js';

// --- התלות בפונקציות אלו תיפתר כאשר ניצור את המודולים הבאים ---
import { getTiles, getIndex, setIndex, buildBoard, clearGoldOverlay } from './board.js';
import { updatePaletteButtonUI } from './palette.js';
// import { updateSymmetryUI } from './actions.js'; // ניצור את זה בהמשך
// import { updateColorPickerButtonUI } from './colorPicker.js'; // ניצור את זה בהמשך

// --- Private Helper Functions ---

/**
 * יוצר ומחזיר "תמונת מצב" של המצב הנוכחי של האפליקציה.
 * @returns {object} אובייקט המייצג את מצב האפליקציה.
 */
function getCurrentState() {
    return {
        n: state.n,
        activePaletteIndex: state.activePaletteIndex,
        paletteName: PALETTES[state.activePaletteIndex].originalName,
        separatorPx: state.separatorPx,
        symmetryMode: state.symmetryMode,
        selectedColor: state.selectedColor,
        isRainbowModeActive: state.isRainbowModeActive,
        tiles: getTiles().map(el => ({
            k: getIndex(el),
            isGold: !!el.dataset.goldOverlay
        }))
    };
}

/**
 * משווה בין שני אובייקטי מצב כדי לבדוק אם הם זהים.
 * @param {object} stateA
 * @param {object} stateB
 * @returns {boolean}
 */
function areStatesEqual(stateA, stateB) {
    if (!stateA || !stateB) return false;
    if (
        stateA.n !== stateB.n ||
        stateA.activePaletteIndex !== stateB.activePaletteIndex ||
        stateA.separatorPx !== stateB.separatorPx ||
        stateA.symmetryMode !== stateB.symmetryMode ||
        stateA.selectedColor !== stateB.selectedColor ||
        stateA.isRainbowModeActive !== stateB.isRainbowModeActive ||
        stateA.tiles.length !== stateB.tiles.length
    ) {
        return false;
    }
    for (let i = 0; i < stateA.tiles.length; i++) {
        if (stateA.tiles[i].k !== stateB.tiles[i].k || stateA.tiles[i].isGold !== stateB.tiles[i].isGold) {
            return false;
        }
    }
    return true;
}

/**
 * לוקח אובייקט מצב ומחיל אותו על האפליקציה, כלומר "משחזר" אותו.
 * @param {object} stateToApply - אובייקט המצב לשחזור.
 */
function applyState(stateToApply) {
    // מצא את אינדקס הפלטה לפי שם כדי להבטיח תאימות
    let paletteIdx = PALETTES.findIndex(p => p.originalName === stateToApply.paletteName);
    if (paletteIdx === -1) {
        paletteIdx = stateToApply.activePaletteIndex;
    }
    state.activePaletteIndex = paletteIdx >= 0 && paletteIdx < PALETTES.length ? paletteIdx : 0;
    
    state.separatorPx = stateToApply.separatorPx;
    state.symmetryMode = stateToApply.symmetryMode || 'off';
    state.selectedColor = stateToApply.selectedColor || null;
    state.isRainbowModeActive = stateToApply.isRainbowModeActive || false;
    
    if (state.selectedColor) {
        state.selectedColorIndex = PALETTES[state.activePaletteIndex].colors.indexOf(state.selectedColor);
        if (state.selectedColorIndex === -1) state.selectedColor = null;
    } else {
        state.selectedColorIndex = -1;
    }

    // --- קריאות לפונקציות שTodavía לא יצרנו ---
    // updateGlowEffect();
    // updateColorPickerButtonUI();
    updatePaletteButtonUI();
    // applySeparator(state.separatorPx);
    // updateSymmetryUI();
    // -----------------------------------------

    if (state.n !== stateToApply.n) {
        state.n = stateToApply.n;
        buildBoard(state.n); // בונה מחדש את הלוח אם הגודל השתנה
    }
    
    const tileElements = getTiles();
    stateToApply.tiles.forEach((tileState, i) => {
        const el = tileElements[i];
        if (el) {
            if (tileState.isGold) {
                // applyGoldOverlay(el) - הפונקציה הזו עדיין לא קיימת במודול board
            } else {
                clearGoldOverlay(el);
                setIndex(el, tileState.k);
            }
        }
    });
}


// --- Exported Functions ---

/**
 * דוחף את הפעולה האחרונה לערימת ההיסטוריה.
 * @param {object} action - אובייקט המכיל before ו-after.
 */
function pushHistory(action) {
    state.history.push(action);
    if (state.history.length > HISTORY_LIMIT) {
        state.history.shift();
    }
    state.future = [];
    updateUndoRedoButtons(state.history.length > 0, state.future.length > 0);
}

/**
 * מבצע פעולת Undo.
 */
export function undo() {
    if (state.history.length === 0) return;
    const lastAction = state.history.pop();
    state.future.push(lastAction);
    applyState(lastAction.before);
    clearAllHighlights();
    updateUndoRedoButtons(state.history.length > 0, state.future.length > 0);
}

/**
 * מבצע פעולת Redo.
 */
export function redo() {
    if (state.future.length === 0) return;
    const nextAction = state.future.pop();
    state.history.push(nextAction);
    applyState(nextAction.after);
    clearAllHighlights();
    updateUndoRedoButtons(state.history.length > 0, state.future.length > 0);
}

/**
 * פונקציית מעטפת לביצוע פעולות שצריכות להישמר בהיסטוריה.
 * @param {Function} actionFn - הפעולה לביצוע.
 */
export function performAction(actionFn) {
    const beforeState = getCurrentState();
    actionFn();
    const afterState = getCurrentState();

    if (!areStatesEqual(beforeState, afterState)) {
        pushHistory({ before: beforeState, after: afterState });
        state.hasPerformedInitialAutofill = true;
    }
}