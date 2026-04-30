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

let cachedRadialOrder = null;
let cachedRadialN = null;

// מערך שכנים ממוחזר (Zero Allocation) שהוצאנו מחוץ ללולאות!
const gsNeighborsCoords = [
    {dr: -1, dc: 0}, {dr: 1, dc: 0},
    {dr: 0, dc: -1}, {dr: 0, dc: 1}
];

export function runGravitationalSortGeneration({ n, currentBoardState, gravitationalSortRules }) {
    const nextBoardState = currentBoardState; // Zero Allocation! מוטציה על המקום
    const strength = gravitationalSortRules.strength;

    switch (gravitationalSortRules.direction) {

        case 'up':
             for (let row = 1; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    const above_i = (row - 1) * n + col;
                    if (nextBoardState[i].k > nextBoardState[above_i].k && Math.random() < strength) {
                        // התיקון: החלפה קלאסית (ללא Destructuring) - מהיר פי 100
                        const temp = nextBoardState[i];
                        nextBoardState[i] = nextBoardState[above_i];
                        nextBoardState[above_i] = temp;
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
                        // התיקון: החלפה קלאסית
                        const temp = nextBoardState[i];
                        nextBoardState[i] = nextBoardState[right_i];
                        nextBoardState[right_i] = temp;
                    }
                }
            }
            break;

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


export { runErosionGeneration } from './simulations/erosion.js';

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



export { runBrightnessEvolution, runContrastGeneration } from './simulations/brightness.js';
export { runContourGeneration } from './simulations/contour.js';
export { generateSandpile } from './simulations/chi_flow.js';
export { runTuringGeneration } from './simulations/turing.js';





// --- START: Spiral Simulation (מבנה switch-case בדיוק כמו Gravitational Sort) ---
export function runSpiralGeneration({ n, currentBoardState, currentPalette, spiralRules }) {

const nextBoardState = currentBoardState; // Zero Allocation! מוטציה על המקום

    const method = spiralRules.method || 'classic';
let strength = 0.9; // עוצמת ברירת המחדל המקורית של הספירלה
    
    // החזרת העוצמה המקורית (0.6) עבור המצבים שהגיעו ממיון גרביטציה
    if (spiralRules.method === 'down' || spiralRules.method === 'left' || spiralRules.method === 'radial') {
        strength = 0.6;
    }

    switch (method) {





case 'vortex': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;

            const baseSpinStrength = 0;
            const pullStrength     = 0.8;
            const eddyFrequency    = 0;
            const eddyStrength     = 0;
            const timePhase        = Date.now() * 0.0005;

            // יצירת רשימה למעקב אחרי פיקסלים שכבר זזו בפריים הנוכחי
            const movedThisFrame = new Set();

            for (let row = 0; row < n; row++) {

for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    // אם הפיקסל כבר זז בפריים הזה, דלג עליו מיד
                    if (movedThisFrame.has(i)) continue;
                    
                    if (nextBoardState[i].isGold) continue;

                    const dy = row - centerR;
                    const dx = col - centerC;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 0.5) continue;

                    const turbulence = Math.sin((row * eddyFrequency) + timePhase) *
                                       Math.cos((col * eddyFrequency) - timePhase);

                    const dynamicSpin = baseSpinStrength + (1.0 / Math.max(dist, 1));
                    const currentAngle = Math.atan2(dy, dx);

                    const targetRadius = Math.max(0, dist - pullStrength + turbulence * 1.5);
                    const targetAngle  = currentAngle + dynamicSpin + turbulence * eddyStrength;

                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);

// תנועה קפדנית מבוססת מרחק כדי למנוע ריצודים
                    let bestDistSq = Math.pow(targetR - row, 2) + Math.pow(targetC - col, 2);
                    let bestNr = row, bestNc = col;

                    const neighbors = [
                        {dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1},
                        {dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}
                    ];

                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

                        const neighborDistSq = Math.pow(targetR - nr, 2) + Math.pow(targetC - nc, 2);

                        if (neighborDistSq < bestDistSq) {
                            bestDistSq = neighborDistSq;
                            bestNr = nr;
                            bestNc = nc;
                        }
                    }

                    if ((bestNr !== row || bestNc !== col) && Math.random() < 0.8) {


                        const target_i = bestNr * n + bestNc;
                        
                        // הוספנו פה את הבדיקה שהיעד לא ברשימה
                        if (!nextBoardState[target_i].isGold &&
                            nextBoardState[i].k < nextBoardState[target_i].k &&
                            !movedThisFrame.has(target_i)) { 
                            
                            // ביצוע ההחלפה (התנועה)
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                            
                            // הוספת שני הפיקסלים לרשימה כדי לנעול אותם עד הפריים הבא
                            movedThisFrame.add(i);
                            movedThisFrame.add(target_i);
                        }
                    }

                }
            }
            break;



                }
    




