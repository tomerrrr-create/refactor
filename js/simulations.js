// js/simulations.js

// --- Internal helper functions ---
// These functions are used by the simulations in this file.

function getLuminance(hex) {
  const rgb = parseInt(hex.substring(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function getGeneticColor(parentHexColors, method = 'randomMix') {
  if (parentHexColors.length === 0) return 'rgb(0,0,0)';
  const parentRgbColors = parentHexColors.map(hex => hexToRgb(hex)).filter(Boolean);
  if (parentRgbColors.length === 0) return 'rgb(0,0,0)';

  let r, g, b;

  switch (method) {
      case 'average':
          r = Math.round(parentRgbColors.reduce((sum, c) => sum + c.r, 0) / parentRgbColors.length);
          g = Math.round(parentRgbColors.reduce((sum, c) => sum + c.g, 0) / parentRgbColors.length);
          b = Math.round(parentRgbColors.reduce((sum, c) => sum + c.b, 0) / parentRgbColors.length);
          break;
      case 'dominant':
          let dominantColor = parentRgbColors[0];
          let maxLuminance = -1;
          parentRgbColors.forEach((c, i) => {
              const lum = getLuminance(parentHexColors[i]);
              if (lum > maxLuminance) {
                  maxLuminance = lum;
                  dominantColor = c;
              }
          });
          r = dominantColor.r;
          g = dominantColor.g;
          b = dominantColor.b;
          break;
      case 'randomMix':
      default:
          const getRandomComponent = (component) => {
              const randomIndex = Math.floor(Math.random() * parentRgbColors.length);
              return parentRgbColors[randomIndex][component];
          };
          r = getRandomComponent('r');
          g = getRandomComponent('g');
          b = getRandomComponent('b');
          break;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function findClosestColorIndex(targetRgb, colorPalette) {
    let closestIndex = 0;
    let minDistance = Infinity;
    const target = targetRgb.match(/\d+/g).map(Number);

    colorPalette.forEach((hex, index) => {
        const rgb = hexToRgb(hex);
        if (!rgb) return;
        const dist = Math.sqrt(
            Math.pow(target[0] - rgb.r, 2) +
            Math.pow(target[1] - rgb.g, 2) +
            Math.pow(target[2] - rgb.b, 2)
        );
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
        }
    });
    return closestIndex;
}


export { runGameOfLifeGeneration } from './simulations/game_of_life.js';
export { runGravitationalSortGeneration, resetGravitationalSortCaches } from './simulations/gravitational_sort.js';
export { runSpiralGeneration } from './simulations/spiral.js';
export { runMagnetGeneration, resetMagnetCaches } from './simulations/magnet.js';
export { runErosionGeneration } from './simulations/erosion.js';
export { runBrightnessEvolution, runContrastGeneration } from './simulations/brightness.js';
export { runContourGeneration } from './simulations/contour.js';
export { generateSandpile } from './simulations/chi_flow.js';
export { runTuringGeneration } from './simulations/turing.js';


// --- DLA Helper functions, now adapted for boardState ---




function getStickingNeighborColors({ walker, n, dlaState, currentBoardState, currentPalette }) {
    const neighborColors = [];
    for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
            if (nx === 0 && ny === 0) continue;
            const neighborY = walker.y + ny;
            const neighborX = walker.x + nx;
            if (neighborX >= 0 && neighborX < n && neighborY >= 0 && neighborY < n) {
                const neighborIndex = neighborY * n + neighborX;
                
                // Check 1: Is the neighbor officially part of the crystal?
                if (dlaState.crystal.has(neighborIndex)) {
                    const colorK = currentBoardState[neighborIndex].k;
                    // Check 2 (The Fix): Is its current color NOT black? This prevents corrupted data from being used.
                    if (colorK > 0) {
                        neighborColors.push(currentPalette[colorK]);
                    }
                }
            }
        }
    }
    return neighborColors;
}



function getRandomGridPosition(n) {
    return { y: Math.floor(Math.random() * n), x: Math.floor(Math.random() * n) };
}

function getRandomEdgePosition(n) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
        case 0: x = Math.floor(Math.random() * n); y = 0; break; // Top
        case 1: x = n - 1; y = Math.floor(Math.random() * n); break; // Right
        case 2: x = Math.floor(Math.random() * n); y = n - 1; break; // Bottom
        case 3: x = 0; y = Math.floor(Math.random() * n); break; // Left
    }
    return { x, y };
}





