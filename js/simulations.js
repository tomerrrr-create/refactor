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

function getGeneticColor(parentHexColors, method = 'randomMix') {
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

function findClosestColorIndex(targetRgb, colorPalette) {
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

// --- Exported simulation functions ---

export function runGameOfLifeGeneration({ n, currentBoardState, currentPalette, gameOfLifeRules }) {
    const darkestIndex = 0;
    const lightestIndex = currentPalette.length - 1;
    const halfIndex = Math.floor(lightestIndex / 2);

    // 1. Read the current state from the data array into a 2D grid for easier neighbor calculation
    let internalCurrentState = [];
    for (let i = 0; i < n; i++) {
        internalCurrentState[i] = [];
        for (let j = 0; j < n; j++) {
            const tileData = currentBoardState[i * n + j];
            const tileIndex = tileData.k;

            let isAlive = false;
            switch (gameOfLifeRules.liveCellDef) {
                case 'notDarkest': isAlive = tileIndex !== darkestIndex; break;
                case 'notLightest': isAlive = tileIndex !== lightestIndex; break;
                case 'notDarkestAndLightest': isAlive = tileIndex !== darkestIndex && tileIndex !== lightestIndex; break;
                case 'topHalf': isAlive = tileIndex > halfIndex; break;
                case 'bottomHalf': isAlive = tileIndex < halfIndex && tileIndex !== darkestIndex; break;
                default: isAlive = tileIndex !== darkestIndex;
            }
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

            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue;
                    const ni = i + di;
                    const nj = j + dj;
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && internalCurrentState[ni][nj].isAlive) {
                        liveNeighbors++;
                        neighborColors.push(currentPalette[internalCurrentState[ni][nj].k]);
                    }
                }
            }

            const cell = internalCurrentState[i][j];
            let becomesAlive = false;
            let newK = cell.k;

            if (cell.isAlive) {
                becomesAlive = liveNeighbors >= gameOfLifeRules.survivalMin && liveNeighbors <= gameOfLifeRules.survivalMax;
            } else {
                becomesAlive = liveNeighbors === gameOfLifeRules.birth;
                if (becomesAlive) {
                    const geneticColor = getGeneticColor(neighborColors, gameOfLifeRules.colorGenetics);
                    newK = findClosestColorIndex(geneticColor, currentPalette);
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

export function runBrightnessEvolution({ n, currentBoardState, currentPalette }) {
    const smoothingFactor = 0.5;
    const nextBoardState = currentBoardState.map(tile => ({ ...tile })); // Create a mutable copy
    const maxIndex = currentPalette.length - 1; // קביעת האינדקס המקסימלי המותר

    for (let i = 0; i < n * n; i++) {
        const cell = currentBoardState[i];
        if (cell.isGold) continue;
        
        const row = Math.floor(i / n);
        const col = i % n;

        let totalBrightness = 0;
        let neighborCount = 0;

        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                const ni = row + di;
                const nj = col + dj;
                if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                    const neighbor = currentBoardState[ni * n + nj];
                    if (!neighbor.isGold) {
                        totalBrightness += neighbor.v;
                        neighborCount++;
                    }
                }
            }
        }

        if (neighborCount > 0) {
            const averageBrightness = totalBrightness / neighborCount;
            const currentV = cell.v;
            let newV = currentV + (averageBrightness - currentV) * smoothingFactor;

            // --- התיקון המרכזי ---
            // תחימת הערך החדש בין 0 לאינדקס המקסימלי של הפלטה
            newV = Math.max(0, Math.min(newV, maxIndex)); 
            // ---------------------

            nextBoardState[i].v = newV;
            nextBoardState[i].k = Math.round(newV);
        }
    }

    return nextBoardState;
}





export function runGravitationalSortGeneration({ n, currentBoardState, gravitationalSortRules }) {
    const nextBoardState = currentBoardState.map(tile => ({...tile}));
    const strength = gravitationalSortRules.strength;

    switch (gravitationalSortRules.direction) {
        case 'down':
            for (let row = n - 2; row >= 0; row--) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    const below_i = (row + 1) * n + col;
                    if (nextBoardState[i].k < nextBoardState[below_i].k && Math.random() < strength) {
                        [nextBoardState[i], nextBoardState[below_i]] = [nextBoardState[below_i], nextBoardState[i]];
                    }
                }
            }
            break;
        case 'up':
             for (let row = 1; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    const above_i = (row - 1) * n + col;
                    if (nextBoardState[i].k > nextBoardState[above_i].k && Math.random() < strength) {
                        [nextBoardState[i], nextBoardState[above_i]] = [nextBoardState[above_i], nextBoardState[i]];
                    }
                }
            }
            break;
        case 'right':
             for (let col = n - 2; col >= 0; col--) {
                for (let row = 0; row < n; row++) {
                    const i = row * n + col;
                    const right_i = row * n + (col + 1);
                    if (nextBoardState[i].k < nextBoardState[right_i].k && Math.random() < strength) {
                        [nextBoardState[i], nextBoardState[right_i]] = [nextBoardState[right_i], nextBoardState[i]];
                    }
                }
            }
            break;
        case 'left':
            for (let col = 1; col < n; col++) {
                for (let row = 0; row < n; row++) {
                    const i = row * n + col;
                    const left_i = row * n + (col - 1);
                    if (nextBoardState[i].k > nextBoardState[left_i].k && Math.random() < strength) {
                        [nextBoardState[i], nextBoardState[left_i]] = [nextBoardState[left_i], nextBoardState[i]];
                    }
                }
            }
            break;
    }

    // Update 'v' values to match 'k' after sorting
    nextBoardState.forEach(tile => { tile.v = tile.k; });
    
    return nextBoardState;
}