case 'down': {
    const centerR = (n - 1) / 2;
    const centerC = (n - 1) / 2;
    
    // פרמטרים קבועים ומושלמים למראה חור שחור הרמוני ומדהים
    // (strength מבחוץ שולט רק במהירות – כמה פיקסלים זזים בכל פריים)
    const baseSpinStrength = 0.105;   // סיבוב עדין אך ברור – יוצר ספירלות יפהפיות
    const pullStrength     = 0.78;    // שאיבה חזקה ומאוזנת – נבלע פנימה בלי להתפרק

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const i = row * n + col;
            if (nextBoardState[i].isGold) continue;
            
            const dy = row - centerR;
            const dx = col - centerC;
            const distToCenter = Math.sqrt(dx * dx + dy * dy);
            if (distToCenter < 0.5) continue; // מרכז יציב
            
            // חישוב מיקום יעד ספירלי מדויק (פולאר)
            const currentAngle = Math.atan2(dy, dx);
            const targetRadius = Math.max(0.3, distToCenter - pullStrength);
            const targetAngle  = currentAngle + baseSpinStrength;
            
            const targetR = centerR + targetRadius * Math.sin(targetAngle);
            const targetC = centerC + targetRadius * Math.cos(targetAngle);
            
            // וקטור התנועה הרצוי (מה שנותן תנועה חלקה וסיבובית אמיתית)
            const desiredDX = targetC - col;
            const desiredDY = targetR - row;
            const desiredLen = Math.sqrt(desiredDX * desiredDX + desiredDY * desiredDY) || 1;
            
            // 8 שכנים + בדיקת "כמה הכיוון מתאים" (cosine similarity)
            const neighbors = [
                {dr: -1, dc: 0}, {dr: 1, dc: 0},
                {dr: 0, dc: -1}, {dr: 0, dc: 1},
                {dr: -1, dc: -1}, {dr: -1, dc: 1},
                {dr: 1, dc: -1}, {dr: 1, dc: 1}
            ];
            
            let bestScore = -1;
            let bestNr = row;
            let bestNc = col;
            
            for (const {dr, dc} of neighbors) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                
                // וקטור התנועה של השכן
                const moveLen = Math.sqrt(dc * dc + dr * dr) || 1;
                const score = (dc * desiredDX + dr * desiredDY) / (moveLen * desiredLen);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestNr = nr;
                    bestNc = nc;
                }
            }
            
            // תנועה רק אם הכיוון טוב מספיק + בהסתברות strength (מהירות מבחוץ)
            if (bestScore > 0.15 && Math.random() < strength) {
                const target_i = bestNr * n + bestNc;
                
                if (!nextBoardState[target_i].isGold &&
                    nextBoardState[i].k < nextBoardState[target_i].k) {
                    
                    [nextBoardState[i], nextBoardState[target_i]] = 
                     [nextBoardState[target_i], nextBoardState[i]];
                }
            }
        }
    }
    break;
}




