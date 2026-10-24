import { resolveGameOfLifeDeadIndex, isGameOfLifeDeadColor, closestLivingGameOfLifeColor } from '../game-of-life-settings.js';
import { getGeneticColor, findClosestColorIndex } from '../colors.js';

export function runGameOfLifeGeneration({ n, currentBoardState, currentPalette, gameOfLifeRules }) {
    const deadIndex = resolveGameOfLifeDeadIndex(gameOfLifeRules, currentPalette);
    const customDeadColor = isGameOfLifeDeadColor(gameOfLifeRules.deadColor);
    const deadRanks = customDeadColor
        ? currentPalette.map(color => color.toLowerCase() === currentPalette[deadIndex].toLowerCase()) : null;

    // 1. Read the current state from the data array into a 2D grid for easier neighbor calculation
    let internalCurrentState = [];
    for (let i = 0; i < n; i++) {
        internalCurrentState[i] = [];
        for (let j = 0; j < n; j++) {
            const tileData = currentBoardState[i * n + j];
            const tileIndex = tileData.k;

            let isAlive = deadRanks ? !deadRanks[tileIndex] : tileIndex !== deadIndex;

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
            let neighborIndexSum = 0;

            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue;
                    const ni = i + di;
                    const nj = j + dj;
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && internalCurrentState[ni][nj].isAlive) {
                        liveNeighbors++;
                        neighborIndexSum += internalCurrentState[ni][nj].k;
                        neighborColors.push(currentPalette[internalCurrentState[ni][nj].k]);
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
                    if (gameOfLifeRules.sortGenetics === true && liveNeighbors > 0) {
                        // Average ranks in the current sort order, skipping the
                        // selected dead color if living parents straddle it.
                        const mean = neighborIndexSum / liveNeighbors;
                        newK = Math.round(mean);
                        if (deadRanks?.[newK]) {
                            let lower = newK - 1, upper = newK + 1;
                            while (lower >= 0 && deadRanks[lower]) lower--;
                            while (upper < currentPalette.length && deadRanks[upper]) upper++;
                            newK = lower >= 0 && (upper >= currentPalette.length || mean - lower <= upper - mean)
                                ? lower : upper < currentPalette.length ? upper : deadIndex;
                        }
                    } else {
                        // Preserve RGB mixing exactly for legacy recordings and B0.
                        const geneticColor = getGeneticColor(neighborColors, 'average');
                        newK = customDeadColor
                            ? closestLivingGameOfLifeColor(geneticColor, currentPalette, deadRanks, deadIndex)
                            : findClosestColorIndex(geneticColor, currentPalette);
                    }
                }
            }
            
            nextState2D[i][j] = { isAlive: becomesAlive, k: becomesAlive ? newK : deadIndex };
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

