// js/simulations.js

// --- פונקציות עזר פנימיות ---
// פונקציות אלו משמשות את הסימולציות שבהמשך הקובץ, אך שאר האפליקציה לא צריכה להכיר אותן.

function getLuminance(hex) {
  const rgb = parseInt(hex.substring(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  // Formula for perceived brightness
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


// --- פונקציות הסימולציה המיוצאות ---
// כל פונקציה מקבלת כעת את כל התלויות שלה (משתנים ופונקציות) כאובייקט אחד, למען הסדר הטוב.

export function runGameOfLifeGeneration({ n, allCurrentTiles, currentPalette, gameOfLifeRules, getIndex, isGold, setIndex }) {
    const darkestIndex = 0;
    const lightestIndex = currentPalette.length - 1;
    const halfIndex = Math.floor(lightestIndex / 2);

    let currentState = [];
    for (let i = 0; i < n; i++) {
        currentState[i] = [];
        for (let j = 0; j < n; j++) {
            const tile = allCurrentTiles[i * n + j];
            const tileIndex = getIndex(tile);

            let isAlive = false;
            switch (gameOfLifeRules.liveCellDef) {
                case 'notDarkest':
                    isAlive = tileIndex !== darkestIndex;
                    break;
                case 'notLightest':
                    isAlive = tileIndex !== lightestIndex;
                    break;
                case 'notDarkestAndLightest':
                    isAlive = tileIndex !== darkestIndex && tileIndex !== lightestIndex;
                    break;
                case 'topHalf':
                    isAlive = tileIndex > halfIndex;
                    break;
                case 'bottomHalf':
                    isAlive = tileIndex < halfIndex && tileIndex !== darkestIndex;
                    break;
                default:
                    isAlive = tileIndex !== darkestIndex;
            }

            if (isGold(tile)) isAlive = false;

            currentState[i][j] = {
                isAlive,
                k: tileIndex,
            };
        }
    }

    const nextState = [];
    for (let i = 0; i < n; i++) {
        nextState[i] = [];
        for (let j = 0; j < n; j++) {
            let liveNeighbors = 0;
            const neighborColors = [];

            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue;
                    const ni = i + di;
                    const nj = j + dj;
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n && currentState[ni][nj].isAlive) {
                        liveNeighbors++;
                        neighborColors.push(currentPalette[currentState[ni][nj].k]);
                    }
                }
            }

            const cell = currentState[i][j];
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

            nextState[i][j] = {
                isAlive: becomesAlive,
                k: becomesAlive ? newK : darkestIndex,
            };
        }
    }

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const tile = allCurrentTiles[i * n + j];
            const state = nextState[i][j];
            if (!isGold(tile)) {
                setIndex(tile, state.k);
            }
        }
    }
}

export function runBrightnessEvolution({ n, allCurrentTiles, getIndex, isGold, setIndex }) {
    const smoothingFactor = 0.5;

    const currentState = allCurrentTiles.map(tile => ({
        v: tile.dataset.v !== undefined ? parseFloat(tile.dataset.v) : getIndex(tile),
        isGold: isGold(tile)
    }));

    const nextStateV = [];

    for (let i = 0; i < n * n; i++) {
        const cell = currentState[i];
        if (cell.isGold) {
            nextStateV[i] = cell.v;
            continue;
        }
        const row = Math.floor(i / n);
        const col = i % n;

        let totalBrightness = 0;
        let neighborCount = 0;

        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                const ni = row + di;
                const nj = col + dj;
                if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                    const neighbor = currentState[ni * n + nj];
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
            const newV = currentV + (averageBrightness - currentV) * smoothingFactor;
            nextStateV[i] = newV;
        } else {
            nextStateV[i] = cell.v;
        }
    }

    allCurrentTiles.forEach((tile, i) => {
        if (!isGold(tile)) {
            const newV = nextStateV[i];
            setIndex(tile, newV, newV);
        }
    });
}