export function runErosionGeneration({ n, currentBoardState, currentPalette, erosionRules }) {
    const pLen = currentPalette.length;
    const earthEndIndex = Math.floor(pLen * 0.20);
    const airEndIndex = Math.floor(pLen * 0.80);

    const isEarth = (k) => k < earthEndIndex;
    const isAir = (k) => k >= earthEndIndex && k < airEndIndex;
    const isWater = (k) => k >= airEndIndex;
    
    // Operate on a mutable array of indices for easier swapping
    const currentStateIndices = currentBoardState.map(tile => tile.k);

    for (let i = n * n - 1; i >= 0; i--) {
        const k = currentStateIndices[i];
        if (!isWater(k)) continue;

        const row = Math.floor(i / n);
        const col = i % n;

        if (row < n - 1) { // Not the bottom row
            const belowIdx = i + n;
            const belowK = currentStateIndices[belowIdx];

            if (isAir(belowK)) {
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [belowK, k];
                continue;
            }
            if (isEarth(belowK) && Math.random() < erosionRules.erosionStrength) {
                currentStateIndices[belowIdx]++; // Erode earth
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [currentStateIndices[belowIdx], k];
                continue;
            }
            
            const canGoLeft = col > 0 && isAir(currentStateIndices[belowIdx - 1]);
            const canGoRight = col < n - 1 && isAir(currentStateIndices[belowIdx + 1]);

            if (canGoLeft && canGoRight) {
                const moveIdx = (Math.random() < 0.5) ? belowIdx - 1 : belowIdx + 1;
                [currentStateIndices[i], currentStateIndices[moveIdx]] = [currentStateIndices[moveIdx], k];
            } else if (canGoLeft) {
                [currentStateIndices[i], currentStateIndices[belowIdx - 1]] = [currentStateIndices[belowIdx - 1], k];
            } else if (canGoRight) {
                [currentStateIndices[i], currentStateIndices[belowIdx + 1]] = [currentStateIndices[belowIdx + 1], k];
            }
        }
    }
    
    const nextBoardState = currentBoardState.map((tile, i) => {
        const newK = currentStateIndices[i];
        return {...tile, k: newK, v: newK };
    });

    return nextBoardState;
}

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
                if (dlaState.crystal.has(neighborIndex)) {
                    const colorK = currentBoardState[neighborIndex].k;
                    neighborColors.push(currentPalette[colorK]);
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

    // The "fastMode" logic remains the same as it's a different algorithm.
    if (dlaRules.fastMode) {
        // ... (existing fastMode code) ...
    } else {
        // --- START: EFFICIENT "WALKERS" ALGORITHM ---
        if (!dlaState || !dlaState.isInitialized) return { nextBoardState: currentBoardState, nextDlaState: dlaState };

        const pLen = currentPalette.length;
        const batchSize = 100;
        let processedCount = 0;

        const nextBoardState = currentBoardState.map(tile => ({...tile}));
        const nextDlaState = { 
            ...dlaState, 
            walkers: [...dlaState.walkers],
            emptyIndices: [...dlaState.emptyIndices] // Work on a copy of the list
        };

        if (nextDlaState.lastWalkerIndex === undefined) nextDlaState.lastWalkerIndex = 0;

        while (processedCount < batchSize && nextDlaState.walkers.length > 0 && nextDlaState.emptyIndices.length > 0) {
            const walkerIndex = nextDlaState.lastWalkerIndex;
            let walker = nextDlaState.walkers[walkerIndex];

            // ... (walker movement logic remains the same) ...
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = Math.floor(Math.random() * 3) - 1;
            walker.x = Math.max(0, Math.min(n - 1, walker.x + dx));
            walker.y = Math.max(0, Math.min(n - 1, walker.y + dy));

            let stuck = false;
            // ... (sticking check logic remains the same) ...
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
                    
                    // --- 1. Remove the newly filled spot from the list of empty indices ---
                    const indexInEmptyList = nextDlaState.emptyIndices.indexOf(boardIndex);
                    if (indexInEmptyList > -1) {
                         // Efficient removal by swapping with the last element and popping
                        const lastElement = nextDlaState.emptyIndices.pop();
                        if (indexInEmptyList < nextDlaState.emptyIndices.length) {
                             nextDlaState.emptyIndices[indexInEmptyList] = lastElement;
                        }
                    }

                    // ... (color genetics logic remains the same) ...
                    let colorIndex;
                    if (dlaRules.colorGenetics) {
                        const parentColors = getStickingNeighborColors({ walker, n, dlaState: nextDlaState, currentBoardState, currentPalette });
                        if (parentColors.length > 0) {
                            const geneticColor = getGeneticColor(parentColors, 'average');
                            colorIndex = findClosestColorIndex(geneticColor, currentPalette);
                        } else {
                            colorIndex = (nextDlaState.crystal.size - 1) % pLen;
                        }
                    } else {
                        colorIndex = (nextDlaState.crystal.size - 1) % pLen;
                    }
                    nextBoardState[boardIndex].k = colorIndex;
                    nextBoardState[boardIndex].v = colorIndex;
                    nextBoardState[boardIndex].isGold = false;
                }

                // --- 2. Replace the walker with a new one from a guaranteed empty spot ---
                if (nextDlaState.emptyIndices.length > 0) {
                    const randomIndexInEmptyList = Math.floor(Math.random() * nextDlaState.emptyIndices.length);
                    const newBoardIndex = nextDlaState.emptyIndices[randomIndexInEmptyList];
                    nextDlaState.walkers[walkerIndex] = {
                        y: Math.floor(newBoardIndex / n),
                        x: newBoardIndex % n
                    };
                } else {
                    // If no empty spots left, remove the walker
                    nextDlaState.walkers.splice(walkerIndex, 1);
                }
            }

            if (nextDlaState.walkers.length > 0) {
                nextDlaState.lastWalkerIndex = (nextDlaState.lastWalkerIndex + 1) % nextDlaState.walkers.length;
            }
            processedCount++;
        }

        return { nextBoardState, nextDlaState };
        // --- END: EFFICIENT "WALKERS" ALGORITHM ---
    }
}