// js/simulations.js
import { state } from './state.js';
import { getTiles, getIndex, setIndex } from './board.js';
import { getCurrentPalette } from './palette.js';

/**
 * מודול זה מכיל את הלוגיקה המורכבת של הסימולציות (Automata).
 */

// --- Private Helper Functions for Simulations ---

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

function getGeneticColor(parentHexColors, method) {
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


// --- Exported Simulation Functions ---

/**
 * מריץ דור אחד של סימולציית "משחק החיים" של קונווי.
 */
export function runGameOfLifeGeneration() {
    const { n, gameOfLifeRules } = state;
    const currentPalette = getCurrentPalette();
    const darkestIndex = 0;
    const lightestIndex = currentPalette.length - 1;
    const halfIndex = Math.floor(lightestIndex / 2);
    const allCurrentTiles = getTiles();

    let currentState = [];
    for (let i = 0; i < n; i++) {
        currentState[i] = [];
        for (let j = 0; j < n; j++) {
            const tile = allCurrentTiles[i * n + j];
            const tileIndex = getIndex(tile);
            let isAlive;
            switch (gameOfLifeRules.liveCellDef) {
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
                case 'notDarkest':
                default:
                    isAlive = tileIndex !== darkestIndex;
            }
            if (!!tile.dataset.goldOverlay) isAlive = false;
            currentState[i][j] = { isAlive, k: tileIndex };
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
            if (!tile.dataset.goldOverlay) {
                setIndex(tile, nextState[i][j].k);
            }
        }
    }
}

/**
 * מריץ דור אחד של סימולציית "אבולוציית הבהירות".
 */
export function runBrightnessEvolution() {
    const { n } = state;
    const allCurrentTiles = getTiles();
    const currentState = allCurrentTiles.map(tile => ({
        k: getIndex(tile),
        isGold: !!tile.dataset.goldOverlay
    }));
    const nextStateK = [];

    for (let i = 0; i < n * n; i++) {
        if (currentState[i].isGold) {
            nextStateK[i] = currentState[i].k;
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
                        totalBrightness += neighbor.k;
                        neighborCount++;
                    }
                }
            }
        }
        nextStateK[i] = neighborCount > 0 ? Math.round(totalBrightness / neighborCount) : currentState[i].k;
    }

    allCurrentTiles.forEach((tile, i) => {
        if (!tile.dataset.goldOverlay) {
            setIndex(tile, nextStateK[i]);
        }
    });
}