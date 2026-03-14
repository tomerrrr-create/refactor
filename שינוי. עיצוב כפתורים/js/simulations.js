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

            // --- START: MODIFICATION 1 ---
            // The 'liveCellDef' logic is now hard-coded to 'notDarkest' as requested.
            // The old switch statement has been removed.
            let isAlive = tileIndex !== darkestIndex;
            // --- END: MODIFICATION 1 ---

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
                    // --- START: MODIFICATION 2 ---
                    // The 'colorGenetics' method is now hard-coded to 'average' as requested.
                    const geneticColor = getGeneticColor(neighborColors, 'average');
                    // --- END: MODIFICATION 2 ---
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

let cachedRadialOrder = null;
let cachedRadialN = null;



export function runGravitationalSortGeneration({ n, currentBoardState, gravitationalSortRules }) {
    const nextBoardState = currentBoardState.map(tile => ({...tile}));
    const strength = gravitationalSortRules.strength;

    switch (gravitationalSortRules.direction) {




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




case 'center_x': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            
            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    let bestDr = 0;
                    let bestDc = 0;
                    let minDist = Math.pow(row - centerR, 2) + Math.pow(col - centerC, 2);
                    
                    const neighbors = [
                        {dr: -1, dc: 0}, {dr: 1, dc: 0},
                        {dr: 0, dc: -1}, {dr: 0, dc: 1}
                    ];
                    
                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                            const dist = Math.pow(nr - centerR, 2) + Math.pow(nc - centerC, 2);
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




case 'vortex': {
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
                    return distA - distB; 
                });
                cachedRadialOrder = indices;
                cachedRadialN = n;
            }

            // 1. מחזירים את מספר המעברים למינימום כדי לשמור על 60FPS חלק ונעים לעין!
            const passes = 6; 
            
            // 2. ה"קפיצה" - ככל שהלוח גדול יותר, הפיקסלים "ידלגו" מעל יותר שכנים אל עבר המרכז
            const stride = Math.max(1, Math.floor(n / 4));

            for (let p = 0; p < passes; p++) {
                
                // כוח משיכה ששואב למרכז (בקפיצות)
                for (let j = 0; j < cachedRadialOrder.length - stride; j++) {
                    const idx1 = cachedRadialOrder[j];          
                    const idx2 = cachedRadialOrder[j + stride]; 
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
                            [nextBoardState[idx1], nextBoardState[idx2]] = [nextBoardState[idx2], nextBoardState[idx1]];
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
                            [nextBoardState[idx1], nextBoardState[idx2]] = [nextBoardState[idx2], nextBoardState[idx1]];
                        }
                    }
                }
            }
            break;
        }


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
    
    const currentStateIndices = currentBoardState.map(tile => tile.k);

    // חזרנו ללולאה המקורית והרציפה שיוצרת תנועת גל חלקה (תמיד רצה מהסוף להתחלה)
    for (let i = n * n - 1; i >= 0; i--) {
        const k = currentStateIndices[i];
        if (!isWater(k)) continue;

        const row = Math.floor(i / n);
        const col = i % n;

        if (row < n - 1) {
            const belowIdx = i + n;
            const belowK = currentStateIndices[belowIdx];

            // נפילה ישרה למטה
            if (isAir(belowK)) {
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [belowK, k];
                continue;
            }
            
            // שחיקת אדמה
            if (isEarth(belowK) && Math.random() < erosionRules.erosionStrength) {
                currentStateIndices[belowIdx]++; 
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [currentStateIndices[belowIdx], k];
                continue;
            }
            
            // בדיקת אלכסונים
            const canGoLeft = col > 0 && isAir(currentStateIndices[belowIdx - 1]);
            const canGoRight = col < n - 1 && isAir(currentStateIndices[belowIdx + 1]);

            if (canGoLeft && canGoRight) {
                // הפתרון: הסריקה דוחפת שמאלה, לכן ניתן פה משקל יתר לימינה כדי לאזן את הערימה!
                const moveIdx = (Math.random() < 0.75) ? belowIdx + 1 : belowIdx - 1;
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




export function runContrastGeneration({ n, currentBoardState, currentPalette }) {
    const nextBoardState = currentBoardState.map(tile => ({...tile}));
    const strength = 0.1; // אפשר להפוך את זה להגדרה שהמשתמש יכול לשלוט בה בעתיד
    const maxIndex = currentPalette.length - 1;

    for (let i = 0; i < n * n; i++) {
        const cell = currentBoardState[i];
        if (cell.isGold) continue;
        
        const row = Math.floor(i / n);
        const col = i % n;

        let totalBrightness = 0;
        let neighborCount = 0;

        // נחשב את ממוצע הבהירות של השכנים בלבד (לא כולל התא עצמו)
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue; // מדלגים על התא המרכזי
                
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
            const avgBrightness = totalBrightness / neighborCount;
            const currentBrightness = cell.v;
            let newBrightness;

            // --- לב הלוגיקה של הקונטרסט ---
            if (currentBrightness > avgBrightness) {
                // אם אני בהיר יותר מהממוצע, אני אהפוך לעוד יותר בהיר
                newBrightness = currentBrightness + strength;
            } else if (currentBrightness < avgBrightness) {
                // אם אני כהה יותר מהממוצע, אני אהפוך לעוד יותר כהה
                newBrightness = currentBrightness - strength;
            } else {
                // אם אני שווה לממוצע, אני לא משתנה
                newBrightness = currentBrightness;
            }
            
            // נוודא שהערך החדש לא חורג מגבולות הפלטה
            newBrightness = Math.max(0, Math.min(newBrightness, maxIndex));

            nextBoardState[i].k = Math.round(newBrightness);
            nextBoardState[i].v = newBrightness;
        }
    }
    return nextBoardState;
}

// --- START: MODIFIED FOR CONTOUR FEATURE ---
export function runContourGeneration({ n, currentBoardState, currentPalette, contourRules }) {
    // 1. Create a copy to write to. We will only read from currentBoardState.
    const nextBoardState = currentBoardState.map(tile => ({ ...tile }));
    
    // 2. Define contour settings based on rules
    const pLen = currentPalette.length;
    const maxIndex = pLen - 1;

    // Use selected line color from rules
    const contourIndex = (contourRules.lineColor === 'lightest') ? maxIndex : 0; // Default to 0 (darkest)

    // Calculate threshold based on sensitivity (0-100)
    // 0 = Low Sensitivity -> High Threshold (50%)
    // 100 = High Sensitivity -> Low Threshold (1%)
    const MAX_THRESHOLD_PERCENT = 0.5; // 50%
    const MIN_THRESHOLD_PERCENT = 0.01; // 1%
    const sensitivity = contourRules.sensitivity || 30; // Default to 30 if undefined
    
    // Map sensitivity (0-100) to a threshold percentage (0.5-0.01)
    const thresholdPercent = MAX_THRESHOLD_PERCENT - ((sensitivity / 100) * (MAX_THRESHOLD_PERCENT - MIN_THRESHOLD_PERCENT));
    
    // Convert percentage to an absolute index step count
    const LUMINANCE_THRESHOLD = Math.max(1, Math.floor(pLen * thresholdPercent));
    
    // 3. Find all edge tiles by reading from the original state
    const indicesToChange = [];
    for (let i = 0; i < n * n; i++) {
        const cell = currentBoardState[i];
        
        // If this tile is *already* a contour line, skip it.
        // This allows the contour to "grow" from its edges on the next generation.
        if (cell.k === contourIndex) {
            continue;
        }

        const currentK = cell.k;
        const row = Math.floor(i / n);
        const col = i % n;
        let isEdge = false;

        // Check North
        if (row > 0 && Math.abs(currentK - currentBoardState[i - n].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }
        // Check South
        if (!isEdge && row < n - 1 && Math.abs(currentK - currentBoardState[i + n].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }
        // Check West
        if (!isEdge && col > 0 && Math.abs(currentK - currentBoardState[i - 1].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }
        // Check East
        if (!isEdge && col < n - 1 && Math.abs(currentK - currentBoardState[i + 1].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }

        if (isEdge) {
            indicesToChange.push(i);
        }
    }

    // 4. Apply all changes simultaneously to the next state
    // This prevents a chain reaction within a single generation
    for (const index of indicesToChange) {
        nextBoardState[index].k = contourIndex;
        nextBoardState[index].v = contourIndex;
        nextBoardState[index].isGold = false; // Contour lines overwrite gold tiles
    }

    return nextBoardState;
}
// --- END: MODIFIED FOR CONTOUR FEATURE ---

export function generateSandpile(currentBoardState, currentPalette, chiFlowRules) {
    const n = Math.sqrt(currentBoardState.length);
    const nextBoardState = currentBoardState.map(cell => ({ ...cell }));
    let hasChanged = false;
    const numColors = currentPalette.length;

    // מגנטיות - עכשיו נשלטת על ידי המשתמש (reach) במקום חישוב קשיח
let pullReach = chiFlowRules.reach;
// אם המשתמש בחר 0 (Auto), נשתמש בנוסחה הדינמית החכמה מהקוד הישן שלך
if (pullReach === 0) {
    pullReach = Math.max(2, Math.floor(numColors / 6));
}

    for (let i = 0; i < currentBoardState.length; i++) {
        const row = Math.floor(i / n);
        const col = i % n;
        const currentK = currentBoardState[i].k;
        
        let neighborsWithEnergy = 0;
        let pullingNeighborsCount = 0;

        // בדיקת 8 שכנים (כולל עטיפת הלוח)
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                
                const wrapRow = (row + r + n) % n;
                const wrapCol = (col + c + n) % n;
                const neighborIdx = wrapRow * n + wrapCol;
                const neighborK = currentBoardState[neighborIdx].k;

                if (neighborK > 0) neighborsWithEnergy++;

                let dist = neighborK - currentK;
                if (dist < 0) dist += numColors;

                if (dist > 0 && dist <= pullReach) {
                    pullingNeighborsCount++;
                }
            }
        }

        // חוק 1: התעוררות - נבדק מול מערך החוקים הדינמי (awakening)
        if (currentK === 0 && chiFlowRules.awakening.includes(neighborsWithEnergy)) {
            nextBoardState[i].k = 1;
            nextBoardState[i].v = 1;
            hasChanged = true;
        } 
        // חוק 2: זרימה ממוקדת - נבדק מול מערך החוקים הדינמי (flow)
        else if (currentK > 0 && chiFlowRules.flow.includes(pullingNeighborsCount)) {
            const nextK = (currentK + 1) % numColors;
            nextBoardState[i].k = nextK;
            nextBoardState[i].v = nextK;
            hasChanged = true;
        }
    }

    // --- התחלת מנגנון ההצתה (Ignition) ---
    // (הקוד שהוספנו קודם נשאר כאן ללא שינוי, הוא עדיין רלוונטי)
    let activeCellsCount = 0;
    const activeCellsIndices = [];

    for (let i = 0; i < currentBoardState.length; i++) {
        if (currentBoardState[i].k > 0) {
            activeCellsCount++;
            activeCellsIndices.push(i);
        }
    }

    if (activeCellsCount > 0 && activeCellsCount < 150) {
        for (const index of activeCellsIndices) {
            const row = Math.floor(index / n);
            const col = index % n;

            for (let r = -4; r <= 4; r++) {
                for (let c = -4; c <= 4; c++) {
                    const newRow = row + r;
                    const newCol = col + c;

                    if (newRow >= 0 && newRow < n && newCol >= 0 && newCol < n) {
                        if (Math.random() > 0.3) {
                            const newIndex = newRow * n + newCol;
                            const randomColorK = Math.floor(Math.random() * numColors);
                            
                            nextBoardState[newIndex].k = randomColorK;
                            nextBoardState[newIndex].v = randomColorK;
                            hasChanged = true;
                        }
                    }
                }
            }
        }
        return { nextBoardState, hasChanged };
    }
    // --- סוף מנגנון ההצתה ---

    return { nextBoardState, hasChanged };
}


// --- Turing Patterns (Reaction-Diffusion) Helper ---
export function runTuringGeneration({ n, currentBoardState, currentPalette, turingState, turingRules }) {
    let state = turingState;
    const pLen = currentPalette.length;
    
    // מכפיל להמרה ויזואלית
    const STRETCH_FACTOR = 1.6; 
    
    // 1. אתחול ראשוני (Ping-Pong Buffers - מניעת יצירת מערכים חדשים בכל פריים)
    if (!state || !state.isInitialized || state.A.length !== n * n) {
        state = { 
            A: new Float32Array(n * n).fill(1.0), 
            B: new Float32Array(n * n).fill(0.0),
            nextA: new Float32Array(n * n), // באפר חלופי לחישובים
            nextB: new Float32Array(n * n), // באפר חלופי לחישובים
            lastBoardK: new Uint16Array(n * n), 
            isInitialized: true 
        };
        
        let hasDrawing = false;
        
        for (let i = 0; i < n * n; i++) {
            const currentK = currentBoardState[i].k;
            state.lastBoardK[i] = currentK;
            
            if (currentK > 0 && !currentBoardState[i].isGold) {
                hasDrawing = true;
                // מיפוי לא-ליניארי (חזקה) כדי שצבעים בהירים לא יישרפו מהר מדי
                const bLevel = Math.pow(currentK / pLen, 1.5); 
                state.B[i] = Math.min(1.0, bLevel); 
                state.A[i] = Math.max(0.0, 1.0 - state.B[i]);
            }
        }
        
        if (!hasDrawing) {
            const center = Math.floor(n / 2);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const idx = (center + dy) * n + (center + dx);
                    if(idx >= 0 && idx < n * n) {
                        state.B[idx] = 1.0;
                        state.A[idx] = 0.0;
                    }
                }
            }
        }
    } else {
        // סנכרון חי לציור של המשתמש
        for (let i = 0; i < n * n; i++) {
            const currentK = currentBoardState[i].k;
            if (currentK !== state.lastBoardK[i]) {
                if (currentK > 0 && !currentBoardState[i].isGold) {
                    const bLevel = Math.pow(currentK / pLen, 1.5);
                    state.B[i] = Math.min(1.0, bLevel);
                    state.A[i] = Math.max(0.0, 1.0 - state.B[i]);
                } else if (currentK === 0) {
                    state.B[i] = 0.0;
                    state.A[i] = 1.0;
                }
                state.lastBoardK[i] = currentK;
            }
        }
    }

    const { feed, kill, dA, dB, timeStep } = turingRules;
    
    // קביעת מספר האיטרציות דינמית לפי גודל הלוח (פותר את בעיית ה-Scale ואת איטיות הסימולציה)
    const iterations = Math.max(3, Math.floor(n / 25)); 

    let currA = state.A;
    let currB = state.B;
    let nextA = state.nextA;
    let nextB = state.nextB;
    
    // 2. חישוב הריאקציה-דיפוזיה בלולאה פנימית מרובה
    for (let step = 0; step < iterations; step++) {
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const i = y * n + x;
                const a = currA[i];
                const b = currB[i];
                
                // --- חישוב לפלסיאן (Inlined) ללא פעולות Modulo יקרות ---
                const yUp = (y === 0) ? n - 1 : y - 1;
                const yDown = (y === n - 1) ? 0 : y + 1;
                const xLeft = (x === 0) ? n - 1 : x - 1;
                const xRight = (x === n - 1) ? 0 : x + 1;

                const top = yUp * n;
                const bottom = yDown * n;
                const row = y * n;

                const sumA = (a * -1.0) +
                             (currA[top + x] * 0.2) + (currA[bottom + x] * 0.2) +
                             (currA[row + xLeft] * 0.2) + (currA[row + xRight] * 0.2) +
                             (currA[top + xLeft] * 0.05) + (currA[top + xRight] * 0.05) +
                             (currA[bottom + xLeft] * 0.05) + (currA[bottom + xRight] * 0.05);

                const sumB = (b * -1.0) +
                             (currB[top + x] * 0.2) + (currB[bottom + x] * 0.2) +
                             (currB[row + xLeft] * 0.2) + (currB[row + xRight] * 0.2) +
                             (currB[top + xLeft] * 0.05) + (currB[top + xRight] * 0.05) +
                             (currB[bottom + xLeft] * 0.05) + (currB[bottom + xRight] * 0.05);
                // --- סוף חישוב לפלסיאן ---
                
                const reaction = a * b * b;
                
                let newA = a + ((dA * sumA) - reaction + (feed * (1 - a))) * timeStep;
                let newB = b + ((dB * sumB) + reaction - ((kill + feed) * b)) * timeStep;
                
                nextA[i] = Math.max(0, Math.min(1, newA));
                nextB[i] = Math.max(0, Math.min(1, newB));
            }
        }
        
        // החלפת מערכים (Ping-Pong) לקראת האיטרציה הבאה
        let tempA = currA; currA = nextA; nextA = tempA;
        let tempB = currB; currB = nextB; nextB = tempB;
    }
    
    // עדכון הסטייט הקבוע במערכים המעודכנים ביותר
    state.A = currA;
    state.B = currB;
    state.nextA = nextA;
    state.nextB = nextB;

// 3. תרגום הריכוזים הכימיים לצבעים
    const nextBoardState = currentBoardState.map((tile, i) => {
        if (tile.isGold) {
            state.lastBoardK[i] = tile.k;
            return tile;
        }
        
        const concentrationA = state.A[i];
        


// 1. הפיכת הכיוון 
        let visualValue = 1.0 - concentrationA; 

        // 2. פריסה על כל הפלטה (החזרנו את המתיחה החסרה!)
        // זה מבטיח שהטווח הכימי (0.05 עד 0.78) נמתח על פני 100% מהצבעים, 
        // כך ששום צבע בפלטה לא ילך לאיבוד.
        visualValue = (visualValue - 0.05) / (0.78 - 0.05);
        visualValue = Math.max(0.0, Math.min(1.0, visualValue));

// 3. העברת המשקל לכהים (Gamma > 1.0): 
        // במקום 0.85, אנחנו משתמשים ב-1.5. 
        // זה "ישקע" את רוב הלוח לתוך הצבעים העמוקים והכהים,
        // וישאיר את הבהירים רק לקצוות המודגשים.
        visualValue = Math.pow(visualValue, 1.5);

        // 4. קונטרסט מותנה (השארנו את מה שמונע את כאב הראש)
        if (visualValue > 0.5) {
            let t = (visualValue - 0.5) * 2.0; 
            t = 1.0 - Math.pow(1.0 - t, 2.0);  
            visualValue = 0.5 + (t * 0.5);     
        }

        
        // מיפוי מדויק לאינדקס הצבע
        const colorIndex = Math.round(visualValue * (pLen - 1));
        
        state.lastBoardK[i] = colorIndex;
        
        return { ...tile, k: colorIndex, v: colorIndex };
    });

    return { 
        nextBoardState, 
        nextTuringState: state 
    };
   }