case 'left': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            
            // --- משתני שליטה: ספירלה נוזלית עם טורבולנציה ---
            const baseSpinStrength = 0.10; // כוח סיבוב בסיסי (בהיקף החיצוני)
            const pullStrength = 0.8;      // כוח השאיבה פנימה
            
            // המשתנים החדשים שיוצרים את הזרמים הסמויים:
            const eddyFrequency = 0.03;    // תדירות המערבולות הקטנות (צפיפות הגלים). ככל שגדול יותר - הזרמים צפופים יותר.
            const eddyStrength = 0.25;     // העוצמה שבה הזרם מסיט את הפיקסל מהמסלול המעגלי.
            
            // מוסיפים פאזת זמן עדינה כדי ששדה הזרימה הבלתי נראה "ינשום" ויזוז בעצמו
            const timePhase = Date.now() * 0.0005;

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (nextBoardState[i].isGold) continue; 
                    
                    const dy = row - centerR;
                    const dx = col - centerC;
                    const distToCenter = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distToCenter === 0) continue; 
                    
                    // 1. טורבולנציה וזרמי משנה (Eddies)
                    // יצירת מפת זרימה מבוססת גלי סינוס עם קוסינוס (מייצר תבניות אורגניות כמו שיש עץ או שיש)
                    const turbulence = Math.sin((row * eddyFrequency) + timePhase) * Math.cos((col * eddyFrequency) - timePhase);
                    
                    // 2. פיזיקה של פתח ניקוז (ככל שקרובים למרכז הסיבוב מהיר יותר)
                    const dynamicSpin = baseSpinStrength + (2.0 / Math.max(distToCenter, 1));
                    
                    const currentAngle = Math.atan2(dy, dx);
                    
                    // הטורבולנציה מתערבת ו"מעקמת" את הזווית קדימה ואחורה, ומרחיבה/מכווצת את הרדיוס קלות
                    const targetRadius = Math.max(0, distToCenter - pullStrength + (turbulence * 1.5));
                    const targetAngle = currentAngle + dynamicSpin + (turbulence * eddyStrength); 
                    
                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);
                    
                    const neighbors = [
                        {dr: -1, dc: 0}, {dr: 1, dc: 0},
                        {dr: 0, dc: -1}, {dr: 0, dc: 1},
                        {dr: -1, dc: -1}, {dr: -1, dc: 1},
                        {dr: 1, dc: -1}, {dr: 1, dc: 1}
                    ];
                    
                    const validNeighbors = [];
                    
                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                            const distToIdeal = Math.pow(nr - targetR, 2) + Math.pow(nc - targetC, 2);
                            validNeighbors.push({ nr, nc, dist: distToIdeal });
                        }
                    }
                    
                    validNeighbors.sort((a, b) => a.dist - b.dist);
                    
                    if (validNeighbors.length > 0) {
                        // 3. החלקה הסתברותית לשבירת פינות ויצירת מראה עגול לעין
                        let chosen = validNeighbors[0];
                        if (validNeighbors.length > 1 && Math.random() < 0.60) {
                            chosen = validNeighbors[1];
                        }
                        
                        const target_i = chosen.nr * n + chosen.nc;
                        
                        if (!nextBoardState[target_i].isGold && nextBoardState[i].k < nextBoardState[target_i].k && Math.random() < strength) {
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                        }
                    }
                }
            }
            break;
        }



      case 'radial': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            
            // --- משתני שליטה על הספירלה ---
            // שחק עם המספרים האלה כדי לשנות את אופי המערבולת!
            const spinStrength = 0.25; // כוח הסיבוב (ברדיאנים). ככל שגדול יותר, הספירלה "שטוחה" ומסתחררת יותר.
            const pullStrength = 0.8;  // כוח השאיבה למרכז (בפיקסלים). ככל שגדול יותר, הפיקסלים יישאבו מהר יותר פנימה.
            
            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    // הגנת זהב: פיקסלים מזהב לא נשאבים ולא זזים
                    if (nextBoardState[i].isGold) continue; 
                    
                    const dy = row - centerR;
                    const dx = col - centerC;
                    const distToCenter = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distToCenter === 0) continue; // אנחנו כבר בדיוק במרכז
                    
                    // 1. חישוב הזווית הנוכחית של הפיקסל ביחס למרכז
                    const currentAngle = Math.atan2(dy, dx);
                    
                    // 2. חישוב נקודת המטרה האידיאלית (קצת יותר קרוב, קצת מסובב)
                    const targetRadius = Math.max(0, distToCenter - pullStrength);
                    const targetAngle = currentAngle + spinStrength; 
                    
                    // המרה חזרה מקואורדינטות פולריות למיקום X,Y על הלוח
                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);
                    
                    let bestDr = 0;
                    let bestDc = 0;
                    let minDistToTarget = Infinity;
                    
                    const neighbors = [
                        {dr: -1, dc: 0}, {dr: 1, dc: 0},
                        {dr: 0, dc: -1}, {dr: 0, dc: 1},
                        {dr: -1, dc: -1}, {dr: -1, dc: 1},
                        {dr: 1, dc: -1}, {dr: 1, dc: 1}
                    ];
                    
                    // 3. מציאת השכן שיושב הכי קרוב לנקודת המטרה האידיאלית
                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                            const distToIdeal = Math.pow(nr - targetR, 2) + Math.pow(nc - targetC, 2);
                            if (distToIdeal < minDistToTarget) {
                                minDistToTarget = distToIdeal;
                                bestDr = dr;
                                bestDc = dc;
                            }
                        }
                    }
                    
                    // 4. ביצוע ההחלפה (עם הסתברות ובדיקת חסימת זהב של השכן)
                    if (bestDr !== 0 || bestDc !== 0) {
                        const target_i = (row + bestDr) * n + (col + bestDc);
                        if (!nextBoardState[target_i].isGold && nextBoardState[i].k < nextBoardState[target_i].k && Math.random() < strength) {
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                        }
                    }
                }
            }
            break;
        }


