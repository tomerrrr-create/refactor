// js/actions.js
import { state } from './state.js';
import { SIZES, SEPARATORS } from './constants.js';
import { performAction } from './history.js';
import { getTiles, setIndex, clearGoldOverlay, buildBoard } from './board.js';
import { getCurrentPalette } from './palette.js';
import { boardOverlay, applySeparator, btnBrushMode } from './dom.js';

// --- Private Helper Functions ---

async function animateBoardTransition(actionFn) {
    if (state.isAnimating) return;
    state.isAnimating = true;
    boardOverlay.style.opacity = '1';
    await new Promise(resolve => setTimeout(resolve, 350));
    
    actionFn(); // כאן הפעולה עצמה מתרחשת
    
    await new Promise(resolve => setTimeout(resolve, 50));
    boardOverlay.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 350));
    state.isAnimating = false;
}

function _performResize(newSize) {
    const oldTilesState = getTiles().map(el => ({ k: el.dataset.k, isGold: !!el.dataset.goldOverlay }));
    const oldSize = state.n;
    
    state.n = newSize;
    buildBoard(newSize);

    const newTiles = getTiles();
    const diff = oldSize - newSize;
    const offset = Math.floor(Math.abs(diff) / 2);

    for (let row = 0; row < newSize; row++) {
        for (let col = 0; col < newSize; col++) {
            const newIndex = row * newSize + col;
            const tile = newTiles[newIndex];
            
            let oldState = null;
            if (newSize < oldSize) { // Cropping
                const oldRow = row + offset;
                const oldCol = col + offset;
                if (oldRow < oldSize && oldCol < oldSize) {
                    oldState = oldTilesState[oldRow * oldSize + oldCol];
                }
            } else { // Expanding
                const oldRow = row - offset;
                const oldCol = col - offset;
                 if (oldRow >= 0 && oldRow < oldSize && oldCol >= 0 && oldCol < oldSize) {
                    oldState = oldTilesState[oldRow * oldSize + oldCol];
                }
            }

            if (tile && oldState) {
                if (oldState.isGold) {
                    // applyGoldOverlay(tile); // We need to export this from board.js
                    tile.style.background = '#FFD700';
                    tile.dataset.goldOverlay = '1';
                } else {
                    setIndex(tile, parseInt(oldState.k, 10));
                }
            } else if (tile) {
                setIndex(tile, 0); // Default color for new tiles
            }
        }
    }
}


// --- Exported Action Functions ---

// כל פונקציה כאן עטופה ב-performAction כדי שתתמוך ב-Undo/Redo

export function invertGrid() {
    performAction(() => {
        const len = getCurrentPalette().length;
        getTiles().forEach(el => {
            const currentIndex = parseInt(el.dataset.k || '0', 10);
            setIndex(el, (len - 1) - currentIndex);
        });
    });
}

export function randomizeBoard() {
    performAction(() => {
        const len = getCurrentPalette().length;
        getTiles().forEach(el => {
            clearGoldOverlay(el);
            setIndex(el, Math.floor(Math.random() * len));
        });
    });
}

export function fillWithDarkest() {
    animateBoardTransition(() => {
        performAction(() => {
            getTiles().forEach(el => {
                clearGoldOverlay(el);
                setIndex(el, 0); // The darkest color is always at index 0
            });
        });
    });
}

export function cycleSeparator() {
    performAction(() => {
        let currentIndex = SEPARATORS.indexOf(state.separatorPx);
        if (currentIndex === -1) currentIndex = 2; // Default to 3px if not found
        const nextIndex = (currentIndex + 1) % SEPARATORS.length;
        state.separatorPx = SEPARATORS[nextIndex];
        applySeparator(state.separatorPx);
    });
}

export function resizeGrid(increase) {
    const seq = [...SIZES].reverse(); // SIZES is small to large, reverse to go large to small
    let newSize;
    if (increase) {
        newSize = seq.find(size => size > state.n) || seq[seq.length-1];
    } else {
        newSize = [...seq].reverse().find(size => size < state.n) || seq[0];
    }
    if (newSize && newSize !== state.n) {
        animateBoardTransition(() => {
             performAction(() => _performResize(newSize));
        });
    }
}

export function toggleBrushMode() {
    state.isBrushModeOn = !state.isBrushModeOn;
    btnBrushMode.classList.toggle('brush-on', state.isBrushModeOn);
    // In a later step, we'll also update the title/aria-label from a translations module
}

export function specialReset() {
    animateBoardTransition(() => {
        performAction(() => {
            // This action combines multiple state changes
            state.activePaletteIndex = Math.floor(Math.random() * 18); // Assuming 18 palettes from config
            state.separatorPx = SEPARATORS[Math.floor(Math.random() * SEPARATORS.length)];
            state.n = SIZES[Math.floor(Math.random() * SIZES.length)];
            
            buildBoard(state.n);
            applySeparator(state.separatorPx);
            // We need to call updatePaletteButtonUI() here, which we will do in main.js
            
            const len = getCurrentPalette().length;
            getTiles().forEach(el => {
                clearGoldOverlay(el);
                setIndex(el, Math.floor(Math.random() * len));
            });
        });
    });
}

export function resetBoardToDefault() {
    animateBoardTransition(() => {
        performAction(() => {
            state.activePaletteIndex = 0;
            state.separatorPx = 3;
            state.n = 11;
            state.symmetryMode = 'off';
            // resetSelectedColor(); // We'll create this function later

            buildBoard(state.n);
            applySeparator(state.separatorPx);
            // updatePaletteButtonUI();
            // updateSymmetryUI();

            const centerIndex = Math.floor((state.n * state.n) / 2);
            getTiles().forEach((tile, index) => {
                clearGoldOverlay(tile);
                if (index === centerIndex) {
                    // applyGoldOverlay(tile);
                    tile.style.background = '#FFD700';
                    tile.dataset.goldOverlay = '1';
                } else {
                    setIndex(tile, 0);
                }
            });
        });
        toggleBrushMode(true); // Ensure brush mode is on after reset
    });
}