// --- START: Spiral Simulation ---
export function runSpiralGeneration({ n, currentBoardState, spiralRules }) {
    const nextBoardState = currentBoardState.map(tile => ({ ...tile }));
    const method = spiralRules.method;
    
    const strength = 0.9; // הוספתי משתנה זה כדי להזין את תנאי ההסתברות מהקוד שלך

    // --- 1. קלאסית (המבוסס על קוד 'left' שלך) ---
    if (method === 'classic') {
        const centerR = (n - 1) / 2;
        const centerC = (n - 1) / 2;
        
        const baseSpinStrength = 0.10; 
        const pullStrength = 0.8;      
        const eddyFrequency = 0.03;    
        const eddyStrength = 0.25;     
        
        const timePhase = Date.now() * 0.0005;

        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const i = row * n + col;
                
                if (nextBoardState[i].isGold) continue; 
                
                const dy = row - centerR;
                const dx = col - centerC;
                const distToCenter = Math.sqrt(dx * dx + dy * dy);
                
                if (distToCenter === 0) continue; 
                
                const turbulence = Math.sin((row * eddyFrequency) + timePhase) * Math.cos((col * eddyFrequency) - timePhase);
                const dynamicSpin = baseSpinStrength + (2.0 / Math.max(distToCenter, 1));
                
                const currentAngle = Math.atan2(dy, dx);
                
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
    }
    // --- 2. התרחבות (המבוסס על קוד 'right' שלך) ---
    else if (method === 'expand') {
        const centerR = (n - 1) / 2;
        const centerC = (n - 1) / 2;
        
        const baseSpinStrength = 0.05; 
        const pullStrength = -0.8; // שונה למינוס כדי ליצור אפקט התרחבות החוצה!
        const eddyFrequency = 0.03;    
        const eddyStrength = 0.25;     
        
        const timePhase = Date.now() * 0.0005;

        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const i = row * n + col;
                
                if (nextBoardState[i].isGold) continue; 
                
                const dy = row - centerR;
                const dx = col - centerC;
                const distToCenter = Math.sqrt(dx * dx + dy * dy);
                
                if (distToCenter === 0) continue; 
                
                const turbulence = Math.sin((row * eddyFrequency) + timePhase) * Math.cos((col * eddyFrequency) - timePhase);
                const dynamicSpin = baseSpinStrength + (2.0 / Math.max(distToCenter, 1));
                const currentAngle = Math.atan2(dy, dx);
                
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
                    if (validNeighbors.length > 1 && Math.random() < 0.60) {
                        [validNeighbors[0], validNeighbors[1]] = [validNeighbors[1], validNeighbors[0]];
                    }
                    
                    if (Math.random() < strength) {
                        for (const candidate of validNeighbors) {
                            const target_i = candidate.nr * n + candidate.nc;
                            
                            if (!nextBoardState[target_i].isGold && nextBoardState[i].k < nextBoardState[target_i].k) {
                                [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                                break; 
                            }
                        }
                    }
                }
            }
        }
    }
    // --- 3. מערבולת (המבוסס על קוד 'down' שלך) ---
    else if (method === 'vortex') {
        const centerR = (n - 1) / 2;
        const centerC = (n - 1) / 2;
        
        const baseSpinStrength = 0.105;   
        const pullStrength     = 0.78;    

        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const i = row * n + col;
                if (nextBoardState[i].isGold) continue;
                
                const dy = row - centerR;
                const dx = col - centerC;
                const distToCenter = Math.sqrt(dx * dx + dy * dy);
                if (distToCenter < 0.5) continue; 
                
                const currentAngle = Math.atan2(dy, dx);
                const targetRadius = Math.max(0.3, distToCenter - pullStrength);
                const targetAngle  = currentAngle + baseSpinStrength;
                
                const targetR = centerR + targetRadius * Math.sin(targetAngle);
                const targetC = centerC + targetRadius * Math.cos(targetAngle);
                
                const desiredDX = targetC - col;
                const desiredDY = targetR - row;
                const desiredLen = Math.sqrt(desiredDX * desiredDX + desiredDY * desiredDY) || 1;
                
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
                    
                    const moveLen = Math.sqrt(dc * dc + dr * dr) || 1;
                    const score = (dc * desiredDX + dr * desiredDY) / (moveLen * desiredLen);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestNr = nr;
                        bestNc = nc;
                    }
                }
                
                if (bestScore > 0.15 && Math.random() < strength) {
                    const target_i = bestNr * n + bestNc;
                    
                    if (!nextBoardState[target_i].isGold && nextBoardState[i].k < nextBoardState[target_i].k) {
                        [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                    }
                }
            }
        }
    }

    return nextBoardState;
}
// --- END: Spiral Simulation ---