// ────────────────────────────── EXPERIMENT A (מיון גיאומטרי טהור מהמרכז החוצה) ──────────────────────────────
       
 case 'a': {

            // מחשבים את המרחק העגול המושלם רק פעם אחת כדי לחסוך ביצועים
            if (cachedRadialN !== n) {
                const centerR = (n - 1) / 2;
                const centerC = (n - 1) / 2;
                const indices = Array.from({length: n * n}, (_, i) => i);
                indices.sort((a, b) => {
                    const rA = Math.floor(a / n), cA = a % n;
                    const rB = Math.floor(b / n), cB = b % n;
                    const distA = Math.pow(rA - centerR, 2) + Math.pow(cA - centerC, 2);
                    const distB = Math.pow(rB - centerR, 2) + Math.pow(cB - centerC, 2);
                    
                    // התיקון: שובר שוויון אקראי מונע את הפרדת הלוח לחצאים!
                    return (distA - distB) || (Math.random() - 0.5); 
                });
                cachedRadialOrder = indices;
                cachedRadialN = n;
            }

            // 1. מחזירים את מספר המעברים למינימום כדי לשמור על 60FPS חלק ונעים לעין!
            const passes = 6; 
            
            // 2. ה"קפיצה" נשארת קבועה כדי לשמור על הכאוטיות שאתה אוהב!
            const stride = Math.max(1, Math.floor(n / 4));

            for (let p = 0; p < passes; p++) {
                
                // כוח משיכה ששואב למרכז (בקפיצות)
                for (let j = 0; j < cachedRadialOrder.length - stride; j++) {
                    const idx1 = cachedRadialOrder[j];          
                    const idx2 = cachedRadialOrder[j + stride]; 
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
let temp = nextBoardState[idx1];
nextBoardState[idx1] = nextBoardState[idx2];
nextBoardState[idx2] = temp;
                        }
                    }
                }
                
                // כוח הדיפה שדוחף החוצה (בקפיצות, מהסוף להתחלה כדי לשחרר פקקים)
                for (let j = cachedRadialOrder.length - 1; j >= stride; j--) {
                    const idx1 = cachedRadialOrder[j - stride];
                    const idx2 = cachedRadialOrder[j];
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
let temp = nextBoardState[idx1];
nextBoardState[idx1] = nextBoardState[idx2];
nextBoardState[idx2] = temp;
                        }
                    }
                }
            }
            break;
        }



