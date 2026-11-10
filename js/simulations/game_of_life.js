import { getGeneticColor, findClosestColorIndex, getLuminance } from '../colors.js';

export function gameOfLifeDeadIndex(currentPalette, rules, originalPalette = currentPalette) {
    if (rules.deadColor !== 'luminance' || !currentPalette.length) return 0;
    const reference = originalPalette.length ? originalPalette : currentPalette;
    let darkest = reference[0];
    for (const color of reference) if (getLuminance(color) < getLuminance(darkest)) darkest = color;
    const index = currentPalette.indexOf(darkest);
    if (index >= 0) return index;
    // Standalone callers may supply a palette without its original ordering.
    return currentPalette.reduce((best, color, i) => getLuminance(color) < getLuminance(currentPalette[best]) ? i : best, 0);
}

export function runGameOfLifeGeneration({ n, currentBoardState, currentPalette, originalPalette = currentPalette, gameOfLifeRules }) {
    const paletteOrderGenetics = gameOfLifeRules.genetics === 'palette-order';
    const darkestIndex = gameOfLifeDeadIndex(currentPalette, gameOfLifeRules, originalPalette);
    const anchoredDead = gameOfLifeRules.deadColor === 'luminance';
    const lightestIndex = currentPalette.length - 1;

    // 1. Read the current state from the data array into a 2D grid for easier neighbor calculation
    let internalCurrentState = [];
    for (let i = 0; i < n; i++) {
        internalCurrentState[i] = [];
        for (let j = 0; j < n; j++) {
            const tileData = currentBoardState[i * n + j];
            const tileIndex = tileData.k;

            // The dead color is independent of the selected inheritance method.
            let isAlive = tileIndex !== darkestIndex;

            if (tileData.isGold) isAlive = false;

            internalCurrentState[i][j] = { isAlive, k: tileIndex };
        }
    }

    // 2. Calculate the next state based on the rules
    const nextState2D = [];
    for (let i = 0; i < n; i++) {
        nextState2D[i] = [];
        for (let j = 0; j < n; j++) {
            let liveNeighbors = 0;
            const neighborColors = [];
            let neighborRanks = 0;

            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue;
                    const ni = i + di;
                    const nj = j + dj;
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && internalCurrentState[ni][nj].isAlive) {
                        liveNeighbors++;
                        const parentIndex = internalCurrentState[ni][nj].k;
                        if (paletteOrderGenetics) neighborRanks += ((parentIndex % currentPalette.length) + currentPalette.length) % currentPalette.length;
                        else neighborColors.push(currentPalette[parentIndex]);
                    }
                }
            }

            const cell = internalCurrentState[i][j];
            let becomesAlive = false;
            let newK = cell.k;

            if (cell.isAlive) {
                // === START MODIFICATION ===
                // Use list-based rule check instead of range
                becomesAlive = gameOfLifeRules.survival.includes(liveNeighbors);
                // === END MODIFICATION ===
            } else {
                // === START MODIFICATION ===
                // Use list-based rule check instead of range
                becomesAlive = gameOfLifeRules.birth.includes(liveNeighbors);
                // === END MODIFICATION ===
                if (becomesAlive) {
                    if (paletteOrderGenetics) {
                        const firstLiving = darkestIndex === 0 && lightestIndex > 0 ? 1 : 0;
                        const inherited = Math.round(liveNeighbors ? neighborRanks / liveNeighbors : firstLiving);
                        // Keep the historical zero-dead calculation unchanged.
                        newK = anchoredDead ? Math.max(0, Math.min(lightestIndex, inherited))
                            : lightestIndex > 0 ? Math.max(1, Math.min(lightestIndex, inherited)) : 0;
                        if (anchoredDead && newK === darkestIndex && lightestIndex > 0)
                            newK = darkestIndex < lightestIndex ? darkestIndex + 1 : darkestIndex - 1;
                    } else {
                        const geneticColor = getGeneticColor(neighborColors, 'average');
                        newK = findClosestColorIndex(geneticColor, currentPalette);
                    }
                }
            }
            
            nextState2D[i][j] = { isAlive: becomesAlive, k: becomesAlive ? newK : darkestIndex };
        }
    }
    
    // 3. Create the new 1D boardState array and return it
    const nextBoardState = currentBoardState.map((tile, index) => {
        if (tile.isGold) {
            return tile; // Gold tiles are immutable
        }
        const row = Math.floor(index / n);
        const col = index % n;
        const { k } = nextState2D[row][col];
        return { ...tile, k: k, v: k };
    });

    return nextBoardState;
}

