import { runBlackHoleGeneration } from './circle.js';
import { runTurbine2Generation } from './spiral-turbine2.js';
import { runSpiralGeneration } from './spiral.js';
import { LINE_GRAVITY_MODES } from '../gravity-cycle.js';
import { runPolygonCirculation } from './polygon-circulation.js';

const PINWHEEL_RULES = Object.freeze({method:'b'});

let cachedRadialOrder = null;
let cachedRadialN = null;

// מערך שכנים ממוחזר (Zero Allocation) שהוצאנו מחוץ ללולאות!
const gsNeighborsCoords = [
    {dr: -1, dc: 0}, {dr: 1, dc: 0},
    {dr: 0, dc: -1}, {dr: 0, dc: 1}
];

export function runGravitationalSortGeneration({ n, currentBoardState, currentPalette, gravitationalSortRules }) {
    const nextBoardState = currentBoardState; // Zero Allocation! מוטציה על המקום
    const strength = gravitationalSortRules.strength;

    if (gravitationalSortRules.direction === 'black_hole') return runBlackHoleGeneration(n, nextBoardState);
    if (gravitationalSortRules.direction === 'turbine2') return runTurbine2Generation(n, nextBoardState, strength);
    if (gravitationalSortRules.direction === 'pinwheel') return runSpiralGeneration({n, currentBoardState, currentPalette, spiralRules:PINWHEEL_RULES});

    if (LINE_GRAVITY_MODES.includes(gravitationalSortRules.direction)) {
        const lineRules = { method: gravitationalSortRules.direction, polygonFlowPhase: gravitationalSortRules.polygonFlowPhase };
        const board = runPolygonCirculation(n, nextBoardState, lineRules);
        gravitationalSortRules.polygonFlowPhase = lineRules.polygonFlowPhase;
        return board;
    }

    switch (gravitationalSortRules.direction) {

        case 'up':
        case 'reverse_up': {
            const step = gravitationalSortRules.direction === 'up' ? 1 : -1;
            const firstRow = step === 1 ? 1 : n - 2;
            for (let row = firstRow; row >= 0 && row < n; row += step) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    const neighbor = i - step * n;
                    if (nextBoardState[i].k > nextBoardState[neighbor].k && Math.random() < strength) {
                        const temp = nextBoardState[i];
                        nextBoardState[i] = nextBoardState[neighbor];
                        nextBoardState[neighbor] = temp;
                    }
                }
            }
            break;
        }

        case 'right':
        case 'reverse_right': {
            const step = gravitationalSortRules.direction === 'right' ? -1 : 1;
            const firstColumn = step === -1 ? n - 2 : 1;
            for (let col = firstColumn; col >= 0 && col < n; col += step) {
                for (let row = 0; row < n; row++) {
                    const i = row * n + col;
                    const neighbor = i - step;
                    if (nextBoardState[i].k < nextBoardState[neighbor].k && Math.random() < strength) {
                        const temp = nextBoardState[i];
                        nextBoardState[i] = nextBoardState[neighbor];
                        nextBoardState[neighbor] = temp;
                    }
                }
            }
            break;
        }

        case 'center_x': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            
            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    let bestDr = 0;
                    let bestDc = 0;
                    
                    // התיקון: x * x במקום Math.pow - מטוס סילון!
                    const rDiff = row - centerR;
                    const cDiff = col - centerC;
                    let minDist = (rDiff * rDiff) + (cDiff * cDiff);
                    
                    // שימוש במערך השכנים הממוחזר שלנו מבחוץ
                    for (let j = 0; j < gsNeighborsCoords.length; j++) {
                        const dr = gsNeighborsCoords[j].dr;
                        const dc = gsNeighborsCoords[j].dc;
                        const nr = row + dr;
                        const nc = col + dc;
                        
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                            const nrDiff = nr - centerR;
                            const ncDiff = nc - centerC;
                            const dist = (nrDiff * nrDiff) + (ncDiff * ncDiff);
                            
                            if (dist < minDist) {
                                minDist = dist;
                                bestDr = dr;
                                bestDc = dc;
                            }
                        }
                    }
                    
                    if (bestDr !== 0 || bestDc !== 0) {
                        const target_i = (row + bestDr) * n + (col + bestDc);
                        if (nextBoardState[i].k < nextBoardState[target_i].k && Math.random() < strength) {
                            // התיקון: החלפה קלאסית
                            const temp = nextBoardState[i];
                            nextBoardState[i] = nextBoardState[target_i];
                            nextBoardState[target_i] = temp;
                        }
                    }
                }
            }
            break;
        }

        case 'vortex': {
            if (cachedRadialN !== n) {
                const centerR = (n - 1) / 2;
                const centerC = (n - 1) / 2;
                const indices = Array.from({length: n * n}, (_, i) => i);
                indices.sort((a, b) => {
                    const rA = Math.floor(a / n), cA = a % n;
                    const rB = Math.floor(b / n), cB = b % n;
                    
                    // התיקון: הסרת Math.pow גם כאן
                    const rAdiff = rA - centerR, cAdiff = cA - centerC;
                    const rBdiff = rB - centerR, cBdiff = cB - centerC;
                    const distA = (rAdiff * rAdiff) + (cAdiff * cAdiff);
                    const distB = (rBdiff * rBdiff) + (cBdiff * cBdiff);
                    
                    return (distA - distB) || (Math.random() - 0.5); 
                });
                cachedRadialOrder = indices;
                cachedRadialN = n;
            }

            const passes = 6; 
            const stride = Math.max(1, Math.floor(n / 4));

            for (let p = 0; p < passes; p++) {
                
                for (let j = 0; j < cachedRadialOrder.length - stride; j++) {
                    const idx1 = cachedRadialOrder[j];          
                    const idx2 = cachedRadialOrder[j + stride]; 
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
                            const temp = nextBoardState[idx1];
                            nextBoardState[idx1] = nextBoardState[idx2];
                            nextBoardState[idx2] = temp;
                        }
                    }
                }
                
                for (let j = cachedRadialOrder.length - 1; j >= stride; j--) {
                    const idx1 = cachedRadialOrder[j - stride];
                    const idx2 = cachedRadialOrder[j];
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
                            const temp = nextBoardState[idx1];
                            nextBoardState[idx1] = nextBoardState[idx2];
                            nextBoardState[idx2] = temp;
                        }
                    }
                }
            }
            break;
        }
    }

    // התיקון האחרון: forEach רגיל מייצר קריאה לפונקציה (Callback) עבור כל תא.
    // לולאת for קלאסית לא מייצרת כלום ורצה במלוא המהירות!
    for (let i = 0; i < n * n; i++) {
        nextBoardState[i].v = nextBoardState[i].k;
    }
    
    return nextBoardState;
}



// === MINIMAL FIX: איפוס cache של Gravitational Sort בלבד ===
export function resetGravitationalSortCaches() {
    if (typeof cachedRadialOrder !== 'undefined') {
        cachedRadialOrder = null;
    }
    if (typeof cachedRadialN !== 'undefined') {
        cachedRadialN = null;
    }
}