/* case 'a': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            const spin = 0; 

            // 1. בניית המסלול המתמטי (מבוצע פעם אחת בלבד ונשמר בזיכרון)
            if (!window.perfectRadialOrderA || window.perfectRadialOrderA_n !== n) {
                let coords = [];
                for (let r = 0; r < n; r++) {
                    for (let c = 0; c < n; c++) {
                        const dy = r - centerR;
                        const dx = c - centerC;
                        const dist = Math.hypot(dx, dy);
                        const angle = Math.atan2(dy, dx);
                        const mathematicalValue = dist + (angle * spin);
                        
                        coords.push({ i: r * n + c, val: mathematicalValue });
                    }
                }
                
                coords.sort((a, b) => a.val - b.val);
                window.perfectRadialOrderA = coords.map(c => c.i);
                window.perfectRadialOrderA_n = n;
            }

            const order = window.perfectRadialOrderA;

            // --- הפתרון: תקציב זמן (Time-Boxing) ---
            // במקום speed מוגזם שתוקע הכל, אנחנו נותנים לקוד 4 מילישניות עבודה נטו
            const timeBudgetMs = 12; 
            const startTime = performance.now();
            
            // אנחנו מאפשרים לו לרוץ עד 50 פעמים, אבל הוא יחתוך הרבה לפני ברגע שהזמן ייגמר
            let passes = 0;
            while (passes < 50) {
                let madeAnySwap = false;

                // א. תנועה פנימה
                for (let j = order.length - 1; j > 0; j--) {
                    const idxInner = order[j - 1];
                    const idxOuter = order[j];
                    
                    if (nextBoardState[idxInner].isGold || nextBoardState[idxOuter].isGold) continue;

                    if (nextBoardState[idxInner].k > nextBoardState[idxOuter].k) {
                        let tempTile = nextBoardState[idxInner];
                        nextBoardState[idxInner] = nextBoardState[idxOuter];
                        nextBoardState[idxOuter] = tempTile;
                        madeAnySwap = true;
                    }
                }

                // ב. תנועה החוצה
                for (let j = 0; j < order.length - 1; j++) {
                    const idxInner = order[j];
                    const idxOuter = order[j + 1];
                    
                    if (nextBoardState[idxInner].isGold || nextBoardState[idxOuter].isGold) continue;

                    if (nextBoardState[idxInner].k > nextBoardState[idxOuter].k) {
                        let tempTile = nextBoardState[idxInner];
                        nextBoardState[idxInner] = nextBoardState[idxOuter];
                        nextBoardState[idxOuter] = tempTile;
                        madeAnySwap = true;
                    }
                }

                // אם אין החלפות, הלוח סודר לחלוטין!
                if (!madeAnySwap) break; 
                
                // --- בדיקת מד הזמן! ---
                // אם עברנו את התקציב (4ms), עוצרים מיד ומשחררים את הדפדפן לצייר
                if (performance.now() - startTime > timeBudgetMs) {
                    break;
                }
                
                passes++;
            }

            break;
        }
        */




        // ────────────────────────────── EXPERIMENT B ──────────────────────────────
        case 'b': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;

            // הסוד לספירלה בלי רוח: כוח סיבוב גבוה, שאיבה עדינה, ואפס טורבולנציה
            const baseSpinStrength = 0.005; // זה מה שיוצר את זרועות הספירלה! (אפשר להגדיל ל-0.25 לספירלה צפופה יותר)
            const pullStrength     = 1.5;  // שאיבה עדינה ואיטית פנימה

            // רשימת נוכחות למניעת "גלישת" פיקסלים
            const movedThisFrame = new Set();

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (movedThisFrame.has(i)) continue;
                    if (nextBoardState[i].isGold) continue;

                    const dy = row - centerR;
                    const dx = col - centerC;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 0.5) continue;

                    // מתמטיקה טהורה וסטטית של ספירלה - ללא זמן וללא רעש
                    const dynamicSpin = baseSpinStrength + (0 / Math.max(dist, 1));
                    const currentAngle = Math.atan2(dy, dx);

                    // יעד יציב לחלוטין
                    const targetRadius = Math.max(0, dist - pullStrength);
                    const targetAngle  = currentAngle + dynamicSpin;

                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);



// תנועה קפדנית מבוססת מרחק כדי למנוע ריצודים
                    let bestDistSq = Math.pow(targetR - row, 2) + Math.pow(targetC - col, 2); // המרחק הנוכחי ליעד
                    let bestNr = row, bestNc = col;

                    const neighbors = [
                        {dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1},
                        {dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}
                    ];

                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

                        const neighborDistSq = Math.pow(targetR - nr, 2) + Math.pow(targetC - nc, 2);

                        // מתעדכן אך ורק אם השכן ממש מקרב אותנו באופן מוחלט ליעד
                        if (neighborDistSq < bestDistSq) {
                            bestDistSq = neighborDistSq;
                            bestNr = nr;
                            bestNc = nc;
                        }
                    }

                    // תנועה: רק אם מצאנו שכן שמקרב אותנו + הוספת 20% פספוס לזרימה נוזלית וחלקה
                    if ((bestNr !== row || bestNc !== col) && Math.random() < 0.8) {

                        const target_i = bestNr * n + bestNc;
                        
                        if (!nextBoardState[target_i].isGold &&
                            nextBoardState[i].k < nextBoardState[target_i].k &&
                            !movedThisFrame.has(target_i)) { 
                            
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                            
                            movedThisFrame.add(i);
                            movedThisFrame.add(target_i);
                        }
                    }
                }
            }
            break;
        }


}

    return nextBoardState;
}
// --- END: Spiral Simulation ---


// --- START: Magnet Simulation (Independent Domain) ---