export function runDlaGeneration({ n, currentBoardState, currentPalette, dlaState, dlaRules }) {

    if (dlaRules.fastMode) {
        // Fast mode logic is separate and remains unchanged.
        return { nextBoardState: currentBoardState, nextDlaState: dlaState };
    } else {
        // --- Original Algorithm with Final, Minimal Fixes Applied ---
        if (!dlaState || !dlaState.isInitialized) return { nextBoardState: currentBoardState, nextDlaState: dlaState };

        const pLen = currentPalette.length;
        const batchSize = 100;
        let processedCount = 0;

        const nextBoardState = currentBoardState.map(tile => ({...tile}));
        const nextDlaState = { 
            ...dlaState, 
            walkers: [...dlaState.walkers],
            emptyIndices: [...dlaState.emptyIndices]
        };

        // Initialize the intelligent fallback logic on the first run.
        if (nextDlaState.lastSuccessfulColorIndex === undefined) {
            const firstCrystalCellIndex = nextDlaState.crystal.values().next().value;
            if (firstCrystalCellIndex !== undefined) {
                nextDlaState.lastSuccessfulColorIndex = currentBoardState[firstCrystalCellIndex].k;
            } else {
                nextDlaState.lastSuccessfulColorIndex = 1; // Absolute fallback
            }
        }

        while (processedCount < batchSize && nextDlaState.walkers.length > 0 && nextDlaState.emptyIndices.length > 0) {
            const walkerIndex = nextDlaState.lastWalkerIndex;
            let walker = nextDlaState.walkers[walkerIndex];

            walker.x = Math.max(0, Math.min(n - 1, walker.x + Math.floor(Math.random() * 3) - 1));
            walker.y = Math.max(0, Math.min(n - 1, walker.y + Math.floor(Math.random() * 3) - 1));

            let stuck = false;
            for (let ny = -1; ny <= 1; ny++) {
                for (let nx = -1; nx <= 1; nx++) {
                     if (nx === 0 && ny === 0) continue;
                    const neighborY = walker.y + ny;
                    const neighborX = walker.x + nx;
                    if (neighborX >= 0 && neighborX < n && neighborY >= 0 && neighborY < n) {
                        if (nextDlaState.crystal.has(neighborY * n + neighborX)) {
                            stuck = true;
                            break;
                        }
                    }
                }
                if (stuck) break;
            }

            if (stuck) {
                const boardIndex = walker.y * n + walker.x;
                if (!nextDlaState.crystal.has(boardIndex)) {
                    nextDlaState.crystal.add(boardIndex);
                    
                    const indexInEmptyList = nextDlaState.emptyIndices.indexOf(boardIndex);
                    if (indexInEmptyList > -1) {
                        const lastElement = nextDlaState.emptyIndices.pop();
                        if (indexInEmptyList < nextDlaState.emptyIndices.length) {
                             nextDlaState.emptyIndices[indexInEmptyList] = lastElement;
                        }
                    }

                    let colorIndex;
                    if (dlaRules.colorGenetics) {

const parentColors = getStickingNeighborColors({ 
    walker, 
    n, 
    dlaState: nextDlaState, 
    currentBoardState: nextBoardState,
    currentPalette 
});

                        if (parentColors.length > 0) {
                            const geneticColor = getGeneticColor(parentColors, 'average');
                            colorIndex = findClosestColorIndex(geneticColor, currentPalette);
                        } else {
                            // THE FIX: Use the intelligent fallback instead of the old color-cycling logic.
                            colorIndex = nextDlaState.lastSuccessfulColorIndex;
                        }
                    } else {
                        colorIndex = (nextDlaState.crystal.size - 1) % pLen;
                    }

                    // Final safety net to prevent any black cells.
                    if (colorIndex === 0) {
                        colorIndex = 1;
                    }
                    
                    // In genetics mode, save this successful color for the next potential emergency.
                    if (dlaRules.colorGenetics) {
                        nextDlaState.lastSuccessfulColorIndex = colorIndex;
                    }

                    nextBoardState[boardIndex].k = colorIndex;
                    nextBoardState[boardIndex].v = colorIndex;
                    nextBoardState[boardIndex].isGold = false;
                }

                if (nextDlaState.emptyIndices.length > 0) {
                    const randomIndexInEmptyList = Math.floor(Math.random() * nextDlaState.emptyIndices.length);
                    const newBoardIndex = nextDlaState.emptyIndices[randomIndexInEmptyList];
                    nextDlaState.walkers[walkerIndex] = { y: Math.floor(newBoardIndex / n), x: newBoardIndex % n };
                } else {
                    nextDlaState.walkers.splice(walkerIndex, 1);
                }
            }

            if (nextDlaState.walkers.length > 0) {
                nextDlaState.lastWalkerIndex = (nextDlaState.lastWalkerIndex + 1) % nextDlaState.walkers.length;
            }
            processedCount++;
        }

        return { nextBoardState, nextDlaState };
    }
}