export function runGravitationalSortGeneration({ n, allCurrentTiles, gravitationalSortRules, getIndex, setIndex }) {
    const currentStateIndices = allCurrentTiles.map(tile => getIndex(tile));
    const strength = gravitationalSortRules.strength;
    let changed = false;

    switch (gravitationalSortRules.direction) {
        case 'down':
            for (let row = n - 2; row >= 0; row--) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    const below_i = (row + 1) * n + col;
                    if (currentStateIndices[i] < currentStateIndices[below_i] && Math.random() < strength) {
                        [currentStateIndices[i], currentStateIndices[below_i]] = [currentStateIndices[below_i], currentStateIndices[i]];
                        changed = true;
                    }
                }
            }
            break;
        case 'up':
            for (let row = 1; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    const above_i = (row - 1) * n + col;
                    if (currentStateIndices[i] > currentStateIndices[above_i] && Math.random() < strength) {
                        [currentStateIndices[i], currentStateIndices[above_i]] = [currentStateIndices[above_i], currentStateIndices[i]];
                        changed = true;
                    }
                }
            }
            break;
        case 'right':
            for (let col = n - 2; col >= 0; col--) {
                for (let row = 0; row < n; row++) {
                    const i = row * n + col;
                    const right_i = row * n + (col + 1);
                    if (currentStateIndices[i] < currentStateIndices[right_i] && Math.random() < strength) {
                        [currentStateIndices[i], currentStateIndices[right_i]] = [currentStateIndices[right_i], currentStateIndices[i]];
                        changed = true;
                    }
                }
            }
            break;
        case 'left':
            for (let col = 1; col < n; col++) {
                for (let row = 0; row < n; row++) {
                    const i = row * n + col;
                    const left_i = row * n + (col - 1);
                    if (currentStateIndices[i] > currentStateIndices[left_i] && Math.random() < strength) {
                        [currentStateIndices[i], currentStateIndices[left_i]] = [currentStateIndices[left_i], currentStateIndices[i]];
                        changed = true;
                    }
                }
            }
            break;
    }

    if (changed) {
        allCurrentTiles.forEach((tile, i) => {
            if (getIndex(tile) !== currentStateIndices[i]) {
                setIndex(tile, currentStateIndices[i]);
            }
        });
    }
}

export function runErosionGeneration({ n, allCurrentTiles, currentPalette, erosionRules, getIndex, setIndex }) {
    const pLen = currentPalette.length;

    const earthEndIndex = Math.floor(pLen * 0.20);
    const airEndIndex = Math.floor(pLen * 0.80);

    const isEarth = (k) => k < earthEndIndex;
    const isAir = (k) => k >= earthEndIndex && k < airEndIndex;
    const isWater = (k) => k >= airEndIndex;

    const currentStateIndices = allCurrentTiles.map(tile => getIndex(tile));

    for (let i = n * n - 1; i >= 0; i--) {
        const k = currentStateIndices[i];

        if (!isWater(k)) {
            continue;
        }

        const row = Math.floor(i / n);
        const col = i % n;

        if (row < n - 1) {
            const belowIdx = i + n;
            const belowK = currentStateIndices[belowIdx];

            if (isAir(belowK)) {
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [belowK, k];
                continue;
            }

            if (isEarth(belowK)) {
                if (Math.random() < erosionRules.erosionStrength) {
                    currentStateIndices[belowIdx]++;
                    [currentStateIndices[i], currentStateIndices[belowIdx]] = [currentStateIndices[belowIdx], k];
                    continue;
                }
            }

            const canGoLeft = col > 0 && isAir(currentStateIndices[belowIdx - 1]);
            const canGoRight = col < n - 1 && isAir(currentStateIndices[belowIdx + 1]);

            if (canGoLeft && canGoRight) {
                const moveIdx = (Math.random() < 0.5) ? belowIdx - 1 : belowIdx + 1;
                [currentStateIndices[i], currentStateIndices[moveIdx]] = [currentStateIndices[moveIdx], k];
                continue;
            } else if (canGoLeft) {
                [currentStateIndices[i], currentStateIndices[belowIdx - 1]] = [currentStateIndices[belowIdx - 1], k];
                continue;
            } else if (canGoRight) {
                [currentStateIndices[i], currentStateIndices[belowIdx + 1]] = [currentStateIndices[belowIdx + 1], k];
                continue;
            }
        }

        const canGoLeft = col > 0 && isAir(currentStateIndices[i - 1]);
        const canGoRight = col < n - 1 && isAir(currentStateIndices[i + 1]);

        if (canGoLeft && canGoRight) {
            const moveIdx = (Math.random() < 0.5) ? i - 1 : i + 1;
            [currentStateIndices[i], currentStateIndices[moveIdx]] = [currentStateIndices[moveIdx], k];
        } else if (canGoLeft) {
            [currentStateIndices[i], currentStateIndices[i - 1]] = [currentStateIndices[i - 1], k];
        } else if (canGoRight) {
            [currentStateIndices[i], currentStateIndices[i + 1]] = [currentStateIndices[i + 1], k];
        }
    }

    allCurrentTiles.forEach((tile, i) => {
        if (getIndex(tile) !== currentStateIndices[i]) {
            setIndex(tile, currentStateIndices[i]);
        }
    });
}