/**
 * ==========================================
 * OPTIMIZED MAGNET SIMULATION ENGINE
 * ==========================================
 * * NOTE FOR FUTURE MAINTENANCE: 
 * This function has been heavily optimized to run smoothly at 60FPS on mobile devices.
 * It deliberately trades modern JavaScript "syntactic sugar" for raw execution speed
 * and minimal memory allocation. Do not refactor back to modern syntax without 
 * profiling mobile performance first.
 * * Key Optimizations Applied:
 * * 1. MEMORY RECYCLING (Zero Allocation):
 * `cachedAnchors` and `cachedMovedThisFrame` are defined outside this function scope.
 * Instead of creating `new Array()` or `new Set()` every frame (which chokes the 
 * mobile Garbage Collector), we clear them using `.length = 0` or `.fill(0)`.
 * * 2. TYPED ARRAYS vs SETS:
 * We use a flat `Uint8Array` to track which pixels moved this frame. Direct index 
 * assignment (array[i] = 1) is astronomically faster than `Set.add()` and `Set.has()`.
 * * 3. NO MATH.POW:
 * `Math.pow(x, 2)` inside a hot loop (running millions of times per frame) causes 
 * CPU throttling. We use simple multiplication `(x * x)` for distance calculations.
 * * 4. CLASSIC SWAPPING (No Destructuring):
 * Using `[a, b] = [b, a]` creates temporary arrays in memory that trigger the GC. 
 * We use a classic `temp` variable to swap pixels safely.
 * * Logic Modes:
 * - 'magnet': Fluid/organic. Finds the top 3 optimal neighbors and allows 
 * path-bending/traffic-bypass.
 * - 'cosmic_magnet': Strict/geometric. Only evaluates the single absolute best 
 * neighbor. If blocked, it waits.
 * * Anchor Logic:
 * Targets only the *perimeter* of empty (black) space. Anchors are aggressively 
 * downsampled to a maximum of 300 points to prevent O(N^2) complexity explosions.
 */





// משתנים גלובליים ברמת המודול - ממוחזרים בכל פריים
const magnetNeighborsCoords = [
    {dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1},
    {dr: -1, dc: -1}, {dr: -1, dc: 1}, {dr: 1, dc: -1}, {dr: 1, dc: 1}
];
const cachedAnchors = [];
let cachedMovedThisFrame = new Uint8Array(0);