function getRandomGridPosition(n) {
    return { y: Math.floor(Math.random() * n), x: Math.floor(Math.random() * n) };
}

// START: New helper function for DLA edge spawning
function getRandomEdgePosition(n) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
        case 0: // Top
            x = Math.floor(Math.random() * n);
            y = 0;
            break;
        case 1: // Right
            x = n - 1;
            y = Math.floor(Math.random() * n);
            break;
        case 2: // Bottom
            x = Math.floor(Math.random() * n);
            y = n - 1;
            break;
        case 3: // Left
            x = 0;
            y = Math.floor(Math.random() * n);
            break;
    }
    return { x, y };
}
// END: New helper function

// START: New helper function for DLA color genetics
function getStickingNeighborColors({ walker, n, dlaState, allCurrentTiles, currentPalette, getIndex }) {
    const neighborColors = [];
    for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
            if (nx === 0 && ny === 0) continue;

            const neighborY = walker.y + ny;
            const neighborX = walker.x + nx;

            if (neighborX >= 0 && neighborX < n && neighborY >= 0 && neighborY < n) {
                const neighborIndex = neighborY * n + neighborX;
                if (dlaState.crystal.has(neighborIndex)) {
                    const neighborTile = allCurrentTiles[neighborIndex];
                    const colorK = getIndex(neighborTile);
                    neighborColors.push(currentPalette[colorK]);
                }
            }
        }
    }
    return neighborColors;
}
// END: New helper function

export function runDlaGeneration({ n, allCurrentTiles, currentPalette, dlaState, dlaRules, setIndex, getIndex }) {
    if (!dlaState || !dlaState.isInitialized) {
        return null; 
    }

    const pLen = currentPalette.length;
    const batchSize = 100; // Process 100 walkers per frame to avoid freezing
    let processedCount = 0;

    if (dlaState.lastWalkerIndex === undefined) {
        dlaState.lastWalkerIndex = 0;
    }

    while (processedCount < batchSize && dlaState.walkers.length > 0) {
        const walkerIndex = dlaState.lastWalkerIndex;
        let walker = dlaState.walkers[walkerIndex];

        // 1. Move walker
        const dx = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const dy = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        
        walker.x = Math.max(0, Math.min(n - 1, walker.x + dx));
        walker.y = Math.max(0, Math.min(n - 1, walker.y + dy));

        // 2. Check for neighbors to stick to
        let stuck = false;
        for (let ny = -1; ny <= 1; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
                if (nx === 0 && ny === 0) continue;

                const neighborY = walker.y + ny;
                const neighborX = walker.x + nx;

                if (neighborX >= 0 && neighborX < n && neighborY >= 0 && neighborY < n) {
                    const neighborIndex = neighborY * n + neighborX;
                    if (dlaState.crystal.has(neighborIndex)) {
                        stuck = true;
                        break;
                    }
                }
            }
            if (stuck) break;
        }

        // 3. If stuck, add to crystal, color, and respawn
        if (stuck) {
            const currentWalkerIndex = walker.y * n + walker.x;

            if (!dlaState.crystal.has(currentWalkerIndex)) {
                dlaState.crystal.add(currentWalkerIndex);
            
                let colorIndex;
                if (dlaRules.colorGenetics) {
                    // START: New Color Genetics Logic
                    const parentColors = getStickingNeighborColors({ walker, n, dlaState, allCurrentTiles, currentPalette, getIndex });
                    if (parentColors.length > 0) {
                        const geneticColor = getGeneticColor(parentColors, 'average');
                        colorIndex = findClosestColorIndex(geneticColor, currentPalette);
                    } else {
                        // Fallback for the very first particle if it has no parents
                        colorIndex = (dlaState.crystal.size - 1) % pLen;
                    }
                    // END: New Color Genetics Logic
                } else {
                    // Original cyclical color logic
                    colorIndex = (dlaState.crystal.size - 1) % pLen;
                }

                const tile = allCurrentTiles[currentWalkerIndex];
                setIndex(tile, colorIndex);
            }
            
            // START: New Respawn Logic
            if (dlaRules.injectFromEdges) {
                dlaState.walkers[walkerIndex] = getRandomEdgePosition(n);
            } else {
                dlaState.walkers[walkerIndex] = getRandomGridPosition(n);
            }
            // END: New Respawn Logic
        }

        dlaState.lastWalkerIndex = (dlaState.lastWalkerIndex + 1) % dlaState.walkers.length;
        processedCount++;
    }

    return dlaState;
}