export function runMagnetGeneration({ n, currentBoardState, magnetRules, currentPalette }) {

    const nextBoardState = currentBoardState; // Zero Allocation!
    const method = magnetRules.method || 'magnet';
    const strength = 0.9; 

    if (cachedMovedThisFrame.length !== n * n) {
        cachedMovedThisFrame = new Uint8Array(n * n);
    } else {
        cachedMovedThisFrame.fill(0);
    }

    let darkestPresentIndex = Infinity;
    for (let i = 0; i < n * n; i++) {
        if (nextBoardState[i].isGold) continue;
        const currentK = nextBoardState[i].k;
        if (currentK < darkestPresentIndex) {
            darkestPresentIndex = currentK;
        }
        if (darkestPresentIndex === 0) break; 
    }
    if (darkestPresentIndex === Infinity) darkestPresentIndex = 0;
    
    const targetColorIndex = darkestPresentIndex; 

    switch (method) {
        case 'magnet': {
            cachedAnchors.length = 0; 

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (nextBoardState[nr * n + nc].k > targetColorIndex) {                                    
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > 300) {
                const step = Math.ceil(cachedAnchors.length / 300);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    let minDist = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDist) {
                            minDist = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDist > 0 && minDist !== Infinity) {
                        const tr_row = targetR - row;
                        const tc_col = targetC - col;
                        const currentDistSq = (tr_row * tr_row) + (tc_col * tc_col);

                        let b1Dist = Infinity, b1Nr = -1, b1Nc = -1;
                        let b2Dist = Infinity, b2Nr = -1, b2Nc = -1;
                        let b3Dist = Infinity, b3Nr = -1, b3Nc = -1;

                        // התיקון: שימוש במערך הגלובלי החיצוני
                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const tr_nr = targetR - nr;
                                const tc_nc = targetC - nc;
                                const neighborDistSq = (tr_nr * tr_nr) + (tc_nc * tc_nc);
                                
                                if (neighborDistSq < currentDistSq) {
                                    if (neighborDistSq < b1Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = b1Dist; b2Nr = b1Nr; b2Nc = b1Nc;
                                        b1Dist = neighborDistSq; b1Nr = nr; b1Nc = nc;
                                    } else if (neighborDistSq < b2Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = neighborDistSq; b2Nr = nr; b2Nc = nc;
                                    } else if (neighborDistSq < b3Dist) {
                                        b3Dist = neighborDistSq; b3Nr = nr; b3Nc = nc;
                                    }
                                }
                            }
                        }

                        if (b1Dist !== Infinity && Math.random() < 0.8) {
                            // התיקון: ביטול מערך ה-options! שימוש ב-if/else במקום אובייקטים
                            for (let attempt = 0; attempt < 3; attempt++) {
                                let optNr = -1, optNc = -1;
                                if (attempt === 0) { optNr = b1Nr; optNc = b1Nc; }
                                else if (attempt === 1) { optNr = b2Nr; optNc = b2Nc; }
                                else { optNr = b3Nr; optNc = b3Nc; }

                                if (optNr === -1) continue; 

                                const target_i = optNr * n + optNc;
                                
                                if (!nextBoardState[target_i].isGold &&
                                    nextBoardState[i].k < nextBoardState[target_i].k && 
                                    cachedMovedThisFrame[target_i] === 0) {
                                    
                                    const tempTile = nextBoardState[i];
                                    nextBoardState[i] = nextBoardState[target_i];
                                    nextBoardState[target_i] = tempTile;
                                    
                                    cachedMovedThisFrame[i] = 1;
                                    cachedMovedThisFrame[target_i] = 1;
                                    
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            break;
        }

        case 'cosmic_magnet': {
            cachedAnchors.length = 0; 

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (nextBoardState[nr * n + nc].k > targetColorIndex) {
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > 300) {
                const step = Math.ceil(cachedAnchors.length / 300);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    let minDist = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDist) {
                            minDist = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDist > 0 && minDist !== Infinity) {
                        const tr_row = targetR - row;
                        const tc_col = targetC - col;
                        let bestDistSq = (tr_row * tr_row) + (tc_col * tc_col);
                        let bestNr = row;
                        let bestNc = col;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const tr_nr = targetR - nr;
                                const tc_nc = targetC - nc;
                                const neighborDistSq = (tr_nr * tr_nr) + (tc_nc * tc_nc);
                                
                                if (neighborDistSq < bestDistSq) {
                                    bestDistSq = neighborDistSq;
                                    bestNr = nr;
                                    bestNc = nc;
                                }
                            }
                        }

                        if ((bestNr !== row || bestNc !== col) && Math.random() < 0.8) {
                            const target_i = bestNr * n + bestNc;
                            
                            if (!nextBoardState[target_i].isGold &&
                                nextBoardState[i].k < nextBoardState[target_i].k && 
                                cachedMovedThisFrame[target_i] === 0) {
                                
                                const tempTile = nextBoardState[i];
                                nextBoardState[i] = nextBoardState[target_i];
                                nextBoardState[target_i] = tempTile;
                                
                                cachedMovedThisFrame[i] = 1;
                                cachedMovedThisFrame[target_i] = 1;
                            }
                        }
                    }
                }
            }
            break;
        }
 
        case 'time_magnet': {
            if (cachedMovedThisFrame.length !== n * n) {
                cachedMovedThisFrame = new Uint8Array(n * n);
            } else {
                cachedMovedThisFrame.fill(0);
            }
            cachedAnchors.length = 0; 
            
            const pLen = currentPalette ? currentPalette.length : 256;

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (nextBoardState[nr * n + nc].k > targetColorIndex) {
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > 300) {
                const step = Math.ceil(cachedAnchors.length / 300);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    const colorWeight = nextBoardState[i].k / pLen; 
                    const moveProbability = 0.15 + (colorWeight * 0.80);
                    
                    if (Math.random() >= moveProbability) continue;

                    let minDistSq = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDistSq > 0 && minDistSq !== Infinity) {
                        const currentDistSq = minDistSq;

                        let b1Dist = Infinity, b1Nr = -1, b1Nc = -1;
                        let b2Dist = Infinity, b2Nr = -1, b2Nc = -1;
                        let b3Dist = Infinity, b3Nr = -1, b3Nc = -1;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const t_dr = targetR - nr;
                                const t_dc = targetC - nc;

                                const neighborDistSq = (t_dr * t_dr) + (t_dc * t_dc);
                                
                                if (neighborDistSq < currentDistSq) {
                                    if (neighborDistSq < b1Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = b1Dist; b2Nr = b1Nr; b2Nc = b1Nc;
                                        b1Dist = neighborDistSq; b1Nr = nr; b1Nc = nc;
                                    } else if (neighborDistSq < b2Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = neighborDistSq; b2Nr = nr; b2Nc = nc;
                                    } else if (neighborDistSq < b3Dist) {
                                        b3Dist = neighborDistSq; b3Nr = nr; b3Nc = nc;
                                    }
                                }
                            }
                        }

                        for (let attempt = 0; attempt < 3; attempt++) {
                            let optNr = -1, optNc = -1;
                            if (attempt === 0) { optNr = b1Nr; optNc = b1Nc; }
                            else if (attempt === 1) { optNr = b2Nr; optNc = b2Nc; }
                            else { optNr = b3Nr; optNc = b3Nc; }

                            if (optNr === -1) continue; 

                            const target_i = optNr * n + optNc;
                            
                            if (!nextBoardState[target_i].isGold &&
                                nextBoardState[i].k < nextBoardState[target_i].k && 
                                cachedMovedThisFrame[target_i] === 0) {
                                
                                const tempTile = nextBoardState[i];
                                nextBoardState[i] = nextBoardState[target_i];
                                nextBoardState[target_i] = tempTile;
                                
                                cachedMovedThisFrame[i] = 1;
                                cachedMovedThisFrame[target_i] = 1;
                                
                                break; 
                            }
                        }
                    }
                }
            }
            break;
        }

        case 'expand': {
            if (cachedMovedThisFrame.length !== n * n) {
                cachedMovedThisFrame = new Uint8Array(n * n);
            } else {
                cachedMovedThisFrame.fill(0);
            }
            cachedAnchors.length = 0; 
            
            const pLen = currentPalette ? currentPalette.length : 256;

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (nextBoardState[nr * n + nc].k > targetColorIndex) {                                    
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > 300) {
                const step = Math.ceil(cachedAnchors.length / 300);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    const colorWeight = 1.0 - (nextBoardState[i].k / pLen); 
                    const moveProbability = 0.15 + (colorWeight * 0.80);
                    
                    if (Math.random() >= moveProbability) continue;

                    let minDistSq = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDistSq > 0 && minDistSq !== Infinity) {
                        const currentDistSq = minDistSq;

                        let b1Dist = Infinity, b1Nr = -1, b1Nc = -1;
                        let b2Dist = Infinity, b2Nr = -1, b2Nc = -1;
                        let b3Dist = Infinity, b3Nr = -1, b3Nc = -1;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const t_dr = targetR - nr;
                                const t_dc = targetC - nc;

                                const neighborDistSq = (t_dr * t_dr) + (t_dc * t_dc);
                                
                                if (neighborDistSq < currentDistSq) {
                                    if (neighborDistSq < b1Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = b1Dist; b2Nr = b1Nr; b2Nc = b1Nc;
                                        b1Dist = neighborDistSq; b1Nr = nr; b1Nc = nc;
                                    } else if (neighborDistSq < b2Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = neighborDistSq; b2Nr = nr; b2Nc = nc;
                                    } else if (neighborDistSq < b3Dist) {
                                        b3Dist = neighborDistSq; b3Nr = nr; b3Nc = nc;
                                    }
                                }
                            }
                        }

                        for (let attempt = 0; attempt < 3; attempt++) {
                            let optNr = -1, optNc = -1;
                            if (attempt === 0) { optNr = b1Nr; optNc = b1Nc; }
                            else if (attempt === 1) { optNr = b2Nr; optNc = b2Nc; }
                            else { optNr = b3Nr; optNc = b3Nc; }

                            if (optNr === -1) continue; 

                            const target_i = optNr * n + optNc;
                            
                            if (!nextBoardState[target_i].isGold &&
                                nextBoardState[i].k < nextBoardState[target_i].k && 
                                cachedMovedThisFrame[target_i] === 0) {
                                
                                const tempTile = nextBoardState[i];
                                nextBoardState[i] = nextBoardState[target_i];
                                nextBoardState[target_i] = tempTile;
                                
                                cachedMovedThisFrame[i] = 1;
                                cachedMovedThisFrame[target_i] = 1;
                                
                                break; 
                            }
                        }
                    }
                }
            }
            break;
        }
    }

    return nextBoardState;
}


// === MINIMAL FIX: איפוס caches של מגנט (זה מה שגורם לאיטיות) ===
export function resetMagnetCaches() {
    if (typeof cachedMovedThisFrame !== 'undefined') {
        cachedMovedThisFrame = new Uint8Array(0);
    }
    if (typeof cachedAnchors !== 'undefined') {
        cachedAnchors.length = 0;
    }